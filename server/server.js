/* Mom Shop cloud server.
   - Serves stitch-replica/ pages
   - POST /api/sync receives browser tables (backup + cron source)
   - Cron 23:30 Asia/Kathmandu: on last BS day writes <Month>_<Year>_report.xlsx to ./reports
   - GET /api/reports lists files, GET /api/reports/:file downloads them
   Run: npm start (PORT env supported). Needs persistent disk/volume in cloud. */
const express = require('express');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const ExcelJS = require('exceljs');
const auth = require('./auth');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..', 'stitch-replica');
const DATA_FILE = path.join(__dirname, 'data', 'shopdb.json');
const REPORTS_DIR = path.join(__dirname, 'reports');
/* Per-user storage: data/user-<name>.json + reports/<name>/. Names are charset-guarded in auth. */
function safeUser(u) { return /^[a-zA-Z0-9_-]{1,32}$/.test(u || '') ? u : null; }
function safeShop(s) { return /^[a-zA-Z0-9_-]{1,40}$/.test(s || '') ? s : null; }
function shopOf(req) { return safeShop(auth.getShop(req.user)) || 'shop'; }
function shopDbFile(shop) { return path.join(__dirname, 'data', 'shop-' + shop + '.json'); }
function shopReportsDir(shop) {
  const d = path.join(REPORTS_DIR, shop);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}
function blankShopDb() { return { customers: [], products: [], orders: [], items: [], deleted: [], seq: { C: 1000, P: 2000, O: 5000, T: 9000 } }; }
function readShopDb(shop, username) {
  const f = shopDbFile(shop);
  try {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (d && d.customers && d.orders) { d.deleted = d.deleted || []; return d; }
  } catch (e) {}
  if (username) {
    try {
      const leg = path.join(__dirname, 'data', 'user-' + username + '.json');
      if (fs.existsSync(leg)) {
        const d = JSON.parse(fs.readFileSync(leg, 'utf8'));
        if (d && d.customers) { d.deleted = d.deleted || []; fs.writeFileSync(f, JSON.stringify(d)); return d; }
      }
    } catch (e) {}
  }
  return blankShopDb();
}
/* Merge browser DB into shop: union by id (incoming wins), item lines
   replaced per order, deletions via tombstones. */
function mergeShopDb(shop, incoming) {
  const cur = readShopDb(shop);
  cur.deleted = cur.deleted || [];
  const gone = new Set([...cur.deleted, ...((incoming && incoming.deleted) || [])]);
  const freshDel = new Set((incoming && incoming.deleted) || []);
  if (freshDel.size) {
    cur.orders = cur.orders.filter(o => !freshDel.has(o.id));
    cur.items = cur.items.filter(i => !freshDel.has(i.order_id));
  }
  cur.deleted = [...gone].slice(-500);
  const drop = new Set(cur.deleted);
  const byId = arr => { const m = {}; (arr || []).forEach(r => { if (r && r.id) m[r.id] = r; }); return m; };
  const mc = byId(cur.customers), mp = byId(cur.products), mo = byId(cur.orders);
  (incoming.customers || []).forEach(r => { if (r && r.id) mc[r.id] = r; });
  (incoming.products || []).forEach(r => { if (r && r.id) mp[r.id] = r; });
  (incoming.orders || []).forEach(r => { if (r && r.id && !drop.has(r.id)) mo[r.id] = r; });
  cur.customers = Object.values(mc);
  cur.products = Object.values(mp);
  cur.orders = Object.values(mo);
  const incOrderIds = new Set((incoming.orders || []).map(o => o && o.id).filter(Boolean));
  cur.items = cur.items.filter(i => !incOrderIds.has(i.order_id) && !drop.has(i.order_id))
    .concat((incoming.items || []).filter(i => i && incOrderIds.has(i.order_id)));
  const sq = (incoming && incoming.seq) || {};
  ['C', 'P', 'O', 'T'].forEach(k => { cur.seq[k] = Math.max(cur.seq[k] || 0, sq[k] || 0); });
  fs.writeFileSync(shopDbFile(shop), JSON.stringify(cur));
  return cur;
}
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DATA_FILE))) fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

/* BS calendar — verified 2083 table (Baishakh 31 ... Chaitra 30). */
const BS_MONTHS = ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
const BS_2083 = [31, 32, 31, 31, 31, 31, 30, 29, 30, 29, 30, 30];
const BS_ANCHOR = Date.UTC(2026, 3, 14);
function adToBsDate(y, mo, d) {
  const days = Math.floor((Date.UTC(y, mo, d) - BS_ANCHOR) / 864e5);
  if (days < 0 || days >= 365) return null;
  let m = 0, left = days;
  while (m < 12 && left >= BS_2083[m]) { left -= BS_2083[m]; m++; }
  return { y: 2083, m: m + 1, d: left + 1 };
}
function nptParts() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
  const m = s.match(/(\d+)\/(\d+)\/(\d+).*?(\d+):(\d+)/);
  return { mo: Number(m[1]), d: Number(m[2]), y: Number(m[3]), h: Number(m[4]), min: Number(m[5]) };
}
function nptBs() { const p = nptParts(); return { bs: adToBsDate(p.y, p.mo - 1, p.d), h: p.h, min: p.min }; }

function orderView(db, o) {
  const c = db.customers.find(c => c.id === o.customer_id) || {};
  const lines = db.items.filter(i => i.order_id === o.id).map(i => {
    const p = db.products.find(p => p.id === i.product_id) || {};
    return { name: p.name || 'Item', qty: Number(i.qty) || 0, ws: Number(i.wholesale) || 0, sp: Number(i.actual_price) || 0 };
  });
  const ss = lines.reduce((s, i) => s + i.sp * i.qty, 0);
  const wc = lines.reduce((s, i) => s + i.ws * i.qty, 0);
  const disc = Number(o.discount) || 0, del = Number(o.delivery) || 0, adv = Number(o.advance) || 0;
  return { o, c, lines, ss, wc, rev: ss - disc, fin: ss - disc + del, prof: ss - wc - disc, bal: ss - disc + del - adv };
}
function monthViews(db, y, m) {
  return db.orders.map(o => orderView(db, o)).filter(v => {
    const d = new Date(v.o.completed_at || v.o.created_at);
    if (isNaN(d)) return false;
    const b = adToBsDate(d.getFullYear(), d.getMonth(), d.getDate());
    return b && b.y === y && b.m === m;
  });
}
/* NOTE: server uses UTC calendar day of stored ISO timestamps (same as browser math). */

async function buildMonthReport(y, m, shop) {
  const db = readShopDb(shop);
  const views = monthViews(db, y, m);
  const s = { n: views.length, comp: 0, ss: 0, wc: 0, disc: 0, del: 0, adv: 0, fin: 0, prof: 0, bal: 0 };
  views.forEach(v => {
    if (v.o.status === 'completed') s.comp++;
    s.ss += v.ss; s.wc += v.wc;
    s.disc += Number(v.o.discount) || 0; s.del += Number(v.o.delivery) || 0; s.adv += Number(v.o.advance) || 0;
    s.fin += v.fin; s.prof += v.prof; s.bal += v.bal;
  });
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Mom Shop CMS';
  wb.created = new Date();
  const sum = wb.addWorksheet('Summary');
  sum.columns = [{ width: 34 }, { width: 22 }];
  [['BS month', BS_MONTHS[m - 1] + ' ' + y], ['Orders', s.n], ['Completed', s.comp], ['Active', s.n - s.comp],
   ['Gross sales', s.ss], ['Discounts', s.disc], ['Revenue (ex delivery)', s.ss - s.disc],
   ['Wholesale cost', s.wc], ['Net profit', s.prof], ['Advance collected', s.adv],
   ['Still due', s.bal], ['Delivery pass-through (courier)', s.del]].forEach(r => sum.addRow(r));
  sum.getRow(1).font = { bold: true };
  const os = wb.addWorksheet('Orders');
  os.columns = [{ width: 12 }, { width: 20 }, { width: 16 }, { width: 12 }, { width: 40 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 16 }];
  os.addRow(['order_id', 'customer', 'phone', 'status', 'items', 'total_collect', 'revenue', 'profit', 'advance', 'balance_due', 'date']);
  views.forEach(v => {
    os.addRow([v.o.id, v.c.full_name || '', v.c.phone || '', v.o.status, v.lines.map(i => i.name + ' x' + i.qty + ' @' + i.sp).join('; '), v.fin, v.rev, v.prof, v.o.advance, v.bal, (v.o.completed_at || v.o.created_at || '').slice(0, 10)]);
  });
  os.getRow(1).font = { bold: true };
  const ts = wb.addWorksheet('Transactions');
  ts.columns = [{ width: 12 }, { width: 12 }, { width: 20 }, { width: 20 }, { width: 8 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 20 }];
  ts.addRow(['txn_id', 'order_id', 'customer', 'product', 'qty', 'price', 'line_total', 'line_profit', 'datetime']);
  const ids = {};
  views.forEach(v => { ids[v.o.id] = true; });
  db.items.filter(i => ids[i.order_id]).forEach(i => {
    const p = db.products.find(p => p.id === i.product_id) || {};
    const c = db.customers.find(c => c.id === i.customer_id) || {};
    const lt = (Number(i.actual_price) || 0) * (Number(i.qty) || 0);
    ts.addRow([i.id, i.order_id, c.full_name || '', p.name || '', i.qty, i.actual_price, lt, lt - (Number(i.wholesale) || 0) * (Number(i.qty) || 0), i.created_at]);
  });
  ts.getRow(1).font = { bold: true };
  const file = BS_MONTHS[m - 1] + '_' + y + '_report.xlsx';
  await wb.xlsx.writeFile(path.join(shopReportsDir(shop), file));
  return { file, orders: s.n, revenue: s.ss - s.disc, profit: s.prof };
}

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ---- Private access: session cookie gate ---- */
function getCookies(req) {
  const h = req.headers.cookie || '';
  const o = {};
  h.split(';').forEach(p => { const i = p.indexOf('='); if (i > -1) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return o;
}
function cookieHeader(token, clear) {
  let c = 'sid=' + (clear ? 'deleted' : token) + '; HttpOnly; Path=/; Max-Age=' + (clear ? 0 : 2592000) + '; SameSite=Lax';
  if (process.env.SECURE_COOKIES === '1') c += '; Secure';
  return c;
}
const OPEN = ['/login.html', '/install.html', '/manifest.webmanifest', '/sw.js', '/pwa.js', '/api/login', '/api/register', '/api/health'];
const OPEN_PREFIX = ['/icons/'];
/* Light throttle on auth endpoints: 30 tries per IP per 5 min. */
const attempts = new Map();
function throttle(req, res, next) {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || '?';
  const now = Date.now();
  let a = attempts.get(ip);
  if (!a || a.reset < now) a = { n: 0, reset: now + 5 * 60 * 1000 };
  a.n++;
  attempts.set(ip, a);
  if (a.n > 30) return res.status(429).json({ ok: false, error: 'too many tries, wait 5 min' });
  next();
}
app.use((req, res, next) => {
  if (OPEN.includes(req.path) || OPEN_PREFIX.some(p => req.path.startsWith(p))) return next();
  const user = auth.check(getCookies(req).sid);
  if (!user) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ ok: false, error: 'login required' });
    return res.redirect('/login.html');
  }
  req.user = user;
  next();
});
app.post('/api/login', throttle, (req, res) => {
  const u = auth.verify(req.body.username, req.body.password);
  if (!u) return res.status(401).json({ ok: false });
  res.setHeader('Set-Cookie', cookieHeader(auth.createSession(u.username), false));
  res.json({ ok: true, username: u.username });
});
app.post('/api/register', throttle, (req, res) => {
  try {
    const u = auth.register(req.body.username, req.body.password);
    res.setHeader('Set-Cookie', cookieHeader(auth.createSession(u.username), false));
    res.json({ ok: true, username: u.username });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});
app.post('/api/logout', (req, res) => {
  auth.destroy(getCookies(req).sid);
  res.setHeader('Set-Cookie', cookieHeader('', true));
  res.json({ ok: true });
});
app.get('/api/me', (req, res) => {
  const u = auth.check(getCookies(req).sid);
  if (!u) return res.status(401).json({ ok: false });
  res.json({ ok: true, username: u });
});

app.get('/api/health', (req, res) => {
  const p = nptParts();
  res.json({ ok: true, npt: p, bs: adToBsDate(p.y, p.mo - 1, p.d) });
});
app.post('/api/sync', (req, res) => {
  const shop = shopOf(req);
  const db = req.body && req.body.db;
  if (!db || !Array.isArray(db.customers) || !Array.isArray(db.orders)) return res.status(400).json({ ok: false, error: 'bad db' });
  const cur = mergeShopDb(shop, db);
  res.json({ ok: true, customers: cur.customers.length, orders: cur.orders.length, items: cur.items.length, deleted: cur.deleted });
});
app.get('/api/pull', (req, res) => {
  const shop = shopOf(req);
  const cur = readShopDb(shop, req.user);
  res.json({ ok: true, db: cur, deleted: cur.deleted || [] });
});
app.get('/api/shop', (req, res) => {
  const shop = shopOf(req);
  res.json({ ok: true, user: req.user, shop, members: auth.shopMembers(shop) });
});
app.post('/api/shop/invite', (req, res) => {
  res.json({ ok: true, code: auth.createInvite(shopOf(req)) });
});
app.post('/api/shop/join', (req, res) => {
  const shop = auth.redeemInvite(req.user, req.body.code);
  if (!shop) return res.status(400).json({ ok: false, error: 'bad or expired code' });
  res.json({ ok: true, shop });
});
app.post('/api/shop/leave', (req, res) => {
  auth.setShop(req.user, req.user);
  res.json({ ok: true, shop: req.user });
});
app.get('/api/db', (req, res) => {
  const f = shopDbFile(shopOf(req));
  if (!fs.existsSync(f)) return res.status(404).json({ ok: false });
  res.download(f, 'shopdb-backup.json');
});
app.get('/api/reports', (req, res) => {
  const dir = shopReportsDir(shopOf(req));
  const out = fs.readdirSync(dir).filter(f => f.endsWith('_report.xlsx')).map(f => {
    const st = fs.statSync(path.join(dir, f));
    return { file: f, size: st.size, mtime: st.mtime };
  }).sort((a, b) => b.mtime - a.mtime);
  res.json(out);
});
app.get('/api/reports/:file', (req, res) => {
  const f = path.basename(req.params.file);
  if (!/^[A-Za-z]+_\d{4}_report\.xlsx$/.test(f)) return res.status(400).json({ ok: false });
  const full = path.join(shopReportsDir(shopOf(req)), f);
  if (!fs.existsSync(full)) return res.status(404).json({ ok: false });
  res.download(full, f);
});
app.post('/api/reports/generate', async (req, res) => {
  try {
    const shop = shopOf(req);
    let y = Number(req.body.y), m = Number(req.body.m);
    if (!y || !m) {
      const p = nptParts();
      const b = adToBsDate(p.y, p.mo - 1, p.d);
      if (!b) return res.status(400).json({ ok: false, error: 'outside BS table' });
      y = b.y; m = b.m;
    }
    const meta = await buildMonthReport(y, m, shop);
    res.json({ ok: true, ...meta });
  } catch (e) { res.status(500).json({ ok: false, error: String(e.message || e) }); }
});

app.get('/manifest.webmanifest', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(ROOT, 'manifest.webmanifest'));
});

app.use(express.static(ROOT));

function monthEndCheck() {
  try {
    const { bs, h, min } = nptBs();
    if (!bs) return;
    const late = h > 23 || (h === 23 && min >= 30);
    if (bs.d !== BS_2083[bs.m - 1] || !late) return;
    const shops = new Set();
    try {
      auth.listUsers().forEach(u => { const s = safeShop(auth.getShop(u.username)); if (s) shops.add(s); });
      fs.readdirSync(path.join(__dirname, 'data')).forEach(f => {
        const m = f.match(/^shop-(.+)\.json$/);
        if (m && safeShop(m[1])) shops.add(m[1]);
      });
    } catch (e) {}
    [...shops].forEach(shop => {
      const file = BS_MONTHS[bs.m - 1] + '_' + bs.y + '_report.xlsx';
      if (fs.existsSync(path.join(shopReportsDir(shop), file))) return;
      buildMonthReport(bs.y, bs.m, shop).then(r => console.log('month-end report saved:', shop + '/' + r.file)).catch(e => console.error('report failed:', e.message));
    });
  } catch (e) { console.error(e.message); }
}
cron.schedule('30 23 * * *', monthEndCheck, { timezone: 'Asia/Kathmandu' });

app.listen(PORT, () => {
  console.log('Mom Shop server on :' + PORT + ' (reports -> ./reports, data -> ./data/shopdb.json)');
  monthEndCheck();
});

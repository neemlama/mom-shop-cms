/* ShopDB v1 — relational store for AI-ready data.
   Tables: customers (C1001...), products (P2001...), orders (O5001...), items = transactions (T9001...).
   First run migrates once from legacy flat key 'customers_simple_v1' (kept as backup). */
const DB_KEY = 'shopdb_v1';
const LEGACY_KEY = 'customers_simple_v1';
/* Cloud sync: POST whole DB to server after each change (silent when offline).
   Set window.SERVER_URL before db.js loads to point elsewhere. Same origin used when served by server. */
const SERVER_URL = (typeof window !== 'undefined' && window.SERVER_URL) || (typeof location !== 'undefined' ? location.origin : 'http://localhost:3000');
let _syncT = null;
function dbSaveSilent(db) { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
function pruneLocal(ids) {
  if (!ids || !ids.length) return;
  const set = new Set(ids);
  let db = null;
  try { db = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) {}
  if (!db || !db.orders) return;
  db.orders = db.orders.filter(o => !set.has(o.id));
  db.items = (db.items || []).filter(i => !set.has(i.order_id));
  db.deleted = (db.deleted || []).filter(id => !set.has(id));
  dbSaveSilent(db);
}
function dbPushNow() {
  return new Promise(resolve => {
    try {
      if (typeof fetch === 'undefined') return resolve(null);
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return resolve(null);
      fetch(SERVER_URL + '/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ db: JSON.parse(raw) }) })
        .then(r => r.json()).then(j => { if (j && j.ok && Array.isArray(j.deleted)) pruneLocal(j.deleted); resolve(j); }).catch(() => resolve(null));
    } catch (e) { resolve(null); }
  });
}
function dbQueuePush() {
  try { if (typeof window === 'undefined') return; clearTimeout(_syncT); _syncT = setTimeout(() => { dbPushNow().catch(() => {}); }, 1500); } catch (e) {}
}
function dbApplyPull(srv, srvDeleted) {
  let local = null;
  try { local = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) {}
  if (!local || !local.orders) { if (srv && srv.orders) dbSaveSilent(srv); return; }
  const byId = arr => { const m = {}; (arr || []).forEach(r => { if (r && r.id) m[r.id] = r; }); return m; };
  const lc = byId(local.customers), lp = byId(local.products), lo = byId(local.orders);
  (srv.customers || []).forEach(r => { if (r && r.id) lc[r.id] = r; });
  (srv.products || []).forEach(r => { if (r && r.id) lp[r.id] = r; });
  (srv.orders || []).forEach(r => { if (r && r.id) lo[r.id] = r; });
  local.customers = Object.values(lc);
  local.products = Object.values(lp);
  local.orders = Object.values(lo);
  const srvOrderIds = new Set((srv.orders || []).map(o => o && o.id).filter(Boolean));
  local.items = (local.items || []).filter(i => !srvOrderIds.has(i.order_id)).concat(srv.items || []);
  const gone = new Set([...(local.deleted || []), ...(srvDeleted || [])]);
  local.deleted = [...gone].slice(-500);
  const drop = new Set(local.deleted);
  local.orders = local.orders.filter(o => !drop.has(o.id));
  local.items = local.items.filter(i => !drop.has(i.order_id));
  const sq = srv.seq || {};
  local.seq = local.seq || { C: 1000, P: 2000, O: 5000, T: 9000 };
  ['C', 'P', 'O', 'T'].forEach(k => { local.seq[k] = Math.max(local.seq[k] || 0, sq[k] || 0); });
  dbSaveSilent(local);
}
function dbPull() {
  return new Promise(resolve => {
    try {
      if (typeof fetch === 'undefined') return resolve(false);
      fetch(SERVER_URL + '/api/pull').then(r => { if (!r.ok) throw 0; return r.json(); }).then(j => {
        if (!j || !j.ok || !j.db) return resolve(false);
        dbApplyPull(j.db, j.deleted || []);
        resolve(true);
      }).catch(() => resolve(false));
    } catch (e) { resolve(false); }
  });
}
function dbBootSync(after) {
  const done = () => { try { if (after) after(); } catch (e) {} };
  try { dbPushNow().then(() => dbPull()).then(done).catch(done); }
  catch (e) { done(); }
}

function dbRead() { try { const d = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); return (d && d.customers) ? d : null; } catch (e) { return null; } }
function dbWrite(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); dbQueuePush(); }
function dbBlank() { return { customers: [], products: [], orders: [], items: [], deleted: [], seq: { C: 1000, P: 2000, O: 5000, T: 9000 }, migrated: false }; }
function dbNid(db, p) { db.seq[p] = (db.seq[p] || 1000) + 1; return p + db.seq[p]; }
function dbNow() { return new Date().toISOString(); }
function splitName(full) { const t = String(full || 'Guest').trim().split(/\s+/); return { first: t[0] || 'Guest', last: t.slice(1).join(' ') }; }

function findCustomer(db, name, phone) {
  phone = String(phone || '').trim(); name = String(name || '').trim().toLowerCase();
  if (phone) { const c = db.customers.find(c => c.phone === phone); if (c) return c; }
  if (name) { const c = db.customers.find(c => (c.full_name || '').toLowerCase() === name); if (c) return c; }
  return null;
}
function getCustomer(db, info, createdAt) {
  let c = findCustomer(db, info.full_name, info.phone);
  if (c) {
    if (info.address && !c.address) c.address = info.address;
    if (info.notes) c.notes = (c.notes ? c.notes + ' | ' : '') + info.notes;
    return c;
  }
  const s = splitName(info.full_name);
  c = { id: dbNid(db, 'C'), first_name: s.first, last_name: s.last, full_name: (info.full_name || 'Guest').trim() || 'Guest', phone: String(info.phone || '').trim(), address: String(info.address || '').trim(), notes: String(info.notes || '').trim(), gender: '', created_at: createdAt || dbNow() };
  db.customers.unshift(c);
  return c;
}
function getProduct(db, it) {
  const nm = String(it.name || 'Item').trim() || 'Item';
  let p = db.products.find(p => (p.name || '').toLowerCase() === nm.toLowerCase());
  if (p) { if (Number(it.ws)) p.wholesale = Number(it.ws); if (Number(it.sp)) p.retail = Number(it.sp); return p; }
  p = { id: dbNid(db, 'P'), name: nm, category: 'Apparel', size: '', color: '', wholesale: Number(it.ws) || 0, retail: Number(it.sp) || 0, created_at: dbNow() };
  db.products.unshift(p);
  return p;
}
function legacyLines(r) {
  if (Array.isArray(r.items) && r.items.length) return r.items.map(i => ({ name: i.name || 'Item', qty: Number(i.qty) || 1, ws: Number(i.ws) || 0, sp: Number(i.sp) || 0 }));
  return [{ name: r.item || 'Item', qty: Number(r.qty) || 1, ws: Number(r.ws) || 0, sp: Number(r.sp) || 0 }];
}
function dbMigrate() {
  let db = dbRead();
  if (db) { db.deleted = db.deleted || []; return db; }
  db = dbBlank();
  let legacy = [];
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]'); } catch (e) { legacy = []; }
  legacy.forEach(r => {
    const c = getCustomer(db, { full_name: r.name, phone: r.phone, address: r.address, notes: r.notes }, r.createdAt);
    const o = { id: dbNid(db, 'O'), customer_id: c.id, status: r.status || 'active', advance: Number(r.adv) || 0, fromA: r.fromA || '', toB: r.toB || '', delivery: Number(r.del) || 0, discount: Number(r.disc) || 0, payment: '', created_at: r.createdAt || dbNow(), completed_at: r.completedAt || null };
    db.orders.unshift(o);
    legacyLines(r).forEach(it => {
      const p = getProduct(db, it);
      db.items.push({ id: dbNid(db, 'T'), order_id: o.id, customer_id: c.id, product_id: p.id, qty: it.qty, actual_price: it.sp, wholesale: it.ws, discount: 0, created_at: o.created_at });
    });
  });
  db.migrated = true;
  dbWrite(db);
  return db;
}
/* Denormalized order view — same shape pages already render. */
function dbOrderView(db, o) {
  const c = db.customers.find(c => c.id === o.customer_id) || { full_name: '?', phone: '', address: '', notes: '' };
  const lines = db.items.filter(i => i.order_id === o.id).map(i => {
    const p = db.products.find(p => p.id === i.product_id) || { name: 'Item' };
    return { name: p.name, qty: Number(i.qty) || 0, ws: Number(i.wholesale) || 0, sp: Number(i.actual_price) || 0 };
  });
  const ss = lines.reduce((s, i) => s + i.sp * i.qty, 0);
  const wc = lines.reduce((s, i) => s + i.ws * i.qty, 0);
  const disc = Number(o.discount) || 0, del = Number(o.delivery) || 0, adv = Number(o.advance) || 0;
  const fin = ss - disc + del, prof = ss - wc - disc, bal = fin - adv;
  return { id: o.id, name: c.full_name || '', phone: c.phone || '', address: c.address || '', notes: c.notes || '', items: lines, adv: adv, fromA: o.fromA || '', toB: o.toB || '', del: del, disc: disc, fin: fin, prof: prof, bal: bal, ss: ss, wc: wc, rev: ss - disc, status: o.status || 'active', createdAt: o.created_at || '', completedAt: o.completed_at || '' };
}
function dbListOrders() { const db = dbMigrate(); return db.orders.map(o => dbOrderView(db, o)); }
function dbSaveOrder(view, editingId) {
  const db = dbMigrate();
  const c = getCustomer(db, { full_name: view.name, phone: view.phone, address: view.address, notes: view.notes });
  let o;
  if (editingId) {
    o = db.orders.find(o => o.id === editingId);
    if (!o) return null;
    o.advance = view.adv; o.fromA = view.fromA; o.toB = view.toB; o.delivery = view.del; o.discount = view.disc;
    o.customer_id = c.id;
    db.items = db.items.filter(i => i.order_id !== o.id);
  } else {
    o = { id: dbNid(db, 'O'), customer_id: c.id, status: 'active', advance: view.adv, fromA: view.fromA, toB: view.toB, delivery: view.del, discount: view.disc, payment: '', created_at: dbNow(), completed_at: null };
    db.orders.unshift(o);
  }
  (view.items || []).forEach(it => {
    const p = getProduct(db, it);
    db.items.push({ id: dbNid(db, 'T'), order_id: o.id, customer_id: c.id, product_id: p.id, qty: Number(it.qty) || 1, actual_price: Number(it.sp) || 0, wholesale: Number(it.ws) || 0, discount: 0, created_at: o.created_at });
  });
  dbWrite(db);
  return o.id;
}
function dbSetStatus(id, status) {
  const db = dbMigrate();
  const o = db.orders.find(o => o.id === id);
  if (!o) return false;
  o.status = status;
  o.completed_at = (status === 'completed') ? dbNow() : null;
  dbWrite(db);
  return true;
}
function dbRemoveOrder(id) {
  const db = dbMigrate();
  db.deleted = [...(db.deleted || []), id].slice(-500);
  db.orders = db.orders.filter(o => o.id !== id);
  db.items = db.items.filter(i => i.order_id !== id);
  dbWrite(db);
}
function dbWipeAll() { localStorage.removeItem(DB_KEY); localStorage.removeItem(LEGACY_KEY); }
/* ---- AI dataset export: 4 clean CSV tables ---- */
function dbDownload(name, csv) {
  const b = new Blob([csv], { type: 'text/csv' });
  const u = URL.createObjectURL(b);
  const l = document.createElement('a');
  l.href = u; l.download = name; l.click();
  URL.revokeObjectURL(u);
}
function dbCsv(rows) { return rows.map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n'); }
function dbExport(which) {
  const db = dbMigrate();
  if (which === 'customers') {
    const rows = [['customer_id', 'first_name', 'last_name', 'phone', 'address', 'notes', 'gender', 'registration_date', 'total_orders', 'lifetime_value']];
    db.customers.forEach(c => {
      const os = db.orders.filter(o => o.customer_id === c.id && o.status !== 'cancelled');
      let lv = 0;
      os.forEach(o => { db.items.filter(i => i.order_id === o.id).forEach(i => { lv += (Number(i.actual_price) || 0) * (Number(i.qty) || 0); }); });
      rows.push([c.id, c.first_name, c.last_name, c.phone, c.address, c.notes, c.gender, c.created_at, os.length, lv]);
    });
    dbDownload('customers.csv', dbCsv(rows));
  } else if (which === 'products') {
    const rows = [['product_id', 'product_name', 'category', 'size', 'color', 'base_cost', 'standard_retail_price', 'units_sold', 'revenue']];
    db.products.forEach(p => {
      const lines = db.items.filter(i => i.product_id === p.id);
      const u = lines.reduce((s, i) => s + (Number(i.qty) || 0), 0);
      const r = lines.reduce((s, i) => s + (Number(i.actual_price) || 0) * (Number(i.qty) || 0), 0);
      rows.push([p.id, p.name, p.category, p.size, p.color, p.wholesale, p.retail, u, r]);
    });
    dbDownload('products.csv', dbCsv(rows));
  } else if (which === 'orders') {
    const rows = [['order_id', 'customer_id', 'status', 'advance_paid', 'delivery_charge', 'order_discount', 'fromA', 'toB', 'created_at', 'completed_at', 'total_collect', 'revenue_ex_delivery', 'profit']];
    db.orders.forEach(o => {
      const v = dbOrderView(db, o);
      rows.push([o.id, o.customer_id, o.status, o.advance, o.delivery, o.discount, o.fromA, o.toB, o.created_at, o.completed_at || '', v.fin, v.rev, v.prof]);
    });
    dbDownload('orders.csv', dbCsv(rows));
  } else if (which === 'transactions') {
    const rows = [['transaction_id', 'order_id', 'customer_id', 'product_id', 'datetime', 'quantity', 'actual_price_paid', 'discount_applied', 'line_total', 'line_profit']];
    db.items.forEach(i => {
      const lt = (Number(i.actual_price) || 0) * (Number(i.qty) || 0);
      rows.push([i.id, i.order_id, i.customer_id, i.product_id, i.created_at, i.qty, i.actual_price, i.discount, lt, lt - (Number(i.wholesale) || 0) * (Number(i.qty) || 0)]);
    });
    dbDownload('transactions.csv', dbCsv(rows));
  }
}

/* ---- Month-end auto report (Bikram Sambat, real .xlsx via SheetJS) ----
   Trigger: last day of BS month at/after 23:30, while any app page is open.
   File: <Month>_<Year>_report.xlsx (e.g. Ashwin_2083_report.xlsx).
   Content always rebuilds from live tables, so creates/cancels are mirrored. */
const BS_MONTHS = ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
const BS_2083 = [31, 32, 31, 31, 31, 31, 30, 29, 30, 29, 30, 30];
const BS_ANCHOR = Date.UTC(2026, 3, 14);
function adToBs(iso) {
  if (!iso) return null;
  const t = new Date(iso); if (isNaN(t)) return null;
  const days = Math.floor((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - BS_ANCHOR) / 864e5);
  if (days < 0 || days >= 365) return null;
  let m = 0, left = days;
  while (m < 12 && left >= BS_2083[m]) { left -= BS_2083[m]; m++; }
  return { y: 2083, m: m + 1, d: left + 1 };
}
function bsStr(iso) { const b = adToBs(iso); return b ? b.y + ' ' + BS_MONTHS[b.m - 1] + ' ' + b.d : ''; }
function dbMonthViews(y, m) {
  return dbListOrders().filter(o => { const b = adToBs(o.completedAt || o.createdAt); return b && b.y === y && b.m === m; });
}
function dbMonthSums(views) {
  const s = { n: views.length, comp: 0, ss: 0, wc: 0, disc: 0, del: 0, adv: 0, fin: 0, prof: 0, bal: 0 };
  views.forEach(v => {
    if (v.status === 'completed') s.comp++;
    const it = Array.isArray(v.items) ? v.items : [];
    s.ss += it.reduce((t, i) => t + (Number(i.sp) || 0) * (Number(i.qty) || 0), 0);
    s.wc += it.reduce((t, i) => t + (Number(i.ws) || 0) * (Number(i.qty) || 0), 0);
    s.disc += Number(v.disc) || 0; s.del += Number(v.del) || 0; s.adv += Number(v.adv) || 0;
    s.fin += Number(v.fin) || 0; s.prof += Number(v.prof) || 0; s.bal += Number(v.bal) || 0;
  });
  s.rev = s.ss - s.disc;
  return s;
}
function dbEnsureXlsx(cb) {
  if (typeof window === 'undefined') return;
  if (window.XLSX) return cb();
  const s = document.createElement('script');
  s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  s.onload = cb;
  document.head.appendChild(s);
}
function dbReportFilename(y, m) { return BS_MONTHS[m - 1] + '_' + y + '_report.xlsx'; }
function dbDownloadMonthReport(y, m) {
  dbEnsureXlsx(() => {
    const views = dbMonthViews(y, m);
    const s = dbMonthSums(views);
    const db = dbMigrate();
    const ids = {};
    views.forEach(v => { ids[v.id] = true; });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Metric', 'Value'],
      ['BS month', BS_MONTHS[m - 1] + ' ' + y],
      ['Orders', s.n],
      ['Completed', s.comp],
      ['Active', s.n - s.comp],
      ['Gross sales', s.ss],
      ['Discounts', s.disc],
      ['Revenue (ex delivery)', s.rev],
      ['Wholesale cost', s.wc],
      ['Net profit', s.prof],
      ['Advance collected', s.adv],
      ['Still due', s.bal],
      ['Delivery pass-through (courier)', s.del]
    ]), 'Summary');
    const oh = [['order_id', 'customer', 'phone', 'status', 'items', 'total_collect', 'revenue_ex_delivery', 'profit', 'advance', 'balance_due', 'date_bs']];
    views.forEach(v => {
      oh.push([v.id, v.name, v.phone, v.status, (v.items || []).map(i => (i.name || 'Item') + ' x' + i.qty + ' @' + i.sp).join('; '), v.fin, v.rev, v.prof, v.adv, v.bal, bsStr(v.completedAt || v.createdAt)]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(oh), 'Orders');
    const th = [['txn_id', 'order_id', 'customer', 'product', 'qty', 'price', 'line_total', 'line_profit', 'datetime']];
    db.items.filter(i => ids[i.order_id]).forEach(i => {
      const p = db.products.find(p => p.id === i.product_id) || {};
      const c = db.customers.find(c => c.id === i.customer_id) || {};
      const lt = (Number(i.actual_price) || 0) * (Number(i.qty) || 0);
      th.push([i.id, i.order_id, c.full_name || '', p.name || '', i.qty, i.actual_price, lt, lt - (Number(i.wholesale) || 0) * (Number(i.qty) || 0), i.created_at]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(th), 'Transactions');
    XLSX.writeFile(wb, dbReportFilename(y, m));
    dbLogReport(y, m, s);
    if (typeof renderReports === 'function') renderReports();
  });
}
function dbLogReport(y, m, s) {
  let r = [];
  try { r = JSON.parse(localStorage.getItem('shop_reports') || '[]'); } catch (e) { r = []; }
  if (!r.find(x => x.key === y + '-' + m)) {
    r.unshift({ key: y + '-' + m, y: y, m: m, month: BS_MONTHS[m - 1], at: new Date().toISOString(), orders: s.n, revenue: s.rev, profit: s.prof });
    try { localStorage.setItem('shop_reports', JSON.stringify(r)); } catch (e) {}
  }
}
function dbSchedulerTick() {
  try {
    const now = new Date();
    const b = adToBs(now.toISOString());
    if (!b) return;
    const late = now.getHours() > 23 || (now.getHours() === 23 && now.getMinutes() >= 30);
    if (b.d !== BS_2083[b.m - 1] || !late) return;
    let r = [];
    try { r = JSON.parse(localStorage.getItem('shop_reports') || '[]'); } catch (e) { r = []; }
    if (r.find(x => x.key === b.y + '-' + b.m)) return;
    dbDownloadMonthReport(b.y, b.m);
  } catch (e) {}
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  setTimeout(dbSchedulerTick, 8000);
  setInterval(dbSchedulerTick, 60000);
}

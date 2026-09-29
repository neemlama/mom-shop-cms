/* Simple username+password auth for private family use.
   Users in ./data/users.json as scrypt hashes (never plaintext).
   Sessions live in memory, 30 days, cleared on server restart. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const INVITES_FILE = path.join(__dirname, 'data', 'invites.json');
const sessions = new Map();
const SESSION_MS = 30 * 24 * 3600 * 1000;

function readUsers() {
  try {
    const u = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (u && typeof u === 'object') return u;
  } catch (e) {}
  return {};
}
function writeUsers(u) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2));
}
function hashPw(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 64).toString('hex');
}
function validName(u) { return /^[a-zA-Z0-9_-]{1,32}$/.test(String(u || '')); }
function createUser(username, password, role) {
  username = String(username || '').trim();
  if (!validName(username)) throw new Error('username: letters, numbers, _ - only, max 32');
  if (!password || String(password).length < 6) throw new Error('password min 6 chars');
  const users = readUsers();
  if (users[username]) throw new Error('user exists: ' + username);
  const salt = crypto.randomBytes(16).toString('hex');
  users[username] = { salt, hash: hashPw(password, salt), role: role || 'user', created_at: new Date().toISOString() };
  writeUsers(users);
  return { username, role: users[username].role };
}
function register(username, password) {
  return createUser(username, password, 'user');
}
function listUsers() {
  const users = readUsers();
  return Object.keys(users).map(u => ({ username: u, role: users[u].role, created_at: users[u].created_at }));
}
function verify(username, password) {
  const users = readUsers();
  const u = users[String(username || '').trim()];
  if (!u) return null;
  const a = Buffer.from(u.hash, 'hex');
  const b = Buffer.from(hashPw(password, u.salt), 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { username: String(username).trim(), role: u.role };
}
function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, exp: Date.now() + SESSION_MS });
  return token;
}
function check(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.exp < Date.now()) { sessions.delete(token); return null; }
  return s.username;
}
function destroy(token) { if (token) sessions.delete(token); }

setInterval(() => {
  const now = Date.now();
  for (const [k, s] of sessions) if (s.exp < now) sessions.delete(k);
}, 3600 * 1000);

function getShop(username) {
  const users = readUsers();
  const u = users[String(username || '').trim()];
  return (u && u.shop) || String(username || '').trim();
}
function setShop(username, shop) {
  const users = readUsers();
  username = String(username || '').trim();
  if (!users[username]) return false;
  users[username].shop = shop;
  writeUsers(users);
  return true;
}
function shopMembers(shop) {
  const users = readUsers();
  return Object.keys(users).filter(u => getShop(u) === shop).map(u => ({ username: u, role: users[u].role }));
}
function readInvites() {
  try {
    const v = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf8'));
    if (v && typeof v === 'object') return v;
  } catch (e) {}
  return {};
}
function writeInvites(v) { fs.writeFileSync(INVITES_FILE, JSON.stringify(v)); }
function createInvite(shop) {
  const all = readInvites();
  const now = Date.now();
  for (const k of Object.keys(all)) if (all[k].exp < now) delete all[k];
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  all[code] = { shop, exp: now + 24 * 3600 * 1000 };
  writeInvites(all);
  return code;
}
function redeemInvite(username, code) {
  code = String(code || '').trim().toUpperCase();
  const all = readInvites();
  const inv = all[code];
  if (!inv || inv.exp < Date.now()) return null;
  delete all[code];
  writeInvites(all);
  setShop(username, inv.shop);
  return inv.shop;
}
module.exports = { createUser, register, listUsers, verify, createSession, check, destroy, getShop, setShop, shopMembers, createInvite, redeemInvite };

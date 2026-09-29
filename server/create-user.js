/* Create a login user: node create-user.js <username> [password] [role]
   If password omitted, you are prompted. First user should be an admin. */
const readline = require('readline');
const auth = require('./auth');

const username = process.argv[2];
let password = process.argv[3];
const role = process.argv[4] || 'user';

if (!username) {
  console.log('Usage: node create-user.js <username> [password] [role]');
  process.exit(1);
}
function done(pw) {
  try {
    const u = auth.createUser(username, pw, role);
    console.log('created:', u.username, '(' + u.role + ')');
  } catch (e) { console.error('failed:', e.message); process.exit(1); }
}
if (password) { done(password); }
else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Password (min 6 chars): ', pw => { rl.close(); done(pw.trim()); });
}

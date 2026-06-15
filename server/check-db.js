const Database = require('better-sqlite3');
const db = new Database('./absensi.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);

const requests = db.prepare('SELECT * FROM role_requests').all();
console.log('Requests:', requests);

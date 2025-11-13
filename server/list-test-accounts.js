import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'src', 'dev.db');
const db = new Database(dbPath);

const users = db.prepare(`
  SELECT email, displayName, gender, age
  FROM users
  WHERE email LIKE 'test.%@example.com'
  ORDER BY email
`).all();

console.log('\n📋 ALL TEST ACCOUNTS');
console.log('═══════════════════════════════════════════════════════');
console.log('Password for ALL accounts: Test123!\n');

users.forEach((u, i) => {
  console.log(`${i + 1}. ${u.email}`);
  console.log(`   ${u.displayName} (${u.gender}, ${u.age} years old)\n`);
});

console.log('═══════════════════════════════════════════════════════');
console.log(`Total: ${users.length} test accounts\n`);

db.close();

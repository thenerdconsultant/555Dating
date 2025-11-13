import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'src', 'dev.db');
const db = new Database(dbPath);

console.log('🔧 Fixing test account photos...\n');

// Remove fake photos from all test accounts
const result = db.prepare(`
  UPDATE users
  SET photos = '[]', selfiePath = NULL
  WHERE email LIKE 'test.%@example.com'
`).run();

console.log(`✅ Fixed ${result.changes} test accounts`);
console.log('   - Removed all fake photo paths');
console.log('   - Cleared fake selfie paths');
console.log('\n💡 You can now upload real photos for these accounts!\n');

db.close();

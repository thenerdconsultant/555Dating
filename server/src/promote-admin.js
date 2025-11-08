import Database from 'better-sqlite3'
import path from 'path'

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'src', 'dev.db')
const db = new Database(dbPath)

const email = process.argv[2]

if (!email) {
  console.error('Usage: node src/promote-admin.js <email>')
  console.error('Example: node src/promote-admin.js wbboykins@gmail.com')
  process.exit(1)
}

const normalizedEmail = email.toLowerCase().trim()

// Check if user exists
const user = db.prepare('SELECT id, email, displayName, isModerator, canSeeLikedMe FROM users WHERE lower(email) = ?').get(normalizedEmail)

if (!user) {
  console.error(`❌ User with email "${email}" not found in database.`)
  process.exit(1)
}

console.log('\n📋 Current user status:')
console.log('  Name:', user.displayName)
console.log('  Email:', user.email)
console.log('  ID:', user.id)
console.log('  Is Moderator:', !!user.isModerator ? '✅ Yes' : '❌ No')
console.log('  Has Premium:', !!user.canSeeLikedMe ? '✅ Yes' : '❌ No')

if (user.isModerator && user.canSeeLikedMe) {
  console.log('\n✅ User is already a moderator with premium access!')
  process.exit(0)
}

// Promote to admin
db.prepare('UPDATE users SET isModerator=1, canSeeLikedMe=1 WHERE id=?').run(user.id)

console.log('\n✅ Successfully promoted user to admin!')
console.log('  ✓ isModerator set to 1')
console.log('  ✓ canSeeLikedMe set to 1')
console.log('\n👉 Next steps:')
console.log('  1. Log out of the app if you are logged in')
console.log('  2. Log back in')
console.log('  3. You should now see the "Admin" link in the navigation')

db.close()

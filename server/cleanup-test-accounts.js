#!/usr/bin/env node
/**
 * Cleanup script to remove all test accounts
 * Usage: node cleanup-test-accounts.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the same default path as the server (src/dev.db)
const defaultDbPath = path.join(__dirname, 'src', 'dev.db');
const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : defaultDbPath;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function cleanup() {
  console.log('🧹 Test Account Cleanup Tool\n');

  const db = new Database(DB_PATH);

  try {
    // Count test accounts
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE email LIKE 'test.%@example.com'");
    const { count } = countStmt.get();

    if (count === 0) {
      console.log('✓ No test accounts found!');
      rl.close();
      db.close();
      return;
    }

    console.log(`Found ${count} test accounts.\n`);

    // Show sample test accounts
    const sampleStmt = db.prepare(`
      SELECT email, displayName, gender
      FROM users
      WHERE email LIKE 'test.%@example.com'
      LIMIT 5
    `);
    const samples = sampleStmt.all();

    console.log('Sample test accounts:');
    samples.forEach(user => {
      console.log(`  • ${user.displayName} (${user.gender}) - ${user.email}`);
    });

    if (count > 5) {
      console.log(`  ... and ${count - 5} more\n`);
    }

    // Confirm deletion
    const answer = await ask(`\n⚠️  Delete all ${count} test accounts? (yes/no): `);

    if (answer.toLowerCase() === 'yes') {
      // Delete related data first (to avoid foreign key issues)
      db.prepare("DELETE FROM likes WHERE userId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM likes WHERE targetId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM messages WHERE senderId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM messages WHERE recipientId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM blocks WHERE userId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM blocks WHERE targetId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM passes WHERE userId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM passes WHERE targetId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM superLikes WHERE userId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM superLikes WHERE targetId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM swipeHistory WHERE userId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();
      db.prepare("DELETE FROM swipeHistory WHERE targetId IN (SELECT id FROM users WHERE email LIKE 'test.%@example.com')").run();

      // Finally, delete the test users
      const result = db.prepare("DELETE FROM users WHERE email LIKE 'test.%@example.com'").run();

      console.log(`\n✅ Successfully deleted ${result.changes} test accounts and all related data!`);
    } else {
      console.log('\n❌ Cleanup cancelled.');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    rl.close();
    db.close();
  }
}

cleanup().catch(console.error);

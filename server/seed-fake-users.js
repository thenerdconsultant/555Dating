#!/usr/bin/env node
/**
 * Seed script to create fake test accounts for development/testing
 * Usage: node seed-fake-users.js [count]
 * Example: node seed-fake-users.js 20
 */

import { faker } from '@faker-js/faker';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the same default path as the server (src/dev.db)
const defaultDbPath = path.join(__dirname, 'src', 'dev.db');
const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : defaultDbPath;
const count = parseInt(process.argv[2]) || 10;

// Body types from your app
const BODY_TYPES = ['skinny', 'fit', 'medium', 'curvy', 'thicc'];
const GENDERS = ['man', 'woman', 'ladyboy'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Thai', 'Vietnamese'];

// Sample bios by gender
const BIOS = {
  man: [
    "Love traveling and trying new foods. Looking for someone to share adventures with!",
    "Fitness enthusiast and coffee addict. Let's grab a coffee and see where it goes.",
    "Engineer by day, musician by night. Looking for my perfect harmony.",
    "Dog lover and outdoor enthusiast. Swipe right if you love hiking!",
    "Foodie who loves cooking. Let me cook you dinner on our first date.",
  ],
  woman: [
    "Yoga instructor and beach lover. Looking for positive vibes only!",
    "Artist with a passion for life. Let's create something beautiful together.",
    "Book lover and wine enthusiast. Looking for my Mr. Right.",
    "Travel addict with a passion for photography. Let's explore the world!",
    "Dancer and dreamer. Looking for someone to dance through life with.",
  ],
  ladyboy: [
    "Living my truth and loving life! Looking for someone genuine.",
    "Makeup artist and fashionista. Let's make memories together!",
    "Dancer with a big heart. Looking for real connections.",
    "Love fashion, travel, and good conversation. Be yourself!",
    "Positive vibes only! Looking for someone who appreciates authenticity.",
  ]
};

async function seedUsers() {
  console.log(`🌱 Seeding ${count} fake test accounts...`);

  const db = new Database(DB_PATH);

  try {
    // Check if users table exists
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!tableCheck) {
      console.error('\n❌ Error: Database tables not found!');
      console.error('\n⚠️  You must start the server at least once to initialize the database.');
      console.error('   Run: npm run dev');
      console.error('   Wait for "Server running..." message, then stop it with Ctrl+C\n');
      db.close();
      process.exit(1);
    }
    // Get a random password hash (same for all test accounts for easy login)
    const testPassword = 'Test123!';
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const insertUser = db.prepare(`
      INSERT INTO users (
        id, email, passwordHash, displayName, gender, birthdate, age,
        location, education, bio, bodyType, heightCm, weightKg,
        selfiePath, photos, languages, lastActive, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const created = [];

    for (let i = 0; i < count; i++) {
      const gender = faker.helpers.arrayElement(GENDERS);
      const firstName = faker.person.firstName(gender === 'woman' ? 'female' : 'male');
      const lastName = faker.person.lastName();
      const displayName = `${firstName} ${lastName[0]}.`;

      // Generate realistic age (18-50)
      const age = faker.number.int({ min: 18, max: 50 });
      const birthdate = new Date();
      birthdate.setFullYear(birthdate.getFullYear() - age);
      const birthdateStr = birthdate.toISOString().split('T')[0];

      // Random location
      const city = faker.location.city();
      const country = faker.location.country();
      const location = `${city}, ${country}`;

      // Random education
      const educations = [
        'High School',
        'Bachelor\'s Degree',
        'Master\'s Degree',
        'PhD',
        'Trade School',
        'Some College'
      ];
      const education = faker.helpers.arrayElement(educations);

      // Random bio
      const bio = faker.helpers.arrayElement(BIOS[gender]);

      // Physical attributes
      const bodyType = faker.helpers.arrayElement(BODY_TYPES);
      const heightCm = faker.number.int({ min: 150, max: 195 });
      const weightKg = faker.number.int({ min: 45, max: 110 });

      // Languages (1-3 random languages)
      const numLanguages = faker.number.int({ min: 1, max: 3 });
      const userLanguages = faker.helpers.arrayElements(LANGUAGES, numLanguages);
      const languagesJson = JSON.stringify(userLanguages);

      // Email (test accounts have special prefix)
      const email = `test.${firstName.toLowerCase()}.${i}@example.com`;

      // Fake selfie path (you can add real images later if needed)
      const selfiePath = `/uploads/selfie-${faker.string.uuid()}.jpg`;

      // Fake photos (2-5 photos)
      const numPhotos = faker.number.int({ min: 2, max: 5 });
      const photos = Array.from({ length: numPhotos }, () =>
        `/uploads/photo-${faker.string.uuid()}.jpg`
      );
      const photosJson = JSON.stringify(photos);

      // Last active (within last 7 days)
      const lastActive = Date.now() - faker.number.int({ min: 0, max: 7 * 24 * 60 * 60 * 1000 });

      // Generate unique ID
      const userId = faker.string.uuid();
      const createdAt = new Date().toISOString();

      try {
        insertUser.run(
          userId,
          email,
          passwordHash,
          displayName,
          gender,
          birthdateStr,
          age,
          location,
          education,
          bio,
          bodyType,
          heightCm,
          weightKg,
          selfiePath,
          photosJson,
          languagesJson,
          lastActive,
          createdAt
        );

        created.push({
          email,
          password: testPassword,
          displayName,
          gender,
          age,
          location
        });

        console.log(`✓ Created: ${displayName} (${gender}, ${age}) - ${email}`);
      } catch (err) {
        console.error(`✗ Failed to create ${displayName}:`, err.message);
      }
    }

    console.log(`\n✅ Successfully created ${created.length} test accounts!\n`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('TEST ACCOUNT CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Password for ALL test accounts: ${testPassword}`);
    console.log('\nSample accounts:');
    created.slice(0, 5).forEach(user => {
      console.log(`  • ${user.displayName} (${user.gender}, ${user.age})`);
      console.log(`    Email: ${user.email}`);
    });

    if (created.length > 5) {
      console.log(`\n  ... and ${created.length - 5} more accounts`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('\n💡 TIP: All test accounts use the same password for easy testing!');
    console.log('💡 TIP: Test accounts have emails like test.john.0@example.com');
    console.log('\n⚠️  NOTE: Selfie and photo paths are fake - upload real images');
    console.log('    or modify selfiePath in the database if needed.\n');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

seedUsers().catch(console.error);

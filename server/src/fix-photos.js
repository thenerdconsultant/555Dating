// One-time script to fix photo paths in database
// Run this with: node src/fix-photos.js

import db from './db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

console.log('Starting photo path fix...\n');

// Get all users with photos
const users = db.prepare('SELECT id, photos, selfiePath FROM users WHERE photos IS NOT NULL OR selfiePath IS NOT NULL').all();

console.log(`Found ${users.length} users with photos or selfies\n`);

let fixedCount = 0;
let removedCount = 0;

for (const user of users) {
  let needsUpdate = false;
  let updatedPhotos = [];
  let updatedSelfie = user.selfiePath;

  // Fix photos array
  if (user.photos) {
    try {
      const photos = JSON.parse(user.photos);
      if (Array.isArray(photos)) {
        for (const photo of photos) {
          // Normalize photo path
          let normalized = photo;

          // Strip full URLs (http://localhost:4000/uploads/photo.jpg -> /uploads/photo.jpg)
          if (photo.includes('://')) {
            const urlMatch = photo.match(/\/uploads\/[^\/]+$/);
            if (urlMatch) {
              normalized = urlMatch[0];
              console.log(`  Normalized URL: ${photo} -> ${normalized}`);
              needsUpdate = true;
            } else {
              console.log(`  ⚠️  Skipping invalid URL: ${photo}`);
              continue;
            }
          }

          // Ensure /uploads/ prefix
          if (!normalized.startsWith('/uploads/')) {
            normalized = '/uploads/' + normalized.replace(/^\/+/, '');
            console.log(`  Added /uploads/ prefix: ${photo} -> ${normalized}`);
            needsUpdate = true;
          }

          // Check if file exists
          const filePath = path.join(__dirname, '..', normalized);
          if (fs.existsSync(filePath)) {
            updatedPhotos.push(normalized);
          } else {
            console.log(`  ❌ File not found, removing: ${normalized}`);
            removedCount++;
            needsUpdate = true;
          }
        }
      }
    } catch (e) {
      console.log(`  Error parsing photos for user ${user.id}: ${e.message}`);
    }
  }

  // Fix selfie path
  if (user.selfiePath) {
    let normalized = user.selfiePath;

    // Strip full URLs
    if (normalized.includes('://')) {
      const urlMatch = normalized.match(/\/uploads\/[^\/]+$/);
      if (urlMatch) {
        normalized = urlMatch[0];
        needsUpdate = true;
      }
    }

    // Ensure /uploads/ prefix
    if (!normalized.startsWith('/uploads/')) {
      normalized = '/uploads/' + normalized.replace(/^\/+/, '');
      needsUpdate = true;
    }

    // Check if file exists
    const filePath = path.join(__dirname, '..', normalized);
    if (!fs.existsSync(filePath)) {
      console.log(`  ❌ Selfie file not found, removing: ${normalized}`);
      normalized = null;
      removedCount++;
      needsUpdate = true;
    }

    updatedSelfie = normalized;
  }

  // Update database if needed
  if (needsUpdate) {
    db.prepare('UPDATE users SET photos=?, selfiePath=? WHERE id=?')
      .run(JSON.stringify(updatedPhotos), updatedSelfie, user.id);
    console.log(`✅ Fixed user ${user.id}: ${updatedPhotos.length} photos, selfie: ${updatedSelfie ? 'yes' : 'no'}\n`);
    fixedCount++;
  }
}

console.log('\n' + '='.repeat(50));
console.log(`✅ Done! Fixed ${fixedCount} users, removed ${removedCount} missing files`);
console.log('='.repeat(50));

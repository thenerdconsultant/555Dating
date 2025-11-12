# Testing Guide - Fake Test Accounts

This guide explains how to create and manage fake test accounts for development and testing.

## Prerequisites

⚠️ **Important**: You must start the server at least once before seeding test accounts to initialize the database!

```bash
# First time setup - start the server to create database tables
npm run dev

# Wait for "Server running on port 4000" message
# Then stop it with Ctrl+C
```

## Quick Start

### Creating Test Accounts

```bash
# Create 10 test accounts (default)
node seed-fake-users.js

# Create 50 test accounts
node seed-fake-users.js 50

# Using PowerShell
.\seed-fake-users.ps1 20
```

### Test Account Details

- **Email format**: `test.firstname.0@example.com`
- **Password for ALL test accounts**: `Test123!`
- **Verified**: All test accounts are auto-verified
- **Complete profiles**: Name, gender, age, bio, location, photos, languages

### What Gets Created

Each fake account includes:
- ✅ Realistic name and profile
- ✅ Gender (man, woman, or ladyboy)
- ✅ Age between 18-50
- ✅ Bio text appropriate to gender
- ✅ Random location (city, country)
- ✅ Body type, height, weight
- ✅ Education level
- ✅ 1-3 random languages
- ✅ Recent "last active" timestamp
- ✅ Fake selfie and photo paths (2-5 photos)

### Important Notes

⚠️ **Photo Paths**: The seeded accounts have fake photo paths like `/uploads/photo-uuid.jpg`. These files don't exist yet. You can:
1. Upload real photos through the profile UI for each test account
2. Manually add placeholder images to the uploads folder
3. Update the database to point to existing images

## Cleanup Test Accounts

To remove all test accounts and their data:

```bash
node cleanup-test-accounts.js
```

This will:
- Show you how many test accounts exist
- Display sample accounts
- Ask for confirmation
- Delete all test accounts and related data (likes, messages, blocks, etc.)

## Example Usage

### 1. Create test accounts for matching

```bash
# Create 20 women for testing as a male user
node seed-fake-users.js 20
```

Most accounts will have varied genders based on the random selection.

### 2. Test messaging feature

```bash
# Create accounts
node seed-fake-users.js 10

# Log in as one test account
# Log in as another test account in incognito
# Test messaging between them
```

### 3. Test discovery filters

```bash
# Create many accounts with varied profiles
node seed-fake-users.js 50

# Test filtering by:
# - Gender
# - Age range
# - Location
# - Body type
# - Languages
```

### 4. Clean up after testing

```bash
# Remove all test accounts
node cleanup-test-accounts.js
```

## Login Examples

After seeding, you can log in with any of these patterns:

```
Email: test.john.0@example.com
Password: Test123!

Email: test.sarah.1@example.com
Password: Test123!

Email: test.mike.2@example.com
Password: Test123!
```

All test accounts use the same password for convenience: **Test123!**

## Advanced: Customizing Test Data

You can edit `seed-fake-users.js` to customize:

- **Genders**: Adjust the `GENDERS` array to control gender distribution
- **Age range**: Modify the `min` and `max` in the age generation
- **Locations**: Add specific cities/countries
- **Bios**: Add more variety to the `BIOS` object
- **Photos**: Point to real placeholder images

## Database Location

Test accounts are created in:
- Default: `server/dating.db`
- Custom: Set `DB_PATH` environment variable

## Troubleshooting

### "Cannot find module '@faker-js/faker'"

Install the dependency:
```bash
cd server
npm install
```

### Test accounts not showing up in discovery

1. Check your gender preferences (men see women, women see men)
2. Verify accounts were created: Check the success message
3. Query the database directly:
   ```sql
   SELECT email, displayName, gender FROM users WHERE email LIKE 'test.%@example.com';
   ```

### Photos not displaying

The fake photo paths don't point to real files. Options:
1. Upload photos through each test account's profile page
2. Copy placeholder images to the uploads folder with matching filenames
3. Update the database to use existing image paths

## Production Safety

⚠️ **NEVER run these scripts on production!**

These scripts are for **development/testing only**. The test account email pattern (`test.%@example.com`) makes them easy to identify and clean up.

## Tips for Better Testing

1. **Create diverse accounts**: Run the seed script multiple times to get varied profiles
2. **Match yourself**: Create accounts of the appropriate gender to match with
3. **Test edge cases**: Manually create accounts with empty bios, no photos, etc.
4. **Regular cleanup**: Run cleanup periodically to start fresh
5. **Save your favorites**: If you create a perfect test account manually, note the credentials

## See Also

- Main README: `../README.md`
- Deployment guide: `../DEPLOY_NOW.md`
- Environment setup: `.env.example`

param(
  [switch]$Silent
)

# cSpell:ignore firebaseapp firebasestorage
$env:FIREBASE_API_KEY = 'AIzaSyDkuP-prOIaNo-9I1lDyYc-6zBn6oayMFg'
$env:FIREBASE_AUTH_DOMAIN = 'dating-c0c5f.firebaseapp.com'
$env:FIREBASE_PROJECT_ID = 'dating-c0c5f'
$env:FIREBASE_STORAGE_BUCKET = 'dating-c0c5f.firebasestorage.app'
$env:FIREBASE_MESSAGING_SENDER_ID = '748938596237'
$env:FIREBASE_APP_ID = '1:748938596237:web:ab45bc09da6d21b05df7c4'
# Update with comma-separated emails that should auto-promote to moderator on login.
$env:ADMIN_EMAILS = 'wbboykins@gmail.com'

if (-not $Silent) {
  Write-Host 'Firebase environment variables loaded for this session.' -ForegroundColor Green
}

#!/usr/bin/env pwsh
# PowerShell wrapper for seeding fake test accounts
# Usage: .\seed-fake-users.ps1 [count]
# Example: .\seed-fake-users.ps1 20

param(
    [int]$Count = 10
)

Write-Host "🌱 Starting fake user seed script..." -ForegroundColor Cyan

# Check if we're in the server directory
if (-not (Test-Path "seed-fake-users.js")) {
    Write-Host "❌ Error: Please run this script from the server directory" -ForegroundColor Red
    exit 1
}

# Run the Node.js seed script
node seed-fake-users.js $Count

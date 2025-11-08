# PowerShell script to promote a user to admin

param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "🔧 Promoting user to admin..." -ForegroundColor Cyan
Write-Host ""

# Navigate to server directory
$serverDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $serverDir

# Run the promotion script
node src/promote-admin.js $Email

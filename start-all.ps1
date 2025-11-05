param(
  [switch]$Mobile
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $root 'server'
$clientDir = Join-Path $root 'client'
$mobileDir = Join-Path $root 'mobile'
$envScript = Join-Path $root 'set-env.ps1'

if (-not (Test-Path $serverDir)) { throw "Server directory not found at $serverDir" }
if (-not (Test-Path $clientDir)) { throw "Client directory not found at $clientDir" }
if ($Mobile -and -not (Test-Path $mobileDir)) { throw "Mobile directory not found at $mobileDir" }
if (-not (Test-Path $envScript)) { throw "set-env.ps1 not found at $envScript" }

. $envScript -Silent

function Start-NpmProcess {
  param(
    [string]$WorkingDirectory,
    [string]$Command,
    [string]$Title
  )

  $escapedCommand = "`$Host.UI.RawUI.WindowTitle = '$Title'; Set-Location `"$WorkingDirectory`"; $Command"
  if (Test-Path "$env:ComSpec") {
    return Start-Process powershell.exe -ArgumentList "-NoExit","-Command",$escapedCommand -WindowStyle Normal -PassThru -WorkingDirectory $WorkingDirectory
  }
  return Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit","-Command",$escapedCommand -WindowStyle Normal -PassThru -WorkingDirectory $WorkingDirectory
}

$processes = @()

$processes += Start-NpmProcess -WorkingDirectory $serverDir -Command 'npm run dev' -Title '555Dating Server'
$processes += Start-NpmProcess -WorkingDirectory $clientDir -Command 'npm run dev' -Title '555Dating Client'

if ($Mobile) {
  $mobileCommand = ". `"$envScript`" -Silent; `$Host.UI.RawUI.WindowTitle = '555Dating Mobile'; npm run start"
  $processes += Start-Process powershell.exe -ArgumentList "-NoExit","-Command","Set-Location `"$mobileDir`"; $mobileCommand" -WindowStyle Normal -PassThru -WorkingDirectory $mobileDir
}

$launchCount = if ($Mobile) { 3 } else { 2 }
Write-Host "Launched $launchCount process(es). Close any window or press Ctrl+C to stop." -ForegroundColor Cyan

if ($processes.Count -gt 0) {
  try {
    Wait-Process -Id ($processes | Select-Object -ExpandProperty Id)
  } catch {
  }
}

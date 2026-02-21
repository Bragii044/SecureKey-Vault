$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')

$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'

npm run icons:generate
npx tsc -p electron/tsconfig.json
npx vite build

# 1) Build unpacked app with sign/resource editing disabled (workaround for symlink/signing constraints).
npx electron-builder --config.win.signAndEditExecutable=false --win --dir

$exePath = Join-Path (Get-Location) 'release\win-unpacked\SecureKey Vault.exe'
$iconPath = Join-Path (Get-Location) 'public\icon.ico'

if (-not (Test-Path -LiteralPath $exePath)) {
  throw "Unpacked EXE not found: $exePath"
}

if (-not (Test-Path -LiteralPath $iconPath)) {
  throw "Icon file not found: $iconPath"
}

$winCodeSignCache = Join-Path $env:LOCALAPPDATA 'electron-builder\Cache\winCodeSign'
$rcedit = Get-ChildItem -Path $winCodeSignCache -Recurse -Filter rcedit-x64.exe -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $rcedit) {
  throw "rcedit-x64.exe not found under cache: $winCodeSignCache"
}

# 2) Force-patch icon on the unpacked EXE.
& $rcedit $exePath --set-icon $iconPath
if ($LASTEXITCODE -ne 0) {
  throw "rcedit icon patch failed with exit code $LASTEXITCODE"
}

# 3) Build installer from prepackaged app so patched icon is preserved.
npx electron-builder --prepackaged release/win-unpacked --win nsis --config.win.signAndEditExecutable=false

Write-Host "Windows packaging completed with patched icon."

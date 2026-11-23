$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         FWINOBOX AI - WINDOWS INSTALLER                  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
try {
    $nodeVer = & node -v
    Write-Host "[1/3] Node.js detected: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# 2. Check Next.js production build
$root = $PSScriptRoot
$appDir = Join-Path $root "hermes-ai"
$buildDir = Join-Path $appDir ".next"

Write-Host "[2/3] Checking Fwinobox AI build status..." -ForegroundColor Cyan
if (-not (Test-Path $buildDir)) {
    Write-Host "Building Fwinobox AI for production..." -ForegroundColor Yellow
    Push-Location $appDir
    & npm.cmd run build
    Pop-Location
}
Write-Host "Production build is ready!" -ForegroundColor Green

# 3. Create Windows Shortcuts
Write-Host "[3/3] Creating Windows Shortcuts..." -ForegroundColor Cyan

$wscript = "$env:WINDIR\System32\wscript.exe"
$launcherVbs = Join-Path $root "launch-silent.vbs"
$iconPath = Join-Path $appDir "app\favicon.ico"

$desktopPath = [Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
if ([string]::IsNullOrWhiteSpace($desktopPath)) {
    $desktopPath = "$env:USERPROFILE\Desktop"
}

$startMenuPath = [Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
if ([string]::IsNullOrWhiteSpace($startMenuPath)) {
    $startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
}

$wsh = New-Object -ComObject WScript.Shell

# Always create local folder shortcut
try {
    $localShortcut = $wsh.CreateShortcut("$root\Launch Fwinobox AI.lnk")
    $localShortcut.TargetPath = $wscript
    $localShortcut.Arguments = "`"$launcherVbs`""
    $localShortcut.WorkingDirectory = $root
    $localShortcut.IconLocation = $iconPath
    $localShortcut.Description = "Fwinobox AI - Modern AI Chatbot"
    $localShortcut.Save()
    Write-Host "✓ Local shortcut created: Launch Fwinobox AI.lnk" -ForegroundColor Green
} catch {}

# Create Desktop Shortcut
try {
    $deskShortcut = $wsh.CreateShortcut("$desktopPath\Fwinobox AI.lnk")
    $deskShortcut.TargetPath = $wscript
    $deskShortcut.Arguments = "`"$launcherVbs`""
    $deskShortcut.WorkingDirectory = $root
    $deskShortcut.IconLocation = $iconPath
    $deskShortcut.Description = "Fwinobox AI - Modern AI Chatbot"
    $deskShortcut.Save()
    Write-Host "✓ Desktop shortcut created: $desktopPath\Fwinobox AI.lnk" -ForegroundColor Green
} catch {
    Write-Host "! Could not write directly to Desktop (permission check). Created local shortcut instead." -ForegroundColor Yellow
}

# Create Start Menu Shortcut
try {
    $menuShortcut = $wsh.CreateShortcut("$startMenuPath\Fwinobox AI.lnk")
    $menuShortcut.TargetPath = $wscript
    $menuShortcut.Arguments = "`"$launcherVbs`""
    $menuShortcut.WorkingDirectory = $root
    $menuShortcut.IconLocation = $iconPath
    $menuShortcut.Description = "Fwinobox AI - Modern AI Chatbot"
    $menuShortcut.Save()
    Write-Host "✓ Start Menu shortcut created: $startMenuPath\Fwinobox AI.lnk" -ForegroundColor Green
} catch {}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "         INSTALLATION COMPLETED SUCCESSFULLY!             " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Fwinobox AI is installed on your Windows laptop!" -ForegroundColor White
Write-Host "- Double-click 'Fwinobox AI' on your Desktop" -ForegroundColor Gray
Write-Host "- Or search 'Fwinobox AI' in your Windows Start Menu" -ForegroundColor Gray
Write-Host ""

@echo off
title Fwinobox AI - Uninstaller
color 0E

echo ==========================================================
echo          FWINOBOX AI - WINDOWS UNINSTALLER
echo ==========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$desktopPath = [Environment]::GetFolderPath('Desktop'); " ^
    "$startMenuPath = [Environment]::GetFolderPath('Programs'); " ^
    "$deskLink = Join-Path $desktopPath 'Fwinobox AI.lnk'; " ^
    "$menuLink = Join-Path $startMenuPath 'Fwinobox AI.lnk'; " ^
    "$oldDeskLink = Join-Path $desktopPath 'Hermes AI.lnk'; " ^
    "$oldMenuLink = Join-Path $startMenuPath 'Hermes AI.lnk'; " ^
    "if (Test-Path $deskLink) { Remove-Item $deskLink -Force; Write-Host 'Removed Desktop Shortcut.' } " ^
    "if (Test-Path $menuLink) { Remove-Item $menuLink -Force; Write-Host 'Removed Start Menu Shortcut.' } " ^
    "if (Test-Path $oldDeskLink) { Remove-Item $oldDeskLink -Force; Write-Host 'Removed Old Hermes Desktop Shortcut.' } " ^
    "if (Test-Path $oldMenuLink) { Remove-Item $oldMenuLink -Force; Write-Host 'Removed Old Hermes Start Menu Shortcut.' }"

echo.
echo Shortcuts removed.
pause

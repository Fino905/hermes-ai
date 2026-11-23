@echo off
title Hermes AI - Uninstaller
color 0E

echo ==========================================================
echo          HERMES AI - WINDOWS UNINSTALLER
echo ==========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$desktopPath = [Environment]::GetFolderPath('Desktop'); " ^
    "$startMenuPath = [Environment]::GetFolderPath('Programs'); " ^
    "$deskLink = Join-Path $desktopPath 'Hermes AI.lnk'; " ^
    "$menuLink = Join-Path $startMenuPath 'Hermes AI.lnk'; " ^
    "if (Test-Path $deskLink) { Remove-Item $deskLink -Force; Write-Host 'Removed Desktop Shortcut.' } " ^
    "if (Test-Path $menuLink) { Remove-Item $menuLink -Force; Write-Host 'Removed Start Menu Shortcut.' }"

echo.
echo Shortcuts removed.
pause

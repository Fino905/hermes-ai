@echo off
title Hermes AI - Windows Installer
color 0B

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"

if %errorlevel% equ 0 (
    set /p LAUNCH="Would you like to launch Hermes AI now? (Y/N): "
    if /i "%LAUNCH%"=="Y" (
        start "" "%windir%\System32\wscript.exe" "%~dp0launch-silent.vbs"
    )
) else (
    pause
)

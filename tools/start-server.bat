@echo off
REM ASCII-only launcher: cmd cannot parse UTF-8 batch files with Russian text.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
if errorlevel 1 pause

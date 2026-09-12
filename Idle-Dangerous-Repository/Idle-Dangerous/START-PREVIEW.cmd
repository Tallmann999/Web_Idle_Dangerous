@echo off
cd /d "%~dp0"
if not exist node_modules call npm ci
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-preview.ps1"
pause

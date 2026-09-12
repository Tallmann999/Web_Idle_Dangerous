@echo off
cd /d "%~dp0"
if not exist node_modules call npm ci
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1"
pause

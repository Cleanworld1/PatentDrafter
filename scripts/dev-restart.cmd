@echo off
cd /d "%~dp0.."
node scripts\dev-restart.mjs
exit /b %ERRORLEVEL%

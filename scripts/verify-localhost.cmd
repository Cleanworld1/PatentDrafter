@echo off
cd /d "%~dp0.."
node scripts\verify-localhost.mjs
exit /b %ERRORLEVEL%

@echo off
cd /d "%~dp0.."
node scripts\test-openai-env.mjs
exit /b %ERRORLEVEL%

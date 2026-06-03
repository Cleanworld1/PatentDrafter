@echo off
cd /d "%~dp0.."
if exist .next rmdir /s /q .next
echo Starting Next.js dev server...
node node_modules\next\dist\bin\next dev

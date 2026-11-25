@echo off
cd /d "%~dp0"
echo Starting Railway AI Assistant...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
npm.cmd run dev
pause

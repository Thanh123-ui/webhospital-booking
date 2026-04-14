@echo off
echo Dang khoi dong he thong Hospital...

:: Khoi dong Backend
start "Backend - Port 5000" cmd /k "cd /d %~dp0backend && node server.js"

:: Doi 2 giay de backend khoi dong truoc
timeout /t 2 /nobreak > nul

:: Khoi dong Frontend
start "Frontend - Port 5173" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================
echo Hospital System dang chay:
echo   Backend : http://localhost:5000
echo   Frontend: http://localhost:5173
echo ===================================
echo.
pause

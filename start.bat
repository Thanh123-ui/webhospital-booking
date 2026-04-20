@echo off
echo Dang khoi dong he thong Hospital Booking...

:: Khoi dong Backend (nodemon tu dong reload khi sua code)
start "Backend - Port 5000" cmd /k "cd /d %~dp0backend && npx nodemon server.js"

:: Doi 2 giay de backend khoi dong truoc
timeout /t 2 /nobreak > nul

:: Khoi dong Frontend
start "Frontend - Port 5173" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo  Hospital Booking System dang chay:
echo    Backend  (API)  : http://localhost:5000
echo    Frontend (UI)   : http://localhost:5173
echo    DB Mode         : Xem cua so Backend de biet
echo ===================================================
echo.
echo  DE THAY DOI DATABASE MODE:
echo    1. Mo file: backend\.env
echo    2. Sua: DB_MODE=mock  (hoac mysql)
echo    3. Cua so Backend tu khoi dong lai (nodemon)
echo ===================================================
echo.
pause

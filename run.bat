@echo off
setlocal enabledelayedexpansion

:menu
cls
echo ================================
echo     JUNON PROJECT RUNNER
echo ================================
echo.
echo Available Operations:
echo.
echo 1) Server (with nodemon ^& debug)
echo 2) Client
echo 3) Server Only (dev mode)
echo 4) Matchmaker
echo 5) Client Build
echo 6) Database Setup
echo.
echo 0) Exit
echo.
set /p choice="Please select an option (0-6): "

if "%choice%"=="1" goto server
if "%choice%"=="2" goto client
if "%choice%"=="3" goto serveronly
if "%choice%"=="4" goto matchmaker
if "%choice%"=="5" goto clientbuild
if "%choice%"=="6" goto dbsetup
if "%choice%"=="0" goto exit
echo Invalid option. Please try again.
timeout /t 2 >nul
goto menu

:server
echo Starting Server with nodemon and debug...
npm run server
goto end

:client
echo Starting Client...
npm run client
goto end

:serveronly
echo Starting Server Only (dev mode)...
npm run serveronly
goto end

:matchmaker
echo Starting Matchmaker...
npm run matchmaker
goto end

:clientbuild
echo Building Client...
npm run client:build
goto end

:dbsetup
echo Setting up Database...
npm run db:setup
goto end

:exit
echo Goodbye!
exit /b 0

:end
echo.
echo Operation completed. Press Enter to return to menu...
pause >nul
goto menu 
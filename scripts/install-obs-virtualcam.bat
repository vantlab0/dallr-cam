@echo off
:: Dallr Studio — OBS Virtual Camera DirectShow Registration Script
:: Run this file as Administrator to register the OBS Virtual Camera filter on Windows

setlocal
echo ========================================================
echo   Dallr Studio — OBS Virtual Camera DirectShow Setup
echo ========================================================
echo.

:: Check for Administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrator privileges are required.
    echo Please right-click this script and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

set "OBS_DIR=C:\Program Files\obs-studio"
set "DLL_64=%OBS_DIR%\data\obs-plugins\win-dshow\obs-virtualcam-module64.dll"
set "DLL_32=%OBS_DIR%\data\obs-plugins\win-dshow\obs-virtualcam-module32.dll"

if not exist "%DLL_64%" (
    echo [!] OBS Studio not found at %OBS_DIR%.
    echo Attempting to install OBS Studio Virtual Camera via winget...
    winget install --id=OBSProject.OBSStudio -e --silent --accept-package-agreements --accept-source-agreements
)

if exist "%DLL_64%" (
    echo [*] Registering 64-bit DirectShow Virtual Camera filter...
    regsvr32.exe /s /i "%DLL_64%"
    if %errorLevel% == 0 (
        echo [OK] 64-bit OBS Virtual Camera registered successfully.
    ) else (
        echo [!] Failed to register 64-bit DLL.
    )
)

if exist "%DLL_32%" (
    echo [*] Registering 32-bit DirectShow Virtual Camera filter...
    regsvr32.exe /s /i "%DLL_32%"
)

echo.
echo ========================================================
echo   OBS Virtual Camera is now installed and registered!
echo   WhatsApp, Zoom, Teams and Discord can now select it.
echo ========================================================
echo.
pause

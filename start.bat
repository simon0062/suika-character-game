@echo off
cd /d "%~dp0"

set PYCMD=
python --version >nul 2>&1 && set PYCMD=python
if "%PYCMD%"=="" python3 --version >nul 2>&1 && set PYCMD=python3
if "%PYCMD%"=="" py --version >nul 2>&1 && set PYCMD=py

if "%PYCMD%"=="" (
    echo Python not found! Install: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Starting server...
echo.
%PYCMD% -c "import socket;s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);s.connect(('8.8.8.8',80));print('PC: http://localhost:8080');print('Phone: http://'+s.getsockname()[0]+':8080');s.close()"
echo.
echo Phone and PC must be on same WiFi
echo Press Ctrl+C to stop
echo.

start "" http://localhost:8080
%PYCMD% -m http.server 8080 --bind 0.0.0.0
pause

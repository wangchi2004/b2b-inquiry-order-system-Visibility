@echo off
setlocal

cd /d "%~dp0"

if not exist .venv (
    py -3 -m venv .venv
)

.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m PyInstaller --clean --noconfirm build_windows.spec

echo.
echo Build complete. Check the dist folder.
pause

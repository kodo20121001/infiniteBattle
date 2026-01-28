@echo off
REM Video to Sprite Sheet Tool - GUI Launcher
REM Using Anaconda Environment

echo.
echo ====================================================================
echo   Video to Sprite Sheet Tool - GUI Version
echo ====================================================================
echo.

REM Set Anaconda path
set ANACONDA_PATH=%USERPROFILE%\anaconda3

REM Check if Anaconda exists
if not exist "%ANACONDA_PATH%" (
    echo ERROR: Anaconda not found
    echo Path: %ANACONDA_PATH%
    pause
    exit /b 1
)

echo [1/4] Initializing Anaconda...
REM Initialize conda
call "%ANACONDA_PATH%\Scripts\activate.bat" "%ANACONDA_PATH%"

if errorlevel 1 (
    echo ERROR: Failed to initialize Anaconda
    pause
    exit /b 1
)

echo [OK] Anaconda initialized
echo.

REM Activate my_rembg environment
echo [2/4] Activating conda environment: my_rembg
call conda activate my_rembg

if errorlevel 1 (
    echo ERROR: Failed to activate conda environment 'my_rembg'
    echo Please create it first: conda create -n my_rembg python=3.8
    pause
    exit /b 1
)

echo [OK] Environment activated: my_rembg
echo.

REM Check dependencies
echo [3/4] Checking dependencies...
python -c "import cv2, PIL, PyQt5" 2>nul
if errorlevel 1 (
    echo Installing required packages...
    pip install opencv-python Pillow PyQt5
    echo.
)

REM Launch GUI
echo [4/4] Launching GUI...
echo.
python gui.py

if errorlevel 1 (
    echo.
    echo Launch failed, please check error messages
    pause
)

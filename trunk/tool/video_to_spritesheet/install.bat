@echo off
REM Video to Sprite Sheet - 自动安装脚本
REM 自动创建conda环境并安装所有依赖

echo ========================================
echo Video to Sprite Sheet - 安装程序
echo ========================================
echo.
echo 此脚本将自动：
echo 1. 创建conda虚拟环境
echo 2. 安装所有依赖包
echo 3. 完成后即可使用
echo.
pause

REM 检查conda是否安装
where conda >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误：未检测到Conda！
    echo 请先安装Anaconda或Miniconda
    echo 下载地址：https://www.anaconda.com/download
    pause
    exit /b 1
)

echo.
echo 正在创建虚拟环境...
call conda create -n video_sprite python=3.10 -y

echo.
echo 正在安装依赖包...
call conda activate video_sprite
pip install opencv-python==4.8.1.78
pip install Pillow==10.1.0
pip install PyQt5==5.15.9
pip install rembg

echo.
echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 使用方法：
echo 1. 双击运行 启动GUI.bat
echo 2. 或在命令行运行：
echo    conda activate video_sprite
echo    python gui.py
echo.
pause

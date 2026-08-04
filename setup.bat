@echo off
echo.
echo 🚀 Simple Chat - Setup Script (Windows)
echo ======================================
echo.

REM Check if Node.js is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js version:
node -v
echo.
echo ✅ npm version:
npm -v
echo.

echo 📦 Installing dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Dependencies installed successfully!
echo.
echo ════════════════════════════════════════
echo 🎉 Setup Complete!
echo ════════════════════════════════════════
echo.
echo Next steps:
echo 1. Make sure MongoDB is running
echo 2. Start the server: npm start
echo 3. Open browser: http://localhost:3000
echo.
echo 📖 For more info, see README.md
echo.
pause

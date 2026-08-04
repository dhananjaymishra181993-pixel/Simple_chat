#!/bin/bash

echo "🚀 Simple Chat - Setup Script"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"
echo ""

# Check if MongoDB is running
echo "📝 Checking MongoDB connection..."
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB CLI not found locally, but it might be running as a service"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "════════════════════════════════════════"
echo "🎉 Setup Complete!"
echo "════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Make sure MongoDB is running: mongod"
echo "2. Start the server: npm start"
echo "3. Open browser: http://localhost:3000"
echo ""
echo "📖 For more info, see README.md"
echo ""

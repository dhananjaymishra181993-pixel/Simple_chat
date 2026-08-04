# 🚀 QUICKSTART GUIDE - Simple Chat

## ⚡ Run in 3 Steps!

### Step 1️⃣: Install Dependencies
```bash
npm install
```

### Step 2️⃣: Start MongoDB
```bash
mongod
```

### Step 3️⃣: Run Server
```bash
npm start
```

✅ **Done!** Open browser: http://localhost:3000

---

## 🎯 What Happens Next

1. **Homepage** opens at http://localhost:3000
2. Click **"Register"** to create account
3. Click **"Login"** with credentials
4. Select user from list to chat
5. Messages sync in real-time! 🎉

---

## 📋 System Requirements

- ✅ Node.js (v14+)
- ✅ MongoDB (running)
- ✅ npm or yarn

---

## 🪟 Windows Users

```bash
setup.bat
npm start
```

---

## 🐧 Linux/Mac Users

```bash
bash setup.sh
npm start
```

---

## 🔧 Development Mode (Auto-reload)

```bash
npm run dev
```

---

## ❌ Common Issues & Fixes

### MongoDB Not Found
```bash
# Windows: Download from https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: sudo apt-get install mongodb
```

### Port 3000 Already in Use
```bash
# Change PORT in .env file
PORT=3001
```

### Dependencies Error
```bash
rm -rf node_modules package-lock.json
npm install --force
```

---

## ✅ Check if Running

Go to: **http://localhost:3000**

You should see:
- 💬 Simple Chat logo
- ✅ Server is running message
- Register & Login buttons

---

## 🎮 Test the App

```
1. Register: testuser1 / password123
2. Open new browser/incognito: testuser2 / password456
3. Start messaging between tabs!
```

---

## 📞 Need Help?

```
❌ "Cannot find module" → npm install
❌ "MongoDB connection failed" → mongod must be running
❌ "Port 3000 in use" → Change PORT in .env
❌ "nodemon not found" → npm install -D nodemon
```

---

## 🎉 All Set!

Your chat app is ready to use!

**Enjoy chatting!** 💬

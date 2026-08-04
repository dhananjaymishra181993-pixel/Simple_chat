# 💬 Simple Chat Application

A real-time chat application built with Express.js, Socket.io, MongoDB, and vanilla JavaScript.

## 🎯 Features

- ✅ User Registration & Login (JWT + httpOnly Cookies)
- ✅ Real-time Private Messaging (Socket.io)
- ✅ Message History & Pagination
- ✅ Read Receipts
- ✅ Online User Status
- ✅ Secure Password Hashing (bcrypt)

---

## 📋 Prerequisites

Make sure you have installed:
- **Node.js** (v14 or higher)
- **MongoDB** (running locally or remote URI)
- **npm** (comes with Node.js)

---

## 🚀 Quick Start (3 Steps!)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start MongoDB
```bash
mongod
```

### Step 3: Run Server
```bash
npm start
```

✅ Server runs on: **http://localhost:3000**

---

## 📱 Usage

1. Open browser: `http://localhost:3000`
2. **Register** a new account
3. **Login** with credentials
4. Select user from list and **start chatting**
5. Messages sync in real-time via Socket.io

---

## 📁 Project Structure

```
Simple_chat/
├── index.js              # Server entry point
├── package.json          # Dependencies
├── .env                  # Environment variables
├── .gitignore            # Git ignore rules
├── public/
│   ├── register.html     # Registration page
│   ├── login.html        # Login page
│   ├── chat.html         # Chat interface
│   └── users.html        # Users list
└── node_modules/         # Dependencies (auto-installed)
```

---

## 🔧 Environment Variables

Edit `.env` file:
```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/simple_chat
JWT_SECRET=your_super_secret_jwt_key_change_in_production_12345
```

---

## 📝 npm Scripts

```bash
# Start production server
npm start

# Start development server (with auto-reload)
npm run dev

# Run tests
npm test
```

---

## ⚠️ Troubleshooting

### ❌ MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Make sure MongoDB is running
```bash
mongod
```

### ❌ Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### ❌ Dependencies Not Installing
```bash
npm install --force
```

### ❌ dotenv not found
```bash
npm install dotenv
```

---

## 🔐 Security Notes

- Change `JWT_SECRET` in `.env` for production
- Use MongoDB Atlas for remote databases
- Enable HTTPS in production
- Use secure cookies in production

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register new user |
| POST | `/api/login` | Login user |
| POST | `/api/logout` | Logout user |
| GET | `/api/me` | Get current user |
| GET | `/api/users` | Get all users |
| GET | `/api/messages` | Get message history |
| POST | `/api/mark-read` | Mark as read |

---

## 🎮 Socket.io Events

| Event | Description |
|-------|-------------|
| `private-message` | Send/receive message |
| `mark-read` | Mark as read |
| `messages-read` | Read notification |
| `user-online` | User came online |
| `user-offline` | User went offline |
| `online-users` | Get online users |

---

## 📄 License

ISC

---

## 👨‍💻 Author

**Dhananjay Mishra**

---

Made with ❤️ for real-time communication

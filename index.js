// server.js (exports app & models for tests; httpOnly cookie auth, pagination, read receipts, socket auth)
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Server } = require('socket.io');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/simple_chat';
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

// Connect to MongoDB with retry logic
const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      await mongoose.connect(MONGO_URI, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected successfully');
      break;
    } catch (err) {
      retries -= 1;
      console.log(`⚠️ MongoDB connection error (${retries} retries left):`, err.message);
      if (retries === 0) {
        console.error('❌ Failed to connect to MongoDB after 5 attempts');
        console.log('📝 Make sure MongoDB is running: mongod');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 2000));
    }
  }
};

connectDB();

/* ---------- Schemas ---------- */
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});
messageSchema.index({ from: 1, to: 1, createdAt: 1 });
const Message = mongoose.model('Message', messageSchema);

/* ---------- App & Socket ---------- */
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// in-memory presence map: userId -> socket.id
const onlineUsers = new Map();

/* ---------- Helpers ---------- */
function parseCookies(reqOrHandshake) {
  const cookieHeader = (reqOrHandshake.headers && reqOrHandshake.headers.cookie) || '';
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const [k, ...v] = pair.trim().split('=');
    cookies[k] = decodeURIComponent(v.join('='));
  });
  return cookies;
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7d
};

/* ---------- Middleware ---------- */
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// small cookie-parsing middleware (so req.cookies is available)
app.use((req, res, next) => {
  req.cookies = parseCookies(req);
  next();
});

// auth middleware: looks for Authorization: Bearer <token> OR cookie 'token'
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
    if (!token && req.cookies && req.cookies.token) token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'missing token' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { userId: payload.userId, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

/* ---------- Auth endpoints ---------- */
// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ username, passwordHash });
    await user.save();
    console.log(`✅ User registered: ${username}`);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'username already taken' });
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Login -> sets httpOnly cookie + returns user info (client cannot read cookie)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'invalid credentials' });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'invalid credentials' });
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, cookieOptions);
    console.log(`✅ User logged in: ${username}`);
    res.json({ userId: user._id, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Logout - clears cookie
app.post('/api/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: 0 });
  console.log('✅ User logged out');
  res.json({ ok: true });
});

// Current user info (client uses this after login or on page load)
app.get('/api/me', (req, res) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies.token;
    if (!token) return res.status(401).json({ error: 'not authenticated' });
    const p = jwt.verify(token, JWT_SECRET);
    res.json({ userId: p.userId, username: p.username });
  } catch (err) {
    return res.status(401).json({ error: 'not authenticated' });
  }
});

/* ---------- Users ---------- */
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, '_id username').lean();
    const others = users.filter(u => String(u._id) !== String(req.user.userId));
    res.json({ users: others });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ---------- Messages: history (pagination) ---------- */
app.get('/api/messages', authMiddleware, async (req, res) => {
  const withUserId = req.query.withUserId;
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);
  const beforeId = req.query.before || null;
  if (!withUserId) return res.status(400).json({ error: 'withUserId required' });

  try {
    const me = mongoose.Types.ObjectId(String(req.user.userId));
    const other = mongoose.Types.ObjectId(String(withUserId));

    const query = {
      $or: [
        { from: me, to: other },
        { from: other, to: me }
      ]
    };

    if (beforeId) {
      const beforeDoc = await Message.findById(beforeId).lean();
      if (beforeDoc) {
        query.createdAt = { $lt: beforeDoc.createdAt };
      }
    }

    const docs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const messages = docs.reverse();
    const hasMore = docs.length === limit;
    res.json({ messages, hasMore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ---------- Mark messages read (read receipts) ---------- */
app.post('/api/mark-read', authMiddleware, async (req, res) => {
  const withUserId = req.query.withUserId || (req.body && req.body.withUserId);
  if (!withUserId) return res.status(400).json({ error: 'withUserId required' });
  try {
    const me = mongoose.Types.ObjectId(String(req.user.userId));
    const other = mongoose.Types.ObjectId(String(withUserId));

    const unread = await Message.find({ from: other, to: me, read: false }).lean();
    const ids = unread.map(m => m._id);
    if (ids.length > 0) {
      await Message.updateMany({ _id: { $in: ids } }, { $set: { read: true } });
      const toSocketId = onlineUsers.get(String(withUserId));
      if (toSocketId) {
        io.to(toSocketId).emit('messages-read', { fromUserId: String(req.user.userId), ids: ids.map(String) });
      }
    }
    res.json({ marked: ids.length, ids: ids.map(String) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ---------- Socket.io auth via cookie ---------- */
io.use((socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake);
    const token = cookies.token;
    if (!token) return next(new Error('Authentication error'));
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = { userId: payload.userId, username: payload.username };
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const { userId, username } = socket.user;
  console.log(`🟢 Connected: ${username} (${socket.id})`);
  onlineUsers.set(String(userId), socket.id);

  // presence
  socket.emit('online-users', Array.from(onlineUsers.keys()));
  socket.broadcast.emit('user-online', { userId: String(userId), username });

  socket.on('private-message', async (data) => {
    const { toUserId, text } = data || {};
    if (!toUserId || !text) return;
    try {
      const fromId = mongoose.Types.ObjectId(String(userId));
      const toId = mongoose.Types.ObjectId(String(toUserId));
      const msgDoc = await Message.create({ from: fromId, to: toId, text });
      const payload = {
        _id: msgDoc._id,
        from: { userId: String(msgDoc.from), username },
        toUserId: String(msgDoc.to),
        text: msgDoc.text,
        createdAt: msgDoc.createdAt,
        read: msgDoc.read
      };
      const toSocketId = onlineUsers.get(String(toUserId));
      if (toSocketId) io.to(toSocketId).emit('private-message', payload);
      socket.emit('private-message', payload);
    } catch (err) {
      console.error('failed to save message', err);
      socket.emit('error', { message: 'failed to save message' });
    }
  });

  socket.on('mark-read', async (data) => {
    try {
      const withUserId = data && data.withUserId;
      if (!withUserId) return;
      const me = mongoose.Types.ObjectId(String(userId));
      const other = mongoose.Types.ObjectId(String(withUserId));
      const unread = await Message.find({ from: other, to: me, read: false }).lean();
      const ids = unread.map(m => m._id);
      if (ids.length > 0) {
        await Message.updateMany({ _id: { $in: ids } }, { $set: { read: true } });
        const toSocketId = onlineUsers.get(String(withUserId));
        if (toSocketId) {
          io.to(toSocketId).emit('messages-read', { fromUserId: String(me), ids: ids.map(String) });
        }
      }
      socket.emit('mark-read:ok', { marked: ids.map(String) });
    } catch (err) {
      console.error(err);
      socket.emit('mark-read:error', { message: 'failed' });
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(String(userId));
    console.log(`🔴 Disconnected: ${username}`);
    socket.broadcast.emit('user-offline', { userId: String(userId), username });
  });
});

/* ---------- Start server ---------- */
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Simple Chat Server Running 🚀        ║
╠════════════════════════════════════════╣
║   URL: http://localhost:${PORT}           ║
║   Environment: ${NODE_ENV}              ║
║   MongoDB: ${MONGO_URI}                   ║
╚════════════════════════════════════════╝
    `);
  });
}

// Export for tests and for programmatic use
module.exports = { app, server, User, Message, mongoose };

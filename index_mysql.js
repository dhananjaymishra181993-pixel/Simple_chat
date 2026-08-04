// server.js - MySQL Version (Express + MySQL2)
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'simple_chat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
};
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

let pool;

// Create MySQL connection pool and initialize tables
const initDB = async () => {
  try {
    // Create pool
    const mysql2 = require('mysql2/promise');
    pool = mysql2.createPool(MYSQL_CONFIG);

    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected successfully');

    // Create tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        passwordHash VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        fromUserId VARCHAR(36) NOT NULL,
        toUserId VARCHAR(36) NOT NULL,
        text LONGTEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (fromUserId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (toUserId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conversation (fromUserId, toUserId, createdAt),
        INDEX idx_from_to (fromUserId, toUserId),
        INDEX idx_createdAt (createdAt)
      )
    `);

    console.log('✅ Database tables created/verified');
    connection.release();
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    process.exit(1);
  }
};

initDB();

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
  
  const connection = await pool.getConnection();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    await connection.query(
      'INSERT INTO users (id, username, passwordHash) VALUES (?, ?, ?)',
      [userId, username, passwordHash]
    );
    
    console.log(`✅ User registered: ${username}`);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'username already taken' });
    }
    console.error(err);
    res.status(500).json({ error: 'server error' });
  } finally {
    connection.release();
  }
});

// Login -> sets httpOnly cookie + returns user info
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  const connection = await pool.getConnection();
  try {
    const [users] = await connection.query(
      'SELECT id, username, passwordHash FROM users WHERE username = ?',
      [username]
    );
    
    const user = users[0];
    if (!user) return res.status(400).json({ error: 'invalid credentials' });
    
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'invalid credentials' });
    
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, cookieOptions);
    console.log(`✅ User logged in: ${username}`);
    res.json({ userId: user.id, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  } finally {
    connection.release();
  }
});

// Logout - clears cookie
app.post('/api/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: 0 });
  console.log('✅ User logged out');
  res.json({ ok: true });
});

// Current user info
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
  const connection = await pool.getConnection();
  try {
    const [users] = await connection.query('SELECT id, username FROM users');
    const others = users.filter(u => u.id !== req.user.userId);
    res.json({ users: others });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  } finally {
    connection.release();
  }
});

/* ---------- Messages: history (pagination) ---------- */
app.get('/api/messages', authMiddleware, async (req, res) => {
  const withUserId = req.query.withUserId;
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);
  const beforeId = req.query.before || null;
  if (!withUserId) return res.status(400).json({ error: 'withUserId required' });

  const connection = await pool.getConnection();
  try {
    const me = req.user.userId;
    const other = withUserId;

    let query = `
      SELECT id, fromUserId, toUserId, text, createdAt, read
      FROM messages
      WHERE (fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?)
    `;
    let params = [me, other, other, me];

    if (beforeId) {
      const [beforeDocs] = await connection.query(
        'SELECT createdAt FROM messages WHERE id = ?',
        [beforeId]
      );
      if (beforeDocs.length > 0) {
        query += ` AND createdAt < ?`;
        params.push(beforeDocs[0].createdAt);
      }
    }

    query += ` ORDER BY createdAt DESC LIMIT ?`;
    params.push(limit);

    const [docs] = await connection.query(query, params);
    const messages = docs.reverse();
    const hasMore = docs.length === limit;

    res.json({ messages, hasMore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  } finally {
    connection.release();
  }
});

/* ---------- Mark messages read (read receipts) ---------- */
app.post('/api/mark-read', authMiddleware, async (req, res) => {
  const withUserId = req.query.withUserId || (req.body && req.body.withUserId);
  if (!withUserId) return res.status(400).json({ error: 'withUserId required' });
  
  const connection = await pool.getConnection();
  try {
    const me = req.user.userId;
    const other = withUserId;

    const [unread] = await connection.query(
      'SELECT id FROM messages WHERE fromUserId = ? AND toUserId = ? AND read = FALSE',
      [other, me]
    );

    const ids = unread.map(m => m.id);
    if (ids.length > 0) {
      await connection.query(
        'UPDATE messages SET read = TRUE WHERE id IN (' + ids.map(() => '?').join(',') + ')',
        ids
      );
      
      const toSocketId = onlineUsers.get(withUserId);
      if (toSocketId) {
        io.to(toSocketId).emit('messages-read', { fromUserId: req.user.userId, ids });
      }
    }

    res.json({ marked: ids.length, ids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  } finally {
    connection.release();
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
  onlineUsers.set(userId, socket.id);

  // presence
  socket.emit('online-users', Array.from(onlineUsers.keys()));
  socket.broadcast.emit('user-online', { userId, username });

  socket.on('private-message', async (data) => {
    const { toUserId, text } = data || {};
    if (!toUserId || !text) return;
    
    const connection = await pool.getConnection();
    try {
      const msgId = uuidv4();
      const now = new Date();

      await connection.query(
        'INSERT INTO messages (id, fromUserId, toUserId, text, createdAt, read) VALUES (?, ?, ?, ?, ?, FALSE)',
        [msgId, userId, toUserId, text, now]
      );

      const payload = {
        _id: msgId,
        id: msgId,
        from: { userId, username },
        toUserId,
        text,
        createdAt: now,
        read: false
      };

      const toSocketId = onlineUsers.get(toUserId);
      if (toSocketId) io.to(toSocketId).emit('private-message', payload);
      socket.emit('private-message', payload);
    } catch (err) {
      console.error('failed to save message', err);
      socket.emit('error', { message: 'failed to save message' });
    } finally {
      connection.release();
    }
  });

  socket.on('mark-read', async (data) => {
    const connection = await pool.getConnection();
    try {
      const withUserId = data && data.withUserId;
      if (!withUserId) return;

      const [unread] = await connection.query(
        'SELECT id FROM messages WHERE fromUserId = ? AND toUserId = ? AND read = FALSE',
        [withUserId, userId]
      );

      const ids = unread.map(m => m.id);
      if (ids.length > 0) {
        await connection.query(
          'UPDATE messages SET read = TRUE WHERE id IN (' + ids.map(() => '?').join(',') + ')',
          ids
        );
        
        const toSocketId = onlineUsers.get(withUserId);
        if (toSocketId) {
          io.to(toSocketId).emit('messages-read', { fromUserId: userId, ids });
        }
      }

      socket.emit('mark-read:ok', { marked: ids });
    } catch (err) {
      console.error(err);
      socket.emit('mark-read:error', { message: 'failed' });
    } finally {
      connection.release();
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    console.log(`🔴 Disconnected: ${username}`);
    socket.broadcast.emit('user-offline', { userId, username });
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
║   Database: MySQL (${MYSQL_CONFIG.database})      ║
╚════════════════════════════════════════╝
    `);
  });
}

// Export for tests and programmatic use
module.exports = { app, server, pool };

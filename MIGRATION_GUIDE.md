# MongoDB to MySQL Migration Guide

## Overview
This guide helps you migrate from the MongoDB-based chat server to the MySQL-based version.

## Two Versions Available

### 1. **index.js** - MongoDB Version (Original)
- Uses Mongoose ODM
- Collection: `users`, `messages`
- Keep using this if you prefer MongoDB

### 2. **index_mysql.js** - MySQL Version (New)
- Uses mysql2/promise
- Tables: `users`, `messages`
- More suitable for traditional SQL workflows

## Quick Start with MySQL

### 1. Install Dependencies
```bash
npm install
npm install mysql2 uuid
```

### 2. Set Environment Variables
Create `.env` file:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=simple_chat
PORT=3000
NODE_ENV=development
JWT_SECRET=your_secret_key
```

### 3. Run MySQL Server
```bash
# Windows (XAMPP/WAMP)
# Start MySQL from control panel

# macOS (Homebrew)
brew services start mysql

# Linux
sudo systemctl start mysql
```

### 4. Run the Chat Server
```bash
# Start MySQL version
npm run start:mysql

# Or with auto-reload during development
npm run dev:mysql
```

### 5. Access the Application
Open browser: `http://localhost:3000`

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  username VARCHAR(255) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username)
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  fromUserId VARCHAR(36) NOT NULL,
  toUserId VARCHAR(36) NOT NULL,
  text LONGTEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (fromUserId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (toUserId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conversation (fromUserId, toUserId, createdAt)
);
```

---

## API Endpoints (Same for Both Versions)

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/me` - Get current user

### Users
- `GET /api/users` - Get all other users

### Messages
- `GET /api/messages?withUserId=<id>&limit=50` - Get chat history (paginated)
- `POST /api/mark-read?withUserId=<id>` - Mark messages as read

### Socket.io Events
- `private-message` - Send/receive messages
- `mark-read` - Mark messages as read
- `user-online` - User came online
- `user-offline` - User went offline

---

## Key Differences Between Versions

| Feature | MongoDB (index.js) | MySQL (index_mysql.js) |
|---------|-------------------|------------------------|
| Connection | Mongoose | mysql2/promise |
| ID Type | ObjectId | UUID (string) |
| Query Style | ODM | Raw SQL |
| Scalability | Document-based | Relational |
| Memory Pool | Single | Connection pool |
| Transactions | Built-in | Available |

---

## Data Migration (MongoDB → MySQL)

If you need to migrate existing MongoDB data:

```javascript
// migration.js
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// 1. Connect to both databases
// 2. Read from MongoDB collections
// 3. Transform data (generate UUIDs for IDs)
// 4. Write to MySQL tables

// Example:
// MongoDB ObjectId: 507f1f77bcf86cd799439011
// MySQL UUID: 550e8400-e29b-41d4-a716-446655440000
```

---

## Performance Tips

### MySQL Version
1. **Connection Pooling**: Already implemented (10 connection limit)
2. **Indexes**: Added on frequently queried columns
3. **Pagination**: Use `limit` parameter to avoid loading all messages
4. **Read Receipts**: Efficiently marked with batch update

### Both Versions
- JWT tokens expire in 7 days
- httpOnly cookies prevent XSS
- CORS enabled for cross-origin requests
- Socket.io authentication required

---

## Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"
```bash
# Check MySQL credentials in .env file
# Verify MySQL is running
# Update DB_USER and DB_PASSWORD
```

### Error: "Database 'simple_chat' doesn't exist"
```bash
# Database is auto-created by the script
# If not, create manually:
mysql> CREATE DATABASE simple_chat;
```

### Error: "ECONNREFUSED" on connection
```bash
# MySQL server not running
# Start MySQL service
# Check DB_HOST and DB_PORT in .env
```

### Socket.io connection fails
```bash
# Ensure token cookie is sent
# Check browser console for CORS errors
# Verify JWT_SECRET matches between register/login
```

---

## Switching Between Versions

### To Use MongoDB (Original)
```bash
npm run dev        # Or: npm run start
```

### To Use MySQL (New)
```bash
npm run dev:mysql  # Or: npm run start:mysql
```

You can run both versions simultaneously on different ports.

---

## Production Deployment

### MySQL Version Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Update `JWT_SECRET` to strong random value
- [ ] Set `DB_PASSWORD` to secure password
- [ ] Enable `secure: true` for cookies (HTTPS only)
- [ ] Use environment variables from `.env`
- [ ] Set up MySQL backups
- [ ] Enable connection SSL/TLS
- [ ] Monitor MySQL connection pool usage
- [ ] Set up logging and monitoring

---

## Questions or Issues?

Refer to:
- Socket.io docs: https://socket.io/docs/
- MySQL2 docs: https://github.com/sidorares/node-mysql2
- Express docs: https://expressjs.com/

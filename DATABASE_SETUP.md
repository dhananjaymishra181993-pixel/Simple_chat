# Database Setup Instructions

## MySQL Setup Guide

### Windows (XAMPP)
1. Download XAMPP from https://www.apachefriends.org
2. Install XAMPP
3. Start Apache & MySQL from XAMPP Control Panel
4. Open phpMyAdmin: http://localhost/phpmyadmin

### Windows (Manual MySQL Installation)
```bash
# Download MySQL Community Server
# https://dev.mysql.com/downloads/mysql/

# During installation:
# - Choose port 3306
# - Set root password
# - Run as Windows Service

# Verify installation:
mysql --version
mysql -u root -p
```

### macOS (Homebrew)
```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MySQL
brew install mysql

# Start MySQL
brew services start mysql

# Set root password (optional)
mysql_secure_installation

# Verify
mysql --version
mysql -u root
```

### Linux (Ubuntu/Debian)
```bash
# Install MySQL Server
sudo apt-get update
sudo apt-get install mysql-server

# Start MySQL
sudo systemctl start mysql

# Secure installation
sudo mysql_secure_installation

# Verify
mysql --version
mysql -u root
```

### Linux (CentOS/RHEL)
```bash
# Install MySQL Server
sudo yum install mysql-server

# Start MySQL
sudo systemctl start mysqld

# Secure installation
sudo mysql_secure_installation

# Verify
mysql --version
mysql -u root
```

---

## Create Database & User

### Option 1: Using MySQL Command Line

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE simple_chat;

# Create user (if needed)
CREATE USER 'chat_user'@'localhost' IDENTIFIED BY 'secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON simple_chat.* TO 'chat_user'@'localhost';
FLUSH PRIVILEGES;

# Verify
SHOW DATABASES;
EXIT;
```

### Option 2: Using phpMyAdmin (GUI)
1. Open http://localhost/phpmyadmin
2. Click "New" in left sidebar
3. Enter database name: `simple_chat`
4. Create
5. Go to "User accounts" tab
6. Add new user with privileges

---

## Environment Variables

Create `.env` file in project root:

```env
# MySQL Connection
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=simple_chat

# Server Config
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secret_key_change_in_production
```

### For Production:
```env
DB_HOST=prod.example.com
DB_PORT=3306
DB_USER=prod_chat_user
DB_PASSWORD=StrongSecurePassword123!@#
DB_NAME=simple_chat_prod

PORT=3000
NODE_ENV=production
JWT_SECRET=UseStrongRandomStringHere_ABC123XYZ789DEF456GHI
```

---

## Verify Database Connection

### Test Connection Using MySQL CLI:
```bash
mysql -h localhost -u root -p simple_chat
```

### Test Connection Using Node.js Script:

Create `test-connection.js`:
```javascript
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'your_password',
      database: 'simple_chat'
    });
    console.log('✅ Database connection successful!');
    await connection.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();
```

Run:
```bash
node test-connection.js
```

---

## View Database Tables

```bash
# Connect to database
mysql -u root -p simple_chat

# Show all tables
SHOW TABLES;

# Show table structure
DESCRIBE users;
DESCRIBE messages;

# Show indexes
SHOW INDEX FROM users;
SHOW INDEX FROM messages;
```

### Using phpMyAdmin:
1. Select database: `simple_chat` (left sidebar)
2. Click "Structure" tab to see all tables
3. Click on table name to view columns and indexes

---

## Backup & Restore

### Backup Database:
```bash
# Backup to file
mysqldump -u root -p simple_chat > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup all databases
mysqldump -u root -p --all-databases > full_backup.sql
```

### Restore Database:
```bash
# Restore from file
mysql -u root -p simple_chat < backup_20240804_123456.sql

# Restore specific table
mysql -u root -p simple_chat < users_table_backup.sql
```

---

## Performance Optimization

### Enable Slow Query Log:
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2; -- queries taking more than 2 seconds
```

### Check Indexes:
```sql
-- Show indexes for messages table
SHOW INDEX FROM messages;

-- Add missing index if needed
ALTER TABLE messages ADD INDEX idx_from_to (fromUserId, toUserId);
```

### Optimize Tables:
```bash
# Connect and optimize
mysql -u root -p simple_chat
OPTIMIZE TABLE users;
OPTIMIZE TABLE messages;
```

---

## Troubleshooting

### Can't connect to MySQL server
```bash
# Check if MySQL is running
# Windows:
tasklist | findstr mysql

# macOS:
brew services list | grep mysql

# Linux:
sudo systemctl status mysql

# Start MySQL if stopped
# Windows: Start MySQL from Services or XAMPP
# macOS: brew services start mysql
# Linux: sudo systemctl start mysql
```

### "Access denied for user"
```bash
# Try without password
mysql -u root

# Or reset root password (MySQL 5.7+)
mysql -u root --skip-password
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

### "Unknown database"
```bash
# Create database if missing
mysql -u root -p
CREATE DATABASE simple_chat;
```

### "Table doesn't exist"
```bash
# Tables are auto-created by the app
# If not, restart the server: npm run start:mysql

# Or create manually:
mysql -u root -p simple_chat < schema.sql
```

---

## Database Cleanup

### Delete all messages:
```sql
DELETE FROM messages;
```

### Delete all users (and their messages):
```sql
DELETE FROM users;
DELETE FROM messages;
```

### Reset auto-increment (if using):
```sql
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE messages AUTO_INCREMENT = 1;
```

### Drop entire database:
```sql
DROP DATABASE simple_chat;
```

---

## Next Steps

1. Run: `npm install`
2. Create `.env` file with your MySQL credentials
3. Start MySQL server
4. Run: `npm run start:mysql`
5. Open: `http://localhost:3000`
6. Register and start chatting!

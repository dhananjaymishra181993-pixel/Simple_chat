# 🔧 TROUBLESHOOTING GUIDE

## ❌ MongoDB Connection Issues

### Error: `Error: connect ECONNREFUSED 127.0.0.1:27017`

**Cause:** MongoDB is not running

**Fix:**
```bash
# Windows
mongod

# Mac (with Homebrew)
brew services start mongodb-community

# Linux (Ubuntu/Debian)
sudo systemctl start mongod
```

**Verify MongoDB is running:**
```bash
mongo --eval "db.adminCommand('ping')"
```

---

## ❌ Port Already in Use

### Error: `Error: listen EADDRINUSE: address already in use :::3000`

**Fix Option 1: Change Port**
```bash
# Edit .env file
PORT=3001
```

**Fix Option 2: Kill Process**

Windows:
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Mac/Linux:
```bash
lsof -i :3000
kill -9 <PID>
```

---

## ❌ Dependencies Not Installed

### Error: `Cannot find module 'express'`

**Fix:**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install --force
```

---

## ❌ dotenv Not Found

### Error: `Cannot find module 'dotenv'`

**Fix:**
```bash
npm install dotenv
```

---

## ❌ Node.js Not Installed

### Error: `node: command not found`

**Fix:**
- Download from https://nodejs.org
- Install LTS version
- Restart terminal
- Verify: `node -v` and `npm -v`

---

## ❌ Socket.io Connection Issues

### Frontend Cannot Connect to Server

**Cause:** Server not running or wrong port

**Fix:**
```bash
# Check if server is running
http://localhost:3000

# If not, run:
npm start

# Check .env PORT matches
```

---

## ❌ Login/Register Not Working

### Error: `invalid credentials` or `username taken`

**Cause:** Database connection issue or user exists

**Fix:**
```bash
# Check MongoDB
mongo

# Use new username for registration
# or delete user from database:
db.users.deleteOne({ username: "testuser" })
```

---

## ❌ Cannot Send Messages

### Messages Not Showing

**Cause:** Socket connection issue

**Fix:**
```bash
# Check browser console (F12)
# Look for Socket.io connection errors

# Restart server:
npm start
```

---

## ✅ Debug Mode

### See Detailed Logs

```bash
# Enable debug logging
DEBUG=* npm start

# Or just app debug
NODE_DEBUG=http,express npm start
```

---

## 🧪 Test Connection

```javascript
// Run in browser console at http://localhost:3000
fetch('/api/me')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error('Server error:', e))
```

---

## 📋 Checklist

- [ ] Node.js installed? `node -v`
- [ ] npm installed? `npm -v`
- [ ] MongoDB running? `mongod`
- [ ] Dependencies installed? `npm install`
- [ ] .env file exists?
- [ ] Port 3000 free? `lsof -i :3000`
- [ ] Server running? `npm start`
- [ ] Browser shows http://localhost:3000?

---

## 🆘 Still Having Issues?

1. **Check console output** - Look for error messages
2. **Check browser console** (F12) - Look for JavaScript errors
3. **Check .env file** - Verify all variables
4. **Restart everything:**
   ```bash
   # Kill server (Ctrl+C)
   # Kill MongoDB (Ctrl+C)
   
   mongod           # Start MongoDB
   npm start        # In new terminal
   ```

---

## 💡 Pro Tips

- Use `npm run dev` for development with auto-reload
- Check `.env` file for environment variables
- Use `nodemon` for automatic server restart
- Clear browser cache if having UI issues (Ctrl+Shift+Del)
- Use incognito/private mode to test multiple logins

---

**Need more help?** Check the README.md or GitHub issues!

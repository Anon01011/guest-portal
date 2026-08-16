const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, loginLimiter, signToken } = require('../middleware/auth');
const { sanitizeStr } = require('../utils/helpers');

const router = express.Router();

// Login
router.post('/login', loginLimiter, async (req, res) => {
  const username = sanitizeStr(req.body.username, 50);
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (typeof password !== 'string' || password.length > 128) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = signToken(user.username);
    res.json({ username: user.username, token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password (recovery code from env)
router.post('/reset-password', loginLimiter, async (req, res) => {
  const username = sanitizeStr(req.body.username, 50);
  const code = req.body.code;
  const newPassword = req.body.newPassword;

  if (!username || !code || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const RECOVERY_CODE = process.env.RECOVERY_CODE;
  if (!RECOVERY_CODE || code !== RECOVERY_CODE) {
    return res.status(400).json({ error: 'Invalid recovery code' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ error: 'New password must be 8–128 characters' });
  }

  try {
    const [rows] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Username not found' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password = ? WHERE username = ?', [hashed, username]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  const username = req.user; // taken from JWT, not from body
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ error: 'New password must be 8–128 characters' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password = ? WHERE username = ?', [hashed, username]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

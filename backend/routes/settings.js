const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { invalidateSettingsCache } = require('../middleware/rollover');
const { sanitizeStr } = require('../utils/helpers');
const scanner = require('../utils/scanner');

const router = express.Router();

// Apply requireAuth to all settings routes
router.use(requireAuth);

// Get settings
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM settings');
    const settings = {};
    rows.forEach(row => { settings[row.setting_key] = row.setting_value; });
    res.json(settings);
  } catch (err) {
    console.error('Get settings error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update settings
router.put('/', async (req, res) => {
  const VALID_DATE_MODES = ['auto', 'manual'];
  const {
    dateMode,
    manualRolloverTime,
    scannerFolder,
    selectedScanner,
    scannerApiUrl,
    scannerApiUsername,
    scannerApiPassword,
    visionApiKey,
    // OCR Engine toggles
    ocrPaddleEnabled,
    ocrVisionEnabled,
    ocrScannerApiEnabled,
    ocrTesseractEnabled
  } = req.body;

  try {
    if (dateMode !== undefined) {
      if (!VALID_DATE_MODES.includes(dateMode)) {
        return res.status(400).json({ error: 'Invalid date_mode value' });
      }
      await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = "date_mode"', [dateMode]);
    }
    if (manualRolloverTime !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(manualRolloverTime)) {
        return res.status(400).json({ error: 'Invalid time format (expected HH:MM)' });
      }
      await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = "manual_rollover_time"', [manualRolloverTime]);
    }
    if (scannerFolder !== undefined) {
      await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = "scanner_folder"', [scannerFolder]);
    }
    if (selectedScanner !== undefined) {
      await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = "selected_scanner"', [selectedScanner]);
    }

    const saveSetting = async (key, val) => {
      const [existing] = await db.query('SELECT id FROM settings WHERE setting_key = ?', [key]);
      if (existing.length > 0) {
        await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [val, key]);
      } else {
        await db.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, val]);
      }
    };

    if (scannerApiUrl !== undefined) {
      await saveSetting('scanner_api_url', scannerApiUrl);
    }
    if (scannerApiUsername !== undefined) {
      await saveSetting('scanner_api_username', scannerApiUsername);
    }
    if (scannerApiPassword !== undefined) {
      await saveSetting('scanner_api_password', scannerApiPassword);
    }
    // Google Cloud Vision API key (free tier: 1000 req/month)
    // Stored in DB so it works on all devices without editing .env files.
    if (visionApiKey !== undefined) {
      await saveSetting('vision_api_key', visionApiKey.trim());
    }

    // OCR Engine enable/disable toggles
    if (ocrPaddleEnabled !== undefined) {
      await saveSetting('ocr_paddle_enabled', ocrPaddleEnabled ? '1' : '0');
    }
    if (ocrVisionEnabled !== undefined) {
      await saveSetting('ocr_vision_enabled', ocrVisionEnabled ? '1' : '0');
    }
    if (ocrScannerApiEnabled !== undefined) {
      await saveSetting('ocr_scanner_api_enabled', ocrScannerApiEnabled ? '1' : '0');
    }
    if (ocrTesseractEnabled !== undefined) {
      await saveSetting('ocr_tesseract_enabled', ocrTesseractEnabled ? '1' : '0');
    }

    invalidateSettingsCache();

    const [rows] = await db.query('SELECT * FROM settings');
    const settings = {};
    rows.forEach(row => { settings[row.setting_key] = row.setting_value; });
    res.json(settings);
  } catch (err) {
    console.error('Update settings error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Force reset operational date to today

router.post('/force-reset', async (req, res) => {
  try {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = "operational_date"', [todayISO]);
    invalidateSettingsCache();
    res.json({ message: 'Operational date reset successfully', operational_date: todayISO });
  } catch (err) {
    console.error('Force reset error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update guest deletion PIN (admin password-verified)
router.put('/delete-pin', async (req, res) => {
  const username = req.user; // Admin user
  const { currentPassword, newPin } = req.body;

  if (!currentPassword || !newPin) {
    return res.status(400).json({ error: 'Current admin password and new PIN are required' });
  }

  if (typeof newPin !== 'string' || !/^\d{4,6}$/.test(newPin)) {
    return res.status(400).json({ error: 'PIN must be a 4-to-6 digit numeric string' });
  }

  try {
    // 1. Verify current admin password
    const [users] = await db.query('SELECT password FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Authentication error' });
    }
    const match = await bcrypt.compare(currentPassword, users[0].password);
    if (!match) {
      return res.status(400).json({ error: 'Incorrect admin password' });
    }

    // 2. Hash and save the new deletion PIN
    const hashedPin = await bcrypt.hash(newPin, 10);
    const [existing] = await db.query('SELECT id FROM settings WHERE setting_key = ?', ['delete_pin']);
    if (existing.length > 0) {
      await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [hashedPin, 'delete_pin']);
    } else {
      await db.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['delete_pin', hashedPin]);
    }

    res.json({ message: 'Deletion PIN updated successfully' });
  } catch (err) {
    console.error('Update delete PIN error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get list of Windows WIA scanners
router.get('/scanners', async (req, res) => {
  try {
    const list = await scanner.listScanners();
    res.json(list);
  } catch (err) {
    console.error('List scanners route error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper to get logical drives on Windows
const getDrives = () => {
  return new Promise((resolve) => {
    exec('wmic logicaldisk get name', (err, stdout) => {
      if (err) return resolve(['C:\\']);
      const drives = stdout.split('\r\n')
        .map(line => line.trim())
        .filter(line => /^[A-Z]:$/i.test(line))
        .map(drive => drive + '\\');
      resolve(drives.length ? drives : ['C:\\']);
    });
  });
};

// Browse folder using native Windows Dialog
router.post('/browse-folder', async (req, res) => {
  try {
    const folderPath = await scanner.browseFolder();
    res.json({ path: folderPath });
  } catch (err) {
    console.error('Browse folder route error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Browse local directories (web directory picker)
router.get('/local-dir', async (req, res) => {
  try {
    let currentPath = req.query.path || '';

    // If no path, return Windows drives list
    if (!currentPath) {
      const drives = await getDrives();
      return res.json({
        currentPath: '',
        parent: null,
        directories: drives
      });
    }

    const resolvedPath = path.resolve(currentPath);
    let items = [];
    try {
      items = fs.readdirSync(resolvedPath, { withFileTypes: true });
    } catch (readErr) {
      console.warn(`[LocalDir] Inaccessible folder ${resolvedPath}:`, readErr.message);
      const parentPath = path.dirname(resolvedPath);
      return res.json({
        currentPath: resolvedPath,
        parent: parentPath === resolvedPath ? null : parentPath,
        directories: []
      });
    }

    const directories = [];
    for (const item of items) {
      try {
        if (item.isDirectory() && !item.name.startsWith('$') && item.name !== 'System Volume Information' && item.name !== 'Config.Msi') {
          directories.push(item.name);
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    }

    const parentPath = path.dirname(resolvedPath);

    res.json({
      currentPath: resolvedPath,
      parent: parentPath === resolvedPath ? null : parentPath,
      directories: directories.sort((a, b) => a.localeCompare(b))
    });
  } catch (err) {
    console.error('Browse local-dir error:', err.message);
    res.json({ currentPath: '', parent: null, directories: [] });
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const scanner = require('../utils/scanner');
const { processDocumentOcr } = require('../utils/ocrParser');
const { requireAuth } = require('../middleware/auth');
const {
  isValidId,
  sanitizeStr,
  escapeLikeWildcards,
  isValidDate,
  isValidPhoto,
  getGuestWithStatus,
  getGuestsWithStatusBatch
} = require('../utils/helpers');

const router = express.Router();

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper to get date directory path YYYY/MonthName/Day (e.g. 2026/August/22) based on date object or ISO date string
const getYearMonthDayFolder = (baseDir, dateObj = new Date()) => {
  let d = dateObj;
  if (typeof dateObj === 'string') {
    d = new Date(dateObj);
    if (isNaN(d.getTime())) d = new Date();
  }
  const year = String(d.getFullYear());
  const monthName = MONTH_NAMES[d.getMonth()] || 'January';
  const day = String(d.getDate());
  const targetDir = path.join(baseDir, year, monthName, day);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
};

// Helper to search for photocopy file across date subfolders and root folder
const findPhotocopyFilePath = (baseDir, idNum) => {
  if (!baseDir || !fs.existsSync(baseDir) || !idNum) return null;
  const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

  const searchQueue = [baseDir];
  while (searchQueue.length > 0) {
    const currentDir = searchQueue.shift();
    try {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const ext of extensions) {
        const candidate = path.join(currentDir, `${idNum}${ext}`);
        if (fs.existsSync(candidate)) return candidate;
        const candidateLower = path.join(currentDir, `${idNum}${ext.toLowerCase()}`);
        if (fs.existsSync(candidateLower)) return candidateLower;
      }
      for (const item of items) {
        if (item.isDirectory()) {
          searchQueue.push(path.join(currentDir, item.name));
        }
      }
    } catch (e) {}
  }
  return null;
};

// Public endpoint to serve scanned document copies (accessed by image tags without auth headers)
router.get('/scan-copy/:idNum', async (req, res) => {
  try {
    const rawIdNum = req.params.idNum;
    if (!rawIdNum || typeof rawIdNum !== 'string' || !/^[a-zA-Z0-9_\-\.]+$/.test(rawIdNum) || rawIdNum.includes('..')) {
      return res.status(400).json({ error: 'Invalid document ID format' });
    }
    const idNum = path.basename(rawIdNum);

    // 1. Check permanent uploads first (search recursively across date folders)
    const destDir = path.join(__dirname, '..', 'uploads', 'photocopies');
    const foundPath = findPhotocopyFilePath(destDir, idNum);
    if (foundPath) {
      return res.sendFile(foundPath);
    }

    // 2. Fallback to check the temporary/custom scanner folder (search recursively across archive/date folders)
    const [rows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = "scanner_folder"');
    const scannerFolder = rows[0]?.setting_value;
    if (scannerFolder) {
      const foundScannerPath = findPhotocopyFilePath(scannerFolder, idNum);
      if (foundScannerPath) {
        return res.sendFile(foundScannerPath);
      }
    }
    
    return res.status(404).json({ error: 'Scanned document photocopy not found' });
  } catch (err) {
    console.error('Fetch scanned copy error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply requireAuth to all subsequent endpoints in this router
router.use(requireAuth);

// Get specific guest's photo copy on-demand (keeps bulk guest list payloads extremely lightweight)
router.get('/:id/photo', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid guest ID format' });
  }
  try {
    const [rows] = await db.query('SELECT photo FROM guests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Guest record not found' });
    }
    res.json({ photo: rows[0].photo || null });
  } catch (err) {
    console.error('Get guest photo error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const saveScannedCopy = async (idNum) => {
  try {
    const [rows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = "scanner_folder"');
    const scannerFolder = rows[0]?.setting_value;
    if (!scannerFolder || !fs.existsSync(scannerFolder)) return;

    // Search for file in scanner output folder (including archive/date subfolders)
    const foundFile = findPhotocopyFilePath(scannerFolder, idNum);

    if (foundFile) {
      const foundExt = path.extname(foundFile).toLowerCase() || '.jpg';
      const rootUploads = path.join(__dirname, '..', 'uploads', 'photocopies');
      const destDir = getYearMonthDayFolder(rootUploads);
      const destPath = path.join(destDir, `${idNum}${foundExt}`);
      fs.copyFileSync(foundFile, destPath);
      console.log(`Successfully saved scanned copy for ID ${idNum} to ${destPath}`);
    }
  } catch (err) {
    console.error('saveScannedCopy error:', err.message);
  }
};

const saveBase64Photocopy = async (idNum, base64Data) => {
  if (!base64Data) return;
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return;
    const buffer = Buffer.from(matches[2], 'base64');
    
    const rootUploads = path.join(__dirname, '..', 'uploads', 'photocopies');
    const destDir = getYearMonthDayFolder(rootUploads);
    const destPath = path.join(destDir, `${idNum}.jpg`);
    fs.writeFileSync(destPath, buffer);
    console.log(`Saved base64 photocopy to uploads date folder: ${destPath}`);

    const [settingsRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = "scanner_folder"');
    const scannerFolder = settingsRows[0]?.setting_value;
    if (scannerFolder) {
      const archiveDir = getYearMonthDayFolder(path.join(scannerFolder, 'archive'));
      const customPath = path.join(archiveDir, `${idNum}.jpg`);
      fs.writeFileSync(customPath, buffer);
      console.log(`Saved base64 photocopy to custom folder archive: ${customPath}`);
    }
  } catch (err) {
    console.error('saveBase64Photocopy error:', err.message);
  }
};

const renamePhotocopy = async (oldIdNum, newIdNum) => {
  if (!oldIdNum || !newIdNum || oldIdNum === newIdNum) return;
  try {
    const rootUploads = path.join(__dirname, '..', 'uploads', 'photocopies');
    const oldPath = findPhotocopyFilePath(rootUploads, oldIdNum);
    if (oldPath) {
      const ext = path.extname(oldPath).toLowerCase();
      const newPath = path.join(path.dirname(oldPath), `${newIdNum}${ext}`);
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed permanent photocopy from ${oldIdNum} to ${newIdNum} at ${newPath}`);
    }

    const [settingsRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = "scanner_folder"');
    const scannerFolder = settingsRows[0]?.setting_value;
    if (scannerFolder) {
      const oldScannerPath = findPhotocopyFilePath(scannerFolder, oldIdNum);
      if (oldScannerPath) {
        const ext = path.extname(oldScannerPath);
        const newScannerPath = path.join(path.dirname(oldScannerPath), `${newIdNum}${ext}`);
        fs.renameSync(oldScannerPath, newScannerPath);
        console.log(`Renamed custom folder photocopy from ${oldIdNum} to ${newIdNum} at ${newScannerPath}`);
      }
    }
  } catch (err) {
    console.error('renamePhotocopy error:', err.message);
  }
};

// Get guests for a date or date range (excluding deleted, omitting photo field for speed)
router.get('/', async (req, res) => {
  const { date, startDate, endDate, show_hidden } = req.query;
  try {
    let sql = 'SELECT id, name, id_num, doc_type, nationality, dob, expiry_date, phone, raw_data, checked_in, check_in_time, saved_date, hidden, status, warning_date, warning_reason, blocked_date, blocked_reason, deleted, delete_reason, deleted_at, created_at, updated_at FROM guests WHERE deleted = 0';
    const params = [];

    if (startDate && endDate && isValidDate(startDate) && isValidDate(endDate)) {
      sql += ' AND saved_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (date && isValidDate(date)) {
      sql += ' AND saved_date = ?';
      params.push(date);
    } else {
      return res.status(400).json({ error: 'Valid date (YYYY-MM-DD) or date range (startDate/endDate) is required' });
    }

    if (show_hidden !== 'true') sql += ' AND hidden = 0';
    sql += ' ORDER BY id DESC';

    const [rows] = await db.query(sql, params);
    const refDate = date || endDate || new Date().toISOString().split('T')[0];
    const results = await getGuestsWithStatusBatch(rows, refDate);
    res.json(results);
  } catch (err) {
    console.error('Get guests error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lookup guest by ID, extracted barcode QID, phone, or name (checks deleted exact IDs to trigger restore)
router.get('/lookup', async (req, res) => {
  const rawQ = req.query.q || '';
  const q = sanitizeStr(rawQ, 200);
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  try {
    const cleanQ = q.trim().toLowerCase();

    // 1. Check exact ID number match (includes deleted)
    let [rows] = await db.query(
      'SELECT * FROM guests WHERE LOWER(id_num) = ?',
      [cleanQ]
    );

    // 2. If not found, try extracting 11-digit QID pattern from barcode payload (e.g. 29812345678 or 30112345678)
    if (rows.length === 0) {
      const qidMatch = q.match(/\b([23]\d{10})\b/);
      if (qidMatch) {
        [rows] = await db.query(
          'SELECT * FROM guests WHERE LOWER(id_num) = ?',
          [qidMatch[1].toLowerCase()]
        );
      }
    }

    // 3. If not found, check if query matches phone number or contains ID
    if (rows.length === 0) {
      [rows] = await db.query(
        'SELECT * FROM guests WHERE (LOWER(phone) = ? OR LOWER(id_num) LIKE ?) AND deleted = 0',
        [cleanQ, `%${cleanQ}%`]
      );
    }

    // 4. If not found, check name match (only active)
    if (rows.length === 0) {
      const escapedQ = escapeLikeWildcards(cleanQ);
      [rows] = await db.query(
        'SELECT * FROM guests WHERE LOWER(name) LIKE ? AND deleted = 0',
        [`%${escapedQ}%`]
      );
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    const [settings] = await db.query(
      'SELECT setting_value FROM settings WHERE setting_key = "operational_date"'
    );
    const operationalDate = settings[0]?.setting_value;

    const guest = await getGuestWithStatus(rows[0], operationalDate);
    if (rows[0].deleted) {
      guest.isDeleted = true;
    }
    res.json(guest);
  } catch (err) {
    console.error('Lookup error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all guests (Guest Management page)
router.get('/all', async (req, res) => {
  const q = sanitizeStr(req.query.q, 100);
  const status = req.query.status;
  const showDeleted = req.query.show_deleted === 'true';
  const VALID_STATUSES = ['ok', 'warning', 'blocked'];

  try {
    const [settings] = await db.query(
      'SELECT setting_value FROM settings WHERE setting_key = "operational_date"'
    );
    const operationalDate = settings[0]?.setting_value;

    let sql = 'SELECT id, name, id_num, doc_type, nationality, dob, expiry_date, phone, raw_data, checked_in, check_in_time, saved_date, hidden, status, warning_date, warning_reason, blocked_date, blocked_reason, deleted, delete_reason, deleted_at, created_at, updated_at FROM guests WHERE deleted = ?';
    const params = [showDeleted ? 1 : 0];
    if (q) {
      const escapedQ = escapeLikeWildcards(q.toLowerCase());
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(id_num) LIKE ?)';
      params.push(`%${escapedQ}%`, `%${escapedQ}%`);
    }
    if (status && VALID_STATUSES.includes(status)) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY id DESC';

    // Limit output to prevent browser and network freezes if no search/filter parameters are applied
    if (!q && !status) {
      sql += ' LIMIT 300';
    }

    const [rows] = await db.query(sql, params);
    const results = await getGuestsWithStatusBatch(rows, operationalDate);
    res.json(results);
  } catch (err) {
    console.error('Get all guests error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new guest
router.post('/', async (req, res) => {
  const name      = sanitizeStr(req.body.name, 255);
  const idNum     = sanitizeStr(req.body.idNum, 100);
  const docType   = sanitizeStr(req.body.docType, 50);
  const nationality = sanitizeStr(req.body.nationality, 100);
  const dob       = sanitizeStr(req.body.dob, 10);
  const expiryDate = sanitizeStr(req.body.expiryDate, 10);
  const phone     = sanitizeStr(req.body.phone, 50);
  const rawData   = typeof req.body.rawData === 'string' ? req.body.rawData.slice(0, 2000) : null;
  const photo     = req.body.photo || null;
  const checkedIn = !!req.body.checkedIn;

  if (!name || !idNum || !docType || !nationality || !dob || !expiryDate) {
    return res.status(400).json({ error: 'Missing required guest fields' });
  }
  if (!isValidDate(dob) || !isValidDate(expiryDate)) {
    return res.status(400).json({ error: 'Invalid date format (expected YYYY-MM-DD)' });
  }
  if (!isValidPhoto(photo)) {
    return res.status(400).json({ error: 'Invalid photo format' });
  }

  try {
    const [dups] = await db.query('SELECT id, deleted FROM guests WHERE id_num = ?', [idNum]);
    if (dups.length > 0) {
      if (dups[0].deleted) {
        return res.status(400).json({ error: 'GUEST_SOFT_DELETED', id: dups[0].id });
      }
      return res.status(400).json({ error: 'Guest with this ID number already exists' });
    }

    const [settings] = await db.query(
      'SELECT setting_value FROM settings WHERE setting_key = "operational_date"'
    );
    const operationalDate = settings[0]?.setting_value;
    if (!operationalDate) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const checkInTime = checkedIn ? new Date().toLocaleTimeString('en-GB') : null;

    const [result] = await db.query(
      `INSERT INTO guests 
       (name, id_num, doc_type, nationality, dob, expiry_date, phone, raw_data, photo, checked_in, check_in_time, saved_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, idNum, docType, nationality, dob, expiryDate, phone || null, rawData || null, photo || null,
        checkedIn ? 1 : 0, checkInTime, operationalDate]
    );

    const photoCopy = req.body.photoCopy || null;
    if (photoCopy) {
      await saveBase64Photocopy(idNum, photoCopy);
    } else {
      await saveScannedCopy(idNum);
    }

    const [inserted] = await db.query('SELECT * FROM guests WHERE id = ?', [result.insertId]);
    res.status(201).json(await getGuestWithStatus(inserted[0], operationalDate));
  } catch (err) {
    console.error('Create guest error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update guest
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid guest ID' });

  const name       = sanitizeStr(req.body.name, 255);
  const idNum      = sanitizeStr(req.body.idNum, 100);
  const docType    = sanitizeStr(req.body.docType, 50);
  const nationality = sanitizeStr(req.body.nationality, 100);
  const dob        = sanitizeStr(req.body.dob, 10);
  const expiryDate = sanitizeStr(req.body.expiryDate, 10);
  const phone      = sanitizeStr(req.body.phone, 50);
  const rawData    = typeof req.body.rawData === 'string' ? req.body.rawData.slice(0, 2000) : null;
  const photo      = req.body.photo || null;

  if (!name || !idNum || !docType || !nationality || !dob || !expiryDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isValidDate(dob) || !isValidDate(expiryDate)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  if (!isValidPhoto(photo)) {
    return res.status(400).json({ error: 'Invalid photo format' });
  }

  try {
    const [existing] = await db.query('SELECT id, id_num FROM guests WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Guest not found' });
    const oldIdNum = existing[0].id_num;

    const [dups] = await db.query('SELECT id, deleted FROM guests WHERE id_num = ? AND id != ?', [idNum, id]);
    if (dups.length > 0) {
      if (dups[0].deleted) {
        return res.status(400).json({ error: 'GUEST_SOFT_DELETED', id: dups[0].id });
      }
      return res.status(400).json({ error: 'Another guest with this ID number already exists' });
    }

    await db.query(
      `UPDATE guests SET name=?, id_num=?, doc_type=?, nationality=?, dob=?, expiry_date=?, phone=?, raw_data=?, photo=? WHERE id=?`,
      [name, idNum, docType, nationality, dob, expiryDate, phone || null, rawData || null, photo || null, id]
    );

    const photoCopy = req.body.photoCopy || null;
    if (photoCopy) {
      await saveBase64Photocopy(idNum, photoCopy);
    } else {
      if (oldIdNum !== idNum) {
        await renamePhotocopy(oldIdNum, idNum);
      }
      await saveScannedCopy(idNum);
    }

    const [settings] = await db.query(
      'SELECT setting_value FROM settings WHERE setting_key = "operational_date"'
    );
    const operationalDate = settings[0]?.setting_value;

    const [updated] = await db.query('SELECT * FROM guests WHERE id = ?', [id]);
    res.json(await getGuestWithStatus(updated[0], operationalDate));
  } catch (err) {
    console.error('Update guest error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check in guest
router.put('/:id/check-in', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid guest ID' });

  try {
    const [existing] = await db.query('SELECT id FROM guests WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Guest not found' });

    const [settings] = await db.query(
      'SELECT setting_value FROM settings WHERE setting_key = "operational_date"'
    );
    const operationalDate = settings[0]?.setting_value;
    if (!operationalDate) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const checkInTime = new Date().toLocaleTimeString('en-GB');
    await db.query(
      'UPDATE guests SET checked_in = 1, check_in_time = ?, saved_date = ? WHERE id = ?', 
      [checkInTime, operationalDate, id]
    );
    res.json({ message: 'Checked in successfully', checkInTime });
  } catch (err) {
    console.error('Check-in error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update guest status (warning / blocked / ok)
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid guest ID' });

  const VALID_STATUSES = ['ok', 'warning', 'blocked'];
  const status = req.body.status;
  const reason = sanitizeStr(req.body.reason, 500);
  const byUser = req.user; // from JWT — not from body

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  if (!reason) {
    return res.status(400).json({ error: 'Reason is required' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM guests WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Guest not found' });

    const todayStr = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toLocaleString('en-GB');

    let warningDate = null, warningReason = null;
    let blockedDate = null, blockedReason = null;
    if (status === 'warning') { warningDate = todayStr; warningReason = reason; }
    else if (status === 'blocked') { blockedDate = todayStr; blockedReason = reason; }

    await db.query(
      `UPDATE guests SET status=?, warning_date=?, warning_reason=?, blocked_date=?, blocked_reason=? WHERE id=?`,
      [status, warningDate, warningReason, blockedDate, blockedReason, id]
    );
    await db.query(
      `INSERT INTO status_history (guest_id, type, reason, date, by_user) VALUES (?, ?, ?, ?, ?)`,
      [id, status, reason, nowStr, byUser]
    );

    const [settings] = await db.query(
      'SELECT setting_value FROM settings WHERE setting_key = "operational_date"'
    );
    const operationalDate = settings[0]?.setting_value;

    const [updated] = await db.query('SELECT * FROM guests WHERE id = ?', [id]);
    res.json(await getGuestWithStatus(updated[0], operationalDate));
  } catch (err) {
    console.error('Update status error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle hidden
router.put('/:id/hide', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid guest ID' });

  try {
    const [existing] = await db.query('SELECT hidden FROM guests WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Guest not found' });

    const newHidden = existing[0].hidden ? 0 : 1;
    await db.query('UPDATE guests SET hidden = ? WHERE id = ?', [newHidden, id]);
    res.json({ message: 'Hidden status updated', hidden: !!newHidden });
  } catch (err) {
    console.error('Toggle hide error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete guest (PIN code-protected, soft-delete)
router.post('/:id/delete', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid guest ID' });

  const pin = req.body.pin;
  const reason = sanitizeStr(req.body.reason || '', 500) || 'No reason provided';
  const byUser = req.user; // from JWT

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'Deletion PIN is required' });
  }

  try {
    // 1. Retrieve the delete PIN setting
    const [settings] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['delete_pin']);
    if (settings.length === 0) {
      return res.status(500).json({ error: 'Delete PIN setting is not configured.' });
    }

    // 2. Verify PIN
    const match = await bcrypt.compare(pin, settings[0].setting_value);
    if (!match) {
      return res.status(403).json({ error: 'Incorrect Deletion PIN' });
    }

    const [existing] = await db.query('SELECT id FROM guests WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Guest not found' });

    // 3. Soft delete guest — store reason and timestamp, log to history
    const nowStr = new Date().toLocaleString('en-GB');
    await db.query(
      'UPDATE guests SET deleted = 1, delete_reason = ?, deleted_at = ? WHERE id = ?',
      [reason, nowStr, id]
    );
    await db.query(
      `INSERT INTO status_history (guest_id, type, reason, date, by_user) VALUES (?, ?, ?, ?, ?)`,
      [id, 'deleted', reason, nowStr, byUser]
    );

    res.json({ message: 'Guest deleted successfully' });
  } catch (err) {
    console.error('Delete guest error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk Restore guests (soft-delete recovery, PIN protected)
router.post('/bulk-restore', async (req, res) => {
  const { ids, pin } = req.body;
  const byUser = req.user;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'At least one guest ID must be selected' });
  }
  if (!ids.every(id => isValidId(id))) {
    return res.status(400).json({ error: 'Invalid guest ID format in array' });
  }
  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'Deletion PIN is required to restore guest records' });
  }

  try {
    const [settings] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['delete_pin']);
    if (settings.length === 0) {
      return res.status(500).json({ error: 'Delete PIN setting is not configured.' });
    }

    const match = await bcrypt.compare(pin, settings[0].setting_value);
    if (!match) {
      return res.status(403).json({ error: 'Incorrect Deletion PIN' });
    }

    const nowStr = new Date().toLocaleString('en-GB');
    const placeholders = ids.map(() => '?').join(',');

    await db.query(
      `UPDATE guests SET deleted = 0, delete_reason = NULL, deleted_at = NULL WHERE id IN (${placeholders})`,
      ids
    );

    for (const guestId of ids) {
      await db.query(
        `INSERT INTO status_history (guest_id, type, reason, date, by_user) VALUES (?, ?, ?, ?, ?)`,
        [guestId, 'ok', 'Restored/Recovered guest record (bulk operation)', nowStr, byUser]
      );
    }

    res.json({ message: `Successfully restored ${ids.length} guest records` });
  } catch (err) {
    console.error('Bulk restore error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk Permanently delete guests (hard-delete, PIN protected)
router.post('/bulk-permanent', async (req, res) => {
  const { ids, pin } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'At least one guest ID must be selected' });
  }
  if (!ids.every(id => isValidId(id))) {
    return res.status(400).json({ error: 'Invalid guest ID format in array' });
  }
  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'Deletion PIN is required for permanent deletion.' });
  }

  try {
    const [settings] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['delete_pin']);
    if (settings.length === 0) {
      return res.status(500).json({ error: 'Delete PIN setting is not configured.' });
    }

    const match = await bcrypt.compare(pin, settings[0].setting_value);
    if (!match) {
      return res.status(403).json({ error: 'Incorrect Deletion PIN' });
    }

    const placeholders = ids.map(() => '?').join(',');
    await db.query(`DELETE FROM guests WHERE id IN (${placeholders})`, ids);
    res.json({ message: `Successfully permanently deleted ${ids.length} guest records.` });
  } catch (err) {
    console.error('Bulk permanent delete error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore guest (soft-delete recovery, PIN protected)
router.post('/:id/restore', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid guest ID' });

  const { pin } = req.body;
  const byUser = req.user;

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'Deletion PIN is required to restore guest record' });
  }

  try {
    // 1. Verify delete PIN
    const [settings] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['delete_pin']);
    if (settings.length === 0) {
      return res.status(500).json({ error: 'Delete PIN setting is not configured.' });
    }

    const match = await bcrypt.compare(pin, settings[0].setting_value);
    if (!match) {
      return res.status(403).json({ error: 'Incorrect Deletion PIN' });
    }

    const [existing] = await db.query('SELECT id FROM guests WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Guest not found' });

    const nowStr = new Date().toLocaleString('en-GB');
    await db.query(
      'UPDATE guests SET deleted = 0, delete_reason = NULL, deleted_at = NULL WHERE id = ?',
      [id]
    );
    await db.query(
      `INSERT INTO status_history (guest_id, type, reason, date, by_user) VALUES (?, ?, ?, ?, ?)`,
      [id, 'ok', 'Restored/Recovered guest record', nowStr, byUser]
    );

    res.json({ message: 'Guest restored successfully' });
  } catch (err) {
    console.error('Restore guest error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Permanently delete guest (hard-delete, PIN protected)
router.post('/:id/permanent', async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid guest ID' });

  const { pin } = req.body;

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'Deletion PIN is required for permanent deletion.' });
  }

  try {
    // 1. Verify delete PIN
    const [settings] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['delete_pin']);
    if (settings.length === 0) {
      return res.status(500).json({ error: 'Delete PIN setting is not configured.' });
    }

    const match = await bcrypt.compare(pin, settings[0].setting_value);
    if (!match) {
      return res.status(403).json({ error: 'Incorrect Deletion PIN' });
    }

    const [existing] = await db.query('SELECT id FROM guests WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Guest not found' });

    // Hard-delete the guest
    await db.query('DELETE FROM guests WHERE id = ?', [id]);
    res.json({ message: 'Guest permanently deleted from database.' });
  } catch (err) {
    console.error('Permanent delete error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});





// Scan and detect new file from physical/network scanner hardware or scanner folder watch
router.post('/scan-detect', async (req, res) => {
  try {
    const { docType } = req.body; // 'QID' or 'Passport'
    
    const [settings] = await db.query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("scanner_folder", "selected_scanner")');
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
    
    let scannerFolder = settingsMap['scanner_folder'];
    const selectedScanner = settingsMap['selected_scanner'];

    // Default scanner folder if not configured
    if (!scannerFolder) {
      scannerFolder = path.join(__dirname, '..', 'uploads', 'scans');
    }

    if (!fs.existsSync(scannerFolder)) {
      try {
        fs.mkdirSync(scannerFolder, { recursive: true });
      } catch (err) {
        return res.status(400).json({ error: `Scanner folder could not be created: ${err.message}` });
      }
    }

    // Helper to find the newest valid scan image in the scanner folder.
    // maxAgeSeconds: only return files modified within this window (default 300s = 5 min).
    // Set to 0 to disable age filtering (pick any image in folder).
    const getLatestScanFile = (folder, maxAgeSeconds = 300) => {
      if (!fs.existsSync(folder)) return null;
      const validExts = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'];
      const nowMs = Date.now();
      const cutoffMs = maxAgeSeconds > 0 ? nowMs - (maxAgeSeconds * 1000) : 0;
      try {
        const files = fs.readdirSync(folder);
        const imageFiles = [];
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (!validExts.includes(ext)) continue;
          const filePath = path.join(folder, file);
          try {
            const stats = fs.statSync(filePath);
            // Skip files older than our cutoff window (stale/leftover from previous sessions)
            if (maxAgeSeconds > 0 && stats.mtimeMs < cutoffMs) continue;
            imageFiles.push({ path: filePath, name: file, mtime: stats.mtimeMs });
          } catch {
            // skip unreadable files
          }
        }
        imageFiles.sort((a, b) => b.mtime - a.mtime);
        return imageFiles.length > 0 ? imageFiles[0].path : null;
      } catch {
        return null;
      }
    };

    let targetScanFile = getLatestScanFile(scannerFolder);
    let scanSource = targetScanFile ? 'folder' : '';
    let wiaError = null;

    // Step A: If no recent scan file in folder and a WIA device is selected, attempt direct WIA scan.
    // TWAIN and PnP devices cannot be commanded directly — they use folder-watch mode only.
    const isWiaDevice = selectedScanner &&
      !selectedScanner.startsWith('twain_') &&
      !selectedScanner.startsWith('pnp_') &&
      !selectedScanner.startsWith('warning_');
    if (!targetScanFile && isWiaDevice) {
      const scanFile = path.join(scannerFolder, `Scan_${Date.now()}.jpg`);
      try {
        console.log(`Triggering direct hardware scan on device: ${selectedScanner}...`);
        await scanner.triggerScan(selectedScanner, scanFile);
        if (fs.existsSync(scanFile)) {
          targetScanFile = scanFile;
          scanSource = 'hardware';
        }
      } catch (scanErr) {
        // Trim the raw PowerShell error to a clean 1-line summary (max 200 chars)
        // The full dump can be hundreds of chars long — don't send it all to the UI
        const rawMsg = (scanErr.message || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        const firstSentence = rawMsg.split(/[.;+`]/).find(s => s.trim().length > 10) || rawMsg;
        wiaError = firstSentence.trim().slice(0, 200);
        console.warn('Direct hardware trigger failed:', scanErr.message);
      }
    }

    // Step B: Check scanner folder again (catches files placed there during WIA attempt or by native scanner software)
    if (!targetScanFile) {
      targetScanFile = getLatestScanFile(scannerFolder);
      if (targetScanFile) {
        scanSource = 'folder';
      }
    }

    // Step C: If NEITHER folder file nor direct scan succeeded, retrieve scanner list and return 412
    if (!targetScanFile) {
      // Always fetch available scanners so the config modal can show them regardless of error type
      const availableScanners = await scanner.listScanners();
      if (availableScanners.length === 0) {
        return res.status(412).json({
          error: 'NO_HARDWARE_FOUND',
          message: wiaError
            ? `Scanner hardware found but scan failed: ${wiaError}. Please place the scanned document image directly into the folder: ${scannerFolder}`
            : `No physical scanner hardware or scan files detected. Please scan a document into ${scannerFolder}, or use Camera/Upload scan.`,
          scanners: [],
          scannerFolder
        });
      }
      return res.status(412).json({
        error: 'NO_SCAN_FILE_FOUND',
        message: `No document image found in scanner output folder (${scannerFolder}). Please insert the document and scan it, then click Scan again.`,
        scanners: availableScanners,
        scannerFolder,
        wiaError: wiaError || null
      });
    }

    // Step D: Process document OCR on targetScanFile
    const detectedData = await processDocumentOcr(targetScanFile, path.basename(targetScanFile), docType);
    const ext = path.extname(targetScanFile);
    
    // Uniquify generic/unknown ID numbers to prevent file collisions
    const genericNames = ['unknown', 'image', 'scan', 'photo'];
    let idClean = (detectedData.idNum || '').toLowerCase().trim();
    if (!idClean || genericNames.includes(idClean) || idClean.length < 3) {
      detectedData.idNum = `UNKNOWN_${Date.now()}`;
    }
    // Sanitize to prevent directory traversal / arbitrary file write
    detectedData.idNum = detectedData.idNum.replace(/[^a-zA-Z0-9_-]/g, '');

    // Save permanently to uploads/photocopies/YYYY/MM/DD
    const rootUploads = path.join(__dirname, '..', 'uploads', 'photocopies');
    const destDir = getYearMonthDayFolder(rootUploads);
    const destPath = path.join(destDir, `${detectedData.idNum}${ext.toLowerCase()}`);
    fs.copyFileSync(targetScanFile, destPath);
    console.log(`Auto-saved photocopy permanently to uploads: ${destPath}`);

    // Archive scan file inside scannerFolder/archive/YYYY/MM/DD to prevent re-processing loops
    const archiveDir = getYearMonthDayFolder(path.join(scannerFolder, 'archive'));
    const archivePath = path.join(archiveDir, `${detectedData.idNum}${ext.toLowerCase()}`);
    try {
      fs.renameSync(targetScanFile, archivePath);
    } catch (renameErr) {
      fs.copyFileSync(targetScanFile, archivePath);
      try { fs.unlinkSync(targetScanFile); } catch (e) {}
    }
    console.log(`Saved copy inside archive folder: ${archivePath}`);

    // Archive companion metadata files if they exist to keep the watched folder clean
    const baseDir = path.dirname(targetScanFile);
    const baseName = path.basename(targetScanFile, ext);
    const companions = ['.json', '.xml', '.txt'];
    for (const compExt of companions) {
      const compPath = path.join(baseDir, `${baseName}${compExt}`);
      if (fs.existsSync(compPath)) {
        const compDest = path.join(archiveDir, `${detectedData.idNum}${compExt}`);
        try {
          fs.renameSync(compPath, compDest);
        } catch (e) {
          try {
            fs.copyFileSync(compPath, compDest);
            fs.unlinkSync(compPath);
          } catch (e2) {}
        }
      }
    }

    const base64Data = fs.readFileSync(archivePath).toString('base64');
    const mimeType = ext.toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    
    res.json({
      ...detectedData,
      scanSource,
      photoCopyBase64: `data:${mimeType};base64,${base64Data}`
    });
  } catch (err) {
    console.error('Scan detect error:', err.message);
    res.status(500).json({ error: 'Internal server error processing scan: ' + err.message });
  }
});
 
// Upload and detect file from client, extract information and save photo copy
router.post('/upload-detect', async (req, res) => {
  try {
    const { fileName, fileData, docType } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'Missing file name or data.' });
    }
 
    // Extract base64 data
    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image data.' });
    }
 
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = path.extname(fileName) || '.jpg';
 
    const detectedData = await processDocumentOcr(buffer, fileName, docType);
 
    // Uniquify generic/unknown ID numbers to prevent file collisions
    const genericNames = ['unknown', 'image', 'scan', 'photo'];
    let idClean = (detectedData.idNum || '').toLowerCase().trim();
    if (!idClean || genericNames.includes(idClean) || idClean.length < 3) {
      detectedData.idNum = `UNKNOWN_${Date.now()}`;
    }
    // Sanitize to prevent directory traversal / arbitrary file write
    detectedData.idNum = detectedData.idNum.replace(/[^a-zA-Z0-9_-]/g, '');

    // Save permanently to uploads/photocopies/YYYY/MM/DD
    const rootUploads = path.join(__dirname, '..', 'uploads', 'photocopies');
    const destDir = getYearMonthDayFolder(rootUploads);
    const destPath = path.join(destDir, `${detectedData.idNum}${ext.toLowerCase()}`);
    fs.writeFileSync(destPath, buffer);
    console.log(`Successfully saved uploaded photocopy for ID ${detectedData.idNum} to ${destPath}`);
 
    // ALSO save to selected scanner folder's archive/YYYY/MM/DD!
    const [settingsRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = "scanner_folder"');
    const scannerFolder = settingsRows[0]?.setting_value;
    if (scannerFolder && fs.existsSync(scannerFolder)) {
      const archiveDir = getYearMonthDayFolder(path.join(scannerFolder, 'archive'));
      const customPath = path.join(archiveDir, `${detectedData.idNum}${ext.toLowerCase()}`);
      fs.writeFileSync(customPath, buffer);
      console.log(`Saved copy to user selected custom archive folder: ${customPath}`);
    }

    res.json({
      ...detectedData,
      photoCopyBase64: fileData
    });
  } catch (err) {
    console.error('Upload detect error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});
 
module.exports = router;

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { isValidDate, sanitizeStr, escapeLikeWildcards, getGuestWithStatus, getGuestsWithStatusBatch } = require('../utils/helpers');

const router = express.Router();

// Apply requireAuth to all reports routes
router.use(requireAuth);

// Detail reports
router.get('/detail', async (req, res) => {
  const { dateFrom, dateTo, idNum, status, docType, checkedIn, nationality, minAge, maxAge } = req.query;
  const VALID_STATUSES = ['ok', 'warning', 'blocked'];
  const VALID_DOC_TYPES = ['QID', 'Passport'];

  try {
    let sql = 'SELECT * FROM guests WHERE deleted = 0';
    const params = [];

    if (dateFrom && isValidDate(dateFrom)) { sql += ' AND saved_date >= ?'; params.push(dateFrom); }
    if (dateTo && isValidDate(dateTo))     { sql += ' AND saved_date <= ?'; params.push(dateTo); }
    if (idNum) {
      const q = escapeLikeWildcards(sanitizeStr(idNum, 100).toLowerCase());
      sql += ' AND (LOWER(id_num) LIKE ? OR LOWER(name) LIKE ? OR LOWER(nationality) LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (checkedIn === 'in') { sql += ' AND checked_in = 1'; }
    else if (checkedIn === 'out') { sql += ' AND checked_in = 0'; }
    
    if (status && VALID_STATUSES.includes(status)) { sql += ' AND status = ?'; params.push(status); }
    if (docType && VALID_DOC_TYPES.includes(docType)) { sql += ' AND doc_type = ?'; params.push(docType); }
    
    if (nationality) {
      const natStr = escapeLikeWildcards(sanitizeStr(nationality, 100).toLowerCase());
      sql += ' AND LOWER(nationality) LIKE ?';
      params.push(`%${natStr}%`);
    }

    if (minAge) {
      // Calculate DOB threshold: DOB <= today - minAge years
      const minAgeVal = parseInt(minAge);
      if (!isNaN(minAgeVal)) {
        const thresholdDate = new Date();
        thresholdDate.setFullYear(thresholdDate.getFullYear() - minAgeVal);
        sql += ' AND dob <= ?';
        params.push(thresholdDate.toISOString().split('T')[0]);
      }
    }

    if (maxAge) {
      // Calculate DOB threshold: DOB >= today - maxAge years (exclusive of the next year birthday)
      const maxAgeVal = parseInt(maxAge);
      if (!isNaN(maxAgeVal)) {
        const thresholdDate = new Date();
        thresholdDate.setFullYear(thresholdDate.getFullYear() - maxAgeVal - 1);
        thresholdDate.setDate(thresholdDate.getDate() + 1);
        sql += ' AND dob >= ?';
        params.push(thresholdDate.toISOString().split('T')[0]);
      }
    }

    sql += ' ORDER BY id DESC';

    const [rows] = await db.query(sql, params);
    const results = await getGuestsWithStatusBatch(rows);
    res.json(results);
  } catch (err) {
    console.error('Report detail error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Summary reports
router.get('/summary', async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  try {
    let sql = 'SELECT id, checked_in, status, nationality FROM guests WHERE deleted = 0';
    const params = [];
    if (dateFrom && isValidDate(dateFrom)) { sql += ' AND saved_date >= ?'; params.push(dateFrom); }
    if (dateTo && isValidDate(dateTo))     { sql += ' AND saved_date <= ?'; params.push(dateTo); }

    const [rows] = await db.query(sql, params);
    const total = rows.length;
    const checkedIn = rows.filter(r => r.checked_in).length;
    const notCheckedIn = total - checkedIn;
    const totalWarning = rows.filter(r => r.status === 'warning').length;
    const totalBlocked = rows.filter(r => r.status === 'blocked').length;

    const nationalities = {};
    rows.forEach(r => {
      nationalities[r.nationality] = (nationalities[r.nationality] || 0) + 1;
    });
    const nationalityBreakdown = Object.entries(nationalities)
      .map(([nat, count]) => ({
        nationality: nat,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    res.json({ 
      total, 
      checkedIn, 
      totalGuests: total,
      totalCheckedIn: checkedIn,
      totalWarning,
      totalBlocked,
      notCheckedIn, 
      nationalityCount: nationalityBreakdown.length, 
      nationalityBreakdown 
    });
  } catch (err) {
    console.error('Report summary error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

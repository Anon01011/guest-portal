/**
 * License Routes for GuestManagementApp
 * Connects to FSQTAR Laravel Licence Manager at D:\FSQTAR-PROJECTS\license
 *
 * GET  /api/license/status   — current license state (for frontend gate & settings)
 * POST /api/license/activate — validate & store a new key in hardware vault
 * POST /api/license/renew    — submit license renewal request to Laravel server
 * POST /api/license/update   — update/change license key dynamically in vault
 * GET  /api/license/info     — full diagnostic details
 */

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const {
  checkLicense,
  getLicenseStatus,
  submitRenewalRequest,
  getDeviceId,
  getDeviceDomain,
  getLocalIpAddress,
  getLicenseServerUrl,
} = require('../middleware/license');

// ─── GET /api/license/status ─────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const s = await checkLicense();
  res.json({
    licensed:       s.licensed,
    clientName:     s.clientName   || null,
    expiresAt:      s.expiresAt    || null,
    reason:         s.reason       || null,
    fromCache:      s.fromCache    || false,
    graceRemaining: s.graceRemaining || null,
    isExpired:      s.isExpired    || false,
    checkedAt:      s.checkedAt    || s.validatedAt || null,
    keyPartial:     s.key ? s.key.slice(0, 9) + '...' : null,
    deviceId:       getDeviceId(),
    domain:         getDeviceDomain(),
    ipAddress:      getLocalIpAddress(),
    configured:     s.licensed || !!s.key,
    serverUrl:      getLicenseServerUrl(),
  });
});

// ─── POST /api/license/activate ──────────────────────────────────────────────
router.post('/activate', async (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.trim().length < 8) {
    return res.status(400).json({ success: false, error: 'A valid license key is required (format: FSQTAR-XXXXX-XXXXX-XXXXX).' });
  }

  const key = licenseKey.trim().toUpperCase();

  try {
    const result = await checkLicense(key);

    if (result.licensed) {
      return res.json({
        success:    true,
        licensed:   true,
        clientName: result.clientName,
        expiresAt:  result.expiresAt,
        message:    `License activated successfully for ${result.clientName || 'this installation'}!`,
      });
    } else {
      return res.status(403).json({
        success:  false,
        licensed: false,
        error:    result.reason || 'License key is invalid or not authorised for this device.',
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error communicating with licence server: ' + err.message });
  }
});

// ─── POST /api/license/renew ──────────────────────────────────────────────────
router.post('/renew', async (req, res) => {
  const { duration, notes } = req.body;

  if (!duration || typeof duration !== 'string') {
    return res.status(400).json({ success: false, error: 'Requested duration is required (e.g. 1_month, 6_months, 1_year, lifetime).' });
  }

  try {
    const response = await submitRenewalRequest(duration, notes || '');
    return res.json(response);
  } catch (err) {
    return res.status(400).json({
      success: false,
      error:   err.message || 'Failed to submit renewal request to license server.',
    });
  }
});

// ─── POST /api/license/update ─────────────────────────────────────────────────
router.post('/update', async (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.trim().length < 8) {
    return res.status(400).json({ success: false, error: 'A valid new license key is required.' });
  }

  const key = licenseKey.trim().toUpperCase();

  try {
    const result = await checkLicense(key);

    if (result.licensed) {
      return res.json({
        success:    true,
        licensed:   true,
        clientName: result.clientName,
        expiresAt:  result.expiresAt,
        message:    `License key updated successfully for ${result.clientName}!`,
      });
    } else {
      return res.status(403).json({
        success:  false,
        licensed: false,
        error:    result.reason || 'New license key is invalid or not authorised.',
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error communicating with licence server: ' + err.message });
  }
});

// ─── GET /api/license/info ───────────────────────────────────────────────────
router.get('/info', async (req, res) => {
  const s = await checkLicense();
  res.json({
    licensed:       s.licensed,
    clientName:     s.clientName   || null,
    expiresAt:      s.expiresAt    || null,
    reason:         s.reason       || null,
    fromCache:      s.fromCache    || false,
    graceRemaining: s.graceRemaining || null,
    isExpired:      s.isExpired    || false,
    checkedAt:      s.checkedAt    || s.validatedAt || null,
    keyPartial:     s.key ? s.key.slice(0, 9) + '...' : null,
    deviceId:       getDeviceId(),
    domain:         getDeviceDomain(),
    ipAddress:      getLocalIpAddress(),
    serverUrl:      getLicenseServerUrl(),
  });
});

module.exports = router;

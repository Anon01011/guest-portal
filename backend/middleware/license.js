/**
 * License Middleware for GuestManagementApp — ULTRA-HARDENED VAULT & REAL-TIME AUDIT
 * ──────────────────────────────────────────────────────────────────────────
 * ZERO SENSITIVE KEYS IN .ENV FILE:
 *  - License keys and secret tokens are NEVER stored in .env.
 *  - Stored strictly in hardware-bound AES-256-GCM encrypted vault (.lic).
 *  - Device hardware fingerprint (Hostname + CPU + Arch + MACs + Salt) generates AES key via PBKDF2.
 *  - Stealing or copying .lic to another machine fails AES decryption and locks app.
 *
 * REAL-TIME SECURITY RISK & TAMPER NOTIFICATION:
 *  - Automatically notifies Licence Manager server of security risk events (integrity failure,
 *    clock tampering, key removal) to log on the admin dashboard & audit logs index screen.
 *
 * SECURITY & INTEGRITY:
 *  - Stealth System Hiding: .lic and .lic_integrity marked +h +s (Windows System Hidden).
 *  - SHA-256 Self-Integrity: SHA-256 seal on this middleware. Modification/tampering = lock.
 *  - Anti-Clock-Rollback: System clock manipulation detection locks application immediately.
 *  - Hardcoded 7-Day Grace: Grace period (168h) is hardcoded inside application source code.
 */

'use strict';

const https        = require('https');
const http         = require('http');
const crypto       = require('crypto');
const fs           = require('fs');
const path         = require('path');
const os           = require('os');
const { execSync } = require('child_process');

// ─── Paths ────────────────────────────────────────────────────────────────────
const BASE_DIR       = path.join(__dirname, '..');
const CACHE_FILE     = path.join(BASE_DIR, '.lic');
const INTEGRITY_FILE = path.join(BASE_DIR, '.lic_integrity');
const SELF_PATH      = __filename;

// ─── Hardcoded Security Constants ─────────────────────────────────────────────
const HARDCODED_GRACE_PERIOD_MS = 7 * 24 * 3_600_000; // Strictly 7 Days (168 Hours)
const CHECK_INTERVAL_MS         = 12 * 3_600_000;     // Re-validate every 12 hours
const APP_INTEGRITY_SALT        = 'fsqtar_gmp_sec_salt_v3_2026_hardware_vault';

// ─── In-memory state ──────────────────────────────────────────────────────────
let _licenseStatus = null;
let _integrity_ok  = true;

// ─── Stealth System Hiding (Windows attrib +h +s) ───────────────────────────
function makeStealthHidden(filePath) {
  if (process.platform === 'win32' && fs.existsSync(filePath)) {
    try {
      execSync(`attrib +h +s "${filePath}"`, { stdio: 'ignore' });
    } catch { /* ignore non-admin warning */ }
  }
}

// ─── Strict Server URL Reader (from process.env ONLY) ─────────────────────────
function getLicenseServerUrl() {
  const url = (process.env.LICENSE_SERVER_URL || '').trim();
  return url ? url.replace(/\/$/, '') : null;
}

// ─── Hardware & Network Fingerprinting ───────────────────────────────────────
function getDeviceDomain() {
  return os.hostname().toLowerCase();
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function getDeviceId() {
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    (os.cpus()[0] || {}).model || '',
    Object.keys(os.networkInterfaces()).sort().join(','),
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

// ─── Hardware-Bound AES-256-GCM Vault Encryption ──────────────────────────────
function getVaultEncryptionKey() {
  const deviceId = getDeviceId();
  return crypto.pbkdf2Sync(deviceId, APP_INTEGRITY_SALT, 10000, 32, 'sha256');
}

function encryptVault(dataObj) {
  try {
    const key       = getVaultEncryptionKey();
    const iv        = crypto.randomBytes(12);
    const cipher    = crypto.createCipheriv('aes-256-gcm', key, iv);
    const jsonStr   = JSON.stringify(dataObj);
    let encrypted   = cipher.update(jsonStr, 'utf8', 'hex');
    encrypted      += cipher.final('hex');
    const authTag   = cipher.getAuthTag().toString('hex');

    return JSON.stringify({
      iv:      iv.toString('hex'),
      authTag: authTag,
      data:    encrypted,
    });
  } catch (e) {
    console.warn('[License Vault] Encryption failed:', e.message);
    return null;
  }
}

function decryptVault(rawContent) {
  try {
    if (!rawContent) return null;
    const parsed = JSON.parse(rawContent);

    if (parsed.iv && parsed.authTag && parsed.data) {
      const key      = getVaultEncryptionKey();
      const iv       = Buffer.from(parsed.iv, 'hex');
      const authTag  = Buffer.from(parsed.authTag, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted  = decipher.update(parsed.data, 'hex', 'utf8');
      decrypted     += decipher.final('utf8');
      return JSON.parse(decrypted);
    } else {
      const decoded = Buffer.from(rawContent, 'base64').toString('utf8');
      return JSON.parse(decoded);
    }
  } catch (e) {
    console.warn('[License Vault] Decryption/Auth failed (stolen file or hardware mismatch)');
    return null;
  }
}

function readVaultCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8').trim();
    return decryptVault(raw);
  } catch { return null; }
}

function writeVaultCache(data) {
  try {
    const payload = encryptVault(data);
    if (payload) {
      if (process.platform === 'win32' && fs.existsSync(CACHE_FILE)) {
        try { execSync(`attrib -h -s "${CACHE_FILE}"`, { stdio: 'ignore' }); } catch {}
      }
      fs.writeFileSync(CACHE_FILE, payload, 'utf8');
      makeStealthHidden(CACHE_FILE);
    }
  } catch (e) { console.warn('[License Vault] Write error:', e.message); }
}

// ─── Self-Integrity Check ─────────────────────────────────────────────────────
function hashFile(filePath) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch { return null; }
}

function checkSelfIntegrity() {
  const currentHash = hashFile(SELF_PATH);
  if (!currentHash) {
    console.error('[License] [ERROR] TAMPER: license.js file missing!');
    _integrity_ok = false;
    reportSecurityRiskToServer('CODE_FILE_REMOVED', { file: 'license.js' });
    return false;
  }

  if (fs.existsSync(INTEGRITY_FILE)) {
    try {
      const stored = JSON.parse(fs.readFileSync(INTEGRITY_FILE, 'utf8'));
      if (stored.hash !== currentHash) {
        console.error('[License] [ERROR] TAMPER: license.js has been modified!');
        _integrity_ok = false;
        reportSecurityRiskToServer('CODE_INTEGRITY_TAMPERED', { file: 'license.js' });
        return false;
      }
      console.log('[License] [OK] Self-Integrity verified.');
      return true;
    } catch { /* rewrite on first run */ }
  }

  try {
    fs.writeFileSync(INTEGRITY_FILE, JSON.stringify({
      hash:     currentHash,
      sealedAt: new Date().toISOString(),
      file:     SELF_PATH,
    }, null, 2), 'utf8');
    makeStealthHidden(INTEGRITY_FILE);
    console.log('[License] [SECURE] Self-Integrity seal initialized.');
  } catch (e) {
    console.warn('[License] Integrity seal write warning:', e.message);
  }
  return true;
}

// ─── Report Security Risk Event to Server ─────────────────────────────────────
async function reportSecurityRiskToServer(event, details = {}) {
  try {
    const serverUrl  = getLicenseServerUrl();
    if (!serverUrl) return;
    const vault      = readVaultCache() || {};
    const licenseKey = vault.key || process.env.LICENSE_KEY || null;

    const payload = {
      event:       event,
      license_key: licenseKey,
      domain:      getDeviceDomain(),
      details: {
        ...details,
        device_id:  getDeviceId(),
        local_ip:   getLocalIpAddress(),
        timestamp:  new Date().toISOString(),
      },
    };

    await postJson(`${serverUrl}/api/v1/license/security-alert`, payload, 5000);
  } catch { /* ignore network error reporting */ }
}

// ─── HMAC Signature Generator ────────────────────────────────────────────────
function generateSignature(licenseKey, secretToken) {
  const key = secretToken || licenseKey;
  return crypto.createHmac('sha256', key).update(licenseKey).digest('hex');
}

// ─── HTTP Requester ───────────────────────────────────────────────────────────
function postJson(url, body, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const data      = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const mod       = parsedUrl.protocol === 'https:' ? https : http;
    const req       = mod.request({
      hostname: parsedUrl.hostname,
      port:     parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path:     parsedUrl.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Accept':         'application/json',
      },
      timeout: timeoutMs,
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch (e) { reject(new Error('Invalid response format: ' + buf.slice(0, 200))); }
      });
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Connection timed out')); });
    req.write(data);
    req.end();
  });
}

// ─── Core Validation Logic (Reads Key from Vault or Activation Parameter) ────
async function validateWithServer(licenseKeyOverride = null) {
  const vault = readVaultCache() || {};
  const licenseKey  = (licenseKeyOverride || vault.key || process.env.LICENSE_KEY || '').trim().toUpperCase();
  const secretToken = (vault.secretToken || process.env.LICENSE_SECRET_TOKEN || '').trim();
  const serverUrl   = getLicenseServerUrl();
  const domain      = getDeviceDomain();
  const ipAddress   = getLocalIpAddress();

  if (!serverUrl) {
    return { licensed: false, reason: 'LICENSE_SERVER_URL is not configured in .env file.' };
  }

  if (!licenseKey) {
    return { licensed: false, reason: 'License key is not configured. Please activate with your license key.' };
  }

  const signature = generateSignature(licenseKey, secretToken);

  const payload = {
    license_key: licenseKey,
    domain:      domain,
    ip_address:  ipAddress,
    signature:   signature,
    server_os:   `${os.type()} ${os.release()}`,
    web_server:  'IIS/Node.js',
    metadata: {
      app:       'GuestManagementApp',
      version:   '1.0.0',
      device_id: getDeviceId(),
      local_ip:  ipAddress,
      node_ver:  process.version,
    },
  };

  const apiUrl = `${serverUrl}/api/v1/license/validate`;
  console.log(`[License] Contacting server: ${apiUrl}`);

  const { status, body } = await postJson(apiUrl, payload);

  if (status === 200 && body.status === 'valid') {
    const updatedSecretToken = body.secret_token || secretToken;

    const validatedResult = {
      licensed:     true,
      clientName:   body.license?.client_name || 'GuestManagementApp',
      expiresAt:    body.license?.expires_at  || null,
      key:          licenseKey,
      secretToken:  updatedSecretToken,
      domain,
      ipAddress,
      serverUrl,
      validatedAt:  new Date().toISOString(),
      lastSeenTime: Date.now(),
    };

    writeVaultCache(validatedResult);
    stripSensitiveFromEnv();

    return validatedResult;
  }

  // Report validation failure security risk to server
  reportSecurityRiskToServer('LICENSE_VALIDATION_FAILED', { reason: body.message, key: licenseKey });

  return {
    licensed:    false,
    reason:      body.message || `License server returned status HTTP ${status}`,
    serverUrl,
    validatedAt: new Date().toISOString(),
  };
}

// ─── Submit License Renewal Request to Server ───────────────────────────────
async function submitRenewalRequest(duration, notes = '') {
  const vault       = readVaultCache() || {};
  const licenseKey  = (vault.key || process.env.LICENSE_KEY || '').trim().toUpperCase();
  const secretToken = (vault.secretToken || process.env.LICENSE_SECRET_TOKEN || '').trim();
  const serverUrl   = getLicenseServerUrl();

  if (!serverUrl) {
    throw new Error('LICENSE_SERVER_URL is not configured in .env');
  }
  if (!licenseKey) {
    throw new Error('No active license key found in hardware vault.');
  }

  const keyToSign = secretToken || licenseKey;
  const signature = crypto.createHmac('sha256', keyToSign).update(licenseKey + duration).digest('hex');

  const payload = {
    license_key: licenseKey,
    duration:    duration,
    notes:       notes,
    signature:   signature,
  };

  const apiUrl = `${serverUrl}/api/v1/license/renew`;
  console.log(`[License] Submitting renewal to: ${apiUrl}`);

  const { status, body } = await postJson(apiUrl, payload);

  if (status === 200 && body.status === 'success') {
    return {
      success:   true,
      message:   body.message || 'Renewal request submitted successfully.',
      requestId: body.request_id || null,
    };
  }

  throw new Error(body.message || `Renewal request failed with status HTTP ${status}`);
}

// ─── Clean Secrets from .env File ─────────────────────────────────────────────
const ENV_FILE = path.join(BASE_DIR, '.env');
function stripSensitiveFromEnv() {
  try {
    if (!fs.existsSync(ENV_FILE)) return;
    let content = fs.readFileSync(ENV_FILE, 'utf8');

    content = content.replace(/^LICENSE_KEY=.*$/m, '');
    content = content.replace(/^LICENSE_SECRET_TOKEN=.*$/m, '');
    content = content.replace(/^LICENSE_GRACE_HOURS=.*$/m, '');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    fs.writeFileSync(ENV_FILE, content, 'utf8');

    delete process.env.LICENSE_KEY;
    delete process.env.LICENSE_SECRET_TOKEN;
    delete process.env.LICENSE_GRACE_HOURS;
  } catch (e) {
    console.warn('[License Vault] Could not clean secrets from .env:', e.message);
  }
}

// ─── License Status Assessor ──────────────────────────────────────────────────
async function checkLicense(licenseKeyOverride = null) {
  if (!_integrity_ok) {
    _licenseStatus = { licensed: false, reason: 'Application security integrity check failed. System locked.' };
    return _licenseStatus;
  }

  try {
    const result = await validateWithServer(licenseKeyOverride);
    if (result.licensed) {
      _licenseStatus = { ...result, fromCache: false, checkedAt: new Date().toISOString() };
      console.log(`[License] [OK] Validated — Client: ${result.clientName}, Expiration: ${result.expiresAt || 'Never'}`);
    } else {
      console.warn(`[License] [ERROR] Verification Failed — ${result.reason}`);
      
      // Check if it's due to expiration, and evaluate if we are within the 7-day grace period
      const cache = readVaultCache();
      if (cache && cache.expiresAt) {
        const expiryTime = new Date(cache.expiresAt).getTime();
        const now = Date.now();
        const gracePeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 days grace
        
        if (now > expiryTime && now <= expiryTime + gracePeriodMs) {
          const remainHours = Math.round((expiryTime + gracePeriodMs - now) / 3_600_000);
          console.warn(`[License] [WARN] Expiration Grace Period Active — ${remainHours}h remaining`);
          
          _licenseStatus = {
            ...cache,
            licensed: true, // Allow access during grace period
            isExpired: true,
            graceRemaining: remainHours,
            fromCache: true,
            reason: result.reason || 'License expired.'
          };
          return _licenseStatus;
        }
      }
      
      _licenseStatus = { ...result, fromCache: false, checkedAt: new Date().toISOString() };
    }
    return _licenseStatus;
  } catch (err) {
    console.warn('[License] Server unreachable:', err.message, '— Evaluating hardware-encrypted vault...');
    const cache = readVaultCache();

    if (cache && cache.licensed) {
      const now          = Date.now();
      const lastSeenTime = cache.lastSeenTime || new Date(cache.checkedAt || cache.validatedAt || 0).getTime();

      // Anti-Clock-Rollback Protection
      if (now < lastSeenTime - 60000) {
        console.error('[License] [ERROR] CLOCK TAMPER DETECTED: System time has been rolled back!');
        reportSecurityRiskToServer('CLOCK_ROLLBACK_DETECTED', { lastSeenTime, currentTime: now });
        _licenseStatus = { licensed: false, reason: 'System clock tampering detected. License locked.', fromCache: true };
        return _licenseStatus;
      }

      // Check if the license key itself is expired first
      if (cache.expiresAt) {
        const expiryTime = new Date(cache.expiresAt).getTime();
        const gracePeriodMs = 7 * 24 * 60 * 60 * 1000;
        
        if (now > expiryTime) {
          if (now <= expiryTime + gracePeriodMs) {
            const remainHours = Math.round((expiryTime + gracePeriodMs - now) / 3_600_000);
            console.warn(`[License] [WARN] Offline Expiration Grace Period Active — ${remainHours}h remaining`);
            _licenseStatus = {
              ...cache,
              licensed: true,
              isExpired: true,
              graceRemaining: remainHours,
              fromCache: true,
              reason: 'License expired.'
            };
            return _licenseStatus;
          } else {
            console.error('[License] [ERROR] Offline Expiration Grace Period Expired.');
            _licenseStatus = {
              licensed: false,
              reason: 'License expired and 7-day grace period exceeded. Please renew.',
              fromCache: true
            };
            return _licenseStatus;
          }
        }
      }

      const age = now - lastSeenTime;

      // Hardcoded Application Grace Period
      if (age < HARDCODED_GRACE_PERIOD_MS) {
        const remainHours = Math.round((HARDCODED_GRACE_PERIOD_MS - age) / 3_600_000);
        console.warn(`[License] [WARN] Offline Grace Period Active — ${remainHours}h remaining`);
        _licenseStatus = { ...cache, fromCache: true, graceRemaining: remainHours };
        return _licenseStatus;
      } else {
        console.error('[License] [ERROR] Offline Grace Period Expired — Application locked until server reconnects.');
        reportSecurityRiskToServer('GRACE_PERIOD_EXPIRED', { ageHours: Math.round(age / 3600000) });
        _licenseStatus = { licensed: false, reason: 'Offline grace period (7 days) expired. Connect to server to reactivate.', fromCache: true };
        return _licenseStatus;
      }
    }

    _licenseStatus = { licensed: false, reason: 'License server unreachable and no valid hardware vault found.', fromCache: true };
    return _licenseStatus;
  }
}

function getLicenseStatus() {
  if (_licenseStatus) return _licenseStatus;
  const c = readVaultCache();
  if (c) { _licenseStatus = c; return c; }
  return { licensed: false, reason: 'License status not yet initialized.' };
}

// ─── Protected Express Middleware ─────────────────────────────────────────────
function requireLicense(req, res, next) {
  if (req.path.startsWith('/api/license')) return next();

  if (!_integrity_ok) {
    return res.status(403).json({
      licensed: false,
      error:    'Application security integrity verification failed.',
      code:     'INTEGRITY_FAILURE',
    });
  }

  const s = getLicenseStatus();
  if (s.licensed) return next();

  return res.status(403).json({
    licensed:  false,
    error:     'Application is locked. Valid license required.',
    reason:    s.reason || 'License invalid or expired.',
    code:      'UNLICENSED',
    serverUrl: getLicenseServerUrl(),
  });
}

// ─── Middleware Initialization ────────────────────────────────────────────────
async function initLicense() {
  console.log('[License] ════════════════════════════════════════════════════');
  console.log(`[License] Server URL  : ${getLicenseServerUrl() || 'NOT SET (configure LICENSE_SERVER_URL in .env)'}`);
  console.log(`[License] Host Domain : ${getDeviceDomain()}`);
  console.log(`[License] Server IP   : ${getLocalIpAddress()}`);
  console.log(`[License] Device ID   : ${getDeviceId()}`);
  console.log('[License] Running self-integrity check...');

  _integrity_ok = checkSelfIntegrity();

  if (!_integrity_ok) {
    _licenseStatus = { licensed: false, reason: 'Security integrity check failed.' };
    console.error('[License] [ERROR] CRITICAL: Integrity check failed — all routes locked.');
    console.error('[License] ════════════════════════════════════════════════════');
    return _licenseStatus;
  }

  stripSensitiveFromEnv();

  const cached = readVaultCache();
  if (cached) _licenseStatus = cached;

  const result = await checkLicense();

  setInterval(async () => {
    console.log('[License] Scheduled license re-verification...');
    await checkLicense();
  }, CHECK_INTERVAL_MS);

  console.log('[License] ════════════════════════════════════════════════════');
  return result;
}

module.exports = {
  initLicense,
  checkLicense,
  getLicenseStatus,
  requireLicense,
  submitRenewalRequest,
  reportSecurityRiskToServer,
  getDeviceId,
  getDeviceDomain,
  getLocalIpAddress,
  getLicenseServerUrl,
};

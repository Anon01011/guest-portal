const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const os = require('os');
const db = require('./db');
require('dotenv').config();

const { apiLimiter } = require('./middleware/auth');
const { checkDateRollover } = require('./middleware/rollover');

const authRouter = require('./routes/auth');
const guestsRouter = require('./routes/guests');
const settingsRouter = require('./routes/settings');
const reportsRouter = require('./routes/reports');
const { router: backupRouter, runAutoBackup } = require('./routes/backup');
const licenseRouter = require('./routes/license');
const { initLicense, requireLicense } = require('./middleware/license');

const app = express();

// Disable X-Powered-By header for security
app.disable('x-powered-by');

// Trust proxy for rate limiters (so it sees client IP behind Nginx/Apache/IIS)
app.set('trust proxy', 1);

// Security Headers & Global Middlewares
// ─────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Automatically detect system IPv4 addresses
const getSystemIPs = () => {
  const ips = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push(iface.address);
        }
      }
    }
  } catch (e) {}
  return ips;
};

const systemIPs = getSystemIPs();
const systemOrigins = systemIPs.flatMap(ip => [
  `http://${ip}`,
  `http://${ip}:80`,
  `http://${ip}:5000`,
  `http://${ip}:8080`,
  `https://${ip}`,
  `https://${ip}:443`
]);

// CORS — origins from ALLOWED_ORIGINS env var (comma-separated) + localhost & system IP defaults
const defaultOrigins = [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:8080',
  'http://127.0.0.1',
  'http://127.0.0.1:80',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8080',
  ...systemOrigins
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

console.log('CORS allowed origins (including system IPs):', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (envOrigins.includes('*')) return callback(null, true);
    // Allow any localhost, 127.0.0.1, or local LAN IP on any port
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    console.warn('CORS blocked origin:', origin);
    callback(null, false);
  },
  credentials: true
}));

// Body parser — limit payload to 6 MB (photos max ~4 MB base64)
app.use(express.json({ limit: '6mb' }));

// Apply Date Rollover Middleware on all requests
app.use(checkDateRollover);

// Apply General API Rate Limiter
app.use('/api/', apiLimiter);

// Global Anti-Cache Middleware for all API endpoints to prevent data glitches
app.use('/api/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// ─────────────────────────────────────────────
// Route Mounting
// ─────────────────────────────────────────────
// License routes — always accessible (needed for activation screen)
app.use('/api/license', licenseRouter);

// License enforcement — block all business routes when unlicensed
app.use('/api/guests',   requireLicense);
app.use('/api/settings', requireLicense);
app.use('/api/reports',  requireLicense);
app.use('/api/backup',   requireLicense);

app.use('/api/auth', authRouter);
app.use('/api/guests', guestsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/backup', backupRouter);

// ─────────────────────────────────────────────
// Global Error Handler (catch-all)
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // bind to all interfaces for cloud hosting

db.initDB()
  .then(async () => {
    // Initialise license check before serving traffic
    await initLicense();

    app.listen(PORT, HOST, () => {
      console.log(`Backend API running on ${HOST}:${PORT}`);
      // Run automatic backup on startup
      runAutoBackup();
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  });

// Handle unhandled promise rejections globally to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions globally to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err.message, err.stack);
});

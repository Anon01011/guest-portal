const db = require('../db');

let cachedSettings = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds TTL

function invalidateSettingsCache() {
  cachedSettings = null;
  lastCacheTime = 0;
}

async function getCachedSettings() {
  const now = Date.now();
  if (cachedSettings && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedSettings;
  }
  const [settingsRows] = await db.query('SELECT * FROM settings');
  const settings = {};
  settingsRows.forEach(row => {
    settings[row.setting_key] = row.setting_value;
  });
  cachedSettings = settings;
  lastCacheTime = now;
  return settings;
}

async function checkDateRollover(req, res, next) {
  try {
    const settings = await getCachedSettings();

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayISO = `${y}-${m}-${d}`;

    if (settings.date_mode === 'auto') {
      if (settings.operational_date !== todayISO) {
        await db.query(
          'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
          [todayISO, 'operational_date']
        );
        invalidateSettingsCache();
      }
    } else {
      const [rh, rm] = (settings.manual_rollover_time || '00:00').split(':').map(Number);
      const rolloverTimeToday = new Date(now);
      rolloverTimeToday.setHours(rh, rm, 0, 0);

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yy = yesterday.getFullYear();
      const ym = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yd = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayISO = `${yy}-${ym}-${yd}`;

      if (now >= rolloverTimeToday) {
        if (settings.operational_date !== todayISO) {
          await db.query(
            'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
            [todayISO, 'operational_date']
          );
          invalidateSettingsCache();
        }
      } else {
        // If we are before custom rollover time today, the active date should be yesterday.
        // If the database date is older than yesterday, force it to yesterday.
        if (settings.operational_date < yesterdayISO) {
          await db.query(
            'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
            [yesterdayISO, 'operational_date']
          );
          invalidateSettingsCache();
        }
      }
    }
  } catch (err) {
    console.error('Date rollover check error:', err.message);
  }
  next();
}

module.exports = {
  checkDateRollover,
  invalidateSettingsCache
};

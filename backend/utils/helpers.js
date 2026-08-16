const db = require('../db');

function isValidId(id) {
  return /^\d+$/.test(String(id));
}

function sanitizeStr(val, maxLen = 255) {
  if (typeof val !== 'string') return null;
  return val.trim().slice(0, maxLen);
}

function escapeLikeWildcards(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[%_]/g, '\\$&');
}

function isValidDate(str) {
  if (!str) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isValidPhoto(photo) {
  if (!photo) return true; // optional
  if (typeof photo !== 'string') return false;
  return photo.startsWith('data:image/');
}

function formatDateLocal(date) {
  if (!date) return null;
  if (typeof date === 'string') {
    return date.includes('T') ? date.split('T')[0] : date;
  }
  if (date instanceof Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(date);
}

async function getGuestWithStatus(guest, operationalDate) {
  const [historyRows] = await db.query(
    'SELECT type, reason, date, by_user FROM status_history WHERE guest_id = ? ORDER BY id ASC',
    [guest.id]
  );
  const history = historyRows.map(h => ({
    type: h.type,
    reason: h.reason,
    date: h.date,
    by: h.by_user
  }));

  // Calculate age dynamically from DOB
  let ageStr = '—';
  if (guest.dob) {
    try {
      const dobDate = new Date(guest.dob);
      if (!isNaN(dobDate.getTime())) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
          calculatedAge--;
        }
        ageStr = `${calculatedAge} yrs`;
      }
    } catch (e) {
      // ignore parsing error
    }
  }

  return {
    id: guest.id,
    name: guest.name,
    idNum: guest.id_num,
    docType: guest.doc_type,
    nationality: guest.nationality,
    dob: formatDateLocal(guest.dob),
    expiryDate: formatDateLocal(guest.expiry_date),
    phone: guest.phone,
    rawData: guest.raw_data,
    photo: guest.photo,
    checkedIn: !!guest.checked_in && (operationalDate ? guest.saved_date === operationalDate : true),
    checkInTime: guest.check_in_time,
    savedDate: guest.saved_date,
    hidden: !!guest.hidden,
    deleteReason: guest.delete_reason || null,
    deletedAt: guest.deleted_at || null,
    statusInfo: {
      current: guest.status,
      warningDate: guest.warning_date,
      warningReason: guest.warning_reason,
      blockedDate: guest.blocked_date,
      blockedReason: guest.blocked_reason,
      age: ageStr,
      history
    }
  };
}

async function getGuestsWithStatusBatch(guests, operationalDate) {
  if (!guests || guests.length === 0) return [];

  const guestIds = guests.map(g => g.id);
  
  // Batch query to resolve status history for all guest IDs at once
  const [allHistoryRows] = await db.query(
    'SELECT guest_id, type, reason, date, by_user FROM status_history WHERE guest_id IN (?) ORDER BY id ASC',
    [guestIds]
  );

  // Group history by guest_id in-memory
  const historyMap = {};
  allHistoryRows.forEach(h => {
    if (!historyMap[h.guest_id]) {
      historyMap[h.guest_id] = [];
    }
    historyMap[h.guest_id].push({
      type: h.type,
      reason: h.reason,
      date: h.date,
      by: h.by_user
    });
  });

  return guests.map(guest => {
    const history = historyMap[guest.id] || [];
    
    let ageStr = '—';
    if (guest.dob) {
      try {
        const dobDate = new Date(guest.dob);
        if (!isNaN(dobDate.getTime())) {
          const today = new Date();
          let calculatedAge = today.getFullYear() - dobDate.getFullYear();
          const m = today.getMonth() - dobDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
            calculatedAge--;
          }
          ageStr = `${calculatedAge} yrs`;
        }
      } catch (e) {}
    }

    return {
      id: guest.id,
      name: guest.name,
      idNum: guest.id_num,
      docType: guest.doc_type,
      nationality: guest.nationality,
      dob: formatDateLocal(guest.dob),
      expiryDate: formatDateLocal(guest.expiry_date),
      phone: guest.phone,
      rawData: guest.raw_data,
      photo: guest.photo,
      checkedIn: !!guest.checked_in && (operationalDate ? guest.saved_date === operationalDate : true),
      checkInTime: guest.check_in_time,
      savedDate: guest.saved_date,
      hidden: !!guest.hidden,
      deleteReason: guest.delete_reason || null,
      deletedAt: guest.deleted_at || null,
      statusInfo: {
        current: guest.status,
        warningDate: guest.warning_date,
        warningReason: guest.warning_reason,
        blockedDate: guest.blocked_date,
        blockedReason: guest.blocked_reason,
        age: ageStr,
        history
      }
    };
  });
}

module.exports = {
  isValidId,
  sanitizeStr,
  escapeLikeWildcards,
  isValidDate,
  isValidPhoto,
  formatDateLocal,
  getGuestWithStatus,
  getGuestsWithStatusBatch
};

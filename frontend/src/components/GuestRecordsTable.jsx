import React, { useState, useEffect } from 'react';

const PAGE_SIZE = 15;

const fmtDateShort = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function GuestRecordsTable({
  guests,
  showHiddenRecords,
  setShowHiddenRecords,
  loadExistingGuest,
  handleStatusFlagTrigger,
  toggleHideGuest,
  handleDeleteTrigger,
  isTblMenuOpen,
  setIsTblMenuOpen
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const filteredGuests = guests.filter(g => showHiddenRecords || !g.hidden);
  const totalPages = Math.max(1, Math.ceil(filteredGuests.length / PAGE_SIZE));

  // Reset to page 1 whenever the guest list or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [guests.length, showHiddenRecords]);

  // Clamp page if it exceeds totalPages
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageGuests = filteredGuests.slice(startIdx, startIdx + PAGE_SIZE);

  const goTo = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  // Build page number array (show max 7 buttons with ellipsis)
  const buildPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (safePage > 4) pages.push('...');
    const lo = Math.max(2, safePage - 2);
    const hi = Math.min(totalPages - 1, safePage + 2);
    for (let i = lo; i <= hi; i++) pages.push(i);
    if (safePage < totalPages - 3) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="tbl-sec">
      <div className="tbl-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-list" aria-hidden="true"></i> Guest Records
          </span>
          <span className="hidden-tag" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            {filteredGuests.length} record{filteredGuests.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="tbl-wrap">
        {filteredGuests.length === 0 ? (
          <div className="empty">
            <i className="ti ti-folder-off" aria-hidden="true"></i>
            <p>No guest records logged for this date.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                <th>Name</th>
                <th style={{ width: '90px' }}>Doc Type</th>
                <th style={{ width: '120px' }}>ID Number</th>
                <th>Nationality</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Age</th>
                <th style={{ width: '110px' }}>Expiry</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '90px' }}>Check-In</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageGuests.map((g, idx) => {
                const isWarn = g.statusInfo?.current === 'warning';
                const isBlock = g.statusInfo?.current === 'blocked';
                const hasStatus = isWarn || isBlock;
                const absIdx = startIdx + idx + 1;

                return (
                  <tr key={g.id} className={g.hidden ? 'row-hidden' : ''} style={{ background: isBlock ? '#fcebeb' : isWarn ? '#faeeda' : '' }}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{absIdx}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', width: '100%', fontWeight: 600, color: isBlock ? '#a32d2d' : isWarn ? '#9e620f' : 'var(--primary)' }}>
                          <span style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => loadExistingGuest(g)} title={g.name}>
                            {g.name}
                          </span>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            {g.hidden && <span className="hidden-tag" style={{ margin: 0 }}>Hidden</span>}
                            {isBlock && <span className="badge" style={{ background: 'var(--danger)', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold' }}>Blocked</span>}
                            {isWarn && <span className="badge" style={{ background: 'var(--warn)', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold' }}>Warning</span>}
                          </div>
                        </div>
                        {hasStatus && (
                          <div className="gm-reason" style={{ color: isBlock ? '#b03a2e' : '#b7950b', fontSize: '10px', marginTop: '2px', fontWeight: 'normal' }}>
                            Reason: {isBlock ? g.statusInfo?.blockedReason : g.statusInfo?.warningReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${g.docType === 'Passport' ? 'badge-existing' : 'badge-new'}`}>
                        {g.docType || 'QID'}
                      </span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{g.idNum}</td>
                    <td>{g.nationality}</td>
                    <td style={{ textAlign: 'center' }}>{g.statusInfo?.age || '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDateShort(g.expiryDate)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={`dot ${g.checkedIn ? 'dot-in' : 'dot-out'}`}></span>
                        {g.checkedIn ? 'Checked In' : 'Not Checked In'}
                      </div>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{g.checkInTime || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                        <button className="ic-btn" title="View / Edit" onClick={() => loadExistingGuest(g)}>
                          <i className="ti ti-edit" aria-hidden="true"></i>
                        </button>
                        {isWarn || isBlock ? (
                          <button className="ic-btn" style={{ color: 'var(--accent)' }} title="Clear Flag" onClick={() => handleStatusFlagTrigger(g, 'unblock')}>
                            <i className="ti ti-circle-check" aria-hidden="true"></i>
                          </button>
                        ) : (
                          <>
                            <button className="ic-btn" style={{ color: 'var(--warn)' }} title="Mark Warning" onClick={() => handleStatusFlagTrigger(g, 'warning')}>
                              <i className="ti ti-alert-triangle" aria-hidden="true"></i>
                            </button>
                            <button className="ic-btn" style={{ color: 'var(--danger)' }} title="Block Guest" onClick={() => handleStatusFlagTrigger(g, 'blocked')}>
                              <i className="ti ti-ban" aria-hidden="true"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination footer */}
      {filteredGuests.length > PAGE_SIZE && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderTop: '.5px solid var(--border)',
          background: 'var(--color-background-secondary, #f9f9f6)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {/* Info text */}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filteredGuests.length)} of {filteredGuests.length} records
          </span>

          {/* Page controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Prev */}
            <button
              onClick={() => goTo(safePage - 1)}
              disabled={safePage === 1}
              style={{
                height: '28px',
                minWidth: '28px',
                padding: '0 7px',
                border: '.5px solid var(--border)',
                borderRadius: '4px',
                background: safePage === 1 ? 'var(--color-background-secondary, #f9f9f6)' : '#fff',
                color: safePage === 1 ? 'var(--text-muted)' : 'var(--text)',
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Previous page"
            >
              <i className="ti ti-chevron-left" style={{ fontSize: '13px' }} aria-hidden="true"></i>
            </button>

            {/* Page numbers */}
            {buildPages().map((p, i) =>
              p === '...'
                ? <span key={`ellipsis-${i}`} style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '0 2px' }}>…</span>
                : (
                  <button
                    key={p}
                    onClick={() => goTo(p)}
                    style={{
                      height: '28px',
                      minWidth: '28px',
                      padding: '0 7px',
                      border: '.5px solid var(--border)',
                      borderRadius: '4px',
                      background: safePage === p ? 'var(--primary)' : '#fff',
                      color: safePage === p ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: safePage === p ? 600 : 400,
                    }}
                  >
                    {p}
                  </button>
                )
            )}

            {/* Next */}
            <button
              onClick={() => goTo(safePage + 1)}
              disabled={safePage === totalPages}
              style={{
                height: '28px',
                minWidth: '28px',
                padding: '0 7px',
                border: '.5px solid var(--border)',
                borderRadius: '4px',
                background: safePage === totalPages ? 'var(--color-background-secondary, #f9f9f6)' : '#fff',
                color: safePage === totalPages ? 'var(--text-muted)' : 'var(--text)',
                cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Next page"
            >
              <i className="ti ti-chevron-right" style={{ fontSize: '13px' }} aria-hidden="true"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

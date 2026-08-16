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

export default function GuestManagementOverlay({
  activeOverlay,
  setActiveOverlay,
  gmSearch,
  setGmSearch,
  gmStatus,
  setGmStatus,
  gmGuests,
  fetchGuestMgmtList,
  loadExistingGuest,
  handleStatusFlagTrigger,
  toggleHideGuest,
  handleDeleteTrigger,
  handleViewHistoryTrigger
}) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [gmGuests.length]);

  if (activeOverlay !== 'guest-mgmt') return null;

  const totalPages = Math.max(1, Math.ceil(gmGuests.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageGuests = gmGuests.slice(startIdx, startIdx + PAGE_SIZE);

  const goTo = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

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
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-hdr card-hdr-primary">
        <div className="card-title">
          <i className="ti ti-users-group" style={{ fontSize: '18px' }} /> Global Guest Management Database
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            type="button"
            className="btn btn-sm btn-danger" 
            style={{ height: '28px', fontSize: '12px', padding: '0 12px', background: 'rgba(255,255,255,0.18)', borderColor: 'transparent', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => setActiveOverlay('deleted-records')}
          >
            <i className="ti ti-trash" style={{ fontSize: '13px' }} /> Deleted Records Archive
          </button>
          <button 
            type="button"
            className="card-close-btn" 
            onClick={() => setActiveOverlay(null)} 
          >
            <i className="ti ti-x" />
          </button>
        </div>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px 20px' }}>
        
        {/* Search Controls */}
        <div className="gm-filter-grid">
          <div>
            <label className="reports-filter-label">Search Name, Nationality or ID Number</label>
            <div className="gm-filter-input-wrap">
              <i className="ti ti-search gm-filter-input-icon" />
              <input
                type="text"
                placeholder="Type name, passport, QID number…"
                value={gmSearch}
                onChange={(e) => setGmSearch(e.target.value)}
                className="gm-filter-input"
                onKeyDown={(e) => { if (e.key === 'Enter') fetchGuestMgmtList(); }}
              />
            </div>
          </div>
          <div>
            <label className="reports-filter-label">Filter by Status Flag</label>
            <select value={gmStatus} onChange={(e) => setGmStatus(e.target.value)} className="gm-filter-select">
              <option value="">All Guests</option>
              <option value="ok">Ok / No Flag</option>
              <option value="warning">Warning Only</option>
              <option value="blocked">Blocked Only</option>
            </select>
          </div>
          <button className="btn btn-sm btn-primary" onClick={fetchGuestMgmtList} style={{ height: '34px', padding: '0 16px' }}>
            <i className="ti ti-search" /> Query Database
          </button>
        </div>

        {/* Database Table */}
        <div style={{ border: '.5px solid var(--border)', borderRadius: '5px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="gm-table-container">
            <table className="gm-table">
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                  <th>Name</th>
                  <th style={{ width: '90px' }}>Doc Type</th>
                  <th style={{ width: '110px' }}>ID Number</th>
                  <th>Nationality</th>
                  <th style={{ width: '100px' }}>Expiry</th>
                  <th style={{ width: '130px' }}>Current Status</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Flag Actions</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Control</th>
                </tr>
              </thead>
              <tbody>
                {gmGuests.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                      <i className="ti ti-users" style={{ fontSize: '28px', display: 'block', marginBottom: '5px' }} />
                      No visitor records matching current query parameters.
                    </td>
                  </tr>
                ) : (
                  pageGuests.map((g, idx) => {
                    const isWarn = g.statusInfo?.current === 'warning';
                    const isBlock = g.statusInfo?.current === 'blocked';
                    const hasStatus = isWarn || isBlock;
                    const absIdx = startIdx + idx + 1;

                    return (
                      <tr key={g.id} className={g.hidden ? 'row-hidden' : ''} style={{ background: isBlock ? '#fcebeb' : isWarn ? '#faeeda' : '' }}>
                        <td style={{ textAlign: 'center', color: '#777' }}>{absIdx}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', width: '100%', fontWeight: 600, color: isBlock ? '#a32d2d' : isWarn ? '#9e620f' : 'var(--primary)' }}>
                              <span style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => { loadExistingGuest(g); setActiveOverlay(null); }} title={g.name}>
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
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{g.expiryDate ? g.expiryDate.split('-').reverse().join('-') : ''}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={`dot ${g.checkedIn ? 'dot-in' : 'dot-out'}`}></span>
                            {g.checkedIn ? 'Checked In' : 'Not Checked In'}
                          </div>
                        </td>
                        <td>
                          <div className="gm-actions-wrap">
                            {isWarn || isBlock ? (
                              <button className="gm-action-btn success" onClick={() => handleStatusFlagTrigger(g, 'unblock')}>
                                <i className="ti ti-circle-check" /> Clear
                              </button>
                            ) : (
                              <>
                                <button className="gm-action-btn warn" onClick={() => handleStatusFlagTrigger(g, 'warning')}>
                                  <i className="ti ti-alert-triangle" /> Warn
                                </button>
                                <button className="gm-action-btn danger" onClick={() => handleStatusFlagTrigger(g, 'blocked')}>
                                  <i className="ti ti-ban" /> Block
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="gm-controls-wrap">
                            {g.statusInfo?.history && g.statusInfo.history.length > 0 && (
                              <button 
                                type="button"
                                className="ic-btn" 
                                style={{ color: 'var(--primary)' }} 
                                title="View status flags history" 
                                onClick={() => handleViewHistoryTrigger(g)}
                              >
                                <i className="ti ti-history" />
                              </button>
                            )}
                            <button className={`ic-btn ${g.hidden ? 'active-hide' : ''}`} title={g.hidden ? "Unhide" : "Hide"} onClick={() => toggleHideGuest(g.id)}>
                              <i className={g.hidden ? "ti ti-eye" : "ti ti-eye-off"} />
                            </button>
                            <button className="ic-btn danger" title="Delete" onClick={() => handleDeleteTrigger(g.id)}>
                              <i className="ti ti-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls inside the table footer wrapper */}
          {gmGuests.length > PAGE_SIZE && (
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
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, gmGuests.length)} of {gmGuests.length} records
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          {gmGuests.length} guest{gmGuests.length !== 1 ? 's' : ''} found in database
        </div>
      </div>
    </div>
  );
}


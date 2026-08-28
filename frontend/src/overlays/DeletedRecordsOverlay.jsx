import React, { useState, useEffect } from 'react';

const PAGE_SIZE = 15;

export default function DeletedRecordsOverlay({
  activeOverlay,
  setActiveOverlay,
  deletedSearch,
  setDeletedSearch,
  deletedGuests,
  fetchDeletedList,
  handleRestoreTrigger,
  handlePermanentDeleteTrigger,
  handleBulkRestoreTrigger,
  handleBulkPermanentDeleteTrigger
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  // Reset page & selection when list changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [deletedGuests.length]);

  if (activeOverlay !== 'deleted-records') return null;

  const totalPages = Math.max(1, Math.ceil(deletedGuests.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageGuests = deletedGuests.slice(startIdx, startIdx + PAGE_SIZE);

  const goTo = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  // Checkbox helpers
  const isSelected = (id) => selectedIds.includes(id);

  const toggleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllPageSelected = pageGuests.length > 0 && pageGuests.every(g => selectedIds.includes(g.id));

  const toggleSelectPage = () => {
    if (isAllPageSelected) {
      const pageIdSet = new Set(pageGuests.map(g => g.id));
      setSelectedIds(prev => prev.filter(id => !pageIdSet.has(id)));
    } else {
      const pageIds = pageGuests.map(g => g.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const isAllTotalSelected = deletedGuests.length > 0 && selectedIds.length === deletedGuests.length;

  const toggleSelectAllTotal = () => {
    if (isAllTotalSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deletedGuests.map(g => g.id));
    }
  };

  const clearSelection = () => setSelectedIds([]);

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
      <div className="card-hdr" style={{ background: 'linear-gradient(135deg, #a32d2d 0%, #701a1a 100%)', color: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', textTransform: 'none', letterSpacing: 'normal' }}>
          <i className="ti ti-trash" style={{ fontSize: '18px', color: '#ffb3b3' }} /> Soft-Deleted Records Archive
        </div>
        <button
          type="button"
          onClick={() => setActiveOverlay('guest-mgmt')}
          style={{
            background: 'rgba(255,255,255,0.16)',
            border: 'none',
            color: '#fff',
            borderRadius: '4px',
            padding: '5px 12px',
            height: '28px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '600',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.26)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
        >
          <i className="ti ti-arrow-left" /> Back to Database
        </button>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px 20px' }}>

        {/* Info banner */}
        <div style={{ background: '#fff8f0', border: '1px solid #ffd59e', borderRadius: '5px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#7a4800' }}>
          <i className="ti ti-info-circle" style={{ fontSize: '16px', color: '#f59e0b', flexShrink: 0 }} />
          Records here have been soft-deleted and are hidden from the main dashboard. You can restore them to the active database or permanently destroy them using your Deletion PIN.
        </div>

        {/* Search Controls */}
        <div className="deleted-search-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <label className="reports-filter-label">Search Deleted Name or ID Number</label>
            <div className="gm-filter-input-wrap">
              <i className="ti ti-search gm-filter-input-icon" />
              <input
                type="text"
                placeholder="Type name, passport, QID number…"
                value={deletedSearch}
                onChange={(e) => setDeletedSearch(e.target.value)}
                className="gm-filter-input"
                onKeyDown={(e) => { if (e.key === 'Enter') fetchDeletedList(); }}
              />
            </div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={fetchDeletedList} style={{ height: '34px', padding: '0 16px', background: 'linear-gradient(135deg, #a32d2d 0%, #701a1a 100%)', color: '#fff', borderColor: 'transparent', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
            <i className="ti ti-search" /> Query Archive
          </button>

          {deletedGuests.length > 0 && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={toggleSelectAllTotal}
              style={{ height: '34px', padding: '0 14px', background: isAllTotalSelected ? '#e2e8f0' : '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600', cursor: 'pointer' }}
            >
              <i className={isAllTotalSelected ? "ti ti-checkbox" : "ti ti-square"} />
              {isAllTotalSelected ? 'Deselect All' : `Select All (${deletedGuests.length})`}
            </button>
          )}
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 600, fontSize: '13px' }}>
              <i className="ti ti-checks" style={{ fontSize: '18px', color: '#dc2626' }} />
              <span>{selectedIds.length} record{selectedIds.length > 1 ? 's' : ''} selected for bulk action</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleBulkRestoreTrigger(selectedIds)}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                title="Restore all selected records back to active database"
              >
                <i className="ti ti-rotate-clockwise" /> Restore Selected ({selectedIds.length})
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleBulkPermanentDeleteTrigger(selectedIds)}
                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                title="Permanently destroy all selected records — cannot be undone"
              >
                <i className="ti ti-trash" /> Permanently Destroy ({selectedIds.length})
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={clearSelection}
                style={{ background: '#fff', color: '#64748b', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Database Table */}
        <div style={{ border: '.5px solid var(--border)', borderRadius: '5px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="gm-table-container">
            <table className="gm-table">
              <thead>
                <tr>
                  <th style={{ width: '38px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={toggleSelectPage}
                      title="Select/Deselect all records on this page"
                      style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                  </th>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>Name</th>
                  <th style={{ width: '80px' }}>Doc</th>
                  <th style={{ width: '110px' }}>ID Number</th>
                  <th>Nationality</th>
                  <th style={{ width: '95px' }}>Expiry</th>
                  <th style={{ width: '115px' }}>Deleted On</th>
                  <th>Deletion Reason</th>
                  <th style={{ width: '170px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deletedGuests.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                      <i className="ti ti-trash-off" style={{ fontSize: '28px', display: 'block', marginBottom: '5px' }} />
                      No deleted records matching current search terms.
                    </td>
                  </tr>
                ) : (
                  pageGuests.map((g, idx) => {
                    const absIdx = startIdx + idx + 1;
                    const checked = isSelected(g.id);
                    return (
                      <tr key={g.id} style={{ background: checked ? '#fef2f2' : idx % 2 === 0 ? '#fdfbfb' : '#fff' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelectOne(g.id)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center', color: '#777' }}>{absIdx}</td>
                        <td style={{ fontWeight: 600, color: '#a32d2d' }}>
                          {g.name}
                        </td>
                        <td>
                          <span className={`badge ${g.docType === 'Passport' ? 'badge-existing' : 'badge-new'}`}>
                            {g.docType || 'QID'}
                          </span>
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>{g.idNum}</td>
                        <td>{g.nationality}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>{g.expiryDate ? g.expiryDate.split('-').reverse().join('-') : ''}</td>
                        <td>
                          {g.deletedAt ? (
                            <span style={{ fontSize: '11px', color: '#a32d2d', fontVariantNumeric: 'tabular-nums' }}>
                              {g.deletedAt}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#bbb' }}>—</span>
                          )}
                        </td>
                        <td>
                          {g.deleteReason ? (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                              <i className="ti ti-message-2" style={{ fontSize: '12px', color: '#a32d2d', marginTop: '2px', flexShrink: 0 }} />
                              <span style={{
                                fontSize: '12px',
                                color: '#7a2020',
                                background: '#fcebeb',
                                borderRadius: '3px',
                                padding: '2px 7px',
                                lineHeight: '1.4',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                maxWidth: '220px'
                              }}
                              title={g.deleteReason}
                              >
                                {g.deleteReason}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#bbb', fontStyle: 'italic' }}>No reason provided</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="gm-action-btn success"
                              style={{ background: '#e1f5ee', color: '#0f6e56', padding: '4px 10px', fontSize: '11px', border: 'none', cursor: 'pointer', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                              onClick={() => handleRestoreTrigger(g)}
                              title="Restore this record back to active database"
                            >
                              <i className="ti ti-rotate-clockwise" /> Restore
                            </button>
                            <button
                              type="button"
                              className="gm-action-btn danger"
                              style={{ background: '#fcebeb', color: '#a32d2d', padding: '4px 10px', fontSize: '11px', border: 'none', cursor: 'pointer', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                              onClick={() => handlePermanentDeleteTrigger(g)}
                              title="Permanently destroy this record — cannot be undone"
                            >
                              <i className="ti ti-trash" /> Destroy
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
          {deletedGuests.length > PAGE_SIZE && (
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
                Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, deletedGuests.length)} of {deletedGuests.length} records
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
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-archive" style={{ fontSize: '13px' }} />
          {deletedGuests.length} soft-deleted record{deletedGuests.length !== 1 ? 's' : ''} in archive
        </div>
      </div>
    </div>
  );
}


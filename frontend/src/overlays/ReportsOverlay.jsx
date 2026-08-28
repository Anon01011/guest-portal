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

export default function ReportsOverlay({
  activeOverlay,
  setActiveOverlay,
  reportsTab,
  setReportsTab,
  // Detail report inputs
  rptDateFrom,
  setRptDateFrom,
  rptDateTo,
  setRptDateTo,
  rptIdNum,
  setRptIdNum,
  rptStatus,
  setRptStatus,
  rptDocType,
  setRptDocType,
  rptPeriod,
  setRptPeriod,
  rptCheckedIn,
  setRptCheckedIn,
  rptNationality,
  setRptNationality,
  rptMinAge,
  setRptMinAge,
  rptMaxAge,
  setRptMaxAge,
  rptDetailResults,
  runDetailReport,
  handleExportExcel,
  // Summary report inputs
  sumDateFrom,
  setSumDateFrom,
  sumDateTo,
  setSumDateTo,
  sumPeriod,
  setSumPeriod,
  sumResults,
  runSummaryReport
}) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when list changes or filter is clicked
  useEffect(() => {
    setCurrentPage(1);
  }, [rptDetailResults.length, reportsTab]);

  useEffect(() => {
    if (activeOverlay === 'reports' && reportsTab === 'detail') {
      const handler = setTimeout(() => {
        runDetailReport();
      }, 250);
      return () => clearTimeout(handler);
    }
  }, [rptDateFrom, rptDateTo, rptIdNum, rptStatus, rptDocType, rptPeriod, rptCheckedIn, rptNationality, rptMinAge, rptMaxAge, reportsTab, activeOverlay]);

  useEffect(() => {
    if (activeOverlay === 'reports' && reportsTab === 'summary') {
      runSummaryReport();
    }
  }, [sumDateFrom, sumDateTo, sumPeriod, reportsTab, activeOverlay]);

  if (activeOverlay !== 'reports') return null;

  const totalPages = Math.max(1, Math.ceil(rptDetailResults.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageResults = rptDetailResults.slice(startIdx, startIdx + PAGE_SIZE);

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
          <i className="ti ti-chart-bar" style={{ fontSize: '18px' }} /> Reports &amp; Analytics Logs
        </div>
        <button 
          className="card-close-btn" 
          onClick={() => setActiveOverlay(null)} 
        >
          <i className="ti ti-x" />
        </button>
      </div>
      
      <div className="reports-tabs-bar">
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <button
            onClick={() => setReportsTab('detail')}
            className={`reports-tab-btn ${reportsTab === 'detail' ? 'active' : ''}`}
          >
            Detailed Visitor Logs
          </button>
          <button
            onClick={() => { setReportsTab('summary'); runSummaryReport(); }}
            className={`reports-tab-btn ${reportsTab === 'summary' ? 'active' : ''}`}
          >
            Summary Reports
          </button>
        </div>

        {reportsTab === 'detail' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto', padding: '4px 0' }}>
            <button className="btn btn-primary" onClick={runDetailReport} style={{ height: '32px', padding: '0 14px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
              <i className="ti ti-filter" style={{ marginRight: '4px' }} /> Apply Filters
            </button>
            <button className="btn btn-success" onClick={handleExportExcel} style={{ height: '32px', padding: '0 14px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
              <i className="ti ti-file-spreadsheet" style={{ marginRight: '4px' }} /> Export Excel
            </button>
          </div>
        )}

        {reportsTab === 'summary' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto', padding: '4px 0' }}>
            <button className="btn btn-primary" onClick={runSummaryReport} style={{ height: '32px', padding: '0 14px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
              <i className="ti ti-check" style={{ marginRight: '4px' }} /> Generate Summary
            </button>
          </div>
        )}
      </div>
      
      {reportsTab === 'detail' ? (
        <div className="reports-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Filters Bar — Single Full-Width Horizontal Row */}
          <div className="reports-filter-bar">
            <div style={{ flex: '2 1 200px', minWidth: '160px' }}>
              <label className="reports-filter-label" style={{ fontWeight: '700' }}>Search Guest</label>
              <div style={{ position: 'relative' }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search by Name, ID, Nationality..." 
                  value={rptIdNum} 
                  onChange={(e) => setRptIdNum(e.target.value)} 
                  className="reports-filter-text" 
                  style={{ paddingLeft: '32px', height: '36px' }}
                />
              </div>
            </div>

            <div style={{ flex: '1 1 105px', minWidth: '95px' }}>
              <label className="reports-filter-label">Period</label>
              <select value={rptPeriod} onChange={(e) => setRptPeriod(e.target.value)} className="reports-filter-select" style={{ height: '36px' }}>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="custom">Custom Date Range</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div style={{ flex: '1 1 125px', minWidth: '110px' }}>
              <label className="reports-filter-label">From Date</label>
              <input 
                type="date" 
                value={rptDateFrom} 
                onChange={(e) => setRptDateFrom(e.target.value)} 
                disabled={rptPeriod !== 'custom'}
                className="reports-filter-input" 
                style={{ 
                  height: '36px',
                  opacity: rptPeriod !== 'custom' ? 0.6 : 1, 
                  cursor: rptPeriod !== 'custom' ? 'not-allowed' : 'default' 
                }}
              />
            </div>

            <div style={{ flex: '1 1 125px', minWidth: '110px' }}>
              <label className="reports-filter-label">To Date</label>
              <input 
                type="date" 
                value={rptDateTo} 
                onChange={(e) => setRptDateTo(e.target.value)} 
                disabled={rptPeriod !== 'custom'}
                className="reports-filter-input" 
                style={{ 
                  height: '36px',
                  opacity: rptPeriod !== 'custom' ? 0.6 : 1, 
                  cursor: rptPeriod !== 'custom' ? 'not-allowed' : 'default' 
                }}
              />
            </div>

            <div style={{ flex: '1.1 1 135px', minWidth: '115px' }}>
              <label className="reports-filter-label">Check-In Status</label>
              <select value={rptCheckedIn} onChange={(e) => setRptCheckedIn(e.target.value)} className="reports-filter-select" style={{ height: '36px' }}>
                <option value="">All Check-In Status</option>
                <option value="in">Checked In Only</option>
                <option value="out">Not Checked In</option>
              </select>
            </div>

            <div style={{ flex: '1.1 1 135px', minWidth: '115px' }}>
              <label className="reports-filter-label">Document Type</label>
              <select value={rptDocType} onChange={(e) => setRptDocType(e.target.value)} className="reports-filter-select" style={{ height: '36px' }}>
                <option value="">All Document Types</option>
                <option value="QID">Qatar ID (QID)</option>
                <option value="Passport">Passport</option>
              </select>
            </div>

            <div style={{ flex: '1 1 115px', minWidth: '100px' }}>
              <label className="reports-filter-label">Alert Flag Status</label>
              <select value={rptStatus} onChange={(e) => setRptStatus(e.target.value)} className="reports-filter-select" style={{ height: '36px' }}>
                <option value="">All Flags</option>
                <option value="ok">Ok / No Flag</option>
                <option value="warning">Warning Only</option>
                <option value="blocked">Blocked Only</option>
              </select>
            </div>
          </div>

          {/* Results Table */}
          <div style={{ border: '.5px solid var(--border)', borderRadius: '5px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div className="reports-table-wrap">
              {rptDetailResults.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                  <i className="ti ti-folder-off" style={{ fontSize: '32px', display: 'block', marginBottom: '7px' }} />
                  <span style={{ fontSize: '12px' }}>No records matches current filter set.</span>
                </div>
              ) : (
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                      <th style={{ textAlign: 'left' }}>Name</th>
                      <th style={{ textAlign: 'left' }}>Doc Type</th>
                      <th style={{ textAlign: 'left' }}>ID Number</th>
                      <th style={{ textAlign: 'left' }}>Nationality</th>
                      <th style={{ textAlign: 'center' }}>Age</th>
                      <th style={{ textAlign: 'left' }}>Expiry</th>
                      <th style={{ textAlign: 'left' }}>Check-In</th>
                      <th style={{ textAlign: 'left' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageResults.map((g, idx) => {
                      const absIdx = startIdx + idx + 1;
                      return (
                        <tr key={g.id} style={{ background: g.statusInfo?.current === 'blocked' ? '#fcebeb' : g.statusInfo?.current === 'warning' ? '#faeeda' : '' }}>
                          <td style={{ textAlign: 'center', color: '#777' }}>{absIdx}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', width: '100%' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }} title={g.name}>
                                {g.name}
                              </span>
                              {g.statusInfo?.current === 'blocked' && (
                                <span className="badge" style={{ background: 'var(--danger)', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', flexShrink: 0 }}>
                                  Blocked
                                </span>
                              )}
                              {g.statusInfo?.current === 'warning' && (
                                <span className="badge" style={{ background: 'var(--warn)', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', flexShrink: 0 }}>
                                  Warning
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{g.docType || 'QID'}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>{g.idNum}</td>
                          <td>{g.nationality}</td>
                          <td style={{ textAlign: 'center' }}>{g.statusInfo?.age || '—'}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDateShort(g.expiryDate)}</td>
                          <td>{g.checkedIn ? `Checked In (${g.checkInTime})` : 'Not Checked In'}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDateShort(g.savedDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination controls inside the table footer wrapper */}
            {rptDetailResults.length > PAGE_SIZE && (
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
                  Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, rptDetailResults.length)} of {rptDetailResults.length} records
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
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {rptDetailResults.length} record{rptDetailResults.length !== 1 ? 's' : ''} found
          </div>
        </div>
      ) : (
        <div className="reports-body" style={{ gap: '20px' }}>
          {/* Summary Filters — Single Full-Width Horizontal Grid Row */}
          <div className="reports-filter-bar" style={{ marginBottom: '16px' }}>
            <div style={{ flex: '1 1 180px', minWidth: '130px' }}>
              <label className="reports-filter-label">Period</label>
              <select value={sumPeriod} onChange={(e) => setSumPeriod(e.target.value)} className="reports-filter-select" style={{ height: '36px' }}>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="custom">Custom Date Range</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
              <label className="reports-filter-label">From Date</label>
              <input 
                type="date" 
                value={sumDateFrom} 
                onChange={(e) => setSumDateFrom(e.target.value)} 
                disabled={sumPeriod !== 'custom'}
                className="reports-filter-input" 
                style={{ 
                  height: '36px',
                  opacity: sumPeriod !== 'custom' ? 0.6 : 1, 
                  cursor: sumPeriod !== 'custom' ? 'not-allowed' : 'default' 
                }}
              />
            </div>
            <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
              <label className="reports-filter-label">To Date</label>
              <input 
                type="date" 
                value={sumDateTo} 
                onChange={(e) => setSumDateTo(e.target.value)} 
                disabled={sumPeriod !== 'custom'}
                className="reports-filter-input" 
                style={{ 
                  height: '36px',
                  opacity: sumPeriod !== 'custom' ? 0.6 : 1, 
                  cursor: sumPeriod !== 'custom' ? 'not-allowed' : 'default' 
                }}
              />
            </div>
          </div>

          {sumResults && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* Stats Breakdown Card */}
              <div style={{ background: 'var(--color-background-secondary,#f9f9f6)', border: '.5px solid var(--border)', borderRadius: '5px', padding: '16px 20px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>Aggregated Visitor Metrics</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '.5px dashed var(--border)', paddingBottom: '7px' }}>
                    <span style={{ fontSize: '13px', color: '#555' }}>Total Guests Logged</span>
                    <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>{sumResults.totalGuests}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '.5px dashed var(--border)', paddingBottom: '7px' }}>
                    <span style={{ fontSize: '13px', color: '#555' }}>Total Check-Ins Executed</span>
                    <strong style={{ fontSize: '14px', color: 'var(--accent)' }}>{sumResults.totalCheckedIn}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '.5px dashed var(--border)', paddingBottom: '7px' }}>
                    <span style={{ fontSize: '13px', color: '#555' }}>Warnings Issued</span>
                    <strong style={{ fontSize: '14px', color: 'var(--warn)' }}>{sumResults.totalWarning}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '.5px dashed var(--border)', paddingBottom: '7px' }}>
                    <span style={{ fontSize: '13px', color: '#555' }}>Blocked Guests Flagged</span>
                    <strong style={{ fontSize: '14px', color: 'var(--danger)' }}>{sumResults.totalBlocked}</strong>
                  </div>
                </div>
              </div>

              {/* Nationality Chart Card */}
              <div style={{ background: 'var(--color-background-secondary,#f9f9f6)', border: '.5px solid var(--border)', borderRadius: '5px', padding: '16px 20px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>Nationality Distribution</h4>
                {sumResults.nationalityBreakdown.length === 0 ? (
                  <div style={{ color: '#999', fontSize: '12px', textAlign: 'center', paddingTop: '20px' }}>No visitor records found.</div>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {sumResults.nationalityBreakdown.map((item) => (
                      <div key={item.nationality} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600', marginBottom: '3px' }}>
                          <span>{item.nationality}</span>
                          <span>{item.count} visitor{item.count !== 1 ? 's' : ''} ({item.percentage}%)</span>
                        </div>
                        <div style={{ background: '#eee', borderRadius: '3px', height: '8px', overflow: 'hidden' }}>
                          <div style={{ background: 'var(--primary-mid)', height: '100%', width: `${item.percentage}%`, borderRadius: '3px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}

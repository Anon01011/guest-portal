import React from 'react';

export default function ViewingDateBar({
  dashboardDate,
  setDashboardDate,
  operationalDate
}) {
  return (
    <div className="dash-date-bar">
      <div className="dash-date-bar-inner">
        <span className="ddb-lbl"><i className="ti ti-calendar" aria-hidden="true"></i> Viewing dashboard for:</span>
        <input
          type="date"
          value={dashboardDate}
          onChange={(e) => {
            if (e.target.value) setDashboardDate(e.target.value);
          }}
        />
        {dashboardDate !== operationalDate && (
          <button className="hdr-btn" onClick={() => setDashboardDate(operationalDate)} style={{ display: 'inline-flex' }}>
            <i className="ti ti-rotate" aria-hidden="true"></i><span>Back to Today</span>
          </button>
        )}
        {dashboardDate !== operationalDate && (
          <span className="dash-date-note">
            <i className="ti ti-info-circle" aria-hidden="true"></i> Showing past data — counts exclude hidden records
          </span>
        )}
      </div>
    </div>
  );
}

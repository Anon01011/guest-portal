import React from 'react';

export default function StatsBar({
  dashboardDate,
  operationalDate,
  stats
}) {
  return (
    <div className="stats-bar">
      <div className="stats-bar-inner">
        
        <div className="stat-card">
          <div className="stat-card-icon-wrap">
            <i className="ti ti-users" style={{ fontSize: '18px', color: '#8de0b8' }} />
          </div>
          <div>
            <div className="stat-label">
              {dashboardDate === operationalDate ? 'Visitors Today' : 'Total Visitors'}
            </div>
            <div className="stat-num">{stats.totalToday}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon-wrap green-bg">
            <i className="ti ti-login" style={{ fontSize: '18px', color: '#5dcaa5' }} />
          </div>
          <div>
            <div className="stat-label">Checked In</div>
            <div className="stat-num green">{stats.checkedInToday}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon-wrap warn-bg">
            <i className="ti ti-device-floppy" style={{ fontSize: '18px', color: '#fac775' }} />
          </div>
          <div>
            <div className="stat-label">Saved Records</div>
            <div className="stat-num amber">{stats.savedToday}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon-wrap">
            <i className="ti ti-database" style={{ fontSize: '18px', color: '#d1b9ff' }} />
          </div>
          <div>
            <div className="stat-label">Today's Database</div>
            <div className="stat-num">{stats.totalRecords}</div>
          </div>
        </div>

      </div>
    </div>
  );
}

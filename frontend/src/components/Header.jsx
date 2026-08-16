import React from 'react';
import logoImg from '../assets/logo.jpeg';

const APP_VERSION = '1.0.0';

const fmtDate = (d) => {
  if (!d) return '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export default function Header({
  licenseStatus,
  user,
  operationalDate,
  activeOverlay,
  setActiveOverlay,
  setCpMsg,
  runDetailReport,
  fetchGuestMgmtList,
  handleLogout
}) {
  const [time, setTime] = React.useState(new Date());
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`header ${scrolled ? 'header-scrolled' : ''}`}>
      <div className="header-inner">
        {/* Brand / Logo */}
        <div
          className="header-brand"
          style={{ cursor: 'pointer', gap: '10px' }}
          onClick={() => setActiveOverlay(null)}
          title="Guest Management Portal — Dashboard"
        >
          <img
            src={logoImg}
            alt="First Source Technology"
            style={{
              height: '34px',
              width: 'auto',
              objectFit: 'contain',
              borderRadius: '3px',
              background: '#fff',
              padding: '3px 6px',
              flexShrink: 0
            }}
          />
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '.2px', lineHeight: 1.2 }}>
              Guest Management Portal
            </div>
            <div style={{ fontSize: '9px', fontWeight: 400, opacity: .7, letterSpacing: '.2px', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              <span
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '3px',
                  padding: '1px 5px',
                  fontSize: '8.5px',
                  fontWeight: '700',
                  letterSpacing: '.5px',
                  color: 'rgba(255,255,255,0.95)'
                }}
              >
                v{APP_VERSION}
              </span>
              <span style={{ opacity: 0.8 }}>First Source Technology W.L.L</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          {licenseStatus?.graceRemaining !== undefined && licenseStatus?.graceRemaining !== null && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              background: 'rgba(249, 115, 22, 0.2)',
              border: '1px solid rgba(249, 115, 22, 0.4)',
              color: '#ffedd5',
              fontSize: '11px',
              fontWeight: '600',
              animation: 'pulseGlow 2s infinite alternate',
              marginRight: '8px'
            }}>
              <i className="ti ti-alert-triangle" style={{ color: '#fb923c', fontSize: '14px' }} />
              <span>
                {licenseStatus.isExpired ? 'License Expired' : 'Offline Grace'}: {
                  licenseStatus.graceRemaining > 24 
                    ? `${Math.round(licenseStatus.graceRemaining / 24)} days` 
                    : `${licenseStatus.graceRemaining} hours`
                } remaining
              </span>
              <style>{`
                @keyframes pulseGlow {
                  0% { box-shadow: 0 0 4px rgba(249, 115, 22, 0.1); border-color: rgba(249, 115, 22, 0.3); }
                  100% { box-shadow: 0 0 10px rgba(249, 115, 22, 0.35); border-color: rgba(249, 115, 22, 0.6); }
                }
              `}</style>
            </div>
          )}

          <button
            className={`hdr-btn ${activeOverlay === null ? 'active-tab' : ''}`}
            onClick={() => setActiveOverlay(null)}
            title="Dashboard"
          >
            <i className="ti ti-layout-dashboard" aria-hidden="true"></i>
            <span>Dashboard</span>
          </button>

          <div className="hdr-sep"></div>

          <button
            className={`hdr-btn ${activeOverlay === 'settings' ? 'active-tab' : ''}`}
            onClick={() => { setActiveOverlay('settings'); setCpMsg({ text: '', ok: false }); }}
            title="Settings"
          >
            <i className="ti ti-settings" aria-hidden="true"></i>
            <span>Settings</span>
          </button>

          <div className="hdr-sep"></div>

          <button
            className={`hdr-btn ${activeOverlay === 'reports' ? 'active-tab' : ''}`}
            onClick={() => { setActiveOverlay('reports'); runDetailReport(); }}
            title="Reports"
          >
            <i className="ti ti-chart-bar" aria-hidden="true"></i>
            <span>Reports</span>
          </button>

          <div className="hdr-sep"></div>

          <button
            className={`hdr-btn ${activeOverlay === 'guest-mgmt' ? 'active-tab' : ''}`}
            onClick={() => { setActiveOverlay('guest-mgmt'); fetchGuestMgmtList(); }}
            title="Guest Management"
          >
            <i className="ti ti-users-group" aria-hidden="true"></i>
            <span>Guest Management</span>
          </button>

          <div className="hdr-sep"></div>
          <div className="datetime-box" style={{ textAlign: 'right', lineHeight: 1.35, color: '#fff' }}>
            <div className="datetime-date">{fmtDate(time)} · {operationalDate}</div>
            <div className="datetime-time">{time.toLocaleTimeString('en-GB')}</div>
          </div>
          <div className="hdr-sep"></div>
          <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 10px', background: 'rgba(255,255,255,0.12)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.18)', height: '32px' }}>
            <div style={{ width: '22px', height: '22px', background: 'rgba(255,255,255,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-user" style={{ fontSize: '12px', color: '#fff' }}></i>
            </div>
            <span className="header-username" style={{ fontSize: '12.5px', fontWeight: '600', color: '#fff', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{user}</span>
          </div>
          <div className="hdr-sep"></div>
          <button className="hdr-btn" onClick={handleLogout} title="Logout" style={{ background: 'rgba(220,60,60,0.25)' }}>
            <i className="ti ti-logout" aria-hidden="true"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

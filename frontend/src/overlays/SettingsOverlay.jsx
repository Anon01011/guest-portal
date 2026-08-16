import React from 'react';

export default function SettingsOverlay({
  activeOverlay,
  setActiveOverlay,
  dateMode,
  handleDateModeChange,
  manualRolloverTime,
  setManualRolloverTime,
  handleApplyManualTime,
  manualTimeStatus,
  handleForceReset,
  operationalDate,
  cpCurrent,
  setCpCurrent,
  cpNew,
  setCpNew,
  cpConfirm,
  setCpConfirm,
  cpMsg,
  handlePasswordChange,
  showCpCurrent,
  setShowCpCurrent,
  showCpNew,
  setShowCpNew,
  showCpConfirm,
  setShowCpConfirm,
  handleExportBackup,
  handleImportBackup,
  pinAdminPassword,
  setPinAdminPassword,
  newPin,
  setNewPin,
  pinMsg,
  handleUpdateDeletePin,
  showPinAdminPassword,
  setShowPinAdminPassword,
  showNewPin,
  setShowNewPin,
  scannerFolder,
  setScannerFolder,
  handleApplyScannerFolder,
  scannerFolderStatus,
  selectedScanner,
  setSelectedScanner,
  scannerApiUrl,
  setScannerApiUrl,
  scannerApiUsername,
  setScannerApiUsername,
  scannerApiPassword,
  setScannerApiPassword,
  licenseStatus
}) {
  const [countdown, setCountdown] = React.useState('');
  const [showScannerApiPass, setShowScannerApiPass] = React.useState(false);
  const [showScannerGuide, setShowScannerGuide] = React.useState(false);
  const [activeGuideTab, setActiveGuideTab] = React.useState('wedge');
  const [scannerList, setScannerList] = React.useState([]);
  const [loadingScanners, setLoadingScanners] = React.useState(false);
  const [browsingFolder, setBrowsingFolder] = React.useState(false);

  // Windows service warnings state
  const [serviceWarning, setServiceWarning] = React.useState({ show: false, wia: false, scard: false });

  // Web directory picker state
  const [showDirPicker, setShowDirPicker] = React.useState(false);
  const [pickerPath, setPickerPath] = React.useState('');
  const [pickerDirs, setPickerDirs] = React.useState([]);
  const [pickerParent, setPickerParent] = React.useState(null);
  const [pickerLoading, setPickerLoading] = React.useState(false);
  const [pickerError, setPickerError] = React.useState('');

  const loadDirPickerPath = async (targetPath = '') => {
    setPickerLoading(true);
    setPickerError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/settings/local-dir?path=${encodeURIComponent(targetPath)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPickerPath(data.currentPath);
        setPickerDirs(data.directories || []);
        setPickerParent(data.parent);
      } else {
        const errData = await res.json();
        setPickerError(errData.error || 'Failed to read directory');
      }
    } catch (err) {
      setPickerError('Network error or access denied');
    } finally {
      setPickerLoading(false);
    }
  };

  const handleOpenDirPicker = () => {
    setShowDirPicker(true);
    loadDirPickerPath(scannerFolder || '');
  };

  const handleSelectDirPicker = () => {
    if (pickerPath) {
      setScannerFolder(pickerPath);
    }
    setShowDirPicker(false);
  };

  const fetchScanners = async () => {
    setLoadingScanners(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/settings/scanners`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : [];
        
        // Detect stopped service warning objects
        const wiaStopped = rawList.some(s => s.id === 'warning_wia_stopped');
        const scardStopped = rawList.some(s => s.id === 'warning_scardsvr_stopped');
        
        if (wiaStopped || scardStopped) {
          setServiceWarning({
            show: true,
            wia: wiaStopped,
            scard: scardStopped
          });
        }
        
        // Filter out warning items from the actual selectable dropdown list
        const cleanList = rawList.filter(s => s.type !== 'warning');
        setScannerList(cleanList);
      }
    } catch (err) {
      console.error('Error fetching scanners:', err);
    } finally {
      setLoadingScanners(false);
    }
  };

  const handleBrowseFolder = async () => {
    setBrowsingFolder(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/settings/browse-folder`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.path) {
          setScannerFolder(data.path);
        }
      }
    } catch (err) {
      console.error('Error browsing folder:', err);
    } finally {
      setBrowsingFolder(false);
    }
  };

  React.useEffect(() => {
    if (activeOverlay !== 'settings') return;

    fetchScanners();

    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeOverlay]);

  if (activeOverlay !== 'settings') return null;

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-hdr card-hdr-primary">
        <div className="card-title">
          <i className="ti ti-settings" style={{ fontSize: '18px' }} /> Settings &amp; Configuration
        </div>
        <button 
          className="card-close-btn" 
          onClick={() => setActiveOverlay(null)} 
        >
          <i className="ti ti-x" />
        </button>
      </div>
      <div className="card-body settings-grid">
        
        {/* Operational Date & Rollover */}
        <div>
          <h3 className="settings-section-title">
            <i className="ti ti-calendar-time" style={{ fontSize: '16px' }} /> Operational Date
          </h3>
          <div className="settings-row">
            <div className="cur-day-info">
              <i className="ti ti-activity" style={{ fontSize: '15px', color: 'var(--primary)' }} />
              <span>Current Active Date: <strong className="day-badge">{operationalDate}</strong></span>
            </div>
            
            {/* Auto Rollover Card */}
            <div className="set-card" style={{ borderColor: dateMode === 'auto' ? 'var(--primary-mid)' : '' }}>
              <div className="set-card-hdr">
                <div className="set-card-title">
                  <i className="ti ti-clock-play" /> Automatic Rollover (Auto)
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={dateMode === 'auto'} onChange={(e) => handleDateModeChange(e.target.checked ? 'auto' : 'manual')} />
                  <span className="toggle-track" />
                  <span className="toggle-thumb" />
                </label>
              </div>
              <div className="set-desc">System date rolls over automatically at midnight local time.</div>
              {dateMode === 'auto' && (
                <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px', fontWeight: '600' }}>
                  <i className="ti ti-arrow-right" /> Next auto rollover: {countdown}
                </div>
              )}
            </div>
            
            {/* Manual Rollover Card */}
            <div className="set-card" style={{ borderColor: dateMode === 'manual' ? 'var(--primary-mid)' : '' }}>
              <div className="set-card-hdr">
                <div className="set-card-title">
                  <i className="ti ti-clock-cog" /> Manual Custom Rollover
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={dateMode === 'manual'} onChange={(e) => handleDateModeChange(e.target.checked ? 'manual' : 'auto')} />
                  <span className="toggle-track" />
                  <span className="toggle-thumb" />
                </label>
              </div>
              <div className="set-desc">Operational date rolls over at a custom designated time daily.</div>
              {dateMode === 'manual' && (
                <div className="time-input-row" style={{ marginTop: '8px' }}>
                  <input type="time" value={manualRolloverTime} onChange={(e) => setManualRolloverTime(e.target.value)} />
                  <button className="btn btn-sm btn-primary" onClick={handleApplyManualTime}>
                    <i className="ti ti-check" /> Apply
                  </button>
                  {manualTimeStatus && (
                    <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600' }}>
                      <i className="ti ti-check-circle" /> {manualTimeStatus}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Force Rollover */}
            <div style={{ marginTop: '6px' }}>
              <button type="button" className="btn btn-sm btn-warn" onClick={handleForceReset} style={{ display: 'inline-flex' }}>
                <i className="ti ti-refresh-alert" /> Force Reset Operational Date to Today
              </button>
            </div>
          </div>
        </div>
        
        {/* Change Security Password */}
        <div className="settings-pwd-column">
          <h3 className="settings-section-title">
            <i className="ti ti-lock" style={{ fontSize: '16px' }} /> Security Password
          </h3>
          {cpMsg.text && (
            <div style={{
              display: 'flex',
              background: cpMsg.ok ? '#e1f5ee' : '#fcebeb',
              border: cpMsg.ok ? '.5px solid rgba(29,158,117,.3)' : '.5px solid rgba(163,45,45,.3)',
              borderRadius: '5px',
              padding: '9px 12px',
              fontSize: '12px',
              color: cpMsg.ok ? '#0f6e56' : '#a32d2d',
              marginBottom: '14px',
              alignItems: 'center',
              gap: '7px'
            }}>
              <i className={cpMsg.ok ? "ti ti-check-circle" : "ti ti-alert-circle"} style={{ fontSize: '15px', flexShrink: 0 }} />
              <span>{cpMsg.text}</span>
            </div>
          )}
          <form onSubmit={handlePasswordChange} className="pwd-form-group">
            <div>
              <label className="pwd-label">Current Password</label>
              <div className="pwd-input-wrap">
                <i className="ti ti-lock pwd-input-icon" />
                <input
                  type={showCpCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  value={cpCurrent}
                  onChange={(e) => setCpCurrent(e.target.value)}
                  className="pwd-input"
                />
                <button type="button" onClick={() => setShowCpCurrent(!showCpCurrent)} className="pwd-toggle-btn">
                  <i className={showCpCurrent ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '15px' }} />
                </button>
              </div>
            </div>
            <div>
              <label className="pwd-label">New Password</label>
              <div className="pwd-input-wrap">
                <i className="ti ti-lock-open pwd-input-icon" />
                <input
                  type={showCpNew ? "text" : "password"}
                  placeholder="Enter new password"
                  value={cpNew}
                  onChange={(e) => setCpNew(e.target.value)}
                  className="pwd-input"
                />
                <button type="button" onClick={() => setShowCpNew(!showCpNew)} className="pwd-toggle-btn">
                  <i className={showCpNew ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '15px' }} />
                </button>
              </div>
            </div>
            <div>
              <label className="pwd-label">Confirm New Password</label>
              <div className="pwd-input-wrap">
                <i className="ti ti-shield-lock pwd-input-icon" />
                <input
                  type={showCpConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={cpConfirm}
                  onChange={(e) => setCpConfirm(e.target.value)}
                  className="pwd-input"
                />
                <button type="button" onClick={() => setShowCpConfirm(!showCpConfirm)} className="pwd-toggle-btn">
                  <i className={showCpConfirm ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '15px' }} />
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '38px', justifyContent: 'center', marginTop: '6px' }}>
              <i className="ti ti-key" /> Update Password
            </button>
          </form>

          {/* License Status */}
          <div style={{ marginTop: '24px', borderTop: '.5px solid var(--border)', paddingTop: '20px' }}>
            <h3 className="settings-section-title">
              <i className="ti ti-certificate" style={{ fontSize: '16px' }} /> License Status
            </h3>
            {licenseStatus ? (
              <div className="set-card" style={{
                borderColor: licenseStatus.licensed ? 'rgba(29, 158, 117, 0.3)' : 'rgba(163, 45, 45, 0.3)',
                background: licenseStatus.licensed ? 'rgba(29, 158, 117, 0.03)' : 'rgba(163, 45, 45, 0.03)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '60px',
                  height: '60px',
                  background: licenseStatus.licensed ? 'var(--accent)' : '#a32d2d',
                  opacity: 0.08,
                  borderRadius: '0 0 0 100%'
                }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Current License
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: licenseStatus.licensed ? '#e1f5ee' : '#fcebeb',
                    color: licenseStatus.licensed ? '#0f6e56' : '#a32d2d',
                    border: licenseStatus.licensed ? '1px solid rgba(29,158,117,0.3)' : '1px solid rgba(163,45,45,0.3)'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: licenseStatus.licensed ? '#1d9e75' : '#a32d2d'
                    }} />
                    {licenseStatus.licensed ? 'Active' : 'Invalid'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                  {licenseStatus.clientName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Licensed To:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{licenseStatus.clientName}</span>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Key Code:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--text)', letterSpacing: '0.5px' }}>
                      {licenseStatus.keyPartial || 'FSQTAR-DEMO-MODE'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Expires On:</span>
                    <span style={{ fontWeight: '600', color: 'var(--text)' }}>
                      {licenseStatus.expiresAt ? new Date(licenseStatus.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Never (Lifetime)'}
                    </span>
                  </div>
                  
                  {licenseStatus.reason && !licenseStatus.licensed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#fff', padding: '8px 10px', borderRadius: '4px', border: '1px solid rgba(163,45,45,0.1)', color: '#a32d2d', marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>Error Details:</span>
                      <span style={{ fontSize: '11px', lineHeight: 1.4 }}>{licenseStatus.reason}</span>
                    </div>
                  )}

                  {licenseStatus.deviceId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Machine ID:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)', userSelect: 'all' }}>
                        {licenseStatus.deviceId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                <i className="ti ti-loader rotate" style={{ marginRight: '6px' }} /> Loading license status...
              </div>
            )}
          </div>
        </div>

        {/* Update Guest Deletion PIN Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 className="settings-section-title">
            <i className="ti ti-shield" style={{ fontSize: '16px' }} /> Guest Deletion Authorization PIN
          </h3>
          {pinMsg.text && (
            <div style={{
              display: 'flex',
              background: pinMsg.ok ? '#e1f5ee' : '#fcebeb',
              border: pinMsg.ok ? '.5px solid rgba(29,158,117,.3)' : '.5px solid rgba(163,45,45,.3)',
              borderRadius: '5px',
              padding: '9px 12px',
              fontSize: '12px',
              color: pinMsg.ok ? '#0f6e56' : '#a32d2d',
              marginBottom: '14px',
              alignItems: 'center',
              gap: '7px'
            }}>
              <i className={pinMsg.ok ? "ti ti-check-circle" : "ti ti-alert-circle"} style={{ fontSize: '15px', flexShrink: 0 }} />
              <span>{pinMsg.text}</span>
            </div>
          )}
          <form onSubmit={handleUpdateDeletePin} className="pwd-form-group">
            <div>
              <label className="pwd-label">Admin Verification Password</label>
              <div className="pwd-input-wrap">
                <i className="ti ti-lock pwd-input-icon" />
                <input
                  type={showPinAdminPassword ? "text" : "password"}
                  placeholder="Enter admin password to verify"
                  value={pinAdminPassword}
                  onChange={(e) => setPinAdminPassword(e.target.value)}
                  className="pwd-input"
                />
                <button type="button" onClick={() => setShowPinAdminPassword(!showPinAdminPassword)} className="pwd-toggle-btn">
                  <i className={showPinAdminPassword ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '15px' }} />
                </button>
              </div>
            </div>
            <div>
              <label className="pwd-label">New Deletion PIN (4-6 digits)</label>
              <div className="pwd-input-wrap">
                <i className="ti ti-number pwd-input-icon" />
                <input
                  type={showNewPin ? "text" : "password"}
                  placeholder="Enter 4-6 digit numeric PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="pwd-input"
                  maxLength={6}
                  pattern="\d*"
                />
                <button type="button" onClick={() => setShowNewPin(!showNewPin)} className="pwd-toggle-btn">
                  <i className={showNewPin ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '15px' }} />
                </button>
              </div>
              <p className="set-desc" style={{ marginTop: '5px', fontSize: '11px' }}>
                Default PIN is <strong>1234</strong>. This PIN is required to authorize any guest record soft deletion.
              </p>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '38px', justifyContent: 'center', marginTop: '6px' }}>
              <i className="ti ti-shield-check" /> Update PIN
            </button>
          </form>
        </div>

        {/* Scanner Hardware & Folder Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 className="settings-section-title" style={{ margin: 0 }}>
              <i className="ti ti-device-computer" style={{ fontSize: '16px' }} /> Scanner Configuration
            </h3>
            <button
              type="button"
              className="btn"
              onClick={() => { setShowScannerGuide(true); setActiveGuideTab('wedge'); }}
              style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(15, 76, 129, 0.1)', color: 'var(--primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
            >
              <i className="ti ti-help-circle" /> Setup Guide
            </button>
          </div>
          <div className="pwd-form-group">
            {/* Folder Location */}
            <div>
              <label className="pwd-label">Local PC Scanner Folder Location</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="pwd-input-wrap" style={{ flex: 1 }}>
                  <i className="ti ti-folder-open pwd-input-icon" />
                  <input
                    type="text"
                    placeholder="e.g. C:\ScannerOutput"
                    value={scannerFolder}
                    onChange={(e) => setScannerFolder(e.target.value)}
                    className="pwd-input"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={handleOpenDirPicker}
                  style={{ height: '38px', padding: '0 14px', fontSize: '12px' }}
                  title="Browse local PC folders"
                >
                  Browse...
                </button>
              </div>
              <p className="set-desc" style={{ marginTop: '5px', fontSize: '11px' }}>
                Path to the folder on your local machine where your physical scanner saves scanned images.
              </p>
            </div>

            {/* Hardware Device Selection */}
            <div style={{ marginTop: '6px' }}>
              <label className="pwd-label">Scan Hardware &amp; Network Device (WIA / PnP / IP)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={selectedScanner}
                  onChange={(e) => setSelectedScanner(e.target.value)}
                  style={{
                    height: '38px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '0 10px',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#fff',
                    color: 'var(--text)',
                    flex: 1
                  }}
                >
                  <option value="">Auto-Detect Network Scanner &amp; Folder Watch Mode</option>
                  {scannerList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn"
                  onClick={fetchScanners}
                  disabled={loadingScanners}
                  style={{ height: '38px', width: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  title="Refresh connected scanners list (USB & Network)"
                >
                  <i className={loadingScanners ? "ti ti-loader rotate" : "ti ti-refresh"} />
                </button>
              </div>
              <p className="set-desc" style={{ marginTop: '5px', fontSize: '11px' }}>
                Select your USB or Network scanner device, or leave as Auto-Detect for network push-scanners.
              </p>
              <p className="set-desc" style={{ marginTop: '3px', fontSize: '10.5px', color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="ti ti-info-circle" style={{ fontSize: '13px' }} />
                Note: Keyboard Wedge (HID) swipe readers act as keyboards and will not appear in this list. They work automatically in the portal.
              </p>
            </div>

            {/* Secure Web Service Scanner API (Regula / Thales / Custom) */}
            <div style={{ marginTop: '12px', borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: '12px' }}>
              <label className="pwd-label" style={{ fontWeight: '600', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="ti ti-shield-lock" style={{ fontSize: '15px' }} />
                Secure Scanner Web Service API (Regula / Thales / Network)
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div>
                  <span className="pwd-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scanner Web Service URL</span>
                  <div className="pwd-input-wrap">
                    <i className="ti ti-link pwd-input-icon" />
                    <input
                      type="text"
                      placeholder="e.g. http://localhost:7210 or http://192.168.1.100:7210"
                      value={scannerApiUrl}
                      onChange={(e) => setScannerApiUrl(e.target.value)}
                      className="pwd-input"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <span className="pwd-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auth Username</span>
                    <div className="pwd-input-wrap">
                      <i className="ti ti-user pwd-input-icon" />
                      <input
                        type="text"
                        placeholder="Optional username"
                        value={scannerApiUsername}
                        onChange={(e) => setScannerApiUsername(e.target.value)}
                        className="pwd-input"
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="pwd-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auth Password / API Key</span>
                    <div className="pwd-input-wrap">
                      <i className="ti ti-lock pwd-input-icon" />
                      <input
                        type={showScannerApiPass ? "text" : "password"}
                        placeholder="Optional password"
                        value={scannerApiPassword}
                        onChange={(e) => setScannerApiPassword(e.target.value)}
                        className="pwd-input"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowScannerApiPass(!showScannerApiPass)} 
                        className="pwd-toggle-btn"
                        style={{ background: 'none', border: 'none', position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <i className={showScannerApiPass ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '15px' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="set-desc" style={{ marginTop: '5px', fontSize: '11px' }}>
                Provide connection credentials for your scanner's secure local web service or secure network reader API.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleApplyScannerFolder(scannerFolder, selectedScanner, scannerApiUrl, scannerApiUsername, scannerApiPassword)}
              style={{ width: '100%', height: '38px', justifyContent: 'center', marginTop: '10px' }}
            >
              <i className="ti ti-device-floppy" /> Save Scanner Settings
            </button>
            {scannerFolderStatus && (
              <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600', marginTop: '5px', textAlign: 'center' }}>
                <i className="ti ti-check-circle" /> {scannerFolderStatus}
              </div>
            )}
          </div>
        </div>

        {/* Database Backup & Restore Section */}
        <div style={{ gridColumn: '1 / -1', borderTop: '.5px solid var(--border)', paddingTop: '20px', marginTop: '10px' }}>
          <h3 className="settings-section-title">
            <i className="ti ti-database-share" style={{ fontSize: '16px' }} /> Database Backup &amp; Restore
          </h3>
          <p className="set-desc" style={{ marginBottom: '14px' }}>
            Export all guest records, history, logs, and settings to a secure, encrypted backup file, or restore the database from a previously exported backup file.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleExportBackup}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px' }}
            >
              <i className="ti ti-download" /> Export Backup (Encrypted BAK)
            </button>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                type="button" 
                className="btn btn-warn" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px' }}
                onClick={() => document.getElementById('backup-file-input').click()}
              >
                <i className="ti ti-upload" /> Import &amp; Restore Backup
              </button>
              <input 
                id="backup-file-input"
                type="file" 
                accept=".bak" 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    handleImportBackup(evt.target.result);
                    e.target.value = '';
                  };
                  reader.readAsText(file);
                }}
                style={{ display: 'none' }}
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i className="ti ti-info-circle" style={{ color: 'var(--primary)' }} /> 
              <span>Automatic backups are created daily and stored securely inside the server backups directory (keeping the last 10 versions).</span>
            </div>
          </div>
        </div>

        {/* Web Directory Picker Modal */}
        {/* Scanner Setup Guide Modal */}
        {showScannerGuide && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>
            <div className="card" style={{
              width: '95%',
              maxWidth: '800px',
              height: '85vh',
              maxHeight: '700px',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              boxShadow: 'var(--shadow-lg)'
            }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <i className="ti ti-help-circle" style={{ color: 'var(--primary)', fontSize: '18px' }} />
                  Scanner Hardware Integration Guide
                </h3>
                <button 
                  onClick={() => setShowScannerGuide(false)} 
                  style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div style={{
                display: 'flex',
                gap: '4px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '14px',
                overflowX: 'hidden',
                flexWrap: 'wrap'
              }}>
                {[
                  { id: 'wedge', label: 'Keyboard Wedge (HID)', icon: 'ti-keyboard' },
                  { id: 'plustek', label: 'Plustek SecureScan', icon: 'ti-device-imac' },
                  { id: 'twain', label: 'TWAIN & WIA', icon: 'ti-plug' },
                  { id: 'webservice', label: 'Web Service (Regula)', icon: 'ti-shield-lock' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveGuideTab(tab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: 'none',
                      borderBottom: activeGuideTab === tab.id ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                      background: 'none',
                      color: activeGuideTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className={`ti ${tab.icon}`} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content Panel */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '4px',
                fontSize: '13px',
                lineHeight: '1.5',
                color: 'var(--text)'
              }}>
                {activeGuideTab === 'wedge' && (
                  <div>
                    <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '5px', padding: '10px 12px', color: '#166534', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <i className="ti ti-check-circle" style={{ fontSize: '16px', marginTop: '2px' }} />
                      <div>
                        <strong>Zero Configuration Mode:</strong> Plug-and-play swipe readers require absolutely no software, drivers, or folder watch configurations.
                      </div>
                    </div>

                    <h4 style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '8px' }}>How it Works</h4>
                    <p style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>
                      These devices act exactly like a USB computer keyboard. When you swipe a passport or ID card, they rapidly "type" the parsed raw MRZ character rows.
                    </p>

                    <h4 style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '8px' }}>Steps to Connect:</h4>
                    <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                      <li>Connect the USB reader to any vacant USB port on your client PC.</li>
                      <li>Wait for Windows to automatically configure it (no custom drivers required).</li>
                      <li>Open any page in the Guest Management Portal (no text field needs to be active/focused).</li>
                      <li>Swipe or place your passport/ID on the reader.</li>
                      <li>The portal will automatically intercept the inputs, parse the MRZ block, and load the guest profile.</li>
                    </ol>
                  </div>
                )}

                {activeGuideTab === 'plustek' && (
                  <div>
                    <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '5px', padding: '10px 12px', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <i className="ti ti-info-circle" style={{ fontSize: '16px', color: 'var(--primary)', marginTop: '2px' }} />
                      <div>
                        <strong>Folder Watcher Integration:</strong> Linking Plustek SecureScan Manager directly with the watched folder allows instant import of scanned images and XML/JSON/TXT metadata logs.
                      </div>
                    </div>

                    <h4 style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '8px' }}>Setup Steps:</h4>
                    <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      <li>
                        <strong>Install Plustek Drivers:</strong> Download and install the TWAIN driver and <strong>SecureScan Manager</strong> utility from the <a href="https://plustek.com/us/support/drivers-and-downloads.php" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 'bold' }}>Official Plustek Support & Downloads Portal</a>.
                      </li>
                      <li>
                        <strong>Configure Saving Location:</strong> Open SecureScan Manager, edit your button scan profile, and set the destination saving folder to:
                        <code style={{ display: 'block', background: '#f1f5f9', padding: '6px 10px', borderRadius: '4px', margin: '4px 0', fontFamily: 'monospace', fontSize: '12px' }}>
                          C:\ScannerOutput
                        </code>
                      </li>
                      <li>
                        <strong>Enable Metadata Export:</strong> In the file output settings inside SecureScan Manager, ensure you enable the option to export the document image (JPEG) **AND** the companion text/XML log file (which contains the parsed OCR metadata).
                      </li>
                      <li>
                        <strong>Link Our App:</strong> Set the <strong>Local PC Scanner Folder Location</strong> in our settings panel to the exact same folder: <code style={{ fontFamily: 'monospace' }}>C:\ScannerOutput</code>.
                      </li>
                      <li>
                        <strong>Scan:</strong> Place your passport on the glass and press the scan button. The app will immediately detect the scanned JPEG and metadata, bypass Tesseract OCR to read the text logs directly, and populate the guest form in milliseconds.
                      </li>
                    </ol>
                  </div>
                )}

                {activeGuideTab === 'twain' && (
                  <div>
                    <h4 style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '8px' }}>Direct WIA Hardware Scan</h4>
                    <p style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>
                      WIA (Windows Image Acquisition) devices allow you to trigger scans directly from our app.
                    </p>
                    <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                      <li>Connect your WIA-compatible flatbed or passport scanner to the PC.</li>
                      <li>Go to Scanner Configuration settings and click the <strong>Refresh</strong> icon next to the device dropdown.</li>
                      <li>Select your device from the dropdown.</li>
                      <li>Press the <strong>Scan Passport</strong> or <strong>Scan QID</strong> buttons inside the guest registration form to trigger the hardware scan.</li>
                    </ol>

                    <h4 style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '8px' }}>TWAIN Folder Watching (Fallback)</h4>
                    <p style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>
                      If your scanner only supports TWAIN (which requires a visual vendor desktop popup):
                    </p>
                    <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                      <li>Configure your scanner's native desktop application to auto-save scanned files into a local folder (e.g. <code style={{ fontFamily: 'monospace' }}>C:\ScannerOutput</code>).</li>
                      <li>Set our app's watched folder to that same path.</li>
                      <li>Select the scanner in our dropdown list as a TWAIN device. The app will automatically watch the folder and pull in the latest scans.</li>
                    </ol>
                  </div>
                )}

                {activeGuideTab === 'webservice' && (
                  <div>
                    <div style={{ background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: '5px', padding: '10px 12px', color: '#92400e', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: '16px', marginTop: '2px' }} />
                      <div>
                        <strong>Security Reminder:</strong> For production deployments, always place your document reader web service behind a reverse proxy (like Nginx) and configure Basic Authentication.
                      </div>
                    </div>

                    <h4 style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '8px' }}>Connecting a Secure REST API Scanner:</h4>
                    <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      <li>
                        <strong>Enter Endpoint:</strong> Input the secure scanner service URL (typically `http://localhost:7210` for local Regula Web Service or a network IP if hosted inside your local office network).
                      </li>
                      <li>
                        <strong>Set Credentials:</strong> Enter the <strong>Auth Username</strong> and <strong>Auth Password / API Key</strong> configured on your reverse proxy or gateway to restrict service access.
                      </li>
                      <li>
                        <strong>Workflow:</strong> When you scan, the image is secure-uploaded to the Web Service. The API returns full verified identity fields and the high-resolution face portrait cropped directly from the chip/card.
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => setShowScannerGuide(false)}
                  style={{ height: '36px', padding: '0 18px' }}
                >
                  Got it, close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {showDirPicker && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>
            <div className="card" style={{
              width: '90%',
              maxWidth: '550px',
              height: '80vh',
              maxHeight: '600px',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <i className="ti ti-folder-open" style={{ color: 'var(--primary)', fontSize: '18px' }} />
                  Local Directory Browser
                </h3>
                <button 
                  onClick={() => setShowDirPicker(false)} 
                  style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>

              {/* Current Path Breadcrumb */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '8px 12px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: 'var(--text)',
                marginBottom: '12px',
                wordBreak: 'break-all',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Path:</span>
                <span>{pickerPath || 'Logical Drives'}</span>
              </div>

              {/* Directory Content List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: '#fff',
                marginBottom: '16px'
              }}>
                {pickerLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px' }}>
                    <i className="ti ti-loader rotate" style={{ fontSize: '24px', color: 'var(--primary)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading local folders...</span>
                  </div>
                )}

                {pickerError && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center', color: 'var(--accent)', gap: '8px' }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: '24px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{pickerError}</span>
                    <button 
                      onClick={() => loadDirPickerPath(pickerParent || '')}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '5px' }}
                    >
                      Go Back
                    </button>
                  </div>
                )}

                {!pickerLoading && !pickerError && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Go Up Parent Directory */}
                    {pickerParent !== null && (
                      <div 
                        onClick={() => loadDirPickerPath(pickerParent)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: 'var(--bg-card)',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'var(--primary)'
                        }}
                      >
                        <i className="ti ti-arrow-back-up" style={{ fontSize: '16px' }} />
                        <span>.. (Parent Folder)</span>
                      </div>
                    )}

                    {/* Directories list */}
                    {pickerDirs.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        This folder is empty or access is restricted.
                      </div>
                    ) : (
                      pickerDirs.map((dir, idx) => (
                        <div 
                          key={idx}
                          onClick={() => loadDirPickerPath(pickerPath ? (pickerPath.endsWith('\\') ? pickerPath + dir : pickerPath + '\\' + dir) : dir)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            fontSize: '13px',
                            color: 'var(--text)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <i className="ti ti-folder" style={{ color: '#e2a100', fontSize: '16px' }} />
                          <span style={{ fontWeight: '500' }}>{dir}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDirPicker(false)}
                  style={{ height: '36px' }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSelectDirPicker}
                  disabled={!pickerPath}
                  style={{ height: '36px' }}
                >
                  Select This Folder
                </button>
              </div>
            </div>
          </div>
        )}
        {serviceWarning.show && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
          }}>
            <div className="card" style={{
              width: '90%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
              borderTop: '4px solid var(--accent)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: '28px', color: 'var(--accent)' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
                  Windows Scanner Service Warning
                </h3>
              </div>
              
              <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: '10px' }}>
                  The application detected that critical Windows services required for hardware integrations are stopped:
                </p>
                <ul style={{ paddingLeft: '20px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {serviceWarning.wia && (
                    <li>
                      <strong>Windows Image Acquisition (WIA) Service (`stisvc`):</strong> Required to scan documents directly from the portal.
                    </li>
                  )}
                  {serviceWarning.scard && (
                    <li>
                      <strong>Smart Card Service (`SCardSvr`):</strong> Required to read National IDs and smart cards.
                    </li>
                  )}
                </ul>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '10px 12px', color: '#991b1b', fontSize: '12px' }}>
                  <strong>How to Fix:</strong> The app terminal must be run with <strong>Administrator privileges</strong> to start these services. 
                  Alternatively, open Command Prompt (cmd) as Administrator and run:
                  <code style={{ display: 'block', background: 'rgba(0,0,0,0.05)', padding: '5px', borderRadius: '3px', marginTop: '6px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {serviceWarning.wia ? "net start stisvc\n" : ""}{serviceWarning.scard ? "net start SCardSvr" : ""}
                  </code>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => setServiceWarning({ show: false, wia: false, scard: false })}
                  style={{ height: '36px', padding: '0 20px' }}
                >
                  Acknowledge &amp; Continue
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}

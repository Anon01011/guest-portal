import React, { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '';

// ─── Inject global styles ─────────────────────────────────────────────────────
const STYLE_ID = 'fsq-lg-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    @keyframes fsq-spin   { to { transform: rotate(360deg); } }
    @keyframes fsq-fade   { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fsq-pulse  { 0%,100% { opacity:1; } 50% { opacity:.45; } }
    @keyframes fsq-drift1 { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(40px,25px) scale(1.05); } }
    @keyframes fsq-drift2 { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(-30px,-20px) scale(0.96); } }
    .fsq-input:focus, .fsq-select:focus, .fsq-textarea:focus { border-color: rgba(124,58,237,0.7) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.12) !important; }
    .fsq-btn:not(:disabled):hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.45) !important; }
    .fsq-btn:not(:disabled):active { transform: translateY(0); }
    .fsq-btn { transition: all .18s cubic-bezier(.4,0,.2,1) !important; }
    .fsq-tab-active { color: #f9fafb !important; border-bottom: 2px solid #7c3aed !important; }
  `;
  document.head.appendChild(s);
}

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const KeyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M21 2l-2 2m-3 1l-4 4m2 2l-3 3m-2 0a5 5 0 11-7-7 5 5 0 017 7z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InfoCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
    <circle cx="12" cy="12" r="10" stroke="#8b5cf6" strokeWidth="1.8" />
    <path d="M12 16v-4M12 8h.01" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
    <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="1.8" />
    <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

export default function LicenseGate({ onActivated }) {
  const [activeTab, setActiveTab] = useState('activate');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [info, setInfo] = useState(null);

  const [duration, setDuration] = useState('1_year');
  const [renewNotes, setRenewNotes] = useState('');
  const [verifyingStatus, setVerifyingStatus] = useState(false);

  const inputRef = useRef(null);

  const checkLicenseLive = async (manual = false) => {
    if (manual) setVerifyingStatus(true);
    try {
      const res = await fetch(`${API}/api/license/status`);
      const data = await res.json();
      setInfo(data);
      if (data.licensed) {
        onActivated({ ...data, clientName: data.clientName, expiresAt: data.expiresAt });
      } else if (manual) {
        setError(data.reason || 'License is still locked or expired.');
      }
    } catch (err) {
      if (manual) setError('Cannot reach server. Please check network connection.');
    } finally {
      if (manual) setVerifyingStatus(false);
    }
  };

  useEffect(() => {
    fetch(`${API}/api/license/status`)
      .then(r => r.json())
      .then(d => { setInfo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      checkLicenseLive(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!loading && activeTab === 'activate' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading, activeTab]);

  const formatKey = (val) => {
    const raw = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (raw.startsWith('FSQTAR')) {
      const rest = raw.slice(6);
      const parts = rest.match(/.{1,5}/g) || [];
      return ('FSQTAR' + (parts.length ? '-' + parts.join('-') : '')).slice(0, 24);
    }
    return raw.slice(0, 24);
  };

  const handleActivateOrUpdate = async (e) => {
    e.preventDefault();
    const key = licenseKey.trim().toUpperCase();
    if (!key) { setError('Please enter your license key.'); return; }
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onActivated({ ...data, clientName: data.clientName, expiresAt: data.expiresAt });
      } else {
        setError(data.error || 'Invalid license key. Verification failed.');
      }
    } catch {
      setError('Cannot reach server. Please check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenewalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/license/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration, notes: renewNotes }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Renewal request submitted successfully.');
        setRenewNotes('');
      } else {
        setError(data.error || 'Failed to submit renewal request.');
      }
    } catch {
      setError('Connection error submitting renewal request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={S.root}>
      <div style={S.bg} />
      <div style={{ ...S.orb, ...S.orb1 }} />
      <div style={{ ...S.orb, ...S.orb2 }} />

      <div style={S.card}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.logoWrap}>
            <ShieldIcon />
          </div>
          <div>
            <div style={S.brand}>FSQTAR</div>
            <div style={S.brandSub}>Guest Management Portal</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={S.tabRow}>
          <button
            type="button"
            className={activeTab === 'activate' ? 'fsq-tab-active' : ''}
            onClick={() => { setActiveTab('activate'); setError(''); setSuccessMsg(''); }}
            style={{ ...S.tabBtn, ...(activeTab === 'activate' ? S.tabBtnActive : {}) }}
          >
            Activate / Update Key
          </button>
          <button
            type="button"
            className={activeTab === 'renew' ? 'fsq-tab-active' : ''}
            onClick={() => { setActiveTab('renew'); setError(''); setSuccessMsg(''); }}
            style={{ ...S.tabBtn, ...(activeTab === 'renew' ? S.tabBtnActive : {}) }}
          >
            Request Renewal
          </button>
        </div>

        {info?.configured && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 16px 0' }}>
            <button
              type="button"
              onClick={() => checkLicenseLive(true)}
              disabled={verifyingStatus}
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#818cf8',
                padding: '6px 14px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              <i className={verifyingStatus ? "ti ti-loader rotate" : "ti ti-refresh"} style={{ fontSize: '13px' }} />
              {verifyingStatus ? 'Checking...' : 'Check / Re-Verify Renewal'}
            </button>
          </div>
        )}

        {/* Status Banners */}
        {info && !info.licensed && info.configured && (
          <div style={{ ...S.banner, ...S.bannerWarn }}>
            <AlertTriangleIcon />
            <div>{info.reason || 'License invalid or expired.'}</div>
          </div>
        )}
        {info && !info.configured && (
          <div style={{ ...S.banner, ...S.bannerInfo }}>
            <InfoCircleIcon />
            <div>Enter license key to activate this installation.</div>
          </div>
        )}
        {info?.graceRemaining && (
          <div style={{ ...S.banner, ...S.bannerWarn }}>
            <AlertTriangleIcon />
            <div>Offline mode — {info.graceRemaining}h grace period remaining.</div>
          </div>
        )}

        {successMsg && (
          <div style={{ ...S.banner, ...S.bannerSuccess }}>
            <CheckCircleIcon />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Tab 1: Activate / Update Key */}
        {activeTab === 'activate' && (
          <form onSubmit={handleActivateOrUpdate} style={S.form} noValidate>
            <div style={S.fieldWrap}>
              <label style={S.label}>License Key</label>
              <div style={S.inputRow}>
                <input
                  ref={inputRef}
                  type="text"
                  className="fsq-input"
                  value={licenseKey}
                  onChange={e => { setLicenseKey(formatKey(e.target.value)); setError(''); }}
                  placeholder="FSQTAR-XXXXX-XXXXX-XXXXX"
                  style={S.input}
                  spellCheck={false}
                  autoComplete="off"
                  disabled={submitting}
                  maxLength={24}
                />
              </div>
              {error && (
                <div style={S.errorMsg}>
                  <ErrorIcon />
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="fsq-btn"
              disabled={submitting || !licenseKey}
              style={{ ...S.btn, ...(submitting || !licenseKey ? S.btnDisabled : {}) }}
            >
              {submitting ? (
                <><span style={S.spinner} /> Verifying…</>
              ) : (
                <>
                  <KeyIcon />
                  Activate License
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Request Renewal */}
        {activeTab === 'renew' && (
          <form onSubmit={handleRenewalSubmit} style={S.form} noValidate>
            <div style={S.fieldWrap}>
              <label style={S.label}>Requested Duration</label>
              <select
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="fsq-select"
                style={S.select}
                disabled={submitting}
              >
                <option value="1_month">1 Month Extension</option>
                <option value="6_months">6 Months Extension</option>
                <option value="1_year">1 Year Extension</option>
                <option value="lifetime">Lifetime License</option>
              </select>
            </div>

            <div style={S.fieldWrap}>
              <label style={S.label}>Notes / Comments (Optional)</label>
              <textarea
                value={renewNotes}
                onChange={e => setRenewNotes(e.target.value)}
                className="fsq-textarea"
                placeholder="Specify details for administrator..."
                style={S.textarea}
                rows={3}
                disabled={submitting}
              />
              {error && (
                <div style={S.errorMsg}>
                  <ErrorIcon />
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="fsq-btn"
              disabled={submitting}
              style={{ ...S.btn, ...(submitting ? S.btnDisabled : {}) }}
            >
              {submitting ? (
                <><span style={S.spinner} /> Submitting…</>
              ) : (
                <>
                  <RefreshIcon />
                  Submit Renewal Request
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div style={S.footer}>
          {info?.deviceId && (
            <div style={S.deviceRow}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke="#4b5563" strokeWidth="1.5" />
                <path d="M8 21h8M12 17v4" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <code style={S.deviceId}>Device: {info.deviceId.slice(0, 16)}…</code>
            </div>
          )}
          <p style={S.footerText}>
            Need assistance?{' '}
            <a href="mailto:support@fsqtar.com" style={S.link}>support@fsqtar.com</a>
          </p>
        </div>

      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ ...S.root, justifyContent: 'center', alignItems: 'center' }}>
      <div style={S.bg} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <div style={S.spinner} />
        <p style={{ color: '#6b7280', fontSize: '13px', fontFamily: 'Inter,sans-serif', animation: 'fsq-pulse 1.4s infinite' }}>
          Verifying license security…
        </p>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root: {
    position: 'fixed', inset: 0, zIndex: 99999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    overflow: 'hidden', WebkitFontSmoothing: 'antialiased',
  },
  bg: { position: 'absolute', inset: 0, background: '#09090b' },
  orb: { position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' },
  orb1: {
    width: '520px', height: '520px',
    background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)',
    top: '-180px', left: '-180px', animation: 'fsq-drift1 14s ease-in-out infinite',
  },
  orb2: {
    width: '400px', height: '400px',
    background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
    bottom: '-120px', right: '-120px', animation: 'fsq-drift2 18s ease-in-out infinite',
  },
  card: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: '410px',
    background: '#111113',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px', padding: '32px',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 32px 64px rgba(0,0,0,0.6)',
    animation: 'fsq-fade .25s ease-out',
    display: 'flex', flexDirection: 'column', gap: '18px',
  },
  header: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoWrap: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
  },
  brand: { fontSize: '15px', fontWeight: '600', color: '#f9fafb', letterSpacing: '-0.2px' },
  brandSub: { fontSize: '11.5px', color: '#6b7280', marginTop: '1px' },

  tabRow: {
    display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', gap: '16px',
  },
  tabBtn: {
    background: 'none', border: 'none', color: '#6b7280',
    fontSize: '13px', fontWeight: '500', padding: '8px 0',
    cursor: 'pointer', outline: 'none', transition: 'color .15s',
  },
  tabBtnActive: { color: '#f9fafb', fontWeight: '600' },

  banner: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', lineHeight: '1.5',
  },
  bannerWarn: {
    background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', color: '#d97706',
  },
  bannerInfo: {
    background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)', color: '#8b5cf6',
  },
  bannerSuccess: {
    background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981',
  },

  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: {
    fontSize: '11.5px', fontWeight: '600', color: '#9ca3af',
    letterSpacing: '0.6px', textTransform: 'uppercase',
  },
  inputRow: { position: 'relative' },
  input: {
    width: '100%', padding: '10px 14px',
    background: '#18181b', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '8px', color: '#f9fafb', fontSize: '14px',
    fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', monospace",
    letterSpacing: '1.2px', outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box', caretColor: '#7c3aed',
  },
  select: {
    width: '100%', padding: '10px 14px',
    background: '#18181b', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '8px', color: '#f9fafb', fontSize: '13.5px',
    outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
  },
  textarea: {
    width: '100%', padding: '10px 14px',
    background: '#18181b', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '8px', color: '#f9fafb', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box', resize: 'vertical',
    fontFamily: 'inherit',
  },
  errorMsg: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '12px', color: '#f87171',
  },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '11px 20px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    color: '#fff', border: 'none', borderRadius: '8px',
    fontSize: '13.5px', fontWeight: '600', cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(124,58,237,0.3)', letterSpacing: '0.1px',
  },
  btnDisabled: {
    opacity: 0.45, cursor: 'not-allowed',
    boxShadow: 'none', filter: 'none', transform: 'none',
  },
  spinner: {
    display: 'inline-block', width: '13px', height: '13px',
    border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'fsq-spin .65s linear infinite', flexShrink: 0,
  },
  footer: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  deviceRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  deviceId: {
    fontSize: '11px', color: '#4b5563',
    fontFamily: 'monospace', letterSpacing: '0.5px',
  },
  footerText: { fontSize: '12px', color: '#4b5563', margin: 0 },
  link: { color: '#7c3aed', textDecoration: 'none', fontWeight: '500' },
};

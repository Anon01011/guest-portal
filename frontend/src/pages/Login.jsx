import React from 'react';
import logoImg from '../assets/logo.jpeg';

const APP_VERSION = '1.0.0';

export default function Login({
  loginUser,
  setLoginUser,
  loginPass,
  setLoginPass,
  loginError,
  loginSuccessMsg,
  showLoginPass,
  setShowLoginPass,
  handleLogin,
  forgotScreen,
  setForgotScreen,
  forgotError,
  setForgotError,
  resetUser,
  setResetUser,
  resetCode,
  setResetCode,
  resetNewPass,
  setResetNewPass,
  resetConfirmPass,
  setResetConfirmPass,
  showResetPass1,
  setShowResetPass1,
  showResetPass2,
  setShowResetPass2,
  handleResetPassword
}) {
  return (
    <div className="login-screen">
      {!forgotScreen ? (
        <div className="login-card">
          <div className="login-header">
            <div className="login-header-logo-wrap">
              <img
                src={logoImg}
                alt="First Source Technology"
                className="login-logo"
              />
            </div>
            <div className="login-title">Guest Management Portal</div>
            <div className="login-subtitle">Sign in to continue</div>
          </div>
          <div className="login-body">
            {(loginError || loginSuccessMsg) && (
              <div style={{
                display: 'flex',
                background: loginError ? '#fcebeb' : '#e1f5ee',
                border: loginError ? '.5px solid rgba(163,45,45,.3)' : '.5px solid rgba(29,158,117,.3)',
                borderRadius: '5px',
                padding: '9px 12px',
                fontSize: '12px',
                color: loginError ? '#a32d2d' : '#0f6e56',
                marginBottom: '14px',
                alignItems: 'center',
                gap: '7px'
              }}>
                <i className={loginError ? "ti ti-alert-circle" : "ti ti-check-circle"} style={{ fontSize: '15px', flexShrink: 0 }} />
                <span>{loginError || loginSuccessMsg}</span>
              </div>
            )}
            <form onSubmit={handleLogin} className="login-form">
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '5px' }}>Username</label>
                <div className="login-input-group">
                  <i className="ti ti-user login-input-icon" />
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '5px' }}>Password</label>
                <div className="login-input-group">
                  <i className="ti ti-lock login-input-icon" />
                  <input
                    type={showLoginPass ? "text" : "password"}
                    placeholder="Enter password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="login-input"
                    style={{ paddingRight: '38px' }}
                  />
                  <button type="button" onClick={() => setShowLoginPass(!showLoginPass)} className="login-password-toggle">
                    <i className={showLoginPass ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '17px' }} />
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: '-6px' }}>
                <button type="button" onClick={() => { setForgotScreen(true); setForgotError(''); }} className="login-forgot-btn">Forgot password?</button>
              </div>
              <button type="submit" className="btn-primary" style={{ height: '42px', width: '100%', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: "'Segoe UI',sans-serif" }}>
                <i className="ti ti-login" style={{ fontSize: '17px' }} /> Sign In
              </button>
            </form>

            <div className="login-footer">
              <span className="login-powered">Powered by</span><br />
              <span className="login-company">First Source Technology W.L.L</span>
              <div>
                <span className="login-version">v{APP_VERSION}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="login-card">
          <div className="reset-header">
            <button type="button" onClick={() => setForgotScreen(false)} className="reset-back-btn">
              <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
            </button>
            <div>
              <div style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>Reset Password</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', marginTop: '2px' }}>Enter your recovery code</div>
            </div>
          </div>
          <div className="login-body">
            <div className="reset-info-banner">
              <i className="ti ti-info-circle" style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }} />
              <span>Use the recovery code <strong style={{ userSelect: 'all', cursor: 'pointer' }} onClick={() => setResetCode('FST_RECOVERY_2024')}>FST_RECOVERY_2024</strong> to reset your password. (Click to copy/autofill)</span>
            </div>
            {forgotError && (
              <div style={{ display: 'flex', background: '#fcebeb', border: '.5px solid rgba(163,45,45,.3)', borderRadius: '5px', padding: '9px 12px', fontSize: '12px', color: '#a32d2d', marginBottom: '14px', alignItems: 'center', gap: '7px' }}>
                <i className="ti ti-alert-circle" style={{ fontSize: '15px' }} />
                <span>{forgotError}</span>
              </div>
            )}
            <form onSubmit={handleResetPassword} className="login-form">
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '5px' }}>Username</label>
                <input type="text" placeholder="Enter your username" value={resetUser} onChange={(e) => setResetUser(e.target.value)} className="login-input" style={{ paddingLeft: '12px' }} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '5px' }}>Recovery Code</label>
                <input type="text" placeholder="Enter recovery code" value={resetCode} onChange={(e) => setResetCode(e.target.value)} className="login-input" style={{ paddingLeft: '12px', textTransform: 'uppercase', letterSpacing: '2px' }} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '5px' }}>New Password</label>
                <div className="login-input-group">
                  <input type={showResetPass1 ? "text" : "password"} placeholder="Enter new password" value={resetNewPass} onChange={(e) => setResetNewPass(e.target.value)} className="login-input" style={{ paddingLeft: '12px', paddingRight: '38px' }} />
                  <button type="button" onClick={() => setShowResetPass1(!showResetPass1)} className="login-password-toggle">
                    <i className={showResetPass1 ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '17px' }} />
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '5px' }}>Confirm New Password</label>
                <div className="login-input-group">
                  <input type={showResetPass2 ? "text" : "password"} placeholder="Re-enter new password" value={resetConfirmPass} onChange={(e) => setResetConfirmPass(e.target.value)} className="login-input" style={{ paddingLeft: '12px', paddingRight: '38px' }} />
                  <button type="button" onClick={() => setShowResetPass2(!showResetPass2)} className="login-password-toggle">
                    <i className={showResetPass2 ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '17px' }} />
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ height: '42px', width: '100%', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: "'Segoe UI',sans-serif" }}>
                <i className="ti ti-key" style={{ fontSize: '17px' }} /> Reset Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

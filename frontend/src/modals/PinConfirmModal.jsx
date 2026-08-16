import React from 'react';

export default function PinConfirmModal({
  show,
  title,
  message,
  confirmLabel,
  confirmClass, // 'btn-success-bg' or 'btn-danger-bg'
  pinValue,
  setPinValue,
  errorMsg,
  onConfirm,
  onCancel,
  showPin,
  setShowPin,
  // Optional — only for soft-delete action
  showReasonField,
  deleteReason,
  setDeleteReason
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="delete-modal" style={{ width: '400px' }}>
        <div className="delete-modal-hdr">
          <div className="delete-modal-icon-box" style={{ background: confirmClass === 'btn-danger-bg' ? 'var(--danger)' : 'var(--accent)' }}>
            <i className="ti ti-shield-lock" style={{ fontSize: '20px', color: '#fff' }}></i>
          </div>
          <div>
            <div className="delete-modal-title">{title}</div>
            <div className="delete-modal-subtitle">Authorization Required</div>
          </div>
        </div>
        <div className="delete-modal-body">
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            {message}
          </div>

          {/* Reason field — only shown for soft-delete */}
          {showReasonField && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                <i className="ti ti-message-2" style={{ marginRight: '4px' }} />
                Reason for Deletion <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                placeholder="Enter reason why this record is being deleted…"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                maxLength={500}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1.5px solid var(--border)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  background: 'var(--bg)',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
              <div style={{ fontSize: '10px', color: '#999', textAlign: 'right', marginTop: '3px' }}>
                {(deleteReason || '').length}/500
              </div>
            </div>
          )}

          {/* PIN input */}
          <div className="pwd-input-wrap" style={{ marginBottom: '12px' }}>
            <i className="ti ti-shield pwd-input-icon" />
            <input
              type={showPin ? "text" : "password"}
              placeholder="Enter Deletion PIN"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              className="pwd-input"
              maxLength={6}
              pattern="\d*"
              onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); }}
              autoFocus={!showReasonField}
            />
            <button type="button" onClick={() => setShowPin(!showPin)} className="pwd-toggle-btn">
              <i className={showPin ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '16px' }} />
            </button>
          </div>

          {errorMsg && (
            <div style={{ display: 'flex', fontSize: '12px', color: '#a32d2d', background: '#fcebeb', borderRadius: '4px', padding: '7px 10px', marginBottom: '12px', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} /> <span>{errorMsg}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-sm" onClick={onCancel}>
              <i className="ti ti-x" /> Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={onConfirm}
              style={{
                background: confirmClass === 'btn-danger-bg' ? 'var(--danger)' : 'var(--accent)',
                color: '#fff',
                borderColor: confirmClass === 'btn-danger-bg' ? 'var(--danger)' : 'var(--accent)'
              }}
            >
              {confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import './ConfirmModal.css';

export default function ConfirmModal({
  show,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmClass = 'btn-primary',
  icon = 'ti-alert-circle',
  iconBg = '#e6f1fb',
  iconColor = 'var(--primary)',
  onConfirm,
  onCancel
}) {
  if (!show) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-hdr">
          <div className="confirm-modal-icon-wrap" style={{ background: iconBg }}>
            <i className={`ti ${icon} confirm-modal-icon`} style={{ color: iconColor }} />
          </div>
          <div>
            <div className="confirm-modal-title">{title}</div>
            <div className="confirm-modal-msg">{message}</div>
          </div>
        </div>
        <div className="confirm-modal-footer">
          <button type="button" className="btn btn-sm" onClick={onCancel}>
            <i className="ti ti-x" /> Cancel
          </button>
          <button type="button" className={`btn btn-sm ${confirmClass}`} onClick={onConfirm}>
            <i className={`ti ${icon}`} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export default function DeleteConfirmModal({
  showDeleteModal,
  deletePin,
  setDeletePin,
  deleteModalErr,
  showDeleteModalState,
  confirmDelete,
  showPin,
  setShowPin
}) {
  if (!showDeleteModal) return null;

  return (
    <div className="modal-overlay">
      <div className="delete-modal">
        <div className="delete-modal-hdr">
          <div className="delete-modal-icon-box">
            <i className="ti ti-trash" style={{ fontSize: '20px', color: '#fff' }}></i>
          </div>
          <div>
            <div className="delete-modal-title">Delete Record</div>
            <div className="delete-modal-subtitle">Record can be recovered from Guest Database</div>
          </div>
        </div>
        <div className="delete-modal-body">
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Enter Deletion PIN to confirm.
          </div>
          <div className="pwd-input-wrap" style={{ marginBottom: '12px' }}>
            <i className="ti ti-shield pwd-input-icon" />
            <input
              type={showPin ? "text" : "password"}
              placeholder="Enter Deletion PIN"
              value={deletePin}
              onChange={(e) => setDeletePin(e.target.value)}
              className="pwd-input"
              maxLength={6}
              pattern="\d*"
              onKeyDown={(e) => { if (e.key === 'Enter') confirmDelete(); }}
            />
            <button type="button" onClick={() => setShowPin(!showPin)} className="pwd-toggle-btn">
              <i className={showPin ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '16px' }} />
            </button>
          </div>
          {deleteModalErr && (
            <div style={{ display: 'flex', fontSize: '12px', color: '#a32d2d', background: '#fcebeb', borderRadius: '4px', padding: '7px 10px', marginBottom: '12px', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-alert-circle" /> {deleteModalErr}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-sm" onClick={() => showDeleteModalState(false)}>
              <i className="ti ti-x" /> Cancel
            </button>
            <button type="button" className="btn btn-sm" onClick={confirmDelete} style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}>
              <i className="ti ti-trash" /> Soft Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

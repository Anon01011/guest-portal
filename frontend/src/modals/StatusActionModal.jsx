import React from 'react';

export default function StatusActionModal({
  showStatusModal,
  statusModalGuest,
  statusModalType,
  statusModalReason,
  setStatusModalReason,
  statusModalErr,
  setShowStatusModal,
  confirmStatusAction
}) {
  if (!showStatusModal) return null;

  const btnBgClass = statusModalType === 'warning' ? 'btn-warn-bg' : statusModalType === 'blocked' ? 'btn-danger-bg' : 'btn-accent-bg';
  const iconWrapClass = statusModalType === 'warning' ? 'status-modal-icon-wrap warning' : statusModalType === 'blocked' ? 'status-modal-icon-wrap blocked' : 'status-modal-icon-wrap ok';
  const iconClass = statusModalType === 'warning' ? 'status-modal-icon warning' : statusModalType === 'blocked' ? 'status-modal-icon blocked' : 'status-modal-icon ok';

  return (
    <div className="status-modal-bg show">
      <div className="status-modal">
        <div className="status-modal-hdr">
          <div id="status-modal-icon-wrap" className={iconWrapClass}>
            <i className={statusModalType === 'warning' ? "ti ti-alert-triangle " + iconClass : statusModalType === 'blocked' ? "ti ti-ban " + iconClass : "ti ti-circle-check " + iconClass} />
          </div>
          <div>
            <div className="status-modal-title">
              {statusModalType === 'warning' ? 'Mark Warning' : statusModalType === 'blocked' ? 'Block Guest' : 'Unblock / Clear Flag'}
            </div>
            <div className="status-modal-subtitle">
              {statusModalGuest?.name} — {statusModalGuest?.idNum}
            </div>
          </div>
        </div>
        <div className="status-modal-body">
          <label className="status-modal-label">Reason</label>
          <textarea placeholder="Enter reason…" value={statusModalReason} onChange={(e) => setStatusModalReason(e.target.value)} />
          {statusModalErr && (
            <div className="status-modal-err">
              <i className="ti ti-alert-circle"></i> Please enter a reason.
            </div>
          )}
          <div className="status-modal-footer">
            <button type="button" className="btn btn-sm" onClick={() => setShowStatusModal(false)}><i className="ti ti-x" /> Cancel</button>
            <button type="button" className={`btn btn-sm ${btnBgClass}`} onClick={confirmStatusAction}>
              <i className="ti ti-check" /> Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

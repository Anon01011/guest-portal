import React from 'react';
import './HistoryLogModal.css';

export default function HistoryLogModal({
  show,
  guest,
  onClose
}) {
  if (!show || !guest) return null;

  const history = guest.statusInfo?.history || [];

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-hdr">
          <div className="history-modal-icon-wrap">
            <i className="ti ti-history" />
          </div>
          <div>
            <div className="history-modal-title">Status Flag History</div>
            <div className="history-modal-subtitle">{guest.name} · {guest.idNum}</div>
          </div>
          <button type="button" className="history-modal-close" onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="history-modal-body">
          {history.length === 0 ? (
            <div className="history-empty">
              <i className="ti ti-activity" />
              <p>No status history logs recorded for this guest.</p>
            </div>
          ) : (
            <div className="history-timeline">
              {history.map((h, idx) => {
                const isWarn = h.type === 'warning';
                const isBlock = h.type === 'blocked';
                const isOk = h.type === 'ok';
                const dotColor = isBlock ? 'var(--danger)' : isWarn ? 'var(--warn)' : 'var(--accent)';
                const typeLabel = isBlock ? 'Blocked' : isWarn ? 'Warning' : 'Cleared Flag';
                const badgeClass = isBlock ? 'badge-danger' : isWarn ? 'badge-warn' : 'badge-success';

                return (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-badge-col">
                      <div className="timeline-dot" style={{ background: dotColor }} />
                      {idx < history.length - 1 && <div className="timeline-line" />}
                    </div>
                    <div className="timeline-content-card">
                      <div className="timeline-card-hdr">
                        <span className={`timeline-badge ${badgeClass}`}>{typeLabel}</span>
                        <span className="timeline-time">{h.date}</span>
                      </div>
                      <div className="timeline-reason">"{h.reason}"</div>
                      <div className="timeline-author">
                        <i className="ti ti-user" style={{ fontSize: '11px', marginRight: '3px' }} /> Modified by: <strong>{h.by}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="history-modal-footer">
          <button type="button" className="btn btn-sm btn-primary" onClick={onClose} style={{ height: '32px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-check" /> Close
          </button>
        </div>
      </div>
    </div>
  );
}

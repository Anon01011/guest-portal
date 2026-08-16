import React from 'react';

export default function LoadingOverlay({ show, stage, progress, docType }) {
  if (!show) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="loading-scanner-container">
          <div className="doc-icon-wrapper">
            <i className={docType === 'Passport' ? "ti ti-e-passport doc-large-icon" : "ti ti-id-badge doc-large-icon"} />
            <div className="scanner-laser"></div>
          </div>
        </div>
        
        <h3 className="loading-title">Processing {docType || 'Document'}</h3>
        
        <p className="loading-stage">{stage || 'Initializing...'}</p>
        
        <div className="loading-progress-container">
          <div 
            className="loading-progress-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="loading-percentage">{progress}%</div>
      </div>
    </div>
  );
}

import React from 'react';

export default function ScanSearchCard({
  barcodeSearch,
  setBarcodeSearch,
  handleBarcodeSearch,
  clearForm,
  openNewEntry,
  handleScanDocument,
  handleUploadDocument,
  onOpenCameraScan,
  barcodeInputRef,
  loadExistingGuest,
  fetchWithAuth,
  searchError,
  setSearchError
}) {
  const fileInputRef = React.useRef(null);
  const autocompleteRef = React.useRef(null);
  const [targetDocType, setTargetDocType] = React.useState('QID');
  const [suggestions, setSuggestions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  // Click outside to close autocomplete suggestions
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = async (val) => {
    setBarcodeSearch(val);
    if (setSearchError) setSearchError(false);

    const query = val.trim();
    if (query.length >= 2 && fetchWithAuth) {
      try {
        const res = await fetchWithAuth(`/api/guests/all?q=${encodeURIComponent(query)}&show_deleted=false`);
        if (res.ok) {
          const data = await res.json();
          // Filter to show active entries matching query
          setSuggestions(data.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Error fetching autocomplete suggestions:', err);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const triggerUpload = (docType) => {
    setTargetDocType(docType);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      handleUploadDocument(file.name, evt.target.result, targetDocType);
      e.target.value = ''; // Reset input
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">
          <i className="ti ti-scan" aria-hidden="true"></i> Scan or Search Guest
        </div>
        {/* Actions header buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleScanDocument('QID')}
            title="Scan QID card using local or network scanner device"
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <i className="ti ti-id-badge" aria-hidden="true"></i>
            Scan QID
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleScanDocument('Passport')}
            title="Scan Passport using local or network scanner device"
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <i className="ti ti-e-passport" aria-hidden="true"></i>
            Scan Passport
          </button>
          {onOpenCameraScan && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onOpenCameraScan}
              title="Scan QID or Passport live using webcam or document camera"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--primary-light, #e1f5ee)', color: 'var(--primary, #0f6e56)', borderColor: 'var(--primary-mid, #9de0c9)' }}
            >
              <i className="ti ti-camera" aria-hidden="true"></i>
              Camera Scan
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => triggerUpload('QID')}
            title="Upload QID image file"
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <i className="ti ti-upload" aria-hidden="true"></i>
            Upload QID
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => triggerUpload('Passport')}
            title="Upload Passport image file"
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <i className="ti ti-upload" aria-hidden="true"></i>
            Upload Passport
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (setSearchError) setSearchError(false);
              openNewEntry();
            }}
            title="Open blank guest entry form"
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <i className="ti ti-user-plus" aria-hidden="true"></i>
            New Entry
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*" 
            onChange={handleFileChange}
          />
        </div>
      </div>
      <div className="card-body">
        <form onSubmit={handleBarcodeSearch} className="scan-row-new">
          <div className="barcode-wrap" ref={autocompleteRef}>
            <i className="ti ti-barcode" aria-hidden="true"></i>
            <input
              ref={barcodeInputRef}
              className="barcode-input"
              type="text"
              placeholder="Scan barcode/Passport MRZ or enter Guest ID..."
              value={barcodeSearch}
              onChange={(e) => handleInputChange(e.target.value)}
              autoComplete="off"
              autoFocus
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '5px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 1000,
                maxHeight: '220px',
                overflowY: 'auto',
                marginTop: '4px',
                textAlign: 'left'
              }}>
                {suggestions.map((g, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      loadExistingGuest(g);
                      setBarcodeSearch('');
                      setSuggestions([]);
                      setShowSuggestions(false);
                      if (setSearchError) setSearchError(false);
                    }}
                    style={{
                      padding: '9px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(0,0,0,0.04)',
                      fontSize: '12.5px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#fff'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <div>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{g.name}</span>
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>({g.nationality})</span>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                      {g.idNum}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="scan-actions-group">
            <button type="submit" className="btn btn-primary">
              <i className="ti ti-search" aria-hidden="true"></i> Search
            </button>
            <button 
              type="button" 
              className="btn" 
              onClick={() => {
                if (setSearchError) setSearchError(false);
                clearForm();
              }}
            >
              <i className="ti ti-refresh" aria-hidden="true"></i> Clear
            </button>
          </div>
        </form>

        {searchError && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px 14px', 
            background: 'var(--danger-light)', 
            color: 'var(--danger)', 
            borderRadius: '5px', 
            border: '0.5px solid rgba(163, 45, 45, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12.5px',
            fontWeight: '500',
            textAlign: 'left'
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: '16px' }} />
            <span>No guest record found with this ID or Name. Please verify the ID or create a new entry.</span>
          </div>
        )}
      </div>
    </div>
  );
}

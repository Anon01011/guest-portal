import React, { useState } from 'react';

export default function GuestDetailsCard({
  cardMode,
  currentGuestId,
  guests,
  currentPhoto,
  formName,
  setFormName,
  formIdNum,
  setFormIdNum,
  formDocType,
  setFormDocType,
  formNat,
  setFormNat,
  formDob,
  setFormDob,
  formAge,
  formExp,
  setFormExp,
  formPhone,
  setFormPhone,
  formRaw,
  calcAge,
  handlePhotoLoad,
  clearForm,
  saveGuest,
  updateGuest,
  checkInExisting,
  photoInputRef,
  guestCardRef,
  formPhotoCopy
}) {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);
  const photocopySrc = formPhotoCopy || `${import.meta.env.VITE_API_URL || ''}/api/guests/scan-copy/${formIdNum}`;

  React.useEffect(() => {
    setImgFailed(false);
  }, [formIdNum, formPhotoCopy]);

  const getExpiryBadge = () => {
    if (!formExp) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(formExp);
    const isValid = expDate >= today;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          marginTop: '4px',
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.6px',
          padding: '4px 10px',
          borderRadius: '3px',
          width: 'fit-content',
          background: isValid ? '#e1f5ee' : '#fcebeb',
          color: isValid ? '#0a7a4f' : '#a32d2d',
          border: isValid ? '0.5px solid rgba(10,122,79,0.25)' : '0.5px solid rgba(163,45,45,0.25)'
        }}
      >
        <i className={isValid ? "ti ti-circle-check" : "ti ti-circle-x"} style={{ fontSize: '13px' }} />
        {isValid ? 'VALID' : 'EXPIRED'}
      </div>
    );
  };

  const isCheckedIn = formName && currentGuestId && guests.find(g => g.id === currentGuestId)?.checkedIn;
  const currentGuest = currentGuestId ? guests.find(g => g.id === currentGuestId) : null;
  const guestStatus = currentGuest?.statusInfo?.current;
  const isBlocked = guestStatus === 'blocked';
  const isWarning = guestStatus === 'warning';
  const flagReason = isBlocked
    ? (currentGuest?.statusInfo?.blockedReason || 'No reason provided')
    : isWarning
    ? (currentGuest?.statusInfo?.warningReason || 'No reason provided')
    : null;

  return (
    <>
      <div
        className="guest-card"
        ref={guestCardRef}
        style={isBlocked ? {
          border: '1.5px solid #d9534f',
          boxShadow: '0 2px 16px rgba(217,83,79,0.18)'
        } : isWarning ? {
          border: '1.5px solid #e6972a',
          boxShadow: '0 2px 16px rgba(230,151,42,0.18)'
        } : {}}
      >
        <div
          className="gc-hdr"
          style={isBlocked ? {
            background: '#fdf1f1',
            color: '#a32d2d',
            borderBottom: '1px solid rgba(163,45,45,0.2)'
          } : isWarning ? {
            background: '#fefcf8',
            color: '#c87700',
            borderBottom: '1px solid rgba(200,119,0,0.2)'
          } : {}}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
              <i className="ti ti-id" aria-hidden="true"></i> Guest Details
            </span>
            {isBlocked && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px',
                padding: '2px 8px', borderRadius: '3px',
                background: '#fcebeb', color: '#a32d2d',
                border: '1px solid rgba(163,45,45,0.3)'
              }}>
                <i className="ti ti-ban" style={{ fontSize: '11px' }} />
                BLOCKED{flagReason ? ` — ${flagReason}` : ''}
              </span>
            )}
            {isWarning && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px',
                padding: '2px 8px', borderRadius: '3px',
                background: '#fef4e0', color: '#c87700',
                border: '1px solid rgba(200,119,0,0.3)'
              }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: '11px' }} />
                WARNING{flagReason ? ` — ${flagReason}` : ''}
              </span>
            )}
          </div>
          <span className={`badge ${isCheckedIn ? 'badge-checkedin' : 'badge-notcheckedin'}`}>
            <i className={isCheckedIn ? "ti ti-check" : "ti ti-clock"} style={{ fontSize: '11px', verticalAlign: '-1px', marginRight: '3px' }} />
            {isCheckedIn ? 'Checked In' : 'Not Checked In'}
          </span>
        </div>

        <div className="gc-body">
          <div className="id-layout">
            {/* Photo and Scanned copy column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '170px' }}>
              {/* Photo upload / Camera capture */}
              <div className="id-image-box" style={{ width: '100%' }}>
                {currentPhoto ? (
                  <>
                    <img 
                      src={currentPhoto} 
                      alt="ID Photo" 
                      onClick={() => setLightboxImage(currentPhoto)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view large profile photo"
                    />
                    <div style={{ position: 'absolute', bottom: '4px', right: '4px' }}>
                      <button type="button" onClick={() => photoInputRef.current?.click()} style={{ background: 'rgba(0,0,0,.5)', border: 'none', color: '#fff', borderRadius: '3px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>
                        <i className='ti ti-edit' style={{ fontSize: '11px' }} />
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="photo-upload" onClick={() => photoInputRef.current?.click()}>
                    <i className="ti ti-user-circle" aria-hidden="true"></i>
                    <span>Photo / ID Image</span>
                    <span style={{ fontSize: '10px', opacity: .6 }}>Click to upload</span>
                  </button>
                )}
                <input type="file" ref={photoInputRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhotoLoad} />
              </div>

              {/* Scanned document photocopy Copy Image */}
              {formIdNum && !imgFailed && (
                <div className="scanned-copy-box-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Scanned Doc Copy
                  </span>
                  <div 
                    className="scanned-copy-box"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      height: '112px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: '#f9f9f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                    onClick={() => setLightboxImage(photocopySrc)}
                    title="Click to view large scanned photocopy"
                  >
                    <img 
                      src={photocopySrc}
                      alt="Scanned Copy" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={() => {
                        if (!formPhotoCopy) {
                          setImgFailed(true);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Form Fields */}
            <div className="fields-grid">
              <div className="fg full">
                <div className="fl">Full Name</div>
                <input className="fi" type="text" placeholder="Full name as on ID" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="fg full">
                <div className="fl">Document Type</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div
                    onClick={() => setFormDocType('QID')}
                    className={`dt-btn dt-btn-qid ${formDocType === 'QID' ? 'active' : ''}`}
                  >
                    <i className="ti ti-id-badge-2" style={{ fontSize: '16px' }} /> QID
                  </div>
                  <div
                    onClick={() => setFormDocType('Passport')}
                    className={`dt-btn dt-btn-passport ${formDocType === 'Passport' ? 'active' : ''}`}
                  >
                    <i className="ti ti-e-passport" style={{ fontSize: '16px' }} /> Passport
                  </div>
                </div>
              </div>
              <div className="fg">
                <div className="fl">{formDocType === 'QID' ? 'Qatar ID Number (QID)' : formDocType === 'Passport' ? 'Passport Number' : 'ID Number'}</div>
                <input className="fi" type="text" placeholder={formDocType === 'QID' ? 'Enter QID number' : formDocType === 'Passport' ? 'Enter passport number' : 'ID / Passport No.'} value={formIdNum} onChange={(e) => setFormIdNum(e.target.value)} />
              </div>
              <div className="fg">
                <div className="fl">Nationality</div>
                <input className="fi" type="text" placeholder="Nationality" value={formNat} onChange={(e) => setFormNat(e.target.value)} />
              </div>
              <div className="fg">
                <div className="fl">Date of Birth</div>
                <input className="fi" type="date" value={formDob} onChange={(e) => { setFormDob(e.target.value); calcAge(e.target.value); }} />
              </div>
              <div className="fg">
                <div className="fl">Age (calculated)</div>
                <div className="fv hi">{formAge}</div>
              </div>
              <div className="fg">
                <div className="fl">ID Expiry Date</div>
                <input className="fi" type="date" value={formExp} onChange={(e) => setFormExp(e.target.value)} />
                {getExpiryBadge()}
              </div>
              <div className="fg">
                <div className="fl">Phone (optional)</div>
                <input className="fi" type="tel" placeholder="+974 XXXX XXXX" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="full-id-sec">
            <div className="fl" style={{ marginBottom: '5px' }}>Full ID Raw Data</div>
            <div className="raw-box">{formRaw}</div>
          </div>
        </div>
        {/* Actions Footer */}
        <div className="action-bar">
          {cardMode === 'new' ? (
            <>
              <button type="button" className="btn btn-sm" onClick={clearForm}><i className="ti ti-x" /> Cancel</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => saveGuest(false)}><i className="ti ti-device-floppy" /> Save Only</button>
              <button type="button" className="btn btn-success btn-sm" onClick={() => saveGuest(true)}><i className="ti ti-login" /> Check In &amp; Save</button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-sm" onClick={clearForm}><i className="ti ti-x" /> Close</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={updateGuest}><i className="ti ti-edit" /> Update Details</button>
              {!isCheckedIn && (
                <button type="button" className="btn btn-success btn-sm" onClick={checkInExisting}><i className="ti ti-login" /> Check In Now</button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: '20px'
          }}
          onClick={() => setLightboxImage(null)}
        >
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '15px' }}>
            {/* Show 'Open in new tab' only if it's not a local base64/SVG data URI */}
            {!lightboxImage.startsWith('data:') && (
              <button
                onClick={() => window.open(lightboxImage, '_blank')}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '18px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Open in new tab"
              >
                <i className="ti ti-external-link" />
              </button>
            )}
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="ti ti-x" />
            </button>
          </div>
          <img 
            src={lightboxImage} 
            alt="Large View" 
            style={{ maxWidth: '90%', maxHeight: '85%', objectFit: 'contain', borderRadius: '5px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
            onClick={(e) => e.stopPropagation()}
          />
          <div style={{ color: '#fff', marginTop: '15px', fontSize: '13px', letterSpacing: '0.5px' }}>
            {lightboxImage === currentPhoto ? (
              <span>Profile Image for: <strong>{formName || 'Guest'} ({formIdNum || 'No ID'})</strong></span>
            ) : (
              <span>Document Photocopy for: <strong>{formName || 'Guest'} ({formIdNum || 'No ID'})</strong></span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

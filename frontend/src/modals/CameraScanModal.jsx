import React, { useState, useEffect, useRef } from 'react';

export default function CameraScanModal({
  isOpen,
  onClose,
  onCaptureScan
}) {
  const [docType, setDocType] = useState('QID');
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Stop current camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Enumerate video input devices
  const loadDevices = async () => {
    if (!navigator.mediaDevices) {
      setCameraError('Insecure Origin Blocked: Camera access requires HTTPS, localhost, or browser override configuration. To bypass this on HTTP: open "chrome://flags/#unsafely-treat-insecure-origin-as-secure" in Chrome, add your app URL (e.g. http://' + window.location.host + '), enable the flag, and relaunch your browser.');
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Error listing camera devices:', err);
    }
  };

  // Start camera with selected device ID
  const startCamera = async (deviceId) => {
    stopCamera();
    setCameraError('');
    setIsStarting(true);
    if (!navigator.mediaDevices) {
      setCameraError('Insecure Origin Blocked: Camera access requires HTTPS, localhost, or browser override configuration. To bypass this on HTTP: open "chrome://flags/#unsafely-treat-insecure-origin-as-secure" in Chrome, add your app URL (e.g. http://' + window.location.host + '), enable the flag, and relaunch your browser.');
      setIsStarting(false);
      return;
    }
    try {
      const constraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await loadDevices();
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Could not access camera device. Please check permissions.');
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(selectedDeviceId);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, selectedDeviceId]);

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL('image/jpeg', 0.92);
    const fileName = `${docType}_Camera_${Date.now()}.jpg`;

    stopCamera();
    onCaptureScan(fileName, base64Data, docType);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '680px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--primary, #0f6e56)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-camera" style={{ fontSize: '20px' }} />
            Live WebCam / Camera Scanner
          </h3>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', opacity: 0.8 }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
          
          {/* Controls Bar */}
          <div style={{ display: 'flex', width: '100%', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Document Type:</label>
              <select 
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                <option value="QID">QID (Qatar ID)</option>
                <option value="Passport">Passport</option>
              </select>
            </div>

            {videoDevices.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Camera:</label>
                <select 
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '13px', maxWidth: '200px' }}
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Video Preview Box */}
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: '360px',
            background: '#000',
            borderRadius: '6px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isStarting && (
              <div style={{ color: '#fff', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <i className="ti ti-loader rotate" style={{ fontSize: '20px' }} /> Initializing camera feed...
              </div>
            )}

            {cameraError ? (
              <div style={{ color: '#ff6b6b', padding: '20px', textAlign: 'center', fontSize: '13px' }}>
                <i className="ti ti-camera-off" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }} />
                {cameraError}
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  playsInline 
                  muted 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                {/* Overlay Card Alignment Box */}
                <div style={{
                  position: 'absolute',
                  top: '10%', left: '15%', right: '15%', bottom: '10%',
                  border: '2px dashed rgba(255, 255, 255, 0.8)',
                  borderRadius: '12px',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{
                    color: '#fff',
                    background: 'rgba(0, 0, 0, 0.6)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    Align {docType} inside frame
                  </span>
                </div>
              </>
            )}
          </div>

          <div style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left', background: '#f5f5f5', borderRadius: '5px', padding: '8px 12px', border: '0.5px solid var(--border)', width: '100%' }}>
            <span style={{ fontWeight: 600, color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>Tips for 100% Camera OCR Accuracy:</span>
            <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.4' }}>
              <li>Hold the document <strong>completely flat and straight</strong> inside the dashed frame.</li>
              <li>Avoid light glares, shadows, or reflections directly on the card text.</li>
              <li>Ensure the camera lens is clean and the image is in sharp focus before capturing.</li>
              <li><em>For enterprise-grade 100% accuracy, configure your Google Cloud Vision API Key in the server configuration.</em></li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          background: 'var(--bg-card, #f8f9fa)'
        }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => { stopCamera(); onClose(); }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleCapture}
            disabled={!!cameraError || isStarting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="ti ti-camera-selfie" /> Capture &amp; Read Document
          </button>
        </div>

      </div>
    </div>
  );
}

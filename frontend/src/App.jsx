import React, { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import LicenseGate from './pages/LicenseGate';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import ViewingDateBar from './components/ViewingDateBar';
import ScanSearchCard from './components/ScanSearchCard';
import GuestDetailsCard from './components/GuestDetailsCard';
import LoadingOverlay from './components/LoadingOverlay';
import GuestRecordsTable from './components/GuestRecordsTable';
import StatusActionModal from './modals/StatusActionModal';
import PinConfirmModal from './modals/PinConfirmModal';
import ConfirmModal from './modals/ConfirmModal';
import HistoryLogModal from './modals/HistoryLogModal';
import CameraScanModal from './modals/CameraScanModal';
import SettingsOverlay from './overlays/SettingsOverlay';
import ReportsOverlay from './overlays/ReportsOverlay';
import GuestManagementOverlay from './overlays/GuestManagementOverlay';
import DeletedRecordsOverlay from './overlays/DeletedRecordsOverlay';

export default function App() {
  // ─── License State (BYPASS ACTIVE) ─────────────────────────────
  const [licenseStatus, setLicenseStatus] = useState({ licensed: true, clientName: 'FSQTAR Salon Pro (Active)' });

  // Auth state
  const [user, setUser] = useState(() => localStorage.getItem('user'));

  //   Auth helper: attach JWT to every API request, auto-logout on 401  
  const fetchWithAuth = React.useCallback(async (url, options = {}) => {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const finalUrl = (url.startsWith('/api') && apiBase) ? `${apiBase}${url}` : url;

    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    const res = await fetch(finalUrl, { ...options, headers });
    if (res.status === 401) {
      // Token expired or invalid - force logout
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      setUser(null);
      showToast('Session expired. Please log in again.', 'warn');
    }
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');

  // Password Visibility
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showResetPass1, setShowResetPass1] = useState(false);
  const [showResetPass2, setShowResetPass2] = useState(false);
  const [showCpCurrent, setShowCpCurrent] = useState(false);
  const [showCpNew, setShowCpNew] = useState(false);
  const [showCpConfirm, setShowCpConfirm] = useState(false);

  // Forgot Password state
  const [forgotScreen, setForgotScreen] = useState(false);
  const [resetUser, setResetUser] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Operational Settings
  const [operationalDate, setOperationalDate] = useState('');
  const [dateMode, setDateMode] = useState('auto');
  const [manualRolloverTime, setManualRolloverTime] = useState('00:00');
  const [manualTimeStatus, setManualTimeStatus] = useState('');
  const [scannerFolder, setScannerFolder] = useState('C:\\ScannerOutput');
  const [scannerFolderStatus, setScannerFolderStatus] = useState('');
  const [selectedScanner, setSelectedScanner] = useState('');
  const [scannerApiUrl, setScannerApiUrl] = useState('');
  const [scannerApiUsername, setScannerApiUsername] = useState('');
  const [scannerApiPassword, setScannerApiPassword] = useState('');
  const [visionApiKey, setVisionApiKey] = useState('');
  // OCR Engine toggles (default: all enabled)
  const [ocrPaddleEnabled, setOcrPaddleEnabled] = useState(true);
  const [ocrVisionEnabled, setOcrVisionEnabled] = useState(true);
  const [ocrScannerApiEnabled, setOcrScannerApiEnabled] = useState(true);
  const [ocrTesseractEnabled, setOcrTesseractEnabled] = useState(true);

  // Main App State
  const [dashboardDate, setDashboardDate] = useState('');
  const [guests, setGuests] = useState([]);
  const [showHiddenRecords, setShowHiddenRecords] = useState(false);
  const [stats, setStats] = useState({ totalToday: 0, checkedInToday: 0, savedToday: 0, totalRecords: 0 });
  const [filterDateRange, setFilterDateRange] = useState('today');
  const [filterStartDate, setFilterStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDocType, setFilterDocType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFlag, setFilterFlag] = useState('all');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [isTblMenuOpen, setIsTblMenuOpen] = useState(false);

  // Active Overlay ('reports', 'settings', 'guest-mgmt', or null)
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [reportsTab, setReportsTab] = useState('detail');

  // Form State (Guest Details Card)
  const [showGuestCard, setShowGuestCard] = useState(false);
  const [cardMode, setCardMode] = useState('new'); // 'new' or 'existing'
  const [currentGuestId, setCurrentGuestId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formIdNum, setFormIdNum] = useState('');
  const [formDocType, setFormDocType] = useState(''); // 'QID' or 'Passport'
  const [formNat, setFormNat] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formAge, setFormAge] = useState('-');
  const [formExp, setFormExp] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRaw, setFormRaw] = useState('-');
  const [currentPhoto, setCurrentPhoto] = useState(null); // base64 string
  const [formPhotoCopy, setFormPhotoCopy] = useState(null); // base64 string for scanned document photocopy



  // Change Password state
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpMsg, setCpMsg] = useState({ text: '', ok: false });

  // Delete PIN state
  const [pinAdminPassword, setPinAdminPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState({ text: '', ok: false });
  const [showPinAdminPassword, setShowPinAdminPassword] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  // Guest Management Overlay state
  const [gmSearch, setGmSearch] = useState('');
  const [gmStatus, setGmStatus] = useState('');
  const [gmGuests, setGmGuests] = useState([]);

  // Deleted Records Overlay state
  const [deletedSearch, setDeletedSearch] = useState('');
  const [deletedGuests, setDeletedGuests] = useState([]);

  // Scanner configuration modal
  const [isScannerConfigOpen, setIsScannerConfigOpen] = useState(false);
  const [isCameraScanOpen, setIsCameraScanOpen] = useState(false);
  const [detectedScanners, setDetectedScanners] = useState([]);
  const [tempScannerFolder, setTempScannerFolder] = useState('');
  const [tempSelectedScanner, setTempSelectedScanner] = useState('');
  const [tempScannerApiUrl, setTempScannerApiUrl] = useState('');
  const [tempScannerApiUsername, setTempScannerApiUsername] = useState('');
  const [tempScannerApiPassword, setTempScannerApiPassword] = useState('');
  const [showModalScannerApiPass, setShowModalScannerApiPass] = useState(false);
  const [pendingScanDocType, setPendingScanDocType] = useState('Passport');
  // Holds the WIA error message when scanner is detected but direct scan command failed
  const [scannerWiaError, setScannerWiaError] = useState('');
  const [searchError, setSearchError] = useState(false);
  const [showQualityWarning, setShowQualityWarning] = useState(false);
  const [qualityWarningDocType, setQualityWarningDocType] = useState('QID');
  const warningFileInputRef = useRef(null);
  const [showDocMismatchModal, setShowDocMismatchModal] = useState(false);
  const [mismatchSelectedDocType, setMismatchSelectedDocType] = useState('QID');
  const [mismatchDetectedDocType, setMismatchDetectedDocType] = useState('Passport');
  const [mismatchData, setMismatchData] = useState(null);

  // OCR Progress Loader state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrLoadingStage, setOcrLoadingStage] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);

  // Scanner Modal Folder Picker state
  const [showDirPicker, setShowDirPicker] = useState(false);
  const [pickerPath, setPickerPath] = useState('');
  const [pickerDirs, setPickerDirs] = useState([]);
  const [pickerParent, setPickerParent] = useState(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState('');

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Reports Overlay state
  const [rptPeriod, setRptPeriod] = useState('today');
  const [rptDateFrom, setRptDateFrom] = useState(getTodayString());
  const [rptDateTo, setRptDateTo] = useState(getTodayString());
  const [rptIdNum, setRptIdNum] = useState('');
  const [rptStatus, setRptStatus] = useState('');
  const [rptDocType, setRptDocType] = useState('');
  const [rptCheckedIn, setRptCheckedIn] = useState('');
  const [rptNationality, setRptNationality] = useState('');
  const [rptMinAge, setRptMinAge] = useState('');
  const [rptMaxAge, setRptMaxAge] = useState('');
  const [rptDetailResults, setRptDetailResults] = useState([]);

  const handlePeriodChange = (val) => {
    setRptPeriod(val);
    const today = getTodayString();
    if (val === 'today') {
      setRptDateFrom(today);
      setRptDateTo(today);
    } else if (val === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const yesterday = `${year}-${month}-${day}`;
      setRptDateFrom(yesterday);
      setRptDateTo(yesterday);
    } else if (val === 'all') {
      setRptDateFrom('');
      setRptDateTo('');
    }
  };

  const [sumPeriod, setSumPeriod] = useState('today');
  const [sumDateFrom, setSumDateFrom] = useState(getTodayString());
  const [sumDateTo, setSumDateTo] = useState(getTodayString());
  const [sumResults, setSumResults] = useState(null);

  const handleSumPeriodChange = (val) => {
    setSumPeriod(val);
    const today = getTodayString();
    if (val === 'today') {
      setSumDateFrom(today);
      setSumDateTo(today);
    } else if (val === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const yesterday = `${year}-${month}-${day}`;
      setSumDateFrom(yesterday);
      setSumDateTo(yesterday);
    } else if (val === 'all') {
      setSumDateFrom('');
      setSumDateTo('');
    }
  };

  // Status Action Modal State (Warning / Block / Unblock)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalGuest, setStatusModalGuest] = useState(null);
  const [statusModalType, setStatusModalType] = useState(''); // 'warning', 'blocked', 'unblock'
  const [statusModalReason, setStatusModalReason] = useState('');
  const [statusModalErr, setStatusModalErr] = useState(false);

  // PIN Authorization Modal State (Soft Delete, Restore, Permanent Destroy)
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalTitle, setPinModalTitle] = useState('');
  const [pinModalMessage, setPinModalMessage] = useState('');
  const [pinModalAction, setPinModalAction] = useState(''); // 'soft_delete', 'restore', 'permanent_delete'
  const [pinModalGuestId, setPinModalGuestId] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinModalErr, setPinModalErr] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  // History Log Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyModalGuest, setHistoryModalGuest] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const barcodeInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Form references
  const guestCardRef = useRef(null);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Format Helper Functions
  const fmtDate = (d) => {
    if (!d) return '-';
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtDateISO = (d) => {
    if (!d) return '';
    const dateObj = new Date(d);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  // Fetch Settings and Today's Guests
  const loadSystemSettings = async () => {
    try {
      const res = await fetchWithAuth('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setOperationalDate(data.operational_date);
        setDateMode(data.date_mode);
        setManualRolloverTime(data.manual_rollover_time);
        setScannerFolder(data.scanner_folder || 'C:\\ScannerOutput');
        setSelectedScanner(data.selected_scanner || '');
        setScannerApiUrl(data.scanner_api_url || '');
        setScannerApiUsername(data.scanner_api_username || '');
        setScannerApiPassword(data.scanner_api_password || '');
        setVisionApiKey(data.vision_api_key || '');
        // OCR engine toggles — default to enabled (true) if not yet set in DB
        setOcrPaddleEnabled(data.ocr_paddle_enabled !== '0');
        setOcrVisionEnabled(data.ocr_vision_enabled !== '0');
        setOcrScannerApiEnabled(data.ocr_scanner_api_enabled !== '0');
        setOcrTesseractEnabled(data.ocr_tesseract_enabled !== '0');

        // Default dashboard date to operational date if not set yet
        setDashboardDate(prev => prev || data.operational_date);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const handleApplyScannerFolder = async (
    folderPath = scannerFolder,
    scannerId = selectedScanner,
    apiUrl = scannerApiUrl,
    apiUsername = scannerApiUsername,
    apiPassword = scannerApiPassword
  ) => {
    if (!folderPath.trim()) {
      showToast('Please enter a valid directory path', 'warn');
      return;
    }
    try {
      const res = await fetchWithAuth('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scannerFolder: folderPath.trim(),
          selectedScanner: scannerId,
          scannerApiUrl: apiUrl,
          scannerApiUsername: apiUsername,
          scannerApiPassword: apiPassword,
          visionApiKey: visionApiKey,
          ocrPaddleEnabled,
          ocrVisionEnabled,
          ocrScannerApiEnabled,
          ocrTesseractEnabled
        })
      });
      if (res.ok) {
        setScannerFolderStatus('Saved successfully');
        showToast('Scanner configuration saved successfully', 'success');
        loadSystemSettings();
        setTimeout(() => setScannerFolderStatus(''), 3000);
      }
    } catch (err) {
      showToast('Error setting scanner configuration.', 'warn');
    }
  };
  const fetchAvailableScanners = async () => {
    try {
      const res = await fetchWithAuth('/api/settings/scanners');
      if (res.ok) {
        const data = await res.json();
        setDetectedScanners(data);
        return data;
      }
    } catch (err) {
      console.error('Error fetching scanners:', err);
    }
    return [];
  };

  const loadDirPickerPath = async (targetPath = '') => {
    setPickerLoading(true);
    setPickerError('');
    try {
      const res = await fetchWithAuth(`/api/settings/local-dir?path=${encodeURIComponent(targetPath)}`);
      if (res.ok) {
        const data = await res.json();
        setPickerPath(data.currentPath);
        setPickerDirs(data.directories || []);
        setPickerParent(data.parent);
      } else {
        const errData = await res.json();
        setPickerError(errData.error || 'Failed to read directory');
      }
    } catch (err) {
      setPickerError('Network error or access denied');
    } finally {
      setPickerLoading(false);
    }
  };

  const handleOpenDirPicker = () => {
    setPickerPath(tempScannerFolder || '');
    loadDirPickerPath(tempScannerFolder || '');
    setShowDirPicker(true);
  };

  const handleSelectDirPicker = () => {
    if (pickerPath) {
      setTempScannerFolder(pickerPath);
    }
    setShowDirPicker(false);
  };
  const loadDashboardData = async () => {
    if (!dashboardDate) return;
    try {
      let url = `/api/guests?show_hidden=${showHiddenRecords}`;
      if (filterDateRange === 'custom') {
        if (!filterStartDate || !filterEndDate) return;
        url += `&startDate=${filterStartDate}&endDate=${filterEndDate}`;
      } else {
        url += `&date=${dashboardDate}`;
      }
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setGuests(data);
      }
    } catch (err) {
      console.error('Error loading guests:', err);
    }
  };

  const calculateStats = async () => {
    if (!operationalDate || !dashboardDate) return;
    try {
      let url = `/api/guests?show_hidden=true`;
      if (filterDateRange === 'custom') {
        if (!filterStartDate || !filterEndDate) return;
        url += `&startDate=${filterStartDate}&endDate=${filterEndDate}`;
      } else {
        url += `&date=${dashboardDate}`;
      }
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const dayG = await res.json();
        const visibleDayG = dayG.filter(g => !g.hidden);
        const checkedIn = visibleDayG.filter(g => g.checkedIn).length;
        const saved = visibleDayG.filter(g => !g.checkedIn).length;

        setStats({
          totalToday: visibleDayG.length,
          checkedInToday: checkedIn,
          savedToday: saved,
          totalRecords: visibleDayG.length // Total Database stat card shows active scope count
        });
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // ─── License Check on Mount ────────────────────────────────────
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || '';
    fetch(`${API}/api/license/status`)
      .then(r => r.json())
      .then(d => setLicenseStatus(d))
      .catch(() => {
        // If backend is completely unreachable, allow access so auth gate still works
        setLicenseStatus({ licensed: true, reason: 'Backend unreachable — offline mode' });
      });
  }, []);

  // Re-check license periodically while app is open (every 30 minutes, or 10 seconds if in grace period)
  useEffect(() => {
    const isGraceActive = licenseStatus?.graceRemaining !== undefined && licenseStatus?.graceRemaining !== null;
    const intervalTime = isGraceActive ? 10 * 1000 : 30 * 60 * 1000;

    const interval = setInterval(() => {
      const API = import.meta.env.VITE_API_URL || '';
      fetch(`${API}/api/license/status`)
        .then(r => r.json())
        .then(d => setLicenseStatus(d))
        .catch(() => { });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [licenseStatus]);

  // Lifecycle Hooks
  useEffect(() => {
    if (user) {
      loadSystemSettings();
    }
  }, [user]);

  useEffect(() => {
    if (user && dashboardDate) {
      loadDashboardData();
      calculateStats();
    }
  }, [user, dashboardDate, filterDateRange, filterStartDate, filterEndDate, showHiddenRecords]);

  // Periodic background system settings sync (runs every 10 seconds, suspended when user is editing settings)
  useEffect(() => {
    if (!user || activeOverlay === 'settings' || isScannerConfigOpen) return;
    const timer = setInterval(() => {
      loadSystemSettings();
    }, 10000);
    return () => clearInterval(timer);
  }, [user, activeOverlay, isScannerConfigOpen]);

  // Global Keyboard Wedge Scanner Listener (for USB HID barcode/swipe/MRZ scanners)
  useEffect(() => {
    if (!user) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e) => {
      const activeEl = document.activeElement;

      // If user is editing a form field (name, phone, dob, etc.), don't hijack keys unless it's a super fast hardware keyboard wedge swipe
      const isEditingForm = activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        !activeEl.classList.contains('barcode-input');

      const currentTime = Date.now();
      const delay = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Reset buffer if delay is too long (human typing is > 70ms per key)
      if (delay > 70) {
        buffer = '';
      }

      // Ignore modifiers
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      if (e.key === 'Enter') {
        const scannedText = buffer.trim();
        buffer = ''; // Reset

        if (scannedText.length > 0) {
          // Check if this looks like a passport/ID scan
          const isPassportMRZ = (scannedText.length >= 80 && scannedText.startsWith('P<')) ||
            (scannedText.includes('P<') && scannedText.length >= 44);
          const isNumericQID = /^\d{11}$/.test(scannedText);
          const isGenericBarcode = scannedText.length >= 5;

          // If we are in form editing mode, only allow it if it's clearly a high-speed MRZ/QID hardware input
          if (isEditingForm && !isPassportMRZ && !isNumericQID) {
            return;
          }

          if (isPassportMRZ || isNumericQID || isGenericBarcode) {
            e.preventDefault();
            setBarcodeSearch(scannedText);
            showToast(`Hardware scan detected!`, 'success');
            setTimeout(() => {
              handleBarcodeSearch({ preventDefault: () => { } }, scannedText);
            }, 50);
          }
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [user]);

  // Guest Management list reload
  useEffect(() => {
    if (activeOverlay === 'guest-mgmt') {
      fetchGuestMgmtList();
    }
  }, [activeOverlay, gmSearch, gmStatus]);

  const fetchGuestMgmtList = async () => {
    try {
      const res = await fetchWithAuth(`/api/guests/all?q=${encodeURIComponent(gmSearch)}&status=${gmStatus}&show_deleted=false`);
      if (res.ok) {
        const data = await res.json();
        setGmGuests(data);
      }
    } catch (err) {
      console.error('Error fetching guest management records:', err);
    }
  };

  // Deleted archive list reload
  useEffect(() => {
    if (activeOverlay === 'deleted-records') {
      fetchDeletedList();
    }
  }, [activeOverlay, deletedSearch]);

  const fetchDeletedList = async () => {
    try {
      const res = await fetchWithAuth(`/api/guests/all?q=${encodeURIComponent(deletedSearch)}&show_deleted=true`);
      if (res.ok) {
        const data = await res.json();
        setDeletedGuests(data);
      }
    } catch (err) {
      console.error('Error fetching soft-deleted records:', err);
    }
  };

  // Actions
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');
    if (!loginUser.trim() || !loginPass) {
      setLoginError('Please enter username and password.');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser.trim(), password: loginPass })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('user', data.username);
        localStorage.setItem('authToken', data.token);
        setUser(data.username);
        showToast(`Welcome, ${data.username}!`, 'success');
      } else {
        setLoginError(data.error || 'Invalid username or password.');
        setLoginPass('');
      }
    } catch (err) {
      setLoginError('Server connection error. Please try again.');
    }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showForceResetConfirm, setShowForceResetConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restorePayload, setRestorePayload] = useState(null);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const doLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    setUser(null);
    setLoginUser('');
    setLoginPass('');
    setLoginSuccessMsg('');
    setShowGuestCard(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (!resetUser.trim() || !resetCode.trim() || !resetNewPass || !resetConfirmPass) {
      setForgotError('Please fill in all fields.');
      return;
    }
    if (resetNewPass.length < 8) {
      setForgotError('New password must be at least 8 characters.');
      return;
    }
    if (resetNewPass !== resetConfirmPass) {
      setForgotError('Passwords do not match.');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: resetUser.trim(),
          code: resetCode.trim().toUpperCase(),
          newPassword: resetNewPass
        })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotScreen(false);
        setLoginUser(resetUser.trim());
        setLoginPass('');
        setLoginSuccessMsg('Password reset successfully. Please sign in with your new password.');
        setResetUser('');
        setResetCode('');
        setResetNewPass('');
        setResetConfirmPass('');
      } else {
        setForgotError(data.error || 'Error resetting password.');
      }
    } catch (err) {
      setForgotError('Server connection error.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setCpMsg({ text: '', ok: false });
    if (!cpCurrent || !cpNew || !cpConfirm) {
      setCpMsg({ text: 'All fields are required.', ok: false });
      return;
    }
    if (cpNew.length < 8) {
      setCpMsg({ text: 'New password must be at least 8 characters.', ok: false });
      return;
    }
    if (cpNew !== cpConfirm) {
      setCpMsg({ text: 'New passwords do not match.', ok: false });
      return;
    }

    try {
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user,
          currentPassword: cpCurrent,
          newPassword: cpNew
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCpCurrent('');
        setCpNew('');
        setCpConfirm('');
        setCpMsg({ text: 'Password changed successfully!', ok: true });
        showToast('Password updated successfully', 'success');
        setTimeout(() => setCpMsg({ text: '', ok: false }), 3000);
      } else {
        setCpMsg({ text: data.error || 'Error updating password.', ok: false });
      }
    } catch (err) {
      setCpMsg({ text: 'Server connection error.', ok: false });
    }
  };

  const handleUpdateDeletePin = async (e) => {
    e.preventDefault();
    setPinMsg({ text: '', ok: false });
    if (!pinAdminPassword || !newPin) {
      setPinMsg({ text: 'All fields are required.', ok: false });
      return;
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      setPinMsg({ text: 'PIN must be a 4-to-6 digit numeric string.', ok: false });
      return;
    }

    try {
      const res = await fetchWithAuth('/api/settings/delete-pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pinAdminPassword,
          newPin
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPinAdminPassword('');
        setNewPin('');
        setPinMsg({ text: 'Deletion PIN updated successfully!', ok: true });
        showToast('Deletion PIN updated successfully', 'success');
        setTimeout(() => setPinMsg({ text: '', ok: false }), 3000);
      } else {
        setPinMsg({ text: data.error || 'Failed to update Deletion PIN.', ok: false });
      }
    } catch (err) {
      setPinMsg({ text: 'Server connection error.', ok: false });
    }
  };

  // Barcode / ID Search Lookup
  const parseDateString = (str) => {
    if (!str) return '';
    const clean = str.trim();
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 3) {
        // Convert dd/mm/yyyy to yyyy-mm-dd
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return clean;
  };

  // Barcode / ID Search Lookup
  const handleBarcodeSearch = async (e, overrideQuery) => {
    if (e) e.preventDefault();
    const query = (overrideQuery !== undefined ? overrideQuery : barcodeSearch).trim();
    if (!query) {
      showToast('Please enter a Guest ID or scan a barcode', 'warn');
      return;
    }

    const lines = query.split(/\r?\n|;/);

    // Check if query is a standard ICAO Passport MRZ (2 lines of 44 chars, first line starting with P<)
    if (lines.length >= 2 && lines[0].startsWith('P<') && lines[0].length >= 35) {
      try {
        const line1 = lines[0].trim().replace(/\s+/g, '');
        const line2 = lines[1].trim().replace(/\s+/g, '');

        // Extract country code (indices 2 to 5)
        const countryCode = line1.substring(2, 5);

        // Extract Name: LASTNAME<<FIRSTNAME
        const namePart = line1.substring(5).replace(/<<+/g, '  ').replace(/<+/g, ' ').trim();
        let name = namePart;
        if (namePart.includes('  ')) {
          const parts = namePart.split('  ');
          name = `${parts[1]} ${parts[0]}`.trim();
        }
        // Proper title case the name
        name = name.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');

        // Extract Passport Number (first 9 chars, strip angle brackets)
        const idNum = line2.substring(0, 9).replace(/</g, '').trim();

        // Extract DOB (YYMMDD at index 13 to 19)
        const yy = line2.substring(13, 15);
        const mm = line2.substring(15, 17);
        const dd = line2.substring(17, 19);
        const currentYear = new Date().getFullYear() % 100;
        const century = parseInt(yy) > currentYear ? '19' : '20';
        const dob = `${century}${yy}-${mm}-${dd}`;

        // Extract Expiry (YYMMDD at index 21 to 27)
        const expYy = line2.substring(21, 23);
        const expMm = line2.substring(23, 25);
        const expDd = line2.substring(25, 27);
        const expCentury = parseInt(expYy) < 50 ? '20' : '19';
        const expiryDate = `${expCentury}${expYy}-${expMm}-${expDd}`;

        // Map ICAO country code to nationality (comprehensive)
        const NATIONALITY_MAP = {
          // Middle East
          QAT: 'Qatari', ARE: 'Emirati', SAU: 'Saudi Arabian', KWT: 'Kuwaiti',
          BHR: 'Bahraini', OMN: 'Omani', YEM: 'Yemeni', JOR: 'Jordanian',
          LBN: 'Lebanese', SYR: 'Syrian', IRQ: 'Iraqi', IRN: 'Iranian',
          ISR: 'Israeli', PSE: 'Palestinian', EGY: 'Egyptian',
          // South Asia
          IND: 'Indian', PAK: 'Pakistani', BGD: 'Bangladeshi', LKA: 'Sri Lankan',
          NPL: 'Nepali', BTN: 'Bhutanese', MDV: 'Maldivian', AFG: 'Afghan',
          // Southeast Asia
          PHL: 'Filipino', IDN: 'Indonesian', MYS: 'Malaysian', THA: 'Thai',
          VNM: 'Vietnamese', SGP: 'Singaporean', MMR: 'Burmese', KHM: 'Cambodian',
          LAO: 'Laotian', BRN: 'Bruneian', TLS: 'Timorese',
          // East Asia
          CHN: 'Chinese', JPN: 'Japanese', KOR: 'South Korean', PRK: 'North Korean',
          HKG: 'Hongkonger', MAC: 'Macanese', TWN: 'Taiwanese', MNG: 'Mongolian',
          // Africa
          NGA: 'Nigerian', ETH: 'Ethiopian', KEN: 'Kenyan', TZA: 'Tanzanian',
          GHA: 'Ghanaian', ZAF: 'South African', UGA: 'Ugandan', ZMB: 'Zambian',
          ZWE: 'Zimbabwean', DZA: 'Algerian', MAR: 'Moroccan', TUN: 'Tunisian',
          LBY: 'Libyan', SDN: 'Sudanese', SOM: 'Somali', CMR: 'Cameroonian',
          SEN: 'Senegalese', CIV: 'Ivorian', MDG: 'Malagasy', MOZ: 'Mozambican',
          AGO: 'Angolan', RWA: 'Rwandan', BDI: 'Burundian', ERI: 'Eritrean',
          // Europe
          GBR: 'British', DEU: 'German', FRA: 'French', ITA: 'Italian',
          ESP: 'Spanish', PRT: 'Portuguese', NLD: 'Dutch', BEL: 'Belgian',
          CHE: 'Swiss', AUT: 'Austrian', POL: 'Polish', SWE: 'Swedish',
          NOR: 'Norwegian', DNK: 'Danish', FIN: 'Finnish', GRC: 'Greek',
          CZE: 'Czech', HUN: 'Hungarian', ROU: 'Romanian', BGR: 'Bulgarian',
          HRV: 'Croatian', SRB: 'Serbian', SVK: 'Slovak', SVN: 'Slovenian',
          IRL: 'Irish', UKR: 'Ukrainian', RUS: 'Russian', BLR: 'Belarusian',
          LTU: 'Lithuanian', LVA: 'Latvian', EST: 'Estonian', MKD: 'Macedonian',
          ALB: 'Albanian', BIH: 'Bosnian', MNE: 'Montenegrin', MDA: 'Moldovan',
          // Americas
          USA: 'American', CAN: 'Canadian', MEX: 'Mexican', BRA: 'Brazilian',
          ARG: 'Argentine', COL: 'Colombian', CHL: 'Chilean', PER: 'Peruvian',
          VEN: 'Venezuelan', ECU: 'Ecuadorian', BOL: 'Bolivian', PRY: 'Paraguayan',
          URY: 'Uruguayan', GTM: 'Guatemalan', HND: 'Honduran', SLV: 'Salvadoran',
          NIC: 'Nicaraguan', CRI: 'Costa Rican', PAN: 'Panamanian', DOM: 'Dominican',
          CUB: 'Cuban', HTI: 'Haitian', JAM: 'Jamaican', TTO: 'Trinidadian',
          // Oceania
          AUS: 'Australian', NZL: 'New Zealander', FJI: 'Fijian', PNG: 'Papua New Guinean',
          // Central Asia
          KAZ: 'Kazakhstani', UZB: 'Uzbek', TKM: 'Turkmen', KGZ: 'Kyrgyz', TJK: 'Tajik',
          // Turkey & Caucasus
          TUR: 'Turkish', AZE: 'Azerbaijani', ARM: 'Armenian', GEO: 'Georgian',
        };
        const nationality = NATIONALITY_MAP[countryCode] || countryCode;

        clearForm();
        setShowGuestCard(true);
        setCardMode('new');
        setFormName(name);
        setFormIdNum(idNum);
        setFormDocType('Passport');
        setFormNat(nationality);
        setFormDob(dob);
        setFormExp(expiryDate);
        setFormRaw(query);
        calcAge(dob);

        showToast('Passport MRZ scanned successfully', 'success');

        setTimeout(() => {
          guestCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        return;
      } catch (err) {
        console.error('Failed to parse MRZ:', err);
      }
    }

    // Try to parse raw multi-line barcode data (QID barcodes)
    if (lines.length > 1) {
      try {
        let name = '';
        let idNum = '';
        let docType = 'QID';
        let nationality = '';
        let dob = '';
        let expiryDate = '';

        idNum = lines[0].trim();
        if (lines[1]) name = lines[1].trim();

        lines.forEach(line => {
          const lower = line.toLowerCase();
          if (lower.includes('nationality:')) {
            nationality = line.split(':')[1].trim();
          } else if (lower.includes('dob:')) {
            dob = parseDateString(line.split(':')[1]);
          } else if (lower.includes('expiry:')) {
            expiryDate = parseDateString(line.split(':')[1]);
          }
        });

        if (idNum.startsWith('P') || idNum.length === 9 || idNum.match(/^[A-Z0-9]{8,9}$/)) {
          docType = 'Passport';
        }

        const BARCODE_NAT_MAP = {
          QAT: 'Qatari', ARE: 'Emirati', SAU: 'Saudi Arabian', KWT: 'Kuwaiti',
          BHR: 'Bahraini', OMN: 'Omani', YEM: 'Yemeni', JOR: 'Jordanian',
          LBN: 'Lebanese', SYR: 'Syrian', IRQ: 'Iraqi', IRN: 'Iranian',
          ISR: 'Israeli', PSE: 'Palestinian', EGY: 'Egyptian',
          IND: 'Indian', PAK: 'Pakistani', BGD: 'Bangladeshi', LKA: 'Sri Lankan',
          NPL: 'Nepali', BTN: 'Bhutanese', MDV: 'Maldivian', AFG: 'Afghan',
          PHL: 'Filipino', IDN: 'Indonesian', MYS: 'Malaysian', THA: 'Thai',
          VNM: 'Vietnamese', SGP: 'Singaporean', MMR: 'Burmese', KHM: 'Cambodian',
          CHN: 'Chinese', JPN: 'Japanese', KOR: 'South Korean', HKG: 'Hongkonger',
          NGA: 'Nigerian', ETH: 'Ethiopian', KEN: 'Kenyan', TZA: 'Tanzanian',
          GHA: 'Ghanaian', ZAF: 'South African', UGA: 'Ugandan', DZA: 'Algerian',
          MAR: 'Moroccan', TUN: 'Tunisian', LBY: 'Libyan', SDN: 'Sudanese',
          SOM: 'Somali', CMR: 'Cameroonian', SEN: 'Senegalese',
          GBR: 'British', DEU: 'German', FRA: 'French', ITA: 'Italian',
          ESP: 'Spanish', PRT: 'Portuguese', NLD: 'Dutch', BEL: 'Belgian',
          CHE: 'Swiss', AUT: 'Austrian', POL: 'Polish', SWE: 'Swedish',
          NOR: 'Norwegian', DNK: 'Danish', FIN: 'Finnish', GRC: 'Greek',
          IRL: 'Irish', UKR: 'Ukrainian', RUS: 'Russian',
          USA: 'American', CAN: 'Canadian', MEX: 'Mexican', BRA: 'Brazilian',
          ARG: 'Argentine', COL: 'Colombian', CHL: 'Chilean', PER: 'Peruvian',
          AUS: 'Australian', NZL: 'New Zealander',
          KAZ: 'Kazakhstani', UZB: 'Uzbek', TUR: 'Turkish', AZE: 'Azerbaijani',
        };
        if (nationality && BARCODE_NAT_MAP[nationality.toUpperCase()]) {
          nationality = BARCODE_NAT_MAP[nationality.toUpperCase()];
        }

        clearForm();
        setShowGuestCard(true);
        setCardMode('new');
        setFormName(name);
        setFormIdNum(idNum);
        setFormDocType(docType);
        setFormNat(nationality);
        setFormDob(dob);
        setFormExp(expiryDate);
        setFormRaw(query);
        calcAge(dob);

        showToast('Document barcode scanned successfully', 'success');

        setTimeout(() => {
          guestCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        return;
      } catch (err) {
        console.error('Failed to parse scan data:', err);
      }
    }



    // Check if the record exists in the database
    try {
      const res = await fetchWithAuth(`/api/guests/lookup?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchError(false);
        if (data.isDeleted) {
          setPinModalGuestId(data.id);
          setPinModalAction('restore');
          setPinModalTitle('Restore Deleted Record');
          setPinModalMessage(`The guest "${data.name}" is in the soft-deleted archive. Enter Deletion PIN to restore them.`);
          setPinModalOpen(true);
          return;
        }
        loadExistingGuest(data);
        showToast(`Guest found: ${data.name} (ID: ${data.idNum})`, 'success');
        setTimeout(() => {
          guestCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      } else {
        setSearchError(true);
        // Extract candidate ID if query is numeric / alphanumeric barcode
        const cleanId = query.replace(/[^A-Za-z0-9]/g, '');
        if (cleanId.length >= 6 && cleanId.length <= 20) {
          clearForm();
          setShowGuestCard(true);
          setCardMode('new');
          setFormIdNum(cleanId);
          setFormDocType(/^\d{11}$/.test(cleanId) ? 'QID' : 'Passport');
          showToast(`Scanned ID ${cleanId}: No existing record in DB. Pre-filled into New Entry form.`, 'info');
          setTimeout(() => {
            guestCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
        } else {
          showToast('No guest record found with this ID or Name', 'warn');
        }
      }
    } catch (err) {
      setSearchError(true);
      showToast('Error searching guest', 'warn');
    }
  };

  const loadExistingGuest = async (g) => {
    setShowGuestCard(true);
    setCardMode('existing');
    setCurrentGuestId(g.id);
    setFormName(g.name);
    setFormIdNum(g.idNum);
    setFormDocType(g.docType);
    setFormNat(g.nationality);
    setFormDob(g.dob);
    setFormExp(g.expiryDate);
    setFormPhone(g.phone || '');
    setFormRaw(g.rawData || '-');
    setFormPhotoCopy(null);

    // Fetch photo copy dynamically on-demand to keep bulk lists lightweight
    if (g.photo) {
      setCurrentPhoto(g.photo);
    } else {
      setCurrentPhoto(null);
      try {
        const photoRes = await fetchWithAuth(`/api/guests/${g.id}/photo`);
        if (photoRes.ok) {
          const photoData = await photoRes.json();
          setCurrentPhoto(photoData.photo);
        }
      } catch (err) {
        console.error('Failed to load guest photo:', err);
      }
    }

    // Recalculate age & check expiry
    calcAge(g.dob);

    // Status warning feedback
    if (g.statusInfo && g.statusInfo.current === 'blocked') {
      showToast(`⚠️ This guest is BLOCKED - ${g.statusInfo.blockedReason || 'no reason given'}`, 'warn');
    } else if (g.statusInfo && g.statusInfo.current === 'warning') {
      showToast(`⚠️ This guest has a WARNING on file - ${g.statusInfo.warningReason || 'no reason given'}`, 'warn');
    } else {
      showToast('Guest record loaded', 'success');
    }

    // Scroll to card
    setTimeout(() => {
      guestCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  // Save / Update guest details
  const saveGuest = async (checkIn) => {
    if (!formName.trim() || !formIdNum.trim()) {
      showToast('Name and ID Number are required', 'warn');
      return;
    }

    if (!formNat.trim()) {
      showToast('Nationality is required', 'warn');
      return;
    }

    if (!formDob) {
      showToast('Date of Birth is required', 'warn');
      return;
    }

    if (!formExp) {
      showToast('Expiry Date is required', 'warn');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(formExp);
    if (expDate < today) {
      showToast('Cannot save — ID is expired. Please verify the document.', 'warn');
      return;
    }

    const payload = {
      name: formName.trim(),
      idNum: formIdNum.trim(),
      docType: formDocType,
      nationality: formNat.trim(),
      dob: formDob,
      expiryDate: formExp,
      phone: formPhone.trim(),
      rawData: formRaw,
      photo: currentPhoto,
      photoCopy: formPhotoCopy,
      checkedIn: checkIn
    };

    try {
      const res = await fetchWithAuth('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(checkIn ? 'Guest checked in & saved' : 'Guest saved successfully', 'success');
        clearForm();
        loadDashboardData();
        calculateStats();
      } else {
        if (data.error === 'GUEST_SOFT_DELETED') {
          setPinModalGuestId(data.id);
          setPinModalAction('restore');
          setPinModalTitle('Restore Deleted Record');
          setPinModalMessage(`The guest with ID "${formIdNum}" is in the soft-deleted archive. Enter Deletion PIN to restore them.`);
          setPinModalOpen(true);
          return;
        }

        showToast(data.error || 'Error saving guest details.', 'warn');
        if (data.error && data.error.includes('exists')) {
          // If guest duplicate, load them instead
          const lookupRes = await fetchWithAuth(`/api/guests/lookup?q=${encodeURIComponent(formIdNum.trim())}`);
          if (lookupRes.ok) {
            const existingG = await lookupRes.json();
            loadExistingGuest(existingG);
          }
        }
      }
    } catch {
      showToast('Server connection error while saving.', 'warn');
    }
  };

  const updateGuest = async () => {
    if (!formName.trim() || !formIdNum.trim()) {
      showToast('Name and ID Number are required', 'warn');
      return;
    }

    if (!formNat.trim()) {
      showToast('Nationality is required', 'warn');
      return;
    }

    if (!formDob) {
      showToast('Date of Birth is required', 'warn');
      return;
    }

    if (!formExp) {
      showToast('Expiry Date is required', 'warn');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(formExp);
    if (expDate < today) {
      showToast('Cannot update — ID is expired. Please verify the document.', 'warn');
      return;
    }

    const payload = {
      name: formName.trim(),
      idNum: formIdNum.trim(),
      docType: formDocType,
      nationality: formNat.trim(),
      dob: formDob,
      expiryDate: formExp,
      phone: formPhone.trim(),
      rawData: formRaw,
      photo: currentPhoto,
      photoCopy: formPhotoCopy
    };

    try {
      const res = await fetchWithAuth(`/api/guests/${currentGuestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Guest record updated', 'success');
        clearForm();
        loadDashboardData();
        calculateStats();
      } else {
        showToast(data.error || 'Error updating guest.', 'warn');
      }
    } catch {
      showToast('Server connection error.', 'warn');
    }
  };

  const checkInExisting = async () => {
    try {
      const res = await fetchWithAuth(`/api/guests/${currentGuestId}/check-in`, {
        method: 'PUT'
      });
      if (res.ok) {
        showToast('Guest checked in successfully', 'success');
        clearForm();
        loadDashboardData();
        calculateStats();
      } else {
        showToast('Error checking in guest.', 'warn');
      }
    } catch {
      showToast('Server connection error.', 'warn');
    }
  };

  // Toggle Hidden Status
  const toggleHideGuest = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/guests/${id}/hide`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.hidden ? 'Record hidden - excluded from dashboard counts' : 'Record unhidden - included in dashboard counts', data.hidden ? 'warn' : 'success');
        loadDashboardData();
        calculateStats();
        if (activeOverlay === 'guest-mgmt') {
          fetchGuestMgmtList();
        }
      }
    } catch {
      showToast('Server connection error.', 'warn');
    }
  };

  // PIN Authorization Actions (Soft Delete, Restore, Permanent Destroy)
  const handlePinCancel = () => {
    setPinModalOpen(false);
    setPinModalTitle('');
    setPinModalMessage('');
    setPinModalAction('');
    setPinModalGuestId(null);
    setPinValue('');
    setPinModalErr('');
    setShowPin(false);
    setDeleteReason('');
  };

  const handleDeleteTrigger = (id) => {
    setPinModalGuestId(id);
    setPinModalAction('soft_delete');
    setPinModalTitle('Delete Record');
    setPinModalMessage('This visitor record will be moved to the soft-deleted archive.');
    setPinModalOpen(true);
  };

  const handleRestoreTrigger = (guest) => {
    setPinModalGuestId(guest.id);
    setPinModalAction('restore');
    setPinModalTitle('Restore Record');
    setPinModalMessage(`Are you sure you want to restore the record of "${guest.name}"?`);
    setPinModalOpen(true);
  };

  const handlePermanentDeleteTrigger = (guest) => {
    setPinModalGuestId(guest.id);
    setPinModalAction('permanent_delete');
    setPinModalTitle('Permanently Destroy Record');
    setPinModalMessage(`WARNING: This will permanently delete the record of "${guest.name}" and all history logs. This action cannot be undone.`);
    setPinModalOpen(true);
  };

  const executePinAuthorizedAction = async () => {
    if (!pinValue) {
      setPinModalErr('PIN code is required.');
      return;
    }

    try {
      let url = '';
      let method = 'POST';
      let payload = { pin: pinValue };

      if (pinModalAction === 'soft_delete') {
        if (!deleteReason.trim()) {
          setPinModalErr('Please enter a reason for deletion.');
          return;
        }
        url = `/api/guests/${pinModalGuestId}/delete`;
        method = 'POST';
        payload = { pin: pinValue, reason: deleteReason.trim() };
      } else if (pinModalAction === 'restore') {
        url = `/api/guests/${pinModalGuestId}/restore`;
        method = 'POST';
      } else if (pinModalAction === 'permanent_delete') {
        url = `/api/guests/${pinModalGuestId}/permanent`;
        method = 'POST';
      }

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        if (pinModalAction === 'soft_delete') {
          showToast('Record soft-deleted', 'success');
        } else if (pinModalAction === 'restore') {
          showToast('Record restored successfully', 'success');
        } else if (pinModalAction === 'permanent_delete') {
          showToast('Record permanently deleted', 'success');
        }

        handlePinCancel();
        loadDashboardData();
        calculateStats();

        // Refresh overlays if open
        if (activeOverlay === 'guest-mgmt') fetchGuestMgmtList();
        if (activeOverlay === 'deleted-records') fetchDeletedList();
      } else {
        setPinModalErr(data.error || 'Incorrect Deletion PIN. Try again.');
        setPinValue('');
      }
    } catch {
      setPinModalErr('Server connection error.');
    }
  };

  // Settings rollover actions
  const handleDateModeChange = async (mode) => {
    try {
      const res = await fetchWithAuth('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateMode: mode })
      });
      if (res.ok) {
        setDateMode(mode);
        showToast(mode === 'auto' ? 'Automatic date change enabled' : 'Manual rollover mode enabled');
        loadSystemSettings();
      }
    } catch {
      showToast('Error updating date mode.', 'warn');
    }
  };

  const handleApplyManualTime = async () => {
    if (!manualRolloverTime) {
      showToast('Please select a time', 'warn');
      return;
    }
    try {
      const res = await fetchWithAuth('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateMode: 'manual', manualRolloverTime })
      });
      if (res.ok) {
        setDateMode('manual');
        setManualTimeStatus(`Set to ${manualRolloverTime}`);
        showToast(`Rollover time set to ${manualRolloverTime}`, 'success');
        loadSystemSettings();
      }
    } catch {
      showToast('Error setting manual rollover time.', 'warn');
    }
  };

  const handleForceReset = async () => {
    setShowForceResetConfirm(true);
  };

  const doForceReset = async () => {
    setShowForceResetConfirm(false);
    try {
      const res = await fetchWithAuth('/api/settings/force-reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setOperationalDate(data.operational_date);
        setDashboardDate(data.operational_date);
        showToast('Operational date reset to today', 'success');
        loadSystemSettings();
      }
    } catch {
      showToast('Error resetting operational date.', 'warn');
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetchWithAuth('/api/backup/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database-backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.bak`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast('Backup exported and downloaded successfully', 'success');
      } else {
        showToast('Failed to export backup.', 'warn');
      }
    } catch {
      showToast('Network error during backup export.', 'warn');
    }
  };

  const handleImportBackup = (fileText) => {
    try {
      const cleanText = fileText.trim();
      if (!cleanText || !cleanText.includes(':')) {
        showToast('Invalid backup file format. File is either corrupt or not a secure backup.', 'warn');
        return;
      }
      setRestorePayload({ encryptedData: cleanText });
      setShowRestoreConfirm(true);
    } catch {
      showToast('Failed to read backup file.', 'warn');
    }
  };

  const doRestoreDatabase = async () => {
    if (!restorePayload) return;
    setShowRestoreConfirm(false);
    try {
      const res = await fetchWithAuth('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restorePayload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Database successfully restored from backup!', 'success');
        // Reload all data
        loadDashboardData();
        calculateStats();
        loadSystemSettings();
        if (activeOverlay === 'guest-mgmt') {
          fetchGuestMgmtList();
        }
      } else {
        showToast(data.error || 'Failed to restore database.', 'warn');
      }
    } catch {
      showToast('Network error during database restore.', 'warn');
    } finally {
      setRestorePayload(null);
    }
  };

  // Status flags changes
  const handleStatusFlagTrigger = (guest, type) => {
    setStatusModalGuest(guest);
    setStatusModalType(type);
    setStatusModalReason('');
    setStatusModalErr(false);
    setShowStatusModal(true);
  };

  const handleViewHistoryTrigger = (guest) => {
    setHistoryModalGuest(guest);
    setShowHistoryModal(true);
  };

  const confirmStatusAction = async () => {
    if (!statusModalReason.trim()) {
      setStatusModalErr(true);
      return;
    }

    const payload = {
      status: statusModalType === 'unblock' ? 'ok' : statusModalType,
      reason: statusModalReason.trim(),
      byUser: user
    };

    try {
      const res = await fetchWithAuth(`/api/guests/${statusModalGuest.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(
          statusModalType === 'warning'
            ? 'Guest marked with a warning'
            : statusModalType === 'blocked'
              ? 'Guest has been blocked'
              : 'Guest status cleared',
          statusModalType === 'unblock' ? 'success' : 'warn'
        );
        setShowStatusModal(false);
        loadDashboardData();
        calculateStats();
        if (activeOverlay === 'guest-mgmt') {
          fetchGuestMgmtList();
        }
      } else {
        showToast('Error updating guest flags.', 'warn');
      }
    } catch {
      showToast('Server connection error.', 'warn');
    }
  };

  // Form Autofills and Calculations
  const calcAge = (dobString) => {
    if (!dobString) {
      setFormAge('-');
      return;
    }
    const dob = new Date(dobString);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    setFormAge(`${age} yrs`);
  };

  // Document photo upload loader
  const handlePhotoLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCurrentPhoto(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const clearForm = () => {
    setShowGuestCard(false);
    setBarcodeSearch('');
    setFormName('');
    setFormIdNum('');
    setFormDocType('');
    setFormNat('');
    setFormDob('');
    setFormAge('-');
    setFormExp('');
    setFormPhone('');
    setFormRaw('-');
    setCurrentPhoto(null);
    setFormPhotoCopy(null);
    setCurrentGuestId(null);
  };

  // Open a blank guest form for manual new entry
  const openNewEntry = () => {
    setBarcodeSearch('');
    setFormName('');
    setFormIdNum('');
    setFormDocType('QID');
    setFormNat('');
    setFormDob('');
    setFormAge('-');
    setFormExp('');
    setFormPhone('');
    setFormRaw('-');
    setCurrentPhoto(null);
    setFormPhotoCopy(null);
    setCurrentGuestId(null);
    setCardMode('new');
    setShowGuestCard(true);
    // Scroll guest card into view
    setTimeout(() => {
      guestCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  };

  const loadOcrResult = (data, existingG) => {
    if (existingG) {
      loadExistingGuest(existingG);
      // Ensure the form's docType is set to the detected one so saving saves the correct type
      setFormDocType(data.docType);
      if (data.photoCopyBase64) {
        setFormPhotoCopy(data.photoCopyBase64);
      }
      showToast(`Existing guest record loaded for: ${data.idNum}`, 'success');
    } else {
      clearForm();
      setShowGuestCard(true);
      setCardMode('new');
      setFormName(data.name);
      setFormIdNum(data.idNum);
      setFormDocType(data.docType);
      setFormNat(data.nat);
      setFormDob(data.dob);
      setFormExp(data.exp);
      setFormPhone(data.phone || '');
      setFormRaw(data.raw);
      if (data.facePhotoBase64) {
        setCurrentPhoto(data.facePhotoBase64);
      } else {
        setCurrentPhoto(null);
      }
      if (data.photoCopyBase64) {
        setFormPhotoCopy(data.photoCopyBase64);
      } else {
        setFormPhotoCopy(null);
      }
      calcAge(data.dob);
      showToast(`Document loaded successfully: ${data.idNum}`, 'success');
    }

    if (data.lowQuality) {
      setQualityWarningDocType(data.docType);
      setShowQualityWarning(true);
    }

    setTimeout(() => {
      guestCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleScanDocument = async (docType) => {
    setPendingScanDocType(docType);
    setOcrLoading(true);
    setOcrLoadingStage(`Connecting to scanner & checking folder...`);
    setOcrProgress(30);

    try {
      showToast(`Initializing ${docType} scanner...`, 'info');
      const res = await fetchWithAuth('/api/guests/scan-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType })
      });
      const data = await res.json();

      if (res.status === 412) {
        setOcrLoading(false);
        // Pre-populate temp state for config modal.
        // Use backend's scannerFolder if returned (may differ from locally saved state).
        const folderFromServer = data.scannerFolder || scannerFolder;
        setTempScannerFolder(folderFromServer);
        setTempSelectedScanner(selectedScanner || '');
        setTempScannerApiUrl(scannerApiUrl || '');
        setTempScannerApiUsername(scannerApiUsername || '');
        setTempScannerApiPassword(scannerApiPassword || '');

        // Always use the scanners array from the backend response
        // (backend now always populates it regardless of error type)
        const availableFromServer = data.scanners || [];
        setDetectedScanners(availableFromServer);

        // Track WIA failure message to show in config modal
        setScannerWiaError(data.wiaError || '');

        if (data.error === 'NO_HARDWARE_FOUND') {
          // WIA trigger failed or truly no hardware — show descriptive message
          if (data.wiaError) {
            showToast(`Scanner found but WIA scan failed — place the scanned file in: ${folderFromServer}`, 'warn');
          } else {
            showToast(`No scanner hardware detected. Connect your scanner or use Camera/Upload.`, 'warn');
          }
        } else if (data.error === 'NO_SCAN_FILE_FOUND') {
          showToast(`No scan file in ${folderFromServer} — insert document and scan it first.`, 'warn');
        } else {
          showToast('Please select your scanner or output folder.', 'warn');
        }
        setIsScannerConfigOpen(true);
        return;
      }

      if (res.ok) {
        setOcrLoadingStage('Reading document details & extracting MRZ...');
        setOcrProgress(70);
        let existingG = null;
        try {
          const lookupRes = await fetchWithAuth(`/api/guests/lookup?q=${encodeURIComponent(data.idNum.trim())}`);
          if (lookupRes.ok) {
            existingG = await lookupRes.json();
          }
        } catch {
          // ignore lookup errors
        }

        setOcrProgress(100);
        setOcrLoadingStage('Success! Document loaded.');

        setTimeout(() => {
          setOcrLoading(false);

          const isMismatch = data.docType !== docType;
          if (isMismatch) {
            setMismatchSelectedDocType(docType);
            setMismatchDetectedDocType(data.docType);
            setMismatchData({ ...data, existingG });
            setShowDocMismatchModal(true);
          } else {
            loadOcrResult(data, existingG);
          }
        }, 500);
      } else {
        setOcrLoading(false);
        showToast(data.error || 'Failed to detect scan file.', 'warn');
      }
    } catch (err) {
      // NOTE: No clearInterval here — there is no polling interval in this function
      setOcrLoading(false);
      console.error('Scan error:', err);
      showToast('Error communicating with local scanner.', 'warn');
    }
  };

  const handleUploadDocument = async (fileName, fileData, docType) => {
    setPendingScanDocType(docType);
    setOcrLoading(true);
    setOcrLoadingStage('Uploading document image...');
    setOcrProgress(20);

    const interval = setInterval(() => {
      setOcrProgress(prev => {
        if (prev < 50) {
          setOcrLoadingStage('Analyzing document structure...');
          return prev + 6;
        } else if (prev < 75) {
          setOcrLoadingStage('Reading document details...');
          return prev + 3;
        } else if (prev < 92) {
          setOcrLoadingStage('Verifying identity info...');
          return prev + 1;
        }
        return prev;
      });
    }, 350);

    try {
      showToast(`Uploading and parsing ${docType} document file...`, 'info');
      const res = await fetchWithAuth('/api/guests/upload-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileData, docType })
      });
      const data = await res.json();
      clearInterval(interval);

      if (res.ok) {
        setOcrLoadingStage('Verifying guest record...');
        setOcrProgress(95);
        let existingG = null;
        try {
          const lookupRes = await fetchWithAuth(`/api/guests/lookup?q=${encodeURIComponent(data.idNum.trim())}`);
          if (lookupRes.ok) {
            existingG = await lookupRes.json();
          }
        } catch {
          // ignore lookup errors
        }

        setOcrProgress(100);
        setOcrLoadingStage('Success!');

        setTimeout(() => {
          setOcrLoading(false);

          const isMismatch = data.docType !== docType;
          if (isMismatch) {
            setMismatchSelectedDocType(docType);
            setMismatchDetectedDocType(data.docType);
            setMismatchData({ ...data, existingG });
            setShowDocMismatchModal(true);
          } else {
            loadOcrResult(data, existingG);
          }
        }, 500);
      } else {
        setOcrLoading(false);
        showToast(data.error || 'Failed to process uploaded file.', 'warn');
      }
    } catch (err) {
      clearInterval(interval);
      setOcrLoading(false);
      console.error('Upload document error:', err);
      showToast('Error sending file upload request.', 'warn');
    }
  };

  // Detail Report run
  const runDetailReport = async () => {
    try {
      const res = await fetchWithAuth(
        `/api/reports/detail?dateFrom=${rptDateFrom}&dateTo=${rptDateTo}&idNum=${encodeURIComponent(rptIdNum)}&status=${rptStatus}&docType=${rptDocType}&checkedIn=${rptCheckedIn}&nationality=${encodeURIComponent(rptNationality)}&minAge=${rptMinAge}&maxAge=${rptMaxAge}`
      );
      if (res.ok) {
        const data = await res.json();
        setRptDetailResults(data);
      }
    } catch (err) {
      console.error('Error running detail report:', err);
    }
  };

  // Summary Report run
  const runSummaryReport = async () => {
    try {
      const res = await fetchWithAuth(`/api/reports/summary?dateFrom=${sumDateFrom}&dateTo=${sumDateTo}`);
      if (res.ok) {
        const data = await res.json();
        setSumResults(data);
      }
    } catch (err) {
      console.error('Error running summary report:', err);
    }
  };

  // Export Excel Report with custom styling and colors
  const handleExportExcel = async () => {
    if (rptDetailResults.length === 0) {
      showToast('No records to export', 'warn');
      return;
    }

    try {
      showToast('Loading Excel export engine...', 'info');
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Visitor Logs');

      // Define Columns with exact widths
      worksheet.columns = [
        { header: 'No.', key: 'no', width: 6 },
        { header: 'Full Name', key: 'name', width: 26 },
        { header: 'Document Type', key: 'docType', width: 16 },
        { header: 'ID Number', key: 'idNum', width: 18 },
        { header: 'Nationality', key: 'nationality', width: 16 },
        { header: 'Age', key: 'age', width: 8 },
        { header: 'Expiry Date', key: 'expiry', width: 14 },
        { header: 'Check-In Status', key: 'status', width: 18 },
        { header: 'Check-In Time', key: 'time', width: 16 },
        { header: 'Registered Date', key: 'date', width: 16 },
        { header: 'Status Flag', key: 'flag', width: 14 },
        { header: 'Warning/Block Reason', key: 'flagReason', width: 28 }
      ];

      // Add Data Rows
      const fmtDateShort = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
      };

      rptDetailResults.forEach((g, idx) => {
        const flagVal = g.statusInfo?.current || 'ok';
        let flagLabel = 'OK';
        if (flagVal === 'warning') flagLabel = 'Warning';
        else if (flagVal === 'blocked') flagLabel = 'Blocked';

        let flagReason = '-';
        if (flagVal === 'warning') flagReason = g.statusInfo?.warningReason || '-';
        else if (flagVal === 'blocked') flagReason = g.statusInfo?.blockedReason || '-';

        worksheet.addRow({
          no: idx + 1,
          name: g.name,
          docType: g.docType || 'QID',
          idNum: g.idNum,
          nationality: g.nationality,
          age: g.statusInfo?.age ? parseInt(g.statusInfo.age) || g.statusInfo.age : '-',
          expiry: g.expiryDate ? fmtDateShort(g.expiryDate) : '-',
          status: g.checkedIn ? 'Checked In' : 'Not Checked In',
          time: g.checkInTime || '-',
          date: g.savedDate ? fmtDateShort(g.savedDate) : '-',
          flag: flagLabel,
          flagReason: flagReason
        });
      });

      // Auto-adjust column widths dynamically based on header title and cell data length
      worksheet.columns.forEach((column) => {
        let maxLen = 0;
        if (column.header) {
          maxLen = Math.max(maxLen, column.header.toString().length);
        }
        column.eachCell({ includeEmpty: true }, (cell) => {
          if (cell.value) {
            maxLen = Math.max(maxLen, cell.value.toString().length);
          }
        });
        column.width = Math.max(maxLen + 4, 10);
      });

      // Column index mapping (1-based): 1=No, 2=Name, 3=DocType, 4=IdNum, 5=Nationality, 6=Age, 7=Expiry, 8=Status, 9=Time, 10=Date, 11=Flag, 12=FlagReason
      const CENTER_COLS = new Set([1, 3, 4, 5, 6, 7, 8, 9, 10, 11]); // Center everything except Name (2) and Reason (12)
      const STATUS_COL = 8;
      const FLAG_COL = 11;

      // Style Header Row (Row 1)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0F4C81' }
        };
        cell.font = {
          name: 'Segoe UI',
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 11
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: CENTER_COLS.has(cell.col) ? 'center' : 'left'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'medium', color: { argb: 'FF0D4170' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
      });

      // Style Data Rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header

        row.height = 22;
        const isEven = rowNumber % 2 === 0;

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'FFF5F6FA' : 'FFFFFFFF' }
          };
          cell.font = {
            name: 'Segoe UI',
            size: 10,
            color: { argb: 'FF333333' }
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: CENTER_COLS.has(cell.col) ? 'center' : 'left'
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE6E6E1' } },
            left: { style: 'thin', color: { argb: 'FFE6E6E1' } },
            bottom: { style: 'thin', color: { argb: 'FFE6E6E1' } },
            right: { style: 'thin', color: { argb: 'FFE6E6E1' } }
          };

          // Custom green/amber colour for Check-In Status column
          if (cell.col === STATUS_COL) {
            const val = cell.value;
            cell.font = {
              name: 'Segoe UI',
              size: 10,
              bold: true,
              color: { argb: val === 'Checked In' ? 'FF0F6E56' : 'FFBA7517' }
            };
          }

          // Custom color-coding for Status Flag column
          if (cell.col === FLAG_COL) {
            const val = cell.value;
            let argbColor = 'FF0F6E56'; // Green for OK
            if (val === 'Warning') argbColor = 'FFBA7517'; // Amber
            else if (val === 'Blocked') argbColor = 'FFC53030'; // Red
            cell.font = {
              name: 'Segoe UI',
              size: 10,
              bold: true,
              color: { argb: argbColor }
            };
          }
        });
      });

      // Write worksheet into array buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guest-report-${fmtDateISO(new Date())}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Excel report generated successfully', 'success');
    } catch (err) {
      console.error('Error generating Excel file:', err);
      showToast('Error exporting to Excel', 'warn');
    }
  };

  // ─── License Gate ───────────────────────────────────────────────
  // Show loading shimmer while license check is in-flight
  if (licenseStatus === null) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'radial-gradient(ellipse at 30% 20%, #1e1b4b 0%, #0f0f1a 50%, #0a0a14 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '16px'
      }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', animation: 'lgSpin 0.7s linear infinite' }} />
        <style>{'@keyframes lgSpin { to { transform: rotate(360deg); } }'}</style>
        <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Checking license…</p>
      </div>
    );
  }

  // Show license gate if not licensed
  if (!licenseStatus.licensed) {
    return (
      <LicenseGate
        onActivated={(data) => {
          setLicenseStatus({ licensed: true, clientName: data.clientName, expiresAt: data.expiresAt });
        }}
      />
    );
  }

  // Render Login page if not authenticated
  if (!user) {
    return (
      <Login
        loginUser={loginUser}
        setLoginUser={setLoginUser}
        loginPass={loginPass}
        setLoginPass={setLoginPass}
        loginError={loginError}
        loginSuccessMsg={loginSuccessMsg}
        showLoginPass={showLoginPass}
        setShowLoginPass={setShowLoginPass}
        handleLogin={handleLogin}
        forgotScreen={forgotScreen}
        setForgotScreen={setForgotScreen}
        forgotError={forgotError}
        setForgotError={setForgotError}
        resetUser={resetUser}
        setResetUser={setResetUser}
        resetCode={resetCode}
        setResetCode={setResetCode}
        resetNewPass={resetNewPass}
        setResetNewPass={setResetNewPass}
        resetConfirmPass={resetConfirmPass}
        setResetConfirmPass={setResetConfirmPass}
        showResetPass1={showResetPass1}
        setShowResetPass1={setShowResetPass1}
        showResetPass2={showResetPass2}
        setShowResetPass2={setShowResetPass2}
        handleResetPassword={handleResetPassword}
      />
    );
  }

  const getFilteredGuests = () => {
    return guests.filter(g => {
      if (filterDocType !== 'all' && g.docType !== filterDocType) return false;
      if (filterStatus === 'checkedIn' && !g.checkedIn) return false;
      if (filterStatus === 'notCheckedIn' && g.checkedIn) return false;

      const isWarn = g.statusInfo?.current === 'warning';
      const isBlock = g.statusInfo?.current === 'blocked';
      if (filterFlag === 'warning' && !isWarn) return false;
      if (filterFlag === 'blocked' && !isBlock) return false;
      if (filterFlag === 'normal' && (isWarn || isBlock)) return false;
      return true;
    });
  };

  return (
    <div className="app">
      <Header
        licenseStatus={licenseStatus}
        user={user}
        operationalDate={operationalDate}
        activeOverlay={activeOverlay}
        setActiveOverlay={setActiveOverlay}
        setCpMsg={setCpMsg}
        runDetailReport={runDetailReport}
        fetchGuestMgmtList={fetchGuestMgmtList}
        handleLogout={handleLogout}
      />

      <StatsBar
        dashboardDate={dashboardDate}
        operationalDate={operationalDate}
        stats={stats}
      />

      <div className="content">
        {activeOverlay === null && (
          <>
            <ScanSearchCard
              barcodeSearch={barcodeSearch}
              setBarcodeSearch={setBarcodeSearch}
              handleBarcodeSearch={handleBarcodeSearch}
              clearForm={clearForm}
              openNewEntry={openNewEntry}
              handleScanDocument={handleScanDocument}
              handleUploadDocument={handleUploadDocument}
              onOpenCameraScan={() => setIsCameraScanOpen(true)}
              barcodeInputRef={barcodeInputRef}
              loadExistingGuest={loadExistingGuest}
              fetchWithAuth={fetchWithAuth}
              searchError={searchError}
              setSearchError={setSearchError}
            />


            <GuestDetailsCard
              cardMode={cardMode}
              currentGuestId={currentGuestId}
              guests={guests}
              currentPhoto={currentPhoto}
              formName={formName}
              setFormName={setFormName}
              formIdNum={formIdNum}
              setFormIdNum={setFormIdNum}
              formDocType={formDocType}
              setFormDocType={setFormDocType}
              formNat={formNat}
              setFormNat={setFormNat}
              formDob={formDob}
              setFormDob={setFormDob}
              formAge={formAge}
              formExp={formExp}
              setFormExp={setFormExp}
              formPhone={formPhone}
              setFormPhone={setFormPhone}
              formRaw={formRaw}
              calcAge={calcAge}
              handlePhotoLoad={handlePhotoLoad}
              clearForm={clearForm}
              saveGuest={saveGuest}
              updateGuest={updateGuest}
              checkInExisting={checkInExisting}
              photoInputRef={photoInputRef}
              guestCardRef={guestCardRef}
              formPhotoCopy={formPhotoCopy}
            />

            {/* Dashboard Filters Bar */}
            <div className="card" style={{ marginBottom: '14px', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <i className="ti ti-filter" style={{ color: 'var(--primary)', fontSize: '16px' }} />
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text)' }}>
                  Filter Guest Logs
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>

                {/* Date Range Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Range</label>
                  <select
                    value={filterDateRange}
                    onChange={(e) => setFilterDateRange(e.target.value)}
                    style={{ height: '34px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px', fontSize: '12px', outline: 'none', background: '#fff', color: 'var(--text)' }}
                  >
                    <option value="today">Today Only</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                {/* Custom Dates */}
                {filterDateRange === 'custom' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        style={{ height: '34px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px', fontSize: '12px', outline: 'none', background: '#fff', color: 'var(--text)' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Date</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        style={{ height: '34px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px', fontSize: '12px', outline: 'none', background: '#fff', color: 'var(--text)' }}
                      />
                    </div>
                  </>
                )}

                {/* Document Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Document Type</label>
                  <select
                    value={filterDocType}
                    onChange={(e) => setFilterDocType(e.target.value)}
                    style={{ height: '34px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px', fontSize: '12px', outline: 'none', background: '#fff', color: 'var(--text)' }}
                  >
                    <option value="all">All Documents</option>
                    <option value="QID">Qatar ID (QID)</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>

                {/* Check-In Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Check-in Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ height: '34px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px', fontSize: '12px', outline: 'none', background: '#fff', color: 'var(--text)' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="checkedIn">Checked In</option>
                    <option value="notCheckedIn">Not Checked In</option>
                  </select>
                </div>

                {/* Status Flags */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alert Flags</label>
                  <select
                    value={filterFlag}
                    onChange={(e) => setFilterFlag(e.target.value)}
                    style={{ height: '34px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px', fontSize: '12px', outline: 'none', background: '#fff', color: 'var(--text)' }}
                  >
                    <option value="all">All Records</option>
                    <option value="normal">Normal (No Flags)</option>
                    <option value="warning">Warning Guests</option>
                    <option value="blocked">Blocked Guests</option>
                  </select>
                </div>

              </div>
            </div>

            <GuestRecordsTable
              guests={getFilteredGuests()}
              showHiddenRecords={showHiddenRecords}
              setShowHiddenRecords={setShowHiddenRecords}
              loadExistingGuest={loadExistingGuest}
              handleStatusFlagTrigger={handleStatusFlagTrigger}
              toggleHideGuest={toggleHideGuest}
              handleDeleteTrigger={handleDeleteTrigger}
              isTblMenuOpen={isTblMenuOpen}
              setIsTblMenuOpen={setIsTblMenuOpen}
            />
          </>
        )}

        {activeOverlay === 'settings' && (
          <SettingsOverlay
            licenseStatus={licenseStatus}
            activeOverlay={activeOverlay}
            setActiveOverlay={setActiveOverlay}
            dateMode={dateMode}
            handleDateModeChange={handleDateModeChange}
            manualRolloverTime={manualRolloverTime}
            setManualRolloverTime={setManualRolloverTime}
            handleApplyManualTime={handleApplyManualTime}
            manualTimeStatus={manualTimeStatus}
            handleForceReset={handleForceReset}
            operationalDate={operationalDate}
            cpCurrent={cpCurrent}
            setCpCurrent={setCpCurrent}
            cpNew={cpNew}
            setCpNew={setCpNew}
            cpConfirm={cpConfirm}
            setCpConfirm={setCpConfirm}
            cpMsg={cpMsg}
            handlePasswordChange={handleChangePassword}
            showCpCurrent={showCpCurrent}
            setShowCpCurrent={setShowCpCurrent}
            showCpNew={showCpNew}
            setShowCpNew={setShowCpNew}
            showCpConfirm={showCpConfirm}
            setShowCpConfirm={setShowCpConfirm}
            handleExportBackup={handleExportBackup}
            handleImportBackup={handleImportBackup}
            pinAdminPassword={pinAdminPassword}
            setPinAdminPassword={setPinAdminPassword}
            newPin={newPin}
            setNewPin={setNewPin}
            pinMsg={pinMsg}
            handleUpdateDeletePin={handleUpdateDeletePin}
            showPinAdminPassword={showPinAdminPassword}
            setShowPinAdminPassword={setShowPinAdminPassword}
            showNewPin={showNewPin}
            setShowNewPin={setShowNewPin}
            scannerFolder={scannerFolder}
            setScannerFolder={setScannerFolder}
            handleApplyScannerFolder={handleApplyScannerFolder}
            scannerFolderStatus={scannerFolderStatus}
            selectedScanner={selectedScanner}
            setSelectedScanner={setSelectedScanner}
            scannerApiUrl={scannerApiUrl}
            setScannerApiUrl={setScannerApiUrl}
            scannerApiUsername={scannerApiUsername}
            setScannerApiUsername={setScannerApiUsername}
            scannerApiPassword={scannerApiPassword}
            setScannerApiPassword={setScannerApiPassword}
            visionApiKey={visionApiKey}
            setVisionApiKey={setVisionApiKey}
            ocrPaddleEnabled={ocrPaddleEnabled}
            setOcrPaddleEnabled={setOcrPaddleEnabled}
            ocrVisionEnabled={ocrVisionEnabled}
            setOcrVisionEnabled={setOcrVisionEnabled}
            ocrScannerApiEnabled={ocrScannerApiEnabled}
            setOcrScannerApiEnabled={setOcrScannerApiEnabled}
            ocrTesseractEnabled={ocrTesseractEnabled}
            setOcrTesseractEnabled={setOcrTesseractEnabled}
          />
        )}

        {activeOverlay === 'reports' && (
          <ReportsOverlay
            activeOverlay={activeOverlay}
            setActiveOverlay={setActiveOverlay}
            reportsTab={reportsTab}
            setReportsTab={setReportsTab}
            rptDateFrom={rptDateFrom}
            setRptDateFrom={setRptDateFrom}
            rptDateTo={rptDateTo}
            setRptDateTo={setRptDateTo}
            rptIdNum={rptIdNum}
            setRptIdNum={setRptIdNum}
            rptStatus={rptStatus}
            setRptStatus={setRptStatus}
            rptDocType={rptDocType}
            setRptDocType={setRptDocType}
            rptPeriod={rptPeriod}
            setRptPeriod={handlePeriodChange}
            rptCheckedIn={rptCheckedIn}
            setRptCheckedIn={setRptCheckedIn}
            rptNationality={rptNationality}
            setRptNationality={setRptNationality}
            rptMinAge={rptMinAge}
            setRptMinAge={setRptMinAge}
            rptMaxAge={rptMaxAge}
            setRptMaxAge={setRptMaxAge}
            rptDetailResults={rptDetailResults}
            runDetailReport={runDetailReport}
            handleExportExcel={handleExportExcel}
            sumDateFrom={sumDateFrom}
            setSumDateFrom={setSumDateFrom}
            sumDateTo={sumDateTo}
            setSumDateTo={setSumDateTo}
            sumPeriod={sumPeriod}
            setSumPeriod={handleSumPeriodChange}
            sumResults={sumResults}
            runSummaryReport={runSummaryReport}
          />
        )}

        {activeOverlay === 'guest-mgmt' && (
          <GuestManagementOverlay
            activeOverlay={activeOverlay}
            setActiveOverlay={setActiveOverlay}
            gmSearch={gmSearch}
            setGmSearch={setGmSearch}
            gmStatus={gmStatus}
            setGmStatus={setGmStatus}
            gmGuests={gmGuests}
            fetchGuestMgmtList={fetchGuestMgmtList}
            loadExistingGuest={loadExistingGuest}
            handleStatusFlagTrigger={handleStatusFlagTrigger}
            toggleHideGuest={toggleHideGuest}
            handleDeleteTrigger={handleDeleteTrigger}
            handleViewHistoryTrigger={handleViewHistoryTrigger}
          />
        )}

        {activeOverlay === 'deleted-records' && (
          <DeletedRecordsOverlay
            activeOverlay={activeOverlay}
            setActiveOverlay={setActiveOverlay}
            deletedSearch={deletedSearch}
            setDeletedSearch={setDeletedSearch}
            deletedGuests={deletedGuests}
            fetchDeletedList={fetchDeletedList}
            handleRestoreTrigger={handleRestoreTrigger}
            handlePermanentDeleteTrigger={handlePermanentDeleteTrigger}
          />
        )}
      </div>

      {/* MODALS */}
      <StatusActionModal
        showStatusModal={showStatusModal}
        statusModalGuest={statusModalGuest}
        statusModalType={statusModalType}
        statusModalReason={statusModalReason}
        setStatusModalReason={setStatusModalReason}
        statusModalErr={statusModalErr}
        setShowStatusModal={setShowStatusModal}
        confirmStatusAction={confirmStatusAction}
      />

      <PinConfirmModal
        show={pinModalOpen}
        title={pinModalTitle}
        message={pinModalMessage}
        confirmLabel={pinModalAction === 'permanent_delete' ? 'Permanently Destroy' : pinModalAction === 'restore' ? 'Restore Record' : 'Soft Delete'}
        confirmClass={pinModalAction === 'permanent_delete' || pinModalAction === 'soft_delete' ? 'btn-danger-bg' : 'btn-success-bg'}
        pinValue={pinValue}
        setPinValue={setPinValue}
        errorMsg={pinModalErr}
        onConfirm={executePinAuthorizedAction}
        onCancel={handlePinCancel}
        showPin={showPin}
        setShowPin={setShowPin}
        showReasonField={pinModalAction === 'soft_delete'}
        deleteReason={deleteReason}
        setDeleteReason={setDeleteReason}
      />

      {/* LOGOUT CONFIRM MODAL */}
      <ConfirmModal
        show={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        confirmClass="btn-danger-bg"
        icon="ti-logout"
        iconBg="var(--danger-light)"
        iconColor="var(--danger)"
        onConfirm={doLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* FORCE RESET CONFIRM MODAL */}
      <ConfirmModal
        show={showForceResetConfirm}
        title="Force Reset Date"
        message="Reset the operational date to today? Today's visitor counters will also reset."
        confirmLabel="Yes, Reset"
        confirmClass="btn-warn-bg"
        icon="ti-refresh"
        iconBg="var(--warn-light)"
        iconColor="var(--warn)"
        onConfirm={doForceReset}
        onCancel={() => setShowForceResetConfirm(false)}
      />

      {/* RESTORE DATABASE CONFIRM MODAL */}
      <ConfirmModal
        show={showRestoreConfirm}
        title="Restore Database"
        message="Are you sure you want to restore the database? All existing guests, logs, and settings will be permanently overwritten by the backup file contents. This action cannot be undone."
        confirmLabel="Yes, Restore"
        confirmClass="btn-danger-bg"
        icon="ti-upload"
        iconBg="var(--danger-light)"
        iconColor="var(--danger)"
        onConfirm={doRestoreDatabase}
        onCancel={() => { setShowRestoreConfirm(false); setRestorePayload(null); }}
      />
      {/* STATUS HISTORY TIMELINE MODAL */}
      <HistoryLogModal
        show={showHistoryModal}
        guest={historyModalGuest}
        onClose={() => { setShowHistoryModal(false); setHistoryModalGuest(null); }}
      />

      {/* SCANNER HARDWARE CONFIGURATION MODAL */}
      {isScannerConfigOpen && (
        <div className="confirm-modal-overlay" style={{ zIndex: 1100 }} onClick={() => { setIsScannerConfigOpen(false); setScannerWiaError(''); }}>
          <div className="confirm-modal" style={{ width: '480px', maxWidth: '96%' }} onClick={(e) => e.stopPropagation()}>
            {/* WIA failure warning banner — shown when scanner is visible but direct scan command failed */}
            {scannerWiaError && (() => {
              // Extract a short 1-line summary from the potentially long PowerShell error dump
              const rawErr = scannerWiaError || '';
              // Grab first sentence/line that contains a real error description
              const firstLine = rawErr.split(/\n|;|\r/)[0].trim();
              const shortErr = firstLine.length > 120 ? firstLine.slice(0, 120) + '…' : firstLine;
              const isTwain = (tempSelectedScanner || '').toLowerCase().startsWith('twain_') ||
                              (tempSelectedScanner || '').toLowerCase().includes('twain');
              return (
                <div style={{ background: '#fffbeb', borderBottom: '2px solid #fcd34d', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '12.5px', color: '#78350f' }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '20px', color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>
                      {isTwain ? 'TWAIN Driver — Use Folder Watch Mode' : 'WIA Direct Scan Failed'}
                    </strong>
                    <span style={{ display: 'block', marginBottom: '6px', lineHeight: '1.5', color: '#92400e' }}>
                      {isTwain
                        ? 'TWAIN scanners cannot be triggered directly by the app. Use your scanner\'s native software to scan, save the image to the folder below, then click Apply & Scan.'
                        : <>Scanner was found but the scan command failed. <em style={{ fontStyle: 'normal', fontWeight: 600 }}>{shortErr}</em></>}
                    </span>
                    {!isTwain && rawErr.length > shortErr.length && (
                      <details style={{ marginBottom: '6px' }}>
                        <summary style={{ cursor: 'pointer', fontSize: '11px', color: '#b45309', fontWeight: 600 }}>Show technical details</summary>
                        <pre style={{ marginTop: '6px', padding: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', fontSize: '10px', color: '#451a03', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '100px', overflowY: 'auto', lineHeight: '1.4' }}>{rawErr}</pre>
                      </details>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(245,158,11,0.12)', borderRadius: '5px', border: '1px solid rgba(245,158,11,0.3)' }}>
                      <i className="ti ti-bulb" style={{ fontSize: '14px', color: '#d97706', flexShrink: 0 }} />
                      <span style={{ fontSize: '11.5px' }}><strong>Fix:</strong> Scan your document using the scanner's native app → save to the <strong>folder path below</strong> → click <strong>Apply &amp; Scan</strong>.</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="confirm-modal-hdr" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="confirm-modal-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: '40px', height: '40px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  <i className="ti ti-settings"></i>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div className="confirm-modal-title" style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Scanner Hardware Configuration</div>
                  <div className="confirm-modal-msg" style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Configure direct WIA hardware scanners, or watch local folders for TWAIN/network scanners. <em>USB HID (Keyboard swipe) readers work automatically on any page without setup!</em>
                  </div>
                </div>
              </div>

              <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.08)', margin: '4px 0' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                <div className="fg">
                  <span className="fl" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    Select Scanner Device
                  </span>
                  {detectedScanners.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', background: '#fff5f5', color: '#c53030', borderRadius: '6px', border: '1px dashed #feb2b2', textAlign: 'center', gap: '8px' }}>
                      <i className="ti ti-plug" style={{ fontSize: '24px' }}></i>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>No Connected Scanner Detected</span>
                      <span style={{ fontSize: '11px', lineHeight: '1.4' }}>
                        Please ensure your USB scanner is connected, powered on, and supports Windows WIA or TWAIN drivers.
                      </span>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        style={{ marginTop: '4px', padding: '4px 12px', fontSize: '12px', background: '#fff', border: '1px solid #c53030', color: '#c53030', cursor: 'pointer', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                        onClick={async (e) => {
                          e.preventDefault();
                          showToast('Re-scanning WIA/TWAIN ports...', 'info');
                          const list = await fetchAvailableScanners();
                          if (list.length > 0) {
                            setTempSelectedScanner(list[0].id || list[0].name);
                            showToast(`${list.length} scanner(s) found!`, 'success');
                          } else {
                            showToast('No scanners found.', 'warn');
                          }
                        }}
                      >
                        <i className="ti ti-refresh"></i> Re-Scan Ports
                      </button>
                    </div>
                  ) : (
                    <>
                      <select
                        value={tempSelectedScanner}
                        onChange={(e) => setTempSelectedScanner(e.target.value)}
                        className="fi"
                        style={{ width: '100%', height: '38px', fontSize: '13px', background: '#fff' }}
                      >
                        <option value="">-- Choose Scanner --</option>
                        {detectedScanners.map((sc, idx) => (
                          <option key={idx} value={sc.id || sc.name}>
                            {sc.name}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const isTwainDev = (tempSelectedScanner || '').toLowerCase().startsWith('twain_') || (tempSelectedScanner || '').toLowerCase().includes('twain');
                        const isPnpDev  = (tempSelectedScanner || '').toLowerCase().startsWith('pnp_');
                        if (isTwainDev || isPnpDev) {
                          return (
                            <div style={{ marginTop: '10px', padding: '10px 12px', background: '#fffbeb', color: '#78350f', borderRadius: '6px', fontSize: '11.5px', lineHeight: '1.5', border: '1px solid #fcd34d', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <i className="ti ti-info-circle" style={{ fontSize: '16px', color: '#f59e0b', marginTop: '1px', flexShrink: 0 }} />
                              <div>
                                <strong style={{ color: '#78350f' }}>TWAIN / PnP Scanner — Folder Watch Mode Required</strong>
                                <ol style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                                  <li>Open your scanner's native software (e.g. DocAction, SecureScan, EPSON Scan).</li>
                                  <li>Scan the document and <strong>save/export</strong> the image to: <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 4px', borderRadius: '3px' }}>{tempScannerFolder || 'C:\\ScannerOutput'}</code>.</li>
                                  <li>Come back here and click <strong>Apply &amp; Scan</strong> — the app will pick up the file automatically.</li>
                                </ol>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div style={{ marginTop: '10px', padding: '10px 12px', background: '#f0fdf4', color: '#14532d', borderRadius: '6px', fontSize: '11.5px', lineHeight: '1.5', border: '1px solid #bbf7d0', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <i className="ti ti-device-imac" style={{ fontSize: '16px', color: '#16a34a', marginTop: '1px', flexShrink: 0 }} />
                            <div>
                              <strong style={{ color: '#14532d' }}>WIA Scanner — Direct Scan Mode</strong>
                              <ol style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                                <li>Place the document face-down on your scanner flatbed or in the ADF.</li>
                                <li>Click <strong>Apply &amp; Scan</strong> — the app will command the scanner directly.</li>
                                <li>If it fails, switch to Folder Watch: scan via native software → save to <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 4px', borderRadius: '3px' }}>{tempScannerFolder || 'C:\\ScannerOutput'}</code>.</li>
                              </ol>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>

                <div className="fg">
                  <span className="fl" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    Scanner Folder Output Path (Folder Watcher / Network Scanners)
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={tempScannerFolder}
                      onChange={(e) => setTempScannerFolder(e.target.value)}
                      className="fi"
                      style={{ flex: 1, height: '38px', fontSize: '13px' }}
                      placeholder="C:\ScannerOutput"
                    />
                    <button
                      type="button"
                      className="btn"
                      style={{ height: '38px', padding: '0 14px', fontSize: '13px' }}
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenDirPicker();
                      }}
                    >
                      Browse...
                    </button>
                  </div>
                </div>

                {/* Secure Web Service Scanner API (Regula / Thales / Custom) */}
                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: '12px', marginTop: '4px' }}>
                  <span className="fl" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <i className="ti ti-shield-lock"></i> Secure Scanner Web Service API (Regula / Thales)
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Scanner Web Service URL</span>
                      <input
                        type="text"
                        value={tempScannerApiUrl}
                        onChange={(e) => setTempScannerApiUrl(e.target.value)}
                        className="fi"
                        style={{ width: '100%', height: '38px', fontSize: '13px', fontFamily: 'monospace' }}
                        placeholder="e.g. http://localhost:7210"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Auth Username</span>
                        <input
                          type="text"
                          value={tempScannerApiUsername}
                          onChange={(e) => setTempScannerApiUsername(e.target.value)}
                          className="fi"
                          style={{ width: '100%', height: '38px', fontSize: '13px' }}
                          placeholder="Optional"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Auth Password</span>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showModalScannerApiPass ? "text" : "password"}
                            value={tempScannerApiPassword}
                            onChange={(e) => setTempScannerApiPassword(e.target.value)}
                            className="fi"
                            style={{ width: '100%', height: '38px', fontSize: '13px', paddingRight: '36px' }}
                            placeholder="Optional"
                          />
                          <button
                            type="button"
                            onClick={() => setShowModalScannerApiPass(!showModalScannerApiPass)}
                            style={{ background: 'none', border: 'none', position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#999', padding: '3px' }}
                          >
                            <i className={showModalScannerApiPass ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: '15px' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OCR Engine Configuration */}
                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: '12px', marginTop: '8px' }}>
                  <span className="fl" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <i className="ti ti-cpu"></i> OCR Scanning Engines (Enable / Disable)
                  </span>

                  <style>{`
                    .modal-ocr-row { display:flex; align-items:center; justify-content:space-between; padding:7px 10px; border-radius:6px; border:1px solid var(--border); background:rgba(0,0,0,0.02); margin-bottom:6px; }
                    .modal-ocr-row:last-child { margin-bottom:0; }
                    .modal-ocr-left { display:flex; align-items:center; gap:8px; }
                    .modal-ocr-icon { width:26px; height:26px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
                    .modal-ocr-name { font-size:12px; font-weight:600; color:var(--text); }
                    .modal-ocr-desc { font-size:10px; color:var(--text-muted); }
                    .modal-ocr-switch { position:relative; display:inline-block; width:34px; height:19px; flex-shrink:0; }
                    .modal-ocr-switch input { opacity:0; width:0; height:0; }
                    .modal-ocr-slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:#ccc; border-radius:19px; transition:.2s; }
                    .modal-ocr-slider:before { position:absolute; content:''; height:13px; width:13px; left:3px; bottom:3px; background:white; border-radius:50%; transition:.2s; }
                    input:checked + .modal-ocr-slider { background:var(--primary,#0f4c81); }
                    input:checked + .modal-ocr-slider:before { transform:translateX(15px); }
                  `}</style>

                  {/* PaddleOCR */}
                  <div className="modal-ocr-row">
                    <div className="modal-ocr-left">
                      <div className="modal-ocr-icon" style={{ background: '#eff6ff' }}><i className="ti ti-cpu" style={{ color: '#2563eb' }} /></div>
                      <div>
                        <div className="modal-ocr-name">🤖 PaddleOCR <span style={{ fontSize: '10px', color: '#166534', fontWeight: 700 }}>(Local ONNX - Recommended)</span></div>
                        <div className="modal-ocr-desc">Runs locally on PC — highest accuracy &amp; sub-second speed.</div>
                      </div>
                    </div>
                    <label className="modal-ocr-switch">
                      <input type="checkbox" checked={!!ocrPaddleEnabled} onChange={e => setOcrPaddleEnabled(e.target.checked)} />
                      <span className="modal-ocr-slider" />
                    </label>
                  </div>

                  {/* Secure Scanner Web Service */}
                  <div className="modal-ocr-row">
                    <div className="modal-ocr-left">
                      <div className="modal-ocr-icon" style={{ background: '#f0fdf4' }}><i className="ti ti-shield-lock" style={{ color: '#16a34a' }} /></div>
                      <div>
                        <div className="modal-ocr-name">🔐 Secure Scanner Web Service <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Regula / Network)</span></div>
                        <div className="modal-ocr-desc">Uses hardware scanner Web API URL.</div>
                      </div>
                    </div>
                    <label className="modal-ocr-switch">
                      <input type="checkbox" checked={!!ocrScannerApiEnabled} onChange={e => setOcrScannerApiEnabled(e.target.checked)} />
                      <span className="modal-ocr-slider" />
                    </label>
                  </div>

                  {/* Google Vision */}
                  <div className="modal-ocr-row">
                    <div className="modal-ocr-left">
                      <div className="modal-ocr-icon" style={{ background: '#fefce8' }}><i className="ti ti-brand-google" style={{ color: '#ca8a04' }} /></div>
                      <div>
                        <div className="modal-ocr-name">🌐 Google Cloud Vision API <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Cloud OCR)</span></div>
                        <div className="modal-ocr-desc">Requires Vision API key set in main Settings overlay.</div>
                      </div>
                    </div>
                    <label className="modal-ocr-switch">
                      <input type="checkbox" checked={!!ocrVisionEnabled} onChange={e => setOcrVisionEnabled(e.target.checked)} />
                      <span className="modal-ocr-slider" />
                    </label>
                  </div>

                  {/* Tesseract */}
                  <div className="modal-ocr-row">
                    <div className="modal-ocr-left">
                      <div className="modal-ocr-icon" style={{ background: '#faf5ff' }}><i className="ti ti-file-text" style={{ color: '#7c3aed' }} /></div>
                      <div>
                        <div className="modal-ocr-name">📄 Tesseract OCR <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Offline JS Safety Fallback)</span></div>
                        <div className="modal-ocr-desc">Always keeps a safety fallback so scans never fail.</div>
                      </div>
                    </div>
                    <label className="modal-ocr-switch">
                      <input type="checkbox" checked={!!ocrTesseractEnabled} onChange={e => setOcrTesseractEnabled(e.target.checked)} />
                      <span className="modal-ocr-slider" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="confirm-modal-footer">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setIsScannerConfigOpen(false);
                  setScannerWiaError('');
                }}
              >
                <i className="ti ti-x" /> Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={async (e) => {
                  e.preventDefault();
                  // Save settings to backend
                  await handleApplyScannerFolder(tempScannerFolder, tempSelectedScanner, tempScannerApiUrl, tempScannerApiUsername, tempScannerApiPassword);
                  // Update current states
                  setScannerFolder(tempScannerFolder);
                  setSelectedScanner(tempSelectedScanner);
                  setScannerApiUrl(tempScannerApiUrl);
                  setScannerApiUsername(tempScannerApiUsername);
                  setScannerApiPassword(tempScannerApiPassword);
                  // Dismiss modal
                  setIsScannerConfigOpen(false);
                  // Retry scan!
                  setTimeout(() => {
                    handleScanDocument(pendingScanDocType);
                  }, 200);
                }}
              >
                <i className="ti ti-device-imac" /> Apply & Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUALITY WARNING MODAL */}
      {showQualityWarning && (
        <div className="confirm-modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowQualityWarning(false)}>
          <div className="confirm-modal" style={{ width: '450px', maxWidth: '96%', borderTop: '4px solid var(--warning)' }} onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-hdr" style={{ gap: '14px' }}>
              <div className="confirm-modal-icon-wrap" style={{ background: '#fffbeb', color: '#d97706', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <i className="ti ti-alert-triangle"></i>
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div className="confirm-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#d97706' }}>Low Scan Quality Detected</div>
                <div className="confirm-modal-msg" style={{ marginTop: '8px', marginBottom: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text)' }}>
                  The scanned document photocopy has low quality or blurry text. Some identity details could not be read automatically.
                  <br /><br />
                  Please ensure the document is flat, well-lit, not cut off, and legible, then try again.
                </div>
              </div>
            </div>

            <div className="confirm-modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setShowQualityWarning(false)}
              >
                Cancel & Edit
              </button>

              <button
                type="button"
                className="btn btn-sm btn-outline-warning"
                style={{ color: '#d97706', border: '1px solid #d97706' }}
                onClick={() => {
                  setShowQualityWarning(false);
                  handleScanDocument(qualityWarningDocType);
                }}
              >
                <i className="ti ti-refresh"></i> Scan Again
              </button>

              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  warningFileInputRef.current?.click();
                }}
              >
                <i className="ti ti-upload"></i> Re-Upload
              </button>
            </div>

            {/* Hidden File Input for Re-upload */}
            <input
              type="file"
              ref={warningFileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                  setShowQualityWarning(false);
                  handleUploadDocument(file.name, evt.target.result, qualityWarningDocType);
                  e.target.value = '';
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
        </div>
      )}

      {/* DOCUMENT TYPE MISMATCH MODAL */}
      {showDocMismatchModal && (
        <div className="confirm-modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowDocMismatchModal(false)}>
          <div className="confirm-modal" style={{ width: '460px', maxWidth: '96%', borderTop: '4px solid var(--danger)' }} onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-hdr" style={{ gap: '14px' }}>
              <div className="confirm-modal-icon-wrap" style={{ background: '#fef2f2', color: 'var(--danger)', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <i className="ti ti-file-alert"></i>
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div className="confirm-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--danger)' }}>Wrong Document Type Uploaded</div>
                <div className="confirm-modal-msg" style={{ marginTop: '8px', marginBottom: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text)' }}>
                  You selected **{mismatchSelectedDocType}** but the uploaded document was detected as a **{mismatchDetectedDocType}**.
                  <br /><br />
                  Would you like to switch the form type to **{mismatchDetectedDocType}** and import this document anyway?
                </div>
              </div>
            </div>

            <div className="confirm-modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setShowDocMismatchModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setShowDocMismatchModal(false);
                  if (mismatchData) {
                    loadOcrResult(mismatchData, mismatchData.existingG);
                  }
                }}
              >
                Switch & Import As {mismatchDetectedDocType}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Web Directory Picker Modal */}
      {showDirPicker && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{
            width: '90%',
            maxWidth: '550px',
            height: '80vh',
            maxHeight: '600px',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <i className="ti ti-folder-open" style={{ color: 'var(--primary)', fontSize: '18px' }} />
                Local Directory Browser
              </h3>
              <button
                onClick={() => setShowDirPicker(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Current Path Breadcrumb */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '8px 12px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'var(--text)',
              marginBottom: '12px',
              wordBreak: 'break-all',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>Path:</span>
              <span>{pickerPath || 'Logical Drives'}</span>
            </div>

            {/* Directory Content List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              background: '#fff',
              marginBottom: '16px'
            }}>
              {pickerLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px' }}>
                  <i className="ti ti-loader rotate" style={{ fontSize: '24px', color: 'var(--primary)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading local folders...</span>
                </div>
              )}

              {pickerError && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center', color: 'var(--accent)', gap: '8px' }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '24px' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{pickerError}</span>
                  <button
                    onClick={() => loadDirPickerPath(pickerParent || '')}
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '5px' }}
                  >
                    Go Back
                  </button>
                </div>
              )}

              {!pickerLoading && !pickerError && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Go Up Parent Directory */}
                  {pickerParent !== null && (
                    <div
                      onClick={() => loadDirPickerPath(pickerParent)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: 'var(--bg-card)',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--primary)'
                      }}
                    >
                      <i className="ti ti-arrow-back-up" style={{ fontSize: '16px' }} />
                      <span>.. (Parent Folder)</span>
                    </div>
                  )}

                  {/* Directories list */}
                  {pickerDirs.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      This folder is empty or access is restricted.
                    </div>
                  ) : (
                    pickerDirs.map((dir, idx) => (
                      <div
                        key={idx}
                        onClick={() => loadDirPickerPath(pickerPath ? (pickerPath.endsWith('\\') ? pickerPath + dir : pickerPath + '\\' + dir) : dir)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          fontSize: '13px',
                          color: 'var(--text)',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <i className="ti ti-folder" style={{ color: '#e2a100', fontSize: '16px' }} />
                        <span style={{ fontWeight: '500' }}>{dir}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDirPicker(false)}
                style={{ height: '36px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSelectDirPicker}
                disabled={!pickerPath}
                style={{ height: '36px' }}
              >
                Select This Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA SCAN MODAL */}
      <CameraScanModal
        isOpen={isCameraScanOpen}
        onClose={() => setIsCameraScanOpen(false)}
        onCaptureScan={handleUploadDocument}
      />

      {/* OCR PROGRESS LOADER OVERLAY */}
      <LoadingOverlay
        show={ocrLoading}
        stage={ocrLoadingStage}
        progress={ocrProgress}
        docType={pendingScanDocType}
      />

      {/* TOASTS CONTAINER */}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <i className={`ti ${t.type === 'success' ? 'ti-check' : 'ti-info-circle'}`} style={{ fontSize: '15px' }} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}



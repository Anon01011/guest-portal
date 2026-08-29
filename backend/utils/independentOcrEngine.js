const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const sharp = require('sharp');
const mrzParser = require('mrz');

// ── Python Executable Resolver ───────────────────────────────────────────────
const getPythonExecutable = () => {
  const customPython = (process.env.PYTHON_PATH || '').trim();
  if (customPython && fs.existsSync(customPython)) return customPython;

  const candidates = [
    path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe'),
    path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe'),
    'C:\\Program Files\\Python312\\python.exe',
    'C:\\Program Files\\Python311\\python.exe',
    'C:\\Program Files\\Python310\\python.exe',
    'C:\\Python312\\python.exe',
    'C:\\Python311\\python.exe',
    'C:\\Python310\\python.exe'
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'python';
};

// ── Country Map for MRZ ──────────────────────────────────────────────────────
const COUNTRY_CODE_MAP = {
  QAT: 'QATAR', ARE: 'UAE', SAU: 'SAUDI ARABIA', KWT: 'KUWAIT', BHR: 'BAHRAIN', OMN: 'OMAN',
  YEM: 'YEMEN', JOR: 'JORDAN', LBN: 'LEBANON', SYR: 'SYRIA', IRQ: 'IRAQ', IRN: 'IRAN',
  EGY: 'EGYPT', SDN: 'SUDAN', MAR: 'MOROCCO', DZA: 'ALGERIA', TUN: 'TUNISIA', LBY: 'LIBYA',
  IND: 'INDIA', PAK: 'PAKISTAN', BGD: 'BANGLADESH', LKA: 'SRI LANKA', NPL: 'NEPAL',
  PHL: 'PHILIPPINES', IDN: 'INDONESIA', MYS: 'MALAYSIA', THA: 'THAILAND', VNM: 'VIETNAM',
  USA: 'UNITED STATES', GBR: 'UNITED KINGDOM', CAN: 'CANADA', AUS: 'AUSTRALIA', DEU: 'GERMANY',
  FRA: 'FRANCE', ITA: 'ITALY', ESP: 'SPAIN', TUR: 'TURKEY', RUS: 'RUSSIA', CHN: 'CHINA'
};

const QID_NATIONALITY_CODES = {
  '634': 'QATAR', '356': 'INDIA', '586': 'PAKISTAN', '050': 'BANGLADESH', '144': 'SRI LANKA',
  '524': 'NEPAL', '608': 'PHILIPPINES', '360': 'INDONESIA', '818': 'EGYPT', '729': 'SUDAN',
  '400': 'JORDAN', '422': 'LEBANON', '760': 'SYRIA', '887': 'YEMEN', '504': 'MOROCCO',
  '012': 'ALGERIA', '788': 'TUNISIA', '840': 'UNITED STATES', '826': 'UNITED KINGDOM'
};

// ── Robust Passport Number Cleaner (Guarantees 'Z' is not corrupted to '2') ─
const cleanPassportNumber = (pNo) => {
  if (!pNo) return '';
  let clean = String(pNo).toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  if (!clean) return '';

  // 1. Standard 8-character format (1 letter + 7 digits, e.g. Indian passport: Z1234567, A1234567)
  if (/^[A-Z][0-9OoQqIliT|!SsBbZzGg]{7}$/.test(clean)) {
    const firstChar = clean[0];
    const restDigits = clean.substring(1)
      .replace(/[OoQq]/g, '0')
      .replace(/[IliT|!]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
      .replace(/[Gg]/g, '6');
    return firstChar + restDigits;
  }

  // 2. OCR misread leading 'Z' as '2' in 8-char format (e.g. 21234567 -> Z1234567)
  if (/^2[0-9OoQqIliT|!SsBbZzGg]{7}$/.test(clean)) {
    const restDigits = clean.substring(1)
      .replace(/[OoQq]/g, '0')
      .replace(/[IliT|!]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
      .replace(/[Gg]/g, '6');
    return 'Z' + restDigits;
  }

  // 3. 1 letter + 8 digits (9 chars total, e.g. USA / UK passports)
  if (/^[A-Z][0-9OoQqIliT|!SsBbZzGg]{8}$/.test(clean)) {
    const firstChar = clean[0];
    const restDigits = clean.substring(1)
      .replace(/[OoQq]/g, '0')
      .replace(/[IliT|!]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
      .replace(/[Gg]/g, '6');
    return firstChar + restDigits;
  }

  // 4. 2 letters + 7 digits (e.g. Philippine / EU passports)
  if (/^[A-Z]{2}[0-9OoQqIliT|!SsBbZzGg]{7}$/.test(clean)) {
    const letters = clean.substring(0, 2);
    const restDigits = clean.substring(2)
      .replace(/[OoQq]/g, '0')
      .replace(/[IliT|!]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
      .replace(/[Gg]/g, '6');
    return letters + restDigits;
  }

  // 5. Pure numeric passports
  if (/^[0-9OoQqIliT|!SsBbGg]{7,10}$/.test(clean)) {
    return clean
      .replace(/[OoQq]/g, '0')
      .replace(/[IliT|!]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
      .replace(/[Gg]/g, '6');
  }

  return clean;
};

// ── Smart Date Extractor ─────────────────────────────────────────────────────
const extractDocumentDates = (rawText) => {
  const dates = [];
  const regex = /\b([0-9]{1,2})[\/\-\.]([0-9]{1,2})[\/\-\.]([0-9]{2,4})\b/g;
  let match;
  while ((match = regex.exec(rawText)) !== null) {
    const p1 = parseInt(match[1]);
    const p2 = parseInt(match[2]);
    let yr = parseInt(match[3]);
    if (match[3].length === 2) {
      const curYr = new Date().getFullYear() % 100;
      yr = yr > curYr + 10 ? 1900 + yr : 2000 + yr;
    }
    // Determine day & month
    let day = p1;
    let month = p2;
    if (month > 12 && day <= 12) {
      day = p2;
      month = p1;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && yr >= 1920 && yr <= 2060) {
      dates.push({
        iso: `${yr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        year: yr
      });
    }
  }
  return dates;
};

// ── Passport MRZ Parser (ICAO Doc 9303 TD3 / TD2) ───────────────────────────
const parsePassportMRZ = (ocrText) => {
  const lines = ocrText.split(/\r?\n/).map(l => l.trim().toUpperCase().replace(/\s+/g, '')).filter(Boolean);
  let line1 = '';
  let line2 = '';

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if ((l.startsWith('P<') || l.startsWith('P') || l.startsWith('V<')) && l.length >= 25 && l.length <= 60) {
      line1 = l;
      for (let j = i + 1; j < lines.length; j++) {
        const nextL = lines[j];
        if (nextL.length >= 25 && nextL.length <= 60 && (nextL.includes('<') || /\d/.test(nextL))) {
          line2 = nextL;
          break;
        }
      }
      if (line1 && line2) break;
    }
  }

  if (!line1 || !line2) return null;

  // Format lines to 44 chars
  if (line1.startsWith('P') && line1[1] !== '<') {
    line1 = 'P<' + line1.substring(2);
  }
  const cleanLine1 = line1.padEnd(44, '<').substring(0, 44);
  const cleanLine2 = line2.padEnd(44, '<').substring(0, 44);

  try {
    const strictRes = mrzParser.parse([cleanLine1, cleanLine2]);
    if (strictRes && strictRes.valid && strictRes.fields) {
      const f = strictRes.fields;
      const formatIso = (yymmdd, isExp = false) => {
        if (!yymmdd || yymmdd.length !== 6) return isExp ? '2030-01-01' : '1990-01-01';
        const yy = parseInt(yymmdd.substring(0, 2));
        const mm = yymmdd.substring(2, 4);
        const dd = yymmdd.substring(4, 6);
        const curYy = new Date().getFullYear() % 100;
        const century = isExp ? (yy < 50 ? '20' : '19') : (yy > curYy + 10 ? '19' : '20');
        return `${century}${yymmdd.substring(0, 2)}-${mm}-${dd}`;
      };

      const fullName = `${f.firstName || ''} ${f.lastName || ''}`.trim().toUpperCase();
      const passportNo = cleanPassportNumber(f.documentNumber);
      const nationality = COUNTRY_CODE_MAP[f.nationality] || f.nationality || 'INTERNATIONAL';

      return {
        name: fullName || 'SCANNED PASSPORT HOLDER',
        idNum: passportNo,
        docType: 'Passport',
        nat: nationality,
        dob: formatIso(f.birthDate, false),
        exp: formatIso(f.expirationDate, true)
      };
    }
  } catch (_) { }

  // Fallback MRZ string slicing
  const rawCountry = cleanLine1.substring(2, 5).replace(/</g, '');
  const namePart = cleanLine1.substring(5).replace(/<+/g, ' ').trim();
  const rawId = cleanLine2.substring(0, 9).replace(/</g, '').trim();
  const passportNo = cleanPassportNumber(rawId);

  const dobRaw = cleanLine2.substring(13, 19).replace(/[^0-9]/g, '');
  const expRaw = cleanLine2.substring(21, 27).replace(/[^0-9]/g, '');

  let dob = '1990-01-01';
  let exp = '2030-01-01';
  const curYy = new Date().getFullYear() % 100;
  if (dobRaw.length === 6) {
    const yy = parseInt(dobRaw.substring(0, 2));
    const century = yy > curYy + 10 ? '19' : '20';
    dob = `${century}${dobRaw.substring(0, 2)}-${dobRaw.substring(2, 4)}-${dobRaw.substring(4, 6)}`;
  }
  if (expRaw.length === 6) {
    const yy = parseInt(expRaw.substring(0, 2));
    const century = yy < 50 ? '20' : '19';
    exp = `${century}${expRaw.substring(0, 2)}-${expRaw.substring(2, 4)}-${expRaw.substring(4, 6)}`;
  }

  return {
    name: namePart.toUpperCase() || 'SCANNED PASSPORT HOLDER',
    idNum: passportNo,
    docType: 'Passport',
    nat: COUNTRY_CODE_MAP[rawCountry] || rawCountry || 'INTERNATIONAL',
    dob,
    exp
  };
};

// ── Qatar QID Parser (11 Digits starting with 2 or 3) ────────────────────────
const parseQatarQID = (ocrText) => {
  // 11 digit pattern starting with 2 or 3
  const qidMatch = ocrText.match(/\b([23][0-9]{10})\b/);
  if (!qidMatch) return null;

  const qidNo = qidMatch[1];
  const century = qidNo[0] === '2' ? '19' : '20';
  const birthYear = `${century}${qidNo.substring(1, 3)}`;
  const natCode = qidNo.substring(3, 6);
  const nationality = QID_NATIONALITY_CODES[natCode] || 'QATAR';

  // Extract Name
  let name = '';
  const lines = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const nameLabelRegex = /(?:NAME|FULL\s*NAME|NOME|NAINE|الاسم)\s*[:\s\/-]?\s*([A-Za-z\s'-]+)/i;
  for (const line of lines) {
    const m = line.match(nameLabelRegex);
    if (m && m[1] && m[1].length >= 4 && !/MINISTRY|INTERIOR|QATAR|RESIDENCY/i.test(m[1])) {
      name = m[1].replace(/[^A-Za-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
      break;
    }
  }

  // Dates
  const dates = extractDocumentDates(ocrText);
  let dob = `${birthYear}-01-01`;
  let exp = '2030-01-01';

  if (dates.length > 0) {
    const matchingDob = dates.find(d => String(d.year) === birthYear);
    if (matchingDob) dob = matchingDob.iso;
    else dob = dates[0].iso;

    if (dates.length > 1) {
      exp = dates[dates.length - 1].iso;
    }
  }

  return {
    name: name || 'SCANNED QID HOLDER',
    idNum: qidNo,
    docType: 'QID',
    nat: nationality,
    dob,
    exp
  };
};

// ── Smart Face Extractor ─────────────────────────────────────────────────────
const extractFacePhoto = async (imageBuffer, docType = 'Passport', faceBox = null) => {
  try {
    const meta = await sharp(imageBuffer).metadata();
    if (!meta || !meta.width || !meta.height) return null;

    let cropBox = null;

    // Use detected faceBox from RapidOCR if provided
    if (faceBox && faceBox.length === 4) {
      const [x1, y1, x2, y2] = faceBox;
      const padW = Math.floor((x2 - x1) * 0.25);
      const padH = Math.floor((y2 - y1) * 0.25);
      cropBox = {
        left: Math.max(0, x1 - padW),
        top: Math.max(0, y1 - padH),
        width: Math.min(meta.width - Math.max(0, x1 - padW), (x2 - x1) + padW * 2),
        height: Math.min(meta.height - Math.max(0, y1 - padH), (y2 - y1) + padH * 2)
      };
    } else {
      // Standard geometry crop:
      // Passports: Face is on the bottom-left or bottom-center
      // QID: Face is on the right side
      if (docType === 'QID') {
        cropBox = {
          left: Math.floor(meta.width * 0.65),
          top: Math.floor(meta.height * 0.15),
          width: Math.floor(meta.width * 0.33),
          height: Math.floor(meta.height * 0.70)
        };
      } else {
        cropBox = {
          left: Math.floor(meta.width * 0.05),
          top: Math.floor(meta.height * 0.25),
          width: Math.floor(meta.width * 0.40),
          height: Math.floor(meta.height * 0.65)
        };
      }
    }

    // Ensure within bounds
    cropBox.left = Math.max(0, Math.min(cropBox.left, meta.width - 10));
    cropBox.top = Math.max(0, Math.min(cropBox.top, meta.height - 10));
    cropBox.width = Math.min(cropBox.width, meta.width - cropBox.left);
    cropBox.height = Math.min(cropBox.height, meta.height - cropBox.top);

    if (cropBox.width < 50 || cropBox.height < 50) return null;

    const faceBuf = await sharp(imageBuffer)
      .extract(cropBox)
      .resize({ width: 220, height: 260, fit: 'cover' })
      .jpeg({ quality: 88 })
      .toBuffer();

    return `data:image/jpeg;base64,${faceBuf.toString('base64')}`;
  } catch (err) {
    console.warn('Face photo extraction skipped:', err.message);
    return null;
  }
};

// ── RapidOCR Execution Bridge ────────────────────────────────────────────────
const runRapidOcrEngine = (imageBuffer) => {
  return new Promise((resolve) => {
    let tempPath = null;
    try {
      tempPath = path.join(os.tmpdir(), `indep_ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`);
      fs.writeFileSync(tempPath, imageBuffer);

      const scriptPath = path.join(__dirname, 'paddle_ocr.py');
      const pyBin = getPythonExecutable();

      execFile(pyBin, [scriptPath, tempPath], { timeout: 7000, windowsHide: true }, (err, stdout, stderr) => {
        if (tempPath && fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch (_) { }
        }

        if (err || !stdout) {
          if (stderr) console.warn('Independent OCR Python stderr:', stderr.trim());
          return resolve(null);
        }

        try {
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (!jsonMatch) return resolve(null);
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed && parsed.success && parsed.text) {
            return resolve({
              text: parsed.text,
              lines: parsed.lines || [],
              faceBox: parsed.face_box || null,
              faceBase64: parsed.face_base64 || null
            });
          }
        } catch (_) { }
        resolve(null);
      });
    } catch (e) {
      if (tempPath && fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (_) { }
      }
      resolve(null);
    }
  });
};

// ── Main Entry: Independent High-Accuracy OCR Processor ──────────────────────
const processIndependentOcr = async (filePathOrBuffer, fileName = '', expectedDocType = '') => {
  console.log(`[Independent OCR] Processing document: ${fileName}...`);
  try {
    let rawBuffer = typeof filePathOrBuffer === 'string'
      ? fs.readFileSync(filePathOrBuffer)
      : filePathOrBuffer;

    // 1. Optimize image DPI and orientation via Sharp
    let optimalBuffer;
    try {
      optimalBuffer = await sharp(rawBuffer)
        .rotate()
        .resize({ width: 1400, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 92 })
        .toBuffer();
    } catch (_) {
      optimalBuffer = rawBuffer;
    }

    // 2. Run High-Accuracy Neural OCR Engine (<1s)
    const ocrResult = await runRapidOcrEngine(optimalBuffer);
    const ocrText = ocrResult?.text || '';

    let parsedDoc = null;

    // 3. Document Parsing
    if (expectedDocType === 'Passport' || ocrText.includes('P<') || /PASSPORT/i.test(ocrText)) {
      parsedDoc = parsePassportMRZ(ocrText);
      if (!parsedDoc && /QID|RESIDENCY/i.test(ocrText)) {
        parsedDoc = parseQatarQID(ocrText);
      }
    } else if (expectedDocType === 'QID' || /QID|RESIDENCY|QATAR/i.test(ocrText)) {
      parsedDoc = parseQatarQID(ocrText);
      if (!parsedDoc) {
        parsedDoc = parsePassportMRZ(ocrText);
      }
    } else {
      parsedDoc = parsePassportMRZ(ocrText) || parseQatarQID(ocrText);
    }

    // Fallback loose parsing if standard structures failed
    if (!parsedDoc) {
      const looseDates = extractDocumentDates(ocrText);
      const loosePassMatch = ocrText.match(/\b([A-Z0-9]{8,9})\b/);
      const cleanId = loosePassMatch ? cleanPassportNumber(loosePassMatch[1]) : `UNKNOWN_${Date.now()}`;
      parsedDoc = {
        name: 'SCANNED DOCUMENT HOLDER',
        idNum: cleanId,
        docType: expectedDocType || 'Passport',
        nat: 'INTERNATIONAL',
        dob: looseDates[0]?.iso || '1990-01-01',
        exp: looseDates[looseDates.length - 1]?.iso || '2030-01-01'
      };
    }

    // 4. Face Photo Extraction
    const facePhoto = ocrResult?.faceBase64 || await extractFacePhoto(optimalBuffer, parsedDoc.docType, ocrResult?.faceBox);

    return {
      name: parsedDoc.name,
      idNum: parsedDoc.idNum,
      docType: parsedDoc.docType,
      nat: parsedDoc.nat,
      nationality: parsedDoc.nat,
      dob: parsedDoc.dob,
      exp: parsedDoc.exp,
      expiryDate: parsedDoc.exp,
      phone: '',
      facePhotoBase64: facePhoto,
      raw: `[Independent OCR Engine]\nDoc: ${parsedDoc.docType}\nID: ${parsedDoc.idNum}\nName: ${parsedDoc.name}\nNat: ${parsedDoc.nat}\nDOB: ${parsedDoc.dob}\nExp: ${parsedDoc.exp}`,
      rawOcrText: ocrText,
      lowQuality: !parsedDoc.idNum || parsedDoc.idNum.startsWith('UNKNOWN')
    };
  } catch (err) {
    console.error('[Independent OCR Engine] Failed:', err.message);
    return {
      name: 'SCANNED DOCUMENT HOLDER',
      idNum: `UNKNOWN_${Date.now()}`,
      docType: expectedDocType || 'Passport',
      nat: 'INTERNATIONAL',
      dob: '1990-01-01',
      exp: '2030-01-01',
      phone: '',
      facePhotoBase64: null,
      raw: '',
      lowQuality: true
    };
  }
};

module.exports = {
  processIndependentOcr,
  cleanPassportNumber,
  parsePassportMRZ,
  parseQatarQID,
  extractDocumentDates
};

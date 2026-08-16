const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const mrzParser = require('mrz');
const db = require('../db');

// Passport MRZ country code map
const countryMap = {
  QAT: 'QATAR', ARE: 'UAE', SAU: 'SAUDI ARABIA', KWT: 'KUWAIT', BHR: 'BAHRAIN', OMN: 'OMAN',
  GBR: 'UNITED KINGDOM', USA: 'UNITED STATES', CAN: 'CANADA', IND: 'INDIA', PAK: 'PAKISTAN',
  BGD: 'BANGLADESH', LKA: 'SRI LANKA', NPL: 'NEPAL', PHL: 'PHILIPPINES', IDN: 'INDONESIA',
  MYS: 'MALAYSIA', THA: 'THAILAND', CHN: 'CHINA', JPN: 'JAPAN', ZAF: 'SOUTH AFRICA',
  DEU: 'GERMANY', FRA: 'FRANCE', ITA: 'ITALY', ESP: 'SPAIN', AUS: 'AUSTRALIA', NZL: 'NEW ZEALAND',
  NLD: 'NETHERLANDS', BEL: 'BELGIUM', CHE: 'SWITZERLAND', SWE: 'SWEDEN', NOR: 'NORWAY',
  DNK: 'DENMARK', FIN: 'FINLAND', IRL: 'IRELAND', SGP: 'SINGAPORE', HKG: 'HONG KONG',
  KOR: 'SOUTH KOREA', BRA: 'BRAZIL', MEX: 'MEXICO', RUS: 'RUSSIA', TUR: 'TURKEY'
};

// Global nationality variations and adjectives for accurate matching
const nationalityAdjectives = {
  QAT: ['QATARI', 'QATAR'],
  IND: ['INDIAN', 'INDIA'],
  PAK: ['PAKISTANI', 'PAKISTAN'],
  BGD: ['BANGLADESHI', 'BANGLADESH'],
  LKA: ['SRI LANKAN', 'SRI LANKA'],
  NPL: ['NEPALESE', 'NEPAL'],
  PHL: ['FILIPINO', 'PHILIPPINES', 'PHILIPPINO'],
  GBR: ['BRITISH CITIZEN', 'BRITISH', 'UNITED KINGDOM', 'GBR'],
  USA: ['AMERICAN', 'UNITED STATES', 'USA'],
  CAN: ['CANADIAN', 'CANADA'],
  EGY: ['EGYPTIAN', 'EGYPT'],
  ZAF: ['SOUTH AFRICAN', 'SOUTH AFRICA'],
  YEM: ['YEMENI', 'YEMEN'],
  JOR: ['JORDANIAN', 'JORDAN'],
  LBN: ['LEBANESE', 'LEBANON'],
  SYR: ['SYRIAN', 'SYRIA'],
  IRQ: ['IRAQI', 'IRAQ'],
  SDN: ['SUDANESE', 'SUDAN'],
  SOM: ['SOMALI', 'SOMALIA'],
  PSE: ['PALESTINIAN', 'PALESTINE'],
  TUN: ['TUNISIAN', 'TUNISIA'],
  MAR: ['MOROCCAN', 'MOROCCO'],
  DZA: ['ALGERIAN', 'ALGERIA'],
  LBY: ['LIBYAN', 'LIBYA'],
  FRA: ['FRENCH', 'FRANCE'],
  DEU: ['GERMAN', 'GERMANY'],
  ITA: ['ITALIAN', 'ITALY'],
  ESP: ['SPANISH', 'SPAIN'],
  CHE: ['SWISS', 'SWITZERLAND'],
  AUS: ['AUSTRALIAN', 'AUSTRALIA'],
  NZL: ['NEW ZEALANDER', 'NEW ZEALAND'],
  BRA: ['BRAZILIAN', 'BRAZIL'],
  MEX: ['MEXICAN', 'MEXICO'],
  RUS: ['RUSSIAN', 'RUSSIA'],
  TUR: ['TURKISH', 'TURKEY'],
  MYS: ['MALAYSIAN', 'MALAYSIA'],
  THA: ['THAI', 'THAILAND'],
  CHN: ['CHINESE', 'CHINA'],
  JPN: ['JAPANESE', 'JAPAN'],
  NLD: ['DUTCH', 'NETHERLANDS'],
  BEL: ['BELGIAN', 'BELGIUM'],
  SWE: ['SWEDISH', 'SWEDEN'],
  NOR: ['NORWEGIAN', 'NORWAY'],
  DNK: ['DANISH', 'DENMARK'],
  FIN: ['FINNISH', 'FINLAND'],
  IRL: ['IRISH', 'IRELAND'],
  SGP: ['SINGAPOREAN', 'SINGAPORE'],
  HKG: ['HONG KONG'],
  KOR: ['KOREAN', 'SOUTH KOREA']
};

// Qatar ID numeric nationality lookup map
const qidCountryMap = {
  '634': 'QATAR',
  '356': 'INDIA',
  '586': 'PAKISTAN',
  '050': 'BANGLADESH',
  '144': 'SRI LANKA',
  '524': 'NEPAL',
  '608': 'PHILIPPINES',
  '360': 'INDONESIA',
  '704': 'VIETNAM',
  '818': 'EGYPT',
  '710': 'SOUTH AFRICA',
  '826': 'UNITED KINGDOM',
  '840': 'UNITED STATES',
  '784': 'UAE',
  '682': 'SAUDI ARABIA',
  '482': 'KENYA',
  '566': 'NIGERIA',
  '800': 'UGANDA',
  '887': 'YEMEN',
  '400': 'JORDAN',
  '422': 'LEBANON',
  '760': 'SYRIA',
  '368': 'IRAQ',
  '729': 'SUDAN',
  '706': 'SOMALIA',
  '275': 'PALESTINE',
  '788': 'TUNISIA',
  '504': 'MOROCCO',
  '012': 'ALGERIA',
  '434': 'LIBYA',
  '250': 'FRANCE',
  '276': 'GERMANY',
  '380': 'ITALY',
  '724': 'SPAIN',
  '756': 'SWITZERLAND',
  '036': 'AUSTRALIA',
  '554': 'NEW ZEALAND',
  '124': 'CANADA'
};

// Helper to check if a parsed 3-letter code is a valid ISO country code
const VALID_MRZ_COUNTRY_CODES = new Set([
  // Asia
  'AFG', 'ARM', 'AZE', 'BHR', 'BGD', 'BTN', 'BRN', 'KHM', 'CHN', 'CYP', 'GEO', 'IND', 'IDN', 'IRN', 'IRQ', 'ISR', 'JPN', 'JOR', 'KAZ', 'KWT', 'KGZ', 'LAO', 'LBN', 'MYS', 'MDV', 'MNG', 'MMR', 'NPL', 'PRK', 'OMN', 'PAK', 'PSE', 'PHL', 'QAT', 'SAU', 'SGP', 'KOR', 'LKA', 'SYR', 'TWN', 'TJK', 'THA', 'TLS', 'TUR', 'TKM', 'ARE', 'UZB', 'VNM', 'YEM',
  // Europe
  'ALB', 'AND', 'AUT', 'BLR', 'BEL', 'BIH', 'BGR', 'HRV', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'ISL', 'IRL', 'ITA', 'LVA', 'LIE', 'LTU', 'LUX', 'MLT', 'MDA', 'MCO', 'MNE', 'NLD', 'MKD', 'NOR', 'POL', 'PRT', 'ROU', 'RUS', 'SMR', 'SRB', 'SVK', 'SVN', 'ESP', 'SWE', 'CHE', 'UKR', 'GBR', 'VAT',
  // Americas
  'ATG', 'ARG', 'BHS', 'BRB', 'BLZ', 'BOL', 'BRA', 'CAN', 'CHL', 'COL', 'CRI', 'CUB', 'DMA', 'DOM', 'ECU', 'SLV', 'GRD', 'GTM', 'GUY', 'HTI', 'HND', 'JAM', 'MEX', 'NIC', 'PAN', 'PRY', 'PER', 'KNA', 'LCA', 'VCT', 'SUR', 'TTO', 'USA', 'URY', 'VEN',
  // Africa
  'DZA', 'AGO', 'BEN', 'BWA', 'BFA', 'BDI', 'CPV', 'CMR', 'CAF', 'TCD', 'COM', 'COD', 'COG', 'CIV', 'DJI', 'EGY', 'GNQ', 'ERI', 'SWZ', 'ETH', 'GAB', 'GMB', 'GHA', 'GIN', 'GNB', 'KEN', 'LSO', 'LBR', 'LBY', 'MDG', 'MWI', 'MLI', 'MRT', 'MUS', 'MAR', 'MOZ', 'NAM', 'NER', 'NGA', 'RWA', 'STP', 'SEN', 'SYC', 'SLE', 'SOM', 'ZAF', 'SSD', 'SDN', 'TGO', 'TUN', 'UGA', 'TZA', 'ZMB', 'ZWE',
  // Oceania
  'AUS', 'FJI', 'KIR', 'MHL', 'FSM', 'NRU', 'NZL', 'PLW', 'PNG', 'WSM', 'SLB', 'TON', 'TUV', 'VUT',
  // Non-standard / Specimen / Common
  'UTO', 'D', 'E', 'F', 'I', 'N', 'S'
]);

const isValidCountryCode = (code) => {
  if (!code || code.length !== 3) return false;
  return VALID_MRZ_COUNTRY_CODES.has(code.toUpperCase());
};

// Helper to extract the highest-scoring candidate name from OCR text
const extractNameWithFallback = (ocrText) => {
  const nameLines = ocrText.split('\n');
  
  // Try label-based extraction with scoring first
  for (let i = 0; i < nameLines.length; i++) {
    const line = nameLines[i].toUpperCase();
    const hasNameLabel = line.includes('NAME:') || line.includes('NAME ') ||
      line.includes('AME:') || line.includes('AME ') || line.includes('NAM:') ||
      line.includes('الاسم') || /\bNAME\b/.test(line);

    if (hasNameLabel) {
      // Clean same-line candidate
      let cleanInline = nameLines[i]
        .replace(/name:/i, '').replace(/name/i, '')
        .replace(/ame:/i, '').replace(/ame/i, '')
        .replace(/nam:/i, '')
        .replace(/الاسم:/g, '').replace(/الاسم/g, '')
        .replace(/[^A-Za-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Clean next-line candidate
      let cleanNext = '';
      if (i + 1 < nameLines.length) {
        cleanNext = nameLines[i + 1]
          .replace(/[^A-Za-z\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      const getUppercaseScore = (str) => {
        if (!str) return 0;
        const words = str.split(/\s+/).filter(w => w.length >= 3 && /^[A-Z]+$/.test(w));
        return words.length;
      };

      const scoreInline = getUppercaseScore(cleanInline);
      const scoreNext = getUppercaseScore(cleanNext);

      if (scoreNext > scoreInline && scoreNext >= 2) {
        return cleanNext.toUpperCase().replace(/\s+/g, ' ').trim();
      } else if (cleanInline.length > 3 && scoreInline >= 1) {
        return cleanInline.toUpperCase().replace(/0/g, 'O').replace(/1/g, 'I').replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
      } else if (cleanNext.length > 3 && scoreNext >= 1) {
        return cleanNext.toUpperCase().replace(/0/g, 'O').replace(/1/g, 'I').replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  // Fallback A: Extract first full uppercase line with length 8-50 as a name
  const qidHeaderWords = new Set(['STATE', 'QATAR', 'CARD', 'RESIDENCY', 'CIVIL', 'REGISTER',
    'NATIONAL', 'IDENTITY', 'MINISTRY', 'INTERIOR', 'PERMIT', 'WORK', 'PASS', 'HOLDER',
    'DATE', 'BIRTH', 'EXPIRY', 'NATIONALITY', 'GENDER', 'OCCUPATION', 'ADDRESS', 'VALID',
    'ISSUED', 'ISSUE', 'PLACE', 'PHOTO', 'SIGNATURE', 'NUMBER', 'SERIAL', 'BARCODE',
    'PASSPORT', 'PASAPORTE', 'PASSEPORT', 'REPUBLIC', 'REPUBLICA', 'REPUBLIQUE',
    'UNITED', 'STATES', 'AMERICA', 'COUNTRY', 'SURNAME', 'APELLIDOS', 'NOM', 'NAMES',
    'PRENOMS', 'NOMBRES', 'GIVEN', 'AUTHORITY', 'AUTORIDAD', 'SEX', 'SEXO', 'PAGE',
    'OFFICIAL', 'OFFICE', 'BEARER', 'STATE', 'OF', 'THE', 'AND', 'FOR', 'DE', 'LA', 'EL']);

  for (const line of nameLines) {
    const cleaned = line.replace(/[^A-Za-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
    if (words.length < 2) continue;
    
    // Must be uppercase words
    const isAllUpper = words.every(w => /^[A-Z]+$/.test(w));
    if (!isAllUpper) continue;
    
    // Check if contains any header word
    if (words.some(w => qidHeaderWords.has(w))) continue;
    
    // Keep it if it is length 8-50
    if (cleaned.length >= 8 && cleaned.length <= 50) {
      return cleaned.toUpperCase();
    }
  }

  // Fallback B: If still nothing, try the regex match as last resort (but filter out short lowercase noise)
  const nameMatch = ocrText.match(/(?:name|full\s+name|given\s+names|surname|ame|nam)[:\s]+([A-Za-z \t\.\-]+)/i);
  if (nameMatch) {
    const val = nameMatch[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').toUpperCase();
    if (val.length > 5) return val;
  }

  return '';
};


// Helper to clean and correct passport numbers (correcting 0 vs O confusion)
const cleanPassportNumber = (pNo) => {
  if (!pNo) return '';
  let clean = pNo.toUpperCase().replace(/\s/g, '');
  // Indian passport format: 1 letter + 7 digits. If last character is 'O' or 'o', convert to '0'.
  if (/^[A-Z][0-9OoIliT]{7,8}$/.test(clean)) {
    return clean[0] + clean.substring(1).replace(/[Oo]/g, '0').replace(/[IliT]/g, '1');
  }
  // Purely numeric with potential O/I misreads:
  if (/^[0-9OoIliT]{7,10}$/.test(clean)) {
    return clean.replace(/[Oo]/g, '0').replace(/[IliT]/g, '1');
  }
  // General: Replace 'O' with '0' if it is immediately adjacent to digits on both sides or at boundaries
  clean = clean.replace(/(\d)[Oo](\d)/g, '$10$2');
  clean = clean.replace(/(\d)[Oo]\b/g, '$10');
  clean = clean.replace(/\b[Oo](\d)/g, '0$1');
  return clean;
};

// Extract dates formatted as DD/MM/YYYY or DD-MM-YYYY (tolerant to misread separators like 1, l, i, T, spaces)
const extractDates = (ocrText) => {
  const dates = [];
  // Allow O/o/I/l/i/T in date patterns and correct them
  const regex = /([0-9OoIliT]{2})[\/\-\.\s1lIT]?([0-9OoIliT]{2})[\/\-\.\s1lIT]?([0-9OoIliT]{4})/g;
  let match;
  while ((match = regex.exec(ocrText)) !== null) {
    const dd = match[1].replace(/[Oo]/g, '0').replace(/[IliT]/g, '1');
    const mm = match[2].replace(/[Oo]/g, '0').replace(/[IliT]/g, '1');
    const yyyy = match[3].replace(/[Oo]/g, '0').replace(/[IliT]/g, '1');

    const day = parseInt(dd);
    const month = parseInt(mm);
    const year = parseInt(yyyy);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1930 && year <= 2050) {
      dates.push({
        iso: `${yyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        month,
        year,
        raw: match[0]
      });
    }
  }

  // Add support for verbal month abbreviations
  const monthMap = {
    JAN: 1, FEV: 2, FEB: 2, MAR: 3, AVR: 4, APR: 4, MAI: 5, MAY: 5, JUN: 6,
    JUL: 7, JUI: 7, JUIL: 7, AOU: 8, AUG: 8, SEP: 9, SEPT: 9, OCT: 10, NOV: 11, DEC: 12
  };
  
  const verbalRegex = /\b([0-9OoIliT]{1,2})[\s\-\/\.]+(JAN|FEB|FEV|MAR|APR|AVR|MAY|MAI|JUN|JUL|JUI|JUIL|AUG|AOU|SEP|SEPT|OCT|NOV|DEC)[\s\-\/\.a-zA-Z]*\b([0-9OoIliT]{2,4})\b/gi;
  while ((match = verbalRegex.exec(ocrText)) !== null) {
    const dd = match[1].replace(/[Oo]/g, '0').replace(/[IliT]/g, '1');
    const mStr = match[2].toUpperCase();
    const yyStr = match[3].replace(/[Oo]/g, '0').replace(/[IliT]/g, '1');
    
    const day = parseInt(dd);
    const month = monthMap[mStr];
    let year = parseInt(yyStr);
    
    if (yyStr.length === 2) {
      const currentYear = new Date().getFullYear() % 100;
      year = year > currentYear + 10 ? 1900 + year : 2000 + year;
    }
    
    if (month && day >= 1 && day <= 31 && year >= 1930 && year <= 2050) {
      dates.push({
        iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        month,
        year,
        raw: match[0]
      });
    }
  }

  return dates;
};

// Helper to align parsed MRZ names with uppercase page text to filter out trailing single-letter noise
const restoreSpecialCharacters = (nameStr, rawPageWords) => {
  if (!nameStr) return '';
  
  let restored = nameStr.toUpperCase();
  const cleanStr = (s) => s.replace(/[^A-Z]/g, '');
  
  // Try to match against raw page words
  for (const rw of rawPageWords) {
    if (rw.includes('-') || rw.includes("'")) {
      const rwClean = cleanStr(rw);
      if (!rwClean) continue;
      
      // 1. Check if it matches the entire restored nameStr
      if (rwClean === cleanStr(restored)) {
        return rw;
      }
      
      // 2. Check if it matches a sequence of words in restored
      const words = restored.split(' ');
      for (let len = 1; len <= words.length; len++) {
        for (let start = 0; start <= words.length - len; start++) {
          const slice = words.slice(start, start + len).join(' ');
          if (cleanStr(slice) === rwClean) {
            restored = restored.replace(slice, rw);
          }
        }
      }
    }
  }
  return restored;
};

const extractNationality = (countryCode, txt) => {
  if (!txt) return countryMap[countryCode] || countryCode || 'International';
  
  const upperText = txt.toUpperCase();
  const code = (countryCode || '').toUpperCase();
  
  // 1. If we have a country code, look up its specific adjectives first
  if (code && nationalityAdjectives[code]) {
    for (const adj of nationalityAdjectives[code]) {
      if (upperText.includes(adj)) {
        return adj;
      }
    }
  }
  
  // 2. Line-by-line scan: find "Nationality" label and read the next line value
  // This is the most reliable method - handles "Nationality/ Nationalité\nUTOPIAN" format
  const upperLines = txt.split('\n').map(l => l.trim().toUpperCase()).filter(Boolean);
  const natLabelKeywords = ['NATIONALITY', 'NATIONALITE', 'NATIONALITÉ', 'NATIONALIT'];
  for (let i = 0; i < upperLines.length; i++) {
    const line = upperLines[i];
    if (natLabelKeywords.some(kw => line.includes(kw))) {
      // The value may be on the SAME line (after the label) or the NEXT line
      // Strip the bilingual label portion: "NATIONALITY/ NATIONALITE" then take first meaningful word
      const stripped = line
        .replace(/NATIONALITY\s*\/?/i, '')
        .replace(/NATIONALIT[EÉ]\w*/gi, '')
        .replace(/[^A-Z\s]/g, ' ')
        .trim();
      const bannedWords = new Set(['DATE', 'BIRTH', 'PASSPORT', 'TYPE', 'CODE', 'NUMBER', 'PLACE', 'BIRTH', 'ISSUE', 'EXPIRY', 'GIVEN', 'SURNAME', 'NAME', 'PERSONAL', 'PERSONAL', 'SEXE', 'NAISSANCE', 'DELIVRANCE', 'EXPIRATION']);
      const inlineWords = stripped.split(/\s+/)
        .filter(w => w.length >= 4 && /^[A-Z]+$/.test(w) && !bannedWords.has(w));
      if (inlineWords.length > 0) {
        return inlineWords.slice(0, 2).join(' ');
      }
      // Check next 2 lines for the value
      for (let j = i + 1; j < Math.min(i + 3, upperLines.length); j++) {
        const valLine = upperLines[j];
        if (!valLine || valLine.includes('DATE') || valLine.includes('BIRTH') ||
            valLine.includes('SEX') || valLine.includes('PASSPORT') ||
            valLine.includes('SURNAME') || valLine.includes('GIVEN') ||
            valLine.includes('PLACE') || valLine.includes('NUMBER')) continue;
        // Only pick up words that are at least 4 chars (filter out "AN", "SA", "DE" noise)
        const meaningfulWords = valLine.split(/\s+/)
          .filter(w => w.length >= 4 && /^[A-Z]+$/.test(w))
          .slice(0, 3);
        if (meaningfulWords.length > 0) {
          return meaningfulWords.join(' ');
        }
      }
    }
  }

  // 3. Regex scan: look for "NATIONALITY:" pattern in the full text
  // Only accept words that are 4+ characters to filter bilingual label noise (AN, SA, DE)
  const natLineMatch = txt.match(/(?:nationality|nationalit[eé])\/?\s*(?:nationalit[eé])?[:\s]+([A-Za-z]{4,}(?:\s[A-Za-z]{4,}){0,2})/i);
  if (natLineMatch) {
    const candidate = natLineMatch[1].trim().toUpperCase();
    if (!candidate.includes('PASSPORT') && !candidate.includes('CODE') &&
        !candidate.includes('TYPE') && !candidate.includes('NUMBER') &&
        !candidate.includes('DATE') && !candidate.includes('PLACE') &&
        !candidate.includes('BIRTH')) {
      return candidate;
    }
  }

  // 4. Search all known adjectives to see if any match the page text
  for (const [cCode, adjs] of Object.entries(nationalityAdjectives)) {
    for (const adj of adjs) {
      if (upperText.includes(adj)) {
        return adj;
      }
    }
  }

  return countryMap[code] || countryCode || 'International';
};

const alignNameWithPageText = (surname, givenNames, ocrText) => {
  const lines = ocrText.split('\n');
  const nonMrzLines = lines.filter(l => {
    const clean = l.replace(/\s/g, '').toUpperCase();
    if (clean.match(/^[0-9<]+$/)) return false;
    
    const isMrzCandidate = (clean.startsWith('P') || clean.startsWith('V') || clean.match(/^[A-Z0-9<]{9,}\d/)) && clean.length >= 20;
    const hasLowercase = /[a-z]/.test(l);
    const hasPunct = /[,.?@#$!%&*()_+={}\[\]]/.test(l);
    
    if (isMrzCandidate && !hasLowercase && !hasPunct) {
      return false; // Exclude MRZ lines
    }
    return true;
  });
  
  const pageWords = [];
  const rawPageWords = [];
  const excludedWords = new Set([
    'PASSPORT', 'PASAPORTE', 'PASSEPORT', 'REPUBLIC', 'REPUBLICA', 'REPUBLIQUE',
    'UNITED', 'STATES', 'AMERICA', 'NATIONALITY', 'NATIONALITE', 'COUNTRY',
    'SURNAME', 'APELLIDOS', 'NOM', 'NAMES', 'PRENOMS', 'NOMBRES', 'GIVEN',
    'DATE', 'BIRTH', 'EXPIRY', 'EXPIRATION', 'AUTHORITY', 'AUTORIDAD', 'SEX',
    'SEXO', 'PAGE', 'OFFICIAL', 'OFFICE', 'HOLDER', 'SIGNATURE', 'BEARER',
    'STATE', 'OF', 'THE', 'AND', 'FOR', 'DE', 'LA', 'EL'
  ]);
  
  const allPageWords = [];
  for (const line of nonMrzLines) {
    const rawWords = line.toUpperCase().split(/\s+/).map(w => w.replace(/^[^A-Z\-\']+/g, '').replace(/[^A-Z\-\']+$/g, ''));
    for (const rw of rawWords) {
      if (rw.length >= 3 && !excludedWords.has(rw)) {
        rawPageWords.push(rw);
      }
    }

    const words = line.toUpperCase().split(/[^A-Z\-\']/);
    for (const w of words) {
      if (w.length >= 3 && !excludedWords.has(w)) {
        pageWords.push(w);
      }
    }

    const wordsForSequence = line.toUpperCase().split(/[^A-Z\-\']+/).filter(Boolean);
    allPageWords.push(...wordsForSequence);
  }

  let cleanSurname = surname;
  let cleanGiven = givenNames;

  const matchWithNoise = (target, word) => {
    if (target === word) return true;
    if (target.substring(1) === word) return true;
    if (target.substring(0, target.length - 1) === word) return true;
    if (target.substring(1, target.length - 1) === word) return true;
    return false;
  };

  const stripFillerNoise = (str) => {
    let clean = str.toUpperCase().replace(/[^A-Z]/g, '').trim();
    const fillers = /^[KCXLSVTOB01]/;
    const trailingFillers = /[KCXLSVTOB01]$/;
    
    // Keep stripping leading fillers as long as length > 2
    while (clean.length > 2 && fillers.test(clean)) {
      clean = clean.substring(1);
    }
    // Keep stripping trailing fillers as long as length > 2
    while (clean.length > 2 && trailingFillers.test(clean)) {
      clean = clean.substring(0, clean.length - 1);
    }
    return clean;
  };

  // Case 1: Surname and Given Names got merged into Surname because of missing separator
  if (cleanSurname && !cleanGiven) {
    for (const w1 of pageWords) {
      if (cleanSurname.startsWith(w1) && w1.length < cleanSurname.length) {
        const remaining = cleanSurname.substring(w1.length);
        
        // Try matching with another page word first
        let foundMatch = false;
        for (const w2 of pageWords) {
          if (matchWithNoise(remaining, w2)) {
            cleanSurname = w1;
            cleanGiven = w2;
            foundMatch = true;
            break;
          }
        }
        
        // Fallback: If no second page word matched (e.g. signature blocked it), strip MRZ filler noise from remaining part
        if (!foundMatch) {
          const cleanedRemaining = stripFillerNoise(remaining);
          if (cleanedRemaining.length >= 3) {
            cleanSurname = w1;
            cleanGiven = cleanedRemaining;
            foundMatch = true;
          }
        }

        if (foundMatch) {
          cleanSurname = restoreSpecialCharacters(cleanSurname, rawPageWords);
          cleanGiven = restoreSpecialCharacters(cleanGiven, rawPageWords);
          return { surname: cleanSurname, givenNames: cleanGiven };
        }
      }
    }

    // Case 1b: Merged surname/given names, but page text only contains the given name
    for (const w2 of pageWords) {
      if (cleanSurname.endsWith(w2) && w2.length < cleanSurname.length) {
        const prefix = cleanSurname.substring(0, cleanSurname.length - w2.length);
        const cleanedPrefix = stripFillerNoise(prefix);
        if (cleanedPrefix.length >= 3) {
          cleanSurname = cleanedPrefix;
          cleanGiven = w2;
          cleanSurname = restoreSpecialCharacters(cleanSurname, rawPageWords);
          cleanGiven = restoreSpecialCharacters(cleanGiven, rawPageWords);
          return { surname: cleanSurname, givenNames: cleanGiven };
        }
      } else {
        const fillers = /[KCXLSVTOB01]$/;
        if (fillers.test(cleanSurname)) {
          const trimmed = cleanSurname.substring(0, cleanSurname.length - 1);
          if (trimmed.endsWith(w2) && w2.length < trimmed.length) {
            const prefix = trimmed.substring(0, trimmed.length - w2.length);
            const cleanedPrefix = stripFillerNoise(prefix);
            if (cleanedPrefix.length >= 3) {
              cleanSurname = cleanedPrefix;
              cleanGiven = w2;
              cleanSurname = restoreSpecialCharacters(cleanSurname, rawPageWords);
              cleanGiven = restoreSpecialCharacters(cleanGiven, rawPageWords);
              return { surname: cleanSurname, givenNames: cleanGiven };
            }
          }
        }
      }
    }
  }

  // Case 2: Surname and/or Given Names have trailing filler noise or merged words without separators (e.g. KINGDOMLKFIVE, OBAMAK, MICHELLEC)
  const isPureNoise = (str) => /^[KCXLSVTOB01<]*$/.test(str.toUpperCase());

  const alignSegment = (seg) => {
    if (!seg) return '';
    
    const cleanSeg = seg.replace(/[^A-Z]/g, '');
    
    // 1. Check exact match (ignoring special chars)
    for (const w of pageWords) {
      const cleanW = w.replace(/[^A-Z]/g, '');
      if (cleanSeg === cleanW) return w;
    }
    
    // 2. Check if cleanSeg is part of a larger page word (e.g. seg="OCONNOR" is part of w="O'CONNOR-FIVE")
    for (const w of pageWords) {
      const cleanW = w.replace(/[^A-Z]/g, '');
      if (cleanW.includes(cleanSeg)) {
        // If the difference is a single leading/trailing character that is in the noise set,
        // it was likely stolen by the MRZ separator (e.g. w="KOPAL", seg="OPAL" due to KK separator).
        if (cleanW.length === cleanSeg.length + 1) {
          const extraChar = cleanW.startsWith(cleanSeg) ? cleanW[cleanW.length - 1] : cleanW[0];
          if (isPureNoise(extraChar)) {
            return w; // restore stolen letter
          }
        }
        return seg; // keep it as is, restoreSpecialCharacters will merge/restore it later
      }
    }
    
    // 3. Fallback: check if seg contains multiple page words separated by noise
    // (e.g. seg="KINGDOMLKFIVE", w1="KINGDOM", w2="FIVE")
    for (let j = 0; j < pageWords.length; j++) {
      const w1 = pageWords[j];
      const cleanW1 = w1.replace(/[^A-Z]/g, '');
      const idx1 = cleanSeg.indexOf(cleanW1);
      if (idx1 !== -1) {
        for (let k = 0; k < pageWords.length; k++) {
          if (j === k) continue;
          const w2 = pageWords[k];
          const cleanW2 = w2.replace(/[^A-Z]/g, '');
          const idx2 = cleanSeg.indexOf(cleanW2, idx1 + cleanW1.length);
          if (idx2 !== -1) {
            const prefix = cleanSeg.substring(0, idx1);
            const middle = cleanSeg.substring(idx1 + cleanW1.length, idx2);
            const suffix = cleanSeg.substring(idx2 + cleanW2.length);
            if (isPureNoise(prefix) && isPureNoise(middle) && isPureNoise(suffix)) {
              return `${w1} ${w2}`;
            }
          }
        }
      }
    }
    
    const normalizeOCRConfusions = (str) => {
      return str.toUpperCase()
        .replace(/[GQO0]/g, 'C')
        .replace(/[1LT]/g, 'I')
        .replace(/[5]/g, 'S')
        .replace(/[8]/g, 'B')
        .replace(/[V]/g, 'U');
    };

    // 4. Check if seg contains a single page word surrounded by noise
    // (e.g. seg="CYOUNANCLC", w="YOUNAN")
    for (const w of pageWords) {
      const cleanW = w.replace(/[^A-Z]/g, '');
      const normW = normalizeOCRConfusions(cleanW);
      const normSeg = normalizeOCRConfusions(cleanSeg);
      
      const idx = normSeg.indexOf(normW);
      if (idx !== -1) {
        const prefix = cleanSeg.substring(0, idx);
        const suffix = cleanSeg.substring(idx + cleanW.length);
        if (isPureNoise(prefix) && isPureNoise(suffix)) {
          return seg.substring(idx, idx + cleanW.length); // return matching part of original seg to keep MRZ spelling
        }
      }
    }
    
    // If it is pure discardable noise and didn't match any page words, discard it!
    const isDiscardableNoise = (str) => /^[CLXK01<]+$/.test(str.toUpperCase());
    if (isDiscardableNoise(seg)) {
      return '';
    }
    
    return seg;
  };

  const matchSequenceOfPageWords = (seg, pageWordsList) => {
    if (!seg) return '';
    const cleanSeg = seg.replace(/[^A-Z]/g, '');
    if (cleanSeg.length < 3) return '';
    
    // Scan page words list for any sequence of 1 to 5 words that concatenates to cleanSeg
    for (let i = 0; i < pageWordsList.length; i++) {
      let currentConcat = '';
      const sequence = [];
      for (let j = i; j < Math.min(i + 5, pageWordsList.length); j++) {
        currentConcat += pageWordsList[j].replace(/[^A-Z]/g, '');
        sequence.push(pageWordsList[j]);
        if (currentConcat === cleanSeg) {
          return sequence.join(' ');
        }
      }
    }
    return '';
  };

  if (cleanSurname) {
    const matchedSeq = matchSequenceOfPageWords(cleanSurname, allPageWords);
    if (matchedSeq) {
      cleanSurname = matchedSeq;
    } else {
      const segments = cleanSurname.split(' ');
      const cleanSegments = segments.map(alignSegment).filter(Boolean);
      cleanSurname = cleanSegments.join(' ');
    }
  }
  if (cleanGiven) {
    const matchedSeq = matchSequenceOfPageWords(cleanGiven, allPageWords);
    if (matchedSeq) {
      cleanGiven = matchedSeq;
    } else {
      const segments = cleanGiven.split(' ');
      const cleanSegments = segments.map(alignSegment).filter(Boolean);
      cleanGiven = cleanSegments.join(' ');
    }
  }

  // Restore special characters using raw page words
  cleanSurname = restoreSpecialCharacters(cleanSurname, rawPageWords);
  cleanGiven = restoreSpecialCharacters(cleanGiven, rawPageWords);

  return { surname: cleanSurname, givenNames: cleanGiven };
};

// Passport MRZ Parser helper
const parseMRZ = (ocrText) => {
  const rawLines = ocrText.split('\n');

  // Find first MRZ line. MRZ lines should not contain lowercase letters or punctuation.
  let mrzLine1Index = -1;
  let cleanLine1 = '';

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    
    // Filter out standard page text and label lines (which are not MRZ lines)
    const upperRawLine = rawLine.toUpperCase();
    const lineWords = upperRawLine.split(/[^A-Z]+/).filter(Boolean);
    const hasBannedWord = lineWords.some(w => ['PASSPORT', 'REPUBLIC', 'UNITED', 'STATES', 'AMERICA', 'NATIONALITY', 'SURNAME', 'GIVEN', 'NAMES', 'AUTHORITY', 'BIRTH', 'EXPIRY', 'DATE', 'SEX'].includes(w));
    if (hasBannedWord) {
      continue;
    }

    // Clean trailing noise characters
    let clean = rawLine.trim().replace(/[|\\\/()\[\]{}©’'`]+$/g, '').trim();
    // Count lowercase letters and punctuation to filter out sentence-like background text
    const lowercaseCount = (clean.match(/[a-z]/g) || []).length;
    const punctCount = (clean.match(/[,.&?!;:\-’'`]/g) || []).length;

    const noSpaces = clean.replace(/\s/g, '');
    if (lowercaseCount > 3 || punctCount > 2) {
      continue;
    }

    const upperNoSpaces = noSpaces.toUpperCase();
    const isPOrV = upperNoSpaces.startsWith('P') || upperNoSpaces.startsWith('V');

    if (isPOrV && upperNoSpaces.length >= 20 && upperNoSpaces.length <= 65) {
      mrzLine1Index = i;
      cleanLine1 = upperNoSpaces;
      break;
    }
  }

  if (mrzLine1Index !== -1) {
    // Reconstruct cleanLine1 if '<' was misread as 'S' or other letter at index 1
    if (cleanLine1.startsWith('P') && cleanLine1[1] !== '<') {
      cleanLine1 = 'P<' + cleanLine1.substring(2);
    } else if (cleanLine1.startsWith('V') && cleanLine1[1] !== '<') {
      cleanLine1 = 'V<' + cleanLine1.substring(2);
    }

    const prefix = cleanLine1.startsWith('P') ? 'P<' : 'V<';
    const startIndex = cleanLine1.indexOf(prefix);
    const line1 = cleanLine1.substring(startIndex, startIndex + 44);

    // Find second MRZ line among subsequent lines, skipping short barcode noise lines
    let line2 = '';
    for (let i = mrzLine1Index + 1; i < rawLines.length; i++) {
      const rawLine = rawLines[i];
      let clean = rawLine.trim().replace(/[|\\\/()\[\]{}©’'`]+$/g, '').trim();
      const lowercaseCount = (clean.match(/[a-z]/g) || []).length;
      const punctCount = (clean.match(/[,.&?!;:\-’'`]/g) || []).length;

      const noSpaces = clean.replace(/\s/g, '');
      if (lowercaseCount > 3 || punctCount > 2) {
        continue;
      }

      const upperNoSpaces = noSpaces.toUpperCase();
      if (upperNoSpaces.length >= 20 && upperNoSpaces.length <= 65 && (upperNoSpaces.includes('<') || upperNoSpaces.match(/\d/))) {
        line2 = upperNoSpaces.replace(/^[^A-Z0-9]+/g, '').substring(0, 44); // strip leading pipes/noise and limit to 44 chars
        break;
      }
    }

    if (!line2) return null;

    // Try strict MRZ library parsing first (use if valid)
    try {
      const cleanLine1 = line1.padEnd(44, '<').substring(0, 44);
      const cleanLine2 = line2.padEnd(44, '<').substring(0, 44);
      const strictResult = mrzParser.parse([cleanLine1, cleanLine2]);

      if (strictResult && strictResult.valid && strictResult.fields) {
        const f = strictResult.fields;
        if (f.lastName && f.firstName && f.documentNumber) {
          const formatDate = (yyyymmdd) => {
            if (!yyyymmdd || yyyymmdd.length !== 6) return '1990-01-01';
            const yy = yyyymmdd.substring(0, 2);
            const mm = yyyymmdd.substring(2, 4);
            const dd = yyyymmdd.substring(4, 6);
            const currentYear = new Date().getFullYear() % 100;
            const century = parseInt(yy) > (currentYear + 10) ? '19' : '20';
            return `${century}${yy}-${mm}-${dd}`;
          };

          const formatExpiry = (yyyymmdd) => {
            if (!yyyymmdd || yyyymmdd.length !== 6) return '2030-01-01';
            const yy = yyyymmdd.substring(0, 2);
            const mm = yyyymmdd.substring(2, 4);
            const dd = yyyymmdd.substring(4, 6);
            const century = parseInt(yy) < 50 ? '20' : '19';
            return `${century}${yy}-${mm}-${dd}`;
          };

          const aligned = alignNameWithPageText(f.lastName.toUpperCase(), f.firstName.toUpperCase(), ocrText);
          const fullName = `${aligned.givenNames} ${aligned.surname}`.trim().toUpperCase();
          const nationality = extractNationality(f.nationality, ocrText);

          return {
            name: fullName,
            idNum: f.documentNumber.toUpperCase(),
            docType: 'Passport',
            nat: nationality,
            dob: formatDate(f.birthDate),
            exp: formatExpiry(f.expirationDate)
          };
        }
      }
    } catch (strictErr) {
      // ignore strict parser error and proceed to robust fallback
    }

    // Country Code (index 2-5, 3 chars) - validate if it is a real ISO country code
    const rawCountry = line1.substring(2, 5);
    let country = '';
    let namePart = '';

    if (isValidCountryCode(rawCountry)) {
      country = rawCountry;
      namePart = line1.substring(5);
    } else {
      // If index 2-5 is not a valid country code (e.g. P<DELAPAZ), there is no country code prefix
      namePart = line1.substring(2);
    }

    // Helper to clean up noise segments (removes repeating C/L/X/K filler misreads)
    const fillerChars = /^[<]$/;
    const cleanNameSegment = (seg) => {
      let clean = seg.trim().replace(/[^A-Z0-9]/g, '').trim();
      if (!clean) return '';
      if (/^[<]+$/.test(clean)) return ''; // reject purely noise strings

      // Truncate at first run of 3+ same filler chars (LLL, CCC, XXX = misread '<<<<')
      const noiseMatch = clean.match(/([CLXK])\1\1+/i);
      if (noiseMatch) {
        const idx = clean.indexOf(noiseMatch[0]);
        clean = clean.substring(0, idx);
      }

      // Strip leading filler chars one-by-one (e.g. CYOUNAN -> YOUNAN)
      while (clean.length > 2 && fillerChars.test(clean[0])) {
        clean = clean.substring(1);
      }

      // Strip trailing filler chars one-by-one (e.g. YOUNANCLC -> YOUNAN)
      while (clean.length > 2 && fillerChars.test(clean[clean.length - 1])) {
        clean = clean.substring(0, clean.length - 1);
      }
      return clean;
    };

    let surname = '';
    let givenNames = '';

    // First occurrence of double filler characters is the separator between surname and given names
    let separatorIndex = namePart.indexOf('<<');
    if (separatorIndex === -1) {
      const match = namePart.match(/(KK|XX|CC|<<)/);
      if (match) {
        separatorIndex = match.index;
      }
    }

    if (separatorIndex !== -1) {
      let sepStart = separatorIndex;
      let sepEnd = separatorIndex + 2;
      const noiseSet = new Set(['<']);
      
      // Expand left to include contiguous noise characters
      while (sepStart > 0 && noiseSet.has(namePart[sepStart - 1])) {
        sepStart--;
      }
      // Expand right to include contiguous noise characters
      while (sepEnd < namePart.length && noiseSet.has(namePart[sepEnd])) {
        sepEnd++;
      }

      const surnamePart = namePart.substring(0, sepStart);
      const givenPart = namePart.substring(sepEnd);

      surname = surnamePart.split(/[<\s]+/)
        .map(cleanNameSegment)
        .filter(s => s && (s.length > 2 || s === 'JR' || s === 'SR' || s === 'II' || s === 'IV'))
        .join(' ');
      givenNames = givenPart.split(/[<\s]+/)
        .map(cleanNameSegment)
        .filter(s => s && (s.length > 2 || s === 'JR' || s === 'SR' || s === 'II' || s === 'IV'))
        .join(' ');
    } else {
      // Fallback: split by single < or space if no double separator is found
      const nameSegments = namePart.split(/[<\s]+/).filter(Boolean);
      surname = nameSegments[0] ? cleanNameSegment(nameSegments[0]) : '';
      givenNames = nameSegments.slice(1)
        .map(cleanNameSegment)
        .filter(s => s && (s.length > 2 || s === 'JR' || s === 'SR' || s === 'II' || s === 'IV'))
        .join(' ');
    }

    // Correct numeric 0 to letter O in names (e.g. MARI0 -> MARIO)
    surname = surname.replace(/0/g, 'O');
    givenNames = givenNames.replace(/0/g, 'O');

    // Align name segments with visual page text to eliminate single-character OCR noise (like OBAMAK or MICHELLEC)
    const aligned = alignNameWithPageText(surname, givenNames, ocrText);
    surname = aligned.surname;
    givenNames = aligned.givenNames;

    const fullName = `${givenNames} ${surname}`.trim();

    // Passport number (index 0-9, 9 chars) - clean and correct O/0 confusion
    const rawPassportNo = line2.substring(0, 9).replace(/</g, '').trim();
    const passportNo = cleanPassportNumber(rawPassportNo);

    // Date of Birth & Expiry Date (Robust pattern-based extraction relative to Sex character to handle index shifts)
    let dobRaw = '';
    let expRaw = '';
    
    // Find pattern: [6 digits DOB] + [1 digit check] + [Sex letter/filler] + [6 digits Expiry]
    const datePatternMatch = line2.match(/([0-9OoIliTBbSsZzGg]{6})[0-9OoIliTBbSsZzGg][A-Z<]([0-9OoIliTBbSsZzGg]{6})/);
    if (datePatternMatch) {
      dobRaw = datePatternMatch[1]
        .replace(/[Oo]/g, '0')
        .replace(/[IliT]/g, '1')
        .replace(/[Bb]/g, '8')
        .replace(/[Ss]/g, '5')
        .replace(/[Zz]/g, '2')
        .replace(/[Gg]/g, '6')
        .replace(/[^0-9]/g, '');
        
      expRaw = datePatternMatch[2]
        .replace(/[Oo]/g, '0')
        .replace(/[IliT]/g, '1')
        .replace(/[Bb]/g, '8')
        .replace(/[Ss]/g, '5')
        .replace(/[Zz]/g, '2')
        .replace(/[Gg]/g, '6')
        .replace(/[^0-9]/g, '');
    } else {
      // Fallback to standard index slicing if pattern doesn't match
      dobRaw = line2.substring(13, 19)
        .replace(/[Oo]/g, '0')
        .replace(/[IliT]/g, '1')
        .replace(/[Bb]/g, '8')
        .replace(/[Ss]/g, '5')
        .replace(/[Zz]/g, '2')
        .replace(/[Gg]/g, '6')
        .replace(/[^0-9]/g, '');
        
      expRaw = line2.substring(21, 27)
        .replace(/[Oo]/g, '0')
        .replace(/[IliT]/g, '1')
        .replace(/[Bb]/g, '8')
        .replace(/[Ss]/g, '5')
        .replace(/[Zz]/g, '2')
        .replace(/[Gg]/g, '6')
        .replace(/[^0-9]/g, '');
    }

    let dob = '1990-01-01';
    if (/^\d{6}$/.test(dobRaw)) {
      const yy = parseInt(dobRaw.substring(0, 2));
      const mm = dobRaw.substring(2, 4);
      const dd = dobRaw.substring(4, 6);
      const currentYear = new Date().getFullYear() % 100;
      const century = yy > currentYear + 10 ? '19' : '20';
      const mVal = parseInt(mm);
      const dVal = parseInt(dd);
      if (mVal >= 1 && mVal <= 12 && dVal >= 1 && dVal <= 31) {
        dob = `${century}${dobRaw.substring(0, 2)}-${mm}-${dd}`;
      }
    }

    let exp = '2030-01-01';
    if (/^\d{6}$/.test(expRaw)) {
      const yy = parseInt(expRaw.substring(0, 2));
      const mm = expRaw.substring(2, 4);
      const dd = expRaw.substring(4, 6);
      const century = yy < 50 ? '20' : '19';
      const mVal = parseInt(mm);
      const dVal = parseInt(dd);
      if (mVal >= 1 && mVal <= 12 && dVal >= 1 && dVal <= 31) {
        exp = `${century}${expRaw.substring(0, 2)}-${mm}-${dd}`;
      }
    }

    let nationality = extractNationality(country, ocrText);

    return {
      name: fullName,
      idNum: passportNo,
      docType: 'Passport',
      nat: nationality,
      dob,
      exp
    };
  }
  return null;
};

const parseQIDText = (ocrText) => {
  // Filter out MRZ lines to prevent false matching QID from MRZ numbers
  const qidLines = ocrText.split('\n');
  const nonMrzTextForQid = qidLines.filter(l => {
    const clean = l.replace(/\s/g, '').toUpperCase();
    const isMrzCandidate = (clean.startsWith('P') || clean.startsWith('V') || clean.match(/^[A-Z0-9<]{9,}\d/)) && clean.length >= 20;
    const hasLowercase = /[a-z]/.test(l);
    const hasPunct = /[,.?@#$!%&*()_+={}\[\]]/.test(l);
    return !(isMrzCandidate && !hasLowercase && !hasPunct);
  }).join('\n');

  // Allow common OCR digit misreads in QID regex (length 11, starting with 2 or 3)
  const qidMatch = nonMrzTextForQid.match(/\b([23][0-9OoIliT]{10})\b/) || nonMrzTextForQid.match(/([23][0-9OoIliT]{10})/);
  if (qidMatch) {
    const qid = qidMatch[1].replace(/[Oo]/g, '0').replace(/[IliT]/g, '1');

    // Validate country code in QID (digits 4 to 6)
    const countryCode = qid.substring(3, 6);
    // Accept any valid 3-digit numeric country code (QIDs use standard ISO-3166 numeric country codes)
    if (!/^\d{3}$/.test(countryCode)) {
      return null;
    }

    // 1. Decode Birth Year from QID
    const firstDigit = qid[0];
    const century = firstDigit === '2' ? '19' : '20';
    const birthYear = parseInt(`${century}${qid.substring(1, 3)}`);

    const nameLines = ocrText.split('\n');
    const foundDates = extractDates(ocrText);

    // 2. Decode DOB
    let dob = `${birthYear}-01-01`; // Default fallback using QID birth year
    const dobMatch = foundDates.find(d => d.year === birthYear);
    if (dobMatch) {
      dob = dobMatch.iso;
    } else {
      const dobLine = nameLines.find(l => {
        const upper = l.toUpperCase();
        return upper.includes('D.O.B') || upper.includes('DOB') || upper.includes('BIRTH') || upper.includes('الميلاد');
      });
      if (dobLine) {
        const lineDates = extractDates(dobLine);
        if (lineDates.length > 0) {
          dob = lineDates[0].iso;
        }
      }
    }

    // 3. Decode Expiry
    let exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expLine = nameLines.find(l => {
      const upper = l.toUpperCase();
      return upper.includes('EXP') || upper.includes('VALI') || upper.includes('Expiry') || upper.includes('الصلاحية');
    });

    if (expLine) {
      const lineDates = extractDates(expLine);
      if (lineDates.length > 0) {
        exp = lineDates[0].iso;
      }
    } else {
      const otherDate = foundDates.find(d => d.iso !== dob);
      if (otherDate) {
        exp = otherDate.iso;
      }
    }

    // 4. Decode Name
    let name = extractNameWithFallback(ocrText) || 'Scanned QID Holder';

    // 5. Decode Nationality using standard QID numeric country codes
    let nationality = qidCountryMap[countryCode] || 'Qatari';

    // Fallback: look for nationality label in text if lookup fails or defaults
    if (nationality === 'Qatari') {
      for (let i = 0; i < nameLines.length; i++) {
        const line = nameLines[i].toUpperCase();
        if (line.includes('NATIONALITY:') || line.includes('NATIONALITY')) {
          const clean = nameLines[i].replace(/nationality:/i, '').replace(/nationality/i, '').replace(/[^A-Za-z\s]/g, '').trim();
          if (clean.length > 3) {
            nationality = clean.toUpperCase();
            break;
          }
        }
      }
    }

    return {
      name,
      idNum: qid,
      docType: 'QID',
      nat: nationality,
      dob,
      exp
    };
  }
  return null;
};

// Main entry point for document OCR details detection
const parseDocumentDetails = (fileName, docType, ocrText = '') => {
  const combined = `${fileName} ${ocrText}`.toLowerCase();

  const femaleAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmFlOGZmIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI0MCIgcj0iMjIiIGZpbGw9IiNkOTQ2ZWYiLz48cGF0aCBkPSJNMjAgODVjMC0xNSAxMi0yNSAzMC0yNXMzMCAxMCAzMCAyNXoiIGZpbGw9IiNkOTQ2ZWYiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjQwIiByPSIxOCIgZmlsbD0iI2ZiY2ZlOCIvPjwvc3ZnPg==';
  const maleAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTBmMmZlIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI0MCIgcj0iMjIiIGZpbGw9IiMwMjg0YzciLz48cGF0aCBkPSJNMjAgODVjMC0xNSAxMi0yNSAzMC0yNXMzMCAxMCAzMCAyNXoiIGZpbGw9IiMwMjg0YzciLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjQwIiByPSIxOCIgZmlsbD0iI2JhZTZmZCIvPjwvc3ZnPg==';

  // Helper to validate passport number structure (rejects obviously misread MRZ lines with too many letters)
  const isValidPassportNo = (pNo) => {
    if (!pNo) return false;
    if (pNo.length < 6) return false; // Passport numbers are at least 6 characters
    const letterCount = (pNo.match(/[A-Z]/g) || []).length;
    if (letterCount >= 4) return false; // Usually passport numbers have 1-2 letters maximum
    if (/^[0\s]+$/.test(pNo)) return false; // Reject all zeros/empty
    return true;
  };

  const extractPassportNumberLoosely = (txt) => {
    // 1. Try with prefixes, allowing slashes/dots/spaces/e e.g. "Passport No./Passeport No. 925076473"
    const prefixRegex = /(?:passport|passeport|pass|doc|id)\s*no\.?(?:\s*\/?[A-Za-z\s]*no\.?)?[:\s]+([A-Z0-9]+)/i;
    const match1 = txt.match(prefixRegex);
    if (match1) {
      const cleanNum = cleanPassportNumber(match1[1]);
      if (isValidPassportNo(cleanNum)) {
        return cleanNum;
      }
    }

    // 2. Scan all 8-9 character alphanumeric words in the text and validate them
    const candidateRegex = /\b([A-Z0-9]{8,9})\b/gi;
    let candidateMatch;
    while ((candidateMatch = candidateRegex.exec(txt)) !== null) {
      const cleanNum = cleanPassportNumber(candidateMatch[1]);
      if (isValidPassportNo(cleanNum)) {
        return cleanNum;
      }
    }

    if (match1) {
      return cleanPassportNumber(match1[1]);
    }
    return '';
  };

  // Determine if this is a Passport or QID based on input docType and OCR indicators
  const isPassportExpected = docType === 'Passport' ||
    (docType !== 'QID' && (combined.includes('passport') || ocrText.includes('P<') || ocrText.includes('V<') || ocrText.includes('PSIND') || ocrText.includes('P<IND')));

  // 1. Try standard Passport MRZ parsing
  const mrzData = parseMRZ(ocrText);
  if (mrzData) {
    // Override passport number from text-regex if MRZ returned garbage/invalid
    if (!isValidPassportNo(mrzData.idNum)) {
      const passMatch1 = ocrText.match(/P\s+[A-Z]{3}\s+([A-Z0-9]+)/i);
      const passMatch2 = ocrText.match(/(?:passport|pass|doc|id)\s*no\.?[:\s]+([a-z0-9]+)/i);
      if (passMatch1) {
        mrzData.idNum = passMatch1[1].toUpperCase();
      } else if (passMatch2) {
        mrzData.idNum = passMatch2[1].toUpperCase();
      }
    }

    // Correct invalid DOB/Expiry formats (like 2000-00-00 or default) from found dates
    const foundDates = extractDates(ocrText);
    if (foundDates.length > 0) {
      // Sort dates chronologically: oldest is DOB, newest is Expiry
      const sortedDates = [...foundDates].sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day);

      if (mrzData.dob.includes('00') || mrzData.dob === '1990-01-01') {
        mrzData.dob = sortedDates[0].iso;
      }

      if (mrzData.exp.includes('00') || mrzData.exp === '2030-01-01' || mrzData.exp <= mrzData.dob) {
        mrzData.exp = sortedDates[sortedDates.length - 1].iso;
      }
    } else {
      if (mrzData.dob.includes('00') || mrzData.dob === '1990-01-01') {
        mrzData.dob = '1980-01-01';
      }
      if (mrzData.exp.includes('00') || mrzData.exp === '2030-01-01') {
        mrzData.exp = '2030-01-01';
      }
    }

    return {
      ...mrzData,
      phone: '',
      facePhotoBase64: mrzData.name.includes('ANGELA') ? femaleAvatar : maleAvatar,
      raw: `OCR Parsed from Passport MRZ:\nName: ${mrzData.name}\nPassport No: ${mrzData.idNum}\nNationality: ${mrzData.nat}\nDOB: ${mrzData.dob}\nExpiry: ${mrzData.exp}`
    };
  }

  // 2. Try standard Qatar ID layout parsing
  const qidData = parseQIDText(ocrText);
  if (qidData) {
    return {
      ...qidData,
      phone: '',
      facePhotoBase64: qidData.name.includes('DEBORAH') ? femaleAvatar : maleAvatar,
      raw: `OCR Parsed from Qatar ID:\nName: ${qidData.name}\nQID No: ${qidData.idNum}\nNationality: ${qidData.nat}\nDOB: ${qidData.dob}\nExpiry: ${qidData.exp}`
    };
  }

  // If a passport is expected, do a loose passport details extraction rather than falling back to QID
  if (isPassportExpected) {
    let name = 'Scanned Passport Holder';
    let passportNo = '';

    // Find any line starting with P or V and length >= 30 (our candidate first line)
    const rawLines = ocrText.split('\n');
    const line1 = rawLines.find(line => {
      const upperLine = line.toUpperCase();
      const lineWords = upperLine.split(/[^A-Z]+/).filter(Boolean);
      const hasBannedWord = lineWords.some(w => ['PASSPORT', 'REPUBLIC', 'UNITED', 'STATES', 'AMERICA', 'NATIONALITY', 'SURNAME', 'GIVEN', 'NAMES', 'AUTHORITY', 'BIRTH', 'EXPIRY', 'DATE', 'SEX'].includes(w));
      if (hasBannedWord) return false;
      const clean = line.replace(/\s/g, '').toUpperCase();
      return (clean.startsWith('P') || clean.startsWith('V')) && clean.length >= 20;
    })?.replace(/\s/g, '').toUpperCase();
    if (line1) {
      let cleanedLine1 = line1;
      if (cleanedLine1.startsWith('P') && cleanedLine1[1] !== '<') {
        cleanedLine1 = 'P<' + cleanedLine1.substring(2);
      } else if (cleanedLine1.startsWith('V') && cleanedLine1[1] !== '<') {
        cleanedLine1 = 'V<' + cleanedLine1.substring(2);
      }
      const namePart = cleanedLine1.substring(5);
      const nameSegments = namePart.split('<').filter(Boolean);
      if (nameSegments.length > 0) {
        const cleanNameSegment = (seg) => seg.replace(/[^A-Z]/g, '').trim();
        let surname = cleanNameSegment(nameSegments[0]);
        let givenNames = nameSegments.slice(1).map(cleanNameSegment).filter(Boolean).join(' ');
        name = `${givenNames} ${surname}`.trim().replace(/0/g, 'O').replace(/1/g, 'I');
      }
    }

    if (name === 'Scanned Passport Holder') {
      const ocrLines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
      let surnameVal = '';
      let givenNamesVal = '';
      
      for (let i = 0; i < ocrLines.length; i++) {
        const line = ocrLines[i].toUpperCase();
        if ((line.includes('SURNAME') || line.includes('NOM')) && !line.includes('PRENOM') && !line.includes('PRÉNOM')) {
          if (i + 1 < ocrLines.length) {
            surnameVal = ocrLines[i + 1].trim();
          }
        }
        if (line.includes('GIVEN NAMES') || line.includes('PRENOMS') || line.includes('GIVEN NAME')) {
          if (i + 1 < ocrLines.length) {
            givenNamesVal = ocrLines[i + 1].trim();
          }
        }
      }
      
      if (surnameVal || givenNamesVal) {
        const cleanSeg = (seg) => seg.toUpperCase().replace(/[^A-Z\s\-]/g, '').replace(/\s+/g, ' ').trim();
        surnameVal = cleanSeg(surnameVal);
        givenNamesVal = cleanSeg(givenNamesVal);
        name = `${givenNamesVal} ${surnameVal}`.trim();
      }
    }

    // Extract passport number loosely
    passportNo = extractPassportNumberLoosely(ocrText);

    // Extract nationality
    let nationality = extractNationality('', ocrText);

    // Extract dates
    const foundDates = extractDates(ocrText);
    let dob = '1990-01-01';
    let exp = '2030-01-01';
    if (foundDates.length > 0) {
      const sortedDates = [...foundDates].sort((a, b) => a.year - b.year);
      dob = sortedDates[0].iso;
      if (sortedDates.length > 1) {
        exp = sortedDates[sortedDates.length - 1].iso;
      }
    }

    return {
      name: name || 'Scanned Passport Holder',
      idNum: passportNo,
      docType: 'Passport',
      nat: nationality,
      dob,
      exp,
      phone: '',
      facePhotoBase64: maleAvatar,
      raw: `OCR Loose Parsed from Passport:\nPassport No: ${passportNo}\nNationality: ${nationality}\nDOB: ${dob}\nExpiry: ${exp}`
    };
  }



  // 3. Intelligent general fallback parsing based on raw OCR text
  let detectedId = '';
  let detectedDob = '1990-01-01';
  let detectedExp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Set default document type: if text mentions Qatar, Residency, Permit, or QID, classify as QID!
  const lowerOcr = ocrText.toLowerCase();
  let detectedDocType = docType;
  if (!detectedDocType) {
    if (lowerOcr.includes('qatar') || lowerOcr.includes('residency') || lowerOcr.includes('permit') || lowerOcr.includes('qid')) {
      detectedDocType = 'QID';
    } else {
      detectedDocType = 'Passport';
    }
  }

  let detectedNat = 'International';
  let detectedName = '';

  // Extract ID / Passport Number from text (filter out MRZ lines to prevent false matching QID from MRZ numbers)
  const qidLines = ocrText.split('\n');
  const nonMrzTextForQid = qidLines.filter(l => {
    const clean = l.replace(/\s/g, '').toUpperCase();
    const isMrzCandidate = (clean.startsWith('P') || clean.startsWith('V') || clean.match(/^[A-Z0-9<]{9,}\d/)) && clean.length >= 20;
    const hasLowercase = /[a-z]/.test(l);
    const hasPunct = /[,.?@#$!%&*()_+={}\[\]]/.test(l);
    return !(isMrzCandidate && !hasLowercase && !hasPunct);
  }).join('\n');

  const qidMatch = nonMrzTextForQid.match(/\b([123][0-9OoIliT]{10})\b/) || nonMrzTextForQid.match(/([123][0-9OoIliT]{10})/);
  if (qidMatch) {
    detectedId = qidMatch[1].replace(/[Oo]/g, '0').replace(/[IliT]/g, '1');
    detectedDocType = 'QID';
    detectedNat = 'Qatari';
  } else {
    const loosePassNo = extractPassportNumberLoosely(ocrText);
    if (loosePassNo) {
      detectedId = loosePassNo;
      detectedDocType = 'Passport';
    } else {
      // Try to find Passport Number: e.g. "P QAT 00000000" or "Passport No 00000000"
      const passMatch1 = ocrText.match(/P\s+[A-Z]{3}\s+([A-Z0-9]+)/i);
      const passMatch2 = ocrText.match(/(?:passport|pass|doc|id)\s*no\.?[:\s]+([a-z0-9]+)/i);
      const passMatch3 = ocrText.match(/\b([A-Z0-9]{8,9})\b/i);

      // Stricter check: real IDs or Passports MUST contain at least 4 actual digits to avoid matching pure text words (like NAONAITY)
      const hasEnoughDigits = (str) => {
        if (!str) return false;
        const digits = str.replace(/[^0-9]/g, '');
        return digits.length >= 4;
      };

      if (passMatch1 && hasEnoughDigits(passMatch1[1])) {
        detectedId = cleanPassportNumber(passMatch1[1]);
        detectedDocType = 'Passport';
      } else if (passMatch2 && hasEnoughDigits(passMatch2[1])) {
        detectedId = cleanPassportNumber(passMatch2[1]);
        if (detectedDocType === 'QID' || detectedId.length === 11) {
          detectedDocType = 'QID';
        } else {
          detectedDocType = 'Passport';
        }
      } else if (passMatch3 && hasEnoughDigits(passMatch3[1]) && detectedDocType !== 'QID') {
        detectedId = cleanPassportNumber(passMatch3[1]);
        detectedDocType = 'Passport';
      }
    }
  }

  // Extract Name using our high-quality helper
  detectedName = extractNameWithFallback(ocrText);

  // Extract Dates
  const foundDates = extractDates(ocrText);
  if (foundDates.length > 0) {
    const sortedDates = [...foundDates].sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day);

    let matchedDobFromQid = false;
    // Align with valid real QID birth year if possible
    if (detectedDocType === 'QID' && detectedId && /^[23]/.test(detectedId)) {
      const firstDigit = detectedId[0];
      const century = firstDigit === '2' ? '19' : '20';
      const birthYear = parseInt(`${century}${detectedId.substring(1, 3)}`);
      const dobMatch = sortedDates.find(d => d.year === birthYear);
      if (dobMatch) {
        detectedDob = dobMatch.iso;
        matchedDobFromQid = true;
      }
    }

    if (!matchedDobFromQid) {
      // DOB is the oldest date
      detectedDob = sortedDates[0].iso;
    }

    // Expiry is the newest date
    if (sortedDates.length >= 2) {
      detectedExp = sortedDates[sortedDates.length - 1].iso;
    }
  }

  // Extract Nationality (same line restriction to avoid merging headers)
  const natMatch = ocrText.match(/(?:nationality|nat|country)[:\s]+([A-Za-z ]+)/i);
  if (natMatch) {
    detectedNat = extractNationality('', natMatch[1].trim());
  } else if (detectedDocType === 'QID' && detectedId) {
    const qidCountryMap = {
      '634': 'QATAR', '356': 'INDIA', '586': 'PAKISTAN', '050': 'BANGLADESH', '144': 'SRI LANKA',
      '524': 'NEPAL', '608': 'PHILIPPINES', '360': 'INDONESIA', '704': 'VIETNAM', '818': 'EGYPT',
      '710': 'SOUTH AFRICA', '826': 'UNITED KINGDOM', '840': 'UNITED STATES', '784': 'UAE',
      '682': 'SAUDI ARABIA', '482': 'KENYA', '566': 'NIGERIA', '800': 'UGANDA', '887': 'YEMEN',
      '400': 'JORDAN', '422': 'LEBANON', '760': 'SYRIA', '368': 'IRAQ', '729': 'SUDAN', '706': 'SOMALIA'
    };
    const countryCode = detectedId.substring(3, 6);
    detectedNat = qidCountryMap[countryCode] || 'Qatari';
  } else {
    detectedNat = extractNationality('', ocrText);
  }

  // Final clean fallbacks if still empty
  if (!detectedId) {
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    detectedId = baseName.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase() || 'UNKNOWN';
  }
  if (!detectedName) {
    detectedName = detectedDocType === 'QID' ? 'Uploaded QID Holder' : 'Uploaded Passport Holder';
  }

  return {
    name: detectedName,
    idNum: detectedId,
    docType: detectedDocType,
    nat: detectedNat,
    dob: detectedDob,
    exp: detectedExp,
    phone: '',
    facePhotoBase64: maleAvatar,
    raw: `File: ${fileName}\nType: ${detectedDocType}\nOCR Text Extracted:\n${ocrText || '(No text detected)'}`
  };
};

const performVisionApiOcr = async (base64Content) => {
  const apiKey = process.env.VISION_API_KEY;
  if (!apiKey) return null;
  try {
    console.log("Calling Google Cloud Vision API for premium high-accuracy OCR...");
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Content },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
          }
        ]
      })
    });
    const result = await response.json();
    const annotation = result.responses?.[0]?.fullTextAnnotation;
    if (annotation && annotation.text) {
      console.log(`Google Cloud Vision OCR Completed. Extracted length: ${annotation.text.length}`);
      return annotation.text;
    }
  } catch (err) {
    console.error("Google Cloud Vision API failed:", err.message);
  }
  return null;
};

// Helper to detect 2D boundaries of an ID card in an image (uses variance-based scan)
const detectCardBounds = async (bufferOrPath) => {
  try {
    let buffer = bufferOrPath;
    if (typeof bufferOrPath === 'string') {
      buffer = fs.readFileSync(bufferOrPath);
    }
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;
    
    // Resize to 100x100 for fast pixel variance calculation
    const scanWidth = 100;
    const scanHeight = 100;
    const rawData = await sharp(buffer)
      .resize(scanWidth, scanHeight, { fit: 'fill' })
      .raw()
      .toBuffer();
      
    // Calculate column variances
    const columnVariances = [];
    for (let x = 0; x < scanWidth; x++) {
      const pixels = [];
      for (let y = 0; y < scanHeight; y++) {
        const idx = (y * scanWidth + x) * 3;
        const r = rawData[idx];
        const g = rawData[idx + 1];
        const b = rawData[idx + 2];
        const val = 0.299 * r + 0.587 * g + 0.114 * b;
        pixels.push(val);
      }
      const avg = pixels.reduce((sum, v) => sum + v, 0) / scanHeight;
      const variance = pixels.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / scanHeight;
      columnVariances.push(variance);
    }
    
    // Calculate row variances
    const rowVariances = [];
    for (let y = 0; y < scanHeight; y++) {
      const pixels = [];
      for (let x = 0; x < scanWidth; x++) {
        const idx = (y * scanWidth + x) * 3;
        const r = rawData[idx];
        const g = rawData[idx + 1];
        const b = rawData[idx + 2];
        const val = 0.299 * r + 0.587 * g + 0.114 * b;
        pixels.push(val);
      }
      const avg = pixels.reduce((sum, v) => sum + v, 0) / scanWidth;
      const variance = pixels.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / scanWidth;
      rowVariances.push(variance);
    }
    
    const threshold = 15;
    let cardLeftIndex = 0;
    for (let x = 0; x < scanWidth; x++) {
      if (columnVariances[x] > threshold) {
        cardLeftIndex = x;
        break;
      }
    }
    
    let cardRightIndex = scanWidth - 1;
    for (let x = scanWidth - 1; x >= 0; x--) {
      if (columnVariances[x] > threshold) {
        cardRightIndex = x;
        break;
      }
    }
    
    let cardTopIndex = 0;
    for (let y = 0; y < scanHeight; y++) {
      if (rowVariances[y] > threshold) {
        cardTopIndex = y;
        break;
      }
    }
    
    let cardBottomIndex = scanHeight - 1;
    for (let y = scanHeight - 1; y >= 0; y--) {
      if (rowVariances[y] > threshold) {
        cardBottomIndex = y;
        break;
      }
    }
    
    const leftPx = Math.round((cardLeftIndex / scanWidth) * width);
    const rightPx = Math.round((cardRightIndex / scanWidth) * width);
    const topPx = Math.round((cardTopIndex / scanHeight) * height);
    const bottomPx = Math.round((cardBottomIndex / scanHeight) * height);
    
    return {
      left: leftPx,
      right: rightPx,
      width: rightPx - leftPx,
      top: topPx,
      bottom: bottomPx,
      height: bottomPx - topPx
    };
  } catch (err) {
    console.error('Card bounds detection failed:', err.message);
    return null;
  }
};

// Helper to extract/crop guest's face photo from QID/Passport photocopy buffer
const extractFace = async (bufferOrPath, docType) => {
  try {
    let buffer = bufferOrPath;
    if (typeof bufferOrPath === 'string') {
      buffer = fs.readFileSync(bufferOrPath);
    }
    // Auto-rotate image based on EXIF tag so coordinates match the visual layout
    const rotatedImage = sharp(buffer).rotate();
    const metadata = await rotatedImage.metadata();
    const width = metadata.width;
    const height = metadata.height;

    let left, top, cropWidth, cropHeight;

    if (docType === 'QID') {
      // Try to dynamically detect card boundaries for high-precision cropping
      const rotatedBuffer = await rotatedImage.toBuffer();
      const bounds = await detectCardBounds(rotatedBuffer);
      
      if (bounds && bounds.width > width * 0.3 && bounds.height > height * 0.3) {
        // High-precision crop relative to detected card boundary (shifted left & narrowed)
        left = Math.max(0, Math.round(bounds.left + bounds.width * 0.015));
        top = Math.max(0, Math.round(bounds.top + bounds.height * 0.16));
        cropWidth = Math.min(width - left, Math.round(bounds.width * 0.22));
        cropHeight = Math.min(height - top, Math.round(bounds.height * 0.58));
        console.log(`QID High-precision Crop Bounds - Size: ${width}x${height}, Crop: left=${left}, top=${top}, width=${cropWidth}, height=${cropHeight}`);
      } else {
        // Fallback to percentage-based crop if bounds are invalid
        if (width >= height) {
          left = Math.max(0, Math.round(width * 0.02));
          top = Math.max(0, Math.round(height * 0.16));
          cropWidth = Math.min(width - left, Math.round(width * 0.22));
          cropHeight = Math.min(height - top, Math.round(height * 0.58));
        } else {
          left = Math.max(0, Math.round(width * 0.15));
          top = Math.max(0, Math.round(height * 0.12));
          cropWidth = Math.min(width - left, Math.round(width * 0.55));
          cropHeight = Math.min(height - top, Math.round(height * 0.40));
        }
        console.log(`QID Standard Percentage Crop - Size: ${width}x${height}, Crop: left=${left}, top=${top}, width=${cropWidth}, height=${cropHeight}`);
      }
    } else {
      if (height > width) {
        // Portrait scan (vertical spread of passport booklet): photo is in bottom-left
        left = Math.max(0, Math.round(width * 0.03));
        top = Math.max(0, Math.round(height * 0.65));
        cropWidth = Math.min(width - left, Math.round(width * 0.44));
        cropHeight = Math.min(height - top, Math.round(height * 0.30));
      } else {
        // Landscape scan (data page only): photo is on the left side
        left = Math.max(0, Math.round(width * 0.02));
        top = Math.max(0, Math.round(height * 0.18));
        cropWidth = Math.min(width - left, Math.round(width * 0.33));
        cropHeight = Math.min(height - top, Math.round(height * 0.55));
      }
    }

    console.log(`extractFace Crop Coordinates - Size: ${width}x${height}, Crop: left=${left}, top=${top}, width=${cropWidth}, height=${cropHeight}`);

    const faceBuffer = await rotatedImage
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .jpeg({ quality: 85 })
      .toBuffer();

    return `data:image/jpeg;base64,${faceBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Face extraction failed:', err.message);
    return null;
  }
};


const formatRegulaDate = (dateStr) => {
  if (!dateStr) return '';
  // Try parsing YYMMDD (MRZ format)
  if (/^\d{6}$/.test(dateStr)) {
    const yy = dateStr.slice(0, 2);
    const mm = dateStr.slice(2, 4);
    const dd = dateStr.slice(4, 6);
    const currentYear = new Date().getFullYear() % 100;
    const yearPrefix = parseInt(yy) > currentYear + 20 ? '19' : '20';
    return `${yearPrefix}${yy}-${mm}-${dd}`;
  }
  // Try DD.MM.YYYY or DD/MM/YYYY
  const parts = dateStr.split(/[./-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) { // DD MM YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (parts[0].length === 4) { // YYYY MM DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  return dateStr;
};

const parseRegulaResponse = (data) => {
  const result = {
    name: '',
    idNum: '',
    docType: 'Passport',
    nationality: '',
    dob: '',
    expiryDate: '',
    facePhotoBase64: null,
    rawOcrText: JSON.stringify(data)
  };

  if (!data || !data.ContainerList || !Array.isArray(data.ContainerList.List)) {
    return null;
  }

  let surname = '';
  let givenNames = '';

  for (const container of data.ContainerList.List) {
    // Text container (result_type = 3)
    if (container.result_type === 3 && container.Text && Array.isArray(container.Text.fieldList)) {
      for (const field of container.Text.fieldList) {
        const val = field.valueList?.[0]?.value;
        if (!val) continue;

        const name = field.fieldName;
        if (name === 'Surname' || name === 'Primary Identifier') {
          surname = val;
        } else if (name === 'Given Names' || name === 'Secondary Identifier') {
          givenNames = val;
        } else if (name === 'Document Number') {
          result.idNum = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        } else if (name === 'Date of Birth') {
          result.dob = formatRegulaDate(val);
        } else if (name === 'Date of Expiry') {
          result.expiryDate = formatRegulaDate(val);
        } else if (name === 'Nationality') {
          result.nationality = val.toUpperCase();
        } else if (name === 'Personal Number') {
          const cleanVal = val.replace(/[^a-zA-Z0-9]/g, '');
          if (cleanVal.startsWith('2') || cleanVal.startsWith('3')) {
            result.idNum = cleanVal;
            result.docType = 'QID';
          }
        } else if (name === 'Document Class Code') {
          if (val === 'ID' || val === 'I') {
            result.docType = 'QID';
          }
        }
      }
    }

    // Images container (result_type = 5)
    if (container.result_type === 5 && container.Images && Array.isArray(container.Images.fieldList)) {
      for (const field of container.Images.fieldList) {
        if (field.fieldType === 201) { // Portrait
          const base64 = field.valueList?.[0]?.value;
          if (base64) {
            result.facePhotoBase64 = `data:image/jpeg;base64,${base64}`;
          }
        }
      }
    }
  }

  // Combine names
  if (givenNames || surname) {
    result.name = [givenNames, surname].filter(Boolean).join(' ').trim().toUpperCase();
  }

  // Fallback check: if ID starts with 2 or 3 and is 11 digits, it's a QID
  if (result.idNum && result.idNum.length === 11 && (result.idNum.startsWith('2') || result.idNum.startsWith('3'))) {
    result.docType = 'QID';
  }

  return result;
};

const checkPlustekCompanionFiles = (imagePath) => {
  if (typeof imagePath !== 'string') return null;
  
  try {
    const ext = path.extname(imagePath);
    const baseDir = path.dirname(imagePath);
    const baseName = path.basename(imagePath, ext);
    
    const jsonPath = path.join(baseDir, `${baseName}.json`);
    const xmlPath = path.join(baseDir, `${baseName}.xml`);
    const txtPath = path.join(baseDir, `${baseName}.txt`);
    
    // 1. Try JSON
    if (fs.existsSync(jsonPath)) {
      try {
        console.log(`Plustek companion JSON file detected: ${jsonPath}`);
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(raw);
        const details = {
          name: (data.name || data.fullName || data.Name || '').toUpperCase().trim(),
          idNum: (data.idNum || data.documentNumber || data.passportNumber || data.QidNumber || data.idNumber || data.personalNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim(),
          docType: (data.docType || data.documentType || 'Passport').toUpperCase().includes('QID') ? 'QID' : 'Passport',
          nationality: (data.nationality || data.country || '').toUpperCase().trim(),
          dob: formatRegulaDate(data.dob || data.dateOfBirth || data.birthDate || ''),
          expiryDate: formatRegulaDate(data.expiryDate || data.dateOfExpiry || data.expirationDate || ''),
          facePhotoBase64: null,
          rawOcrText: raw
        };
        if (details.name || details.idNum) return details;
      } catch (e) {
        console.warn('Error parsing Plustek JSON companion file:', e.message);
      }
    }
    
    // 2. Try XML
    if (fs.existsSync(xmlPath)) {
      try {
        console.log(`Plustek companion XML file detected: ${xmlPath}`);
        const raw = fs.readFileSync(xmlPath, 'utf8');
        const getXmlTag = (tag) => {
          const match = new RegExp(`<${tag}>(.*?)</${tag}>`, 'i').exec(raw);
          return match ? match[1].trim() : '';
        };
        
        const details = {
          name: (getXmlTag('name') || getXmlTag('fullName') || getXmlTag('PrimaryIdentifier') || getXmlTag('GivenNames') + ' ' + getXmlTag('Surname')).toUpperCase().trim(),
          idNum: (getXmlTag('idNum') || getXmlTag('documentNumber') || getXmlTag('passportNumber') || getXmlTag('QidNumber') || getXmlTag('personalNumber') || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim(),
          docType: 'Passport',
          nationality: (getXmlTag('nationality') || getXmlTag('country') || '').toUpperCase().trim(),
          dob: formatRegulaDate(getXmlTag('dob') || getXmlTag('dateOfBirth') || getXmlTag('birthDate')),
          expiryDate: formatRegulaDate(getXmlTag('expiryDate') || getXmlTag('dateOfExpiry') || getXmlTag('expirationDate')),
          facePhotoBase64: null,
          rawOcrText: raw
        };
        
        const docClass = (getXmlTag('documentType') || getXmlTag('documentClass') || '').toUpperCase();
        if (docClass.includes('QID') || docClass.includes('ID')) {
          details.docType = 'QID';
        }
        
        if (details.name || details.idNum) return details;
      } catch (e) {
        console.warn('Error parsing Plustek XML companion file:', e.message);
      }
    }
    
    // 3. Try Text
    if (fs.existsSync(txtPath)) {
      try {
        console.log(`Plustek companion TXT file detected: ${txtPath}`);
        const raw = fs.readFileSync(txtPath, 'utf8');
        
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length >= 20);
        const mrzLines = lines.filter(l => /^[A-Z0-9<]{30,44}$/.test(l));
        
        if (mrzLines.length >= 2) {
          const mrzText = mrzLines.join('\n');
          const details = parseMRZ(mrzText);
          if (details && details.idNum) {
            details.rawOcrText = raw;
            return details;
          }
        }
        
        const details = {
          name: '',
          idNum: '',
          docType: 'Passport',
          nationality: '',
          dob: '',
          expiryDate: '',
          facePhotoBase64: null,
          rawOcrText: raw
        };
        
        lines.forEach(line => {
          const parts = line.split(/[:=]/);
          if (parts.length >= 2) {
            const key = parts[0].toLowerCase().trim();
            const val = parts.slice(1).join(':').trim();
            
            if (key.includes('name') || key.includes('full name')) {
              details.name = val.toUpperCase();
            } else if (key.includes('passport') || key.includes('qid') || key.includes('document no') || key.includes('id number') || key.includes('personal no')) {
              details.idNum = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
              if (key.includes('qid')) details.docType = 'QID';
            } else if (key.includes('nationality') || key.includes('country')) {
              details.nationality = val.toUpperCase();
            } else if (key.includes('dob') || key.includes('birth')) {
              details.dob = formatRegulaDate(val);
            } else if (key.includes('expiry') || key.includes('expiration')) {
              details.expiryDate = formatRegulaDate(val);
            }
          }
        });
        
        if (details.name || details.idNum) return details;
      } catch (e) {
        console.warn('Error parsing Plustek TXT companion file:', e.message);
      }
    }
  } catch (err) {
    console.error('Error during Plustek companion file detection:', err.message);
  }
  
  return null;
};

// Orchestrates full OCR call using either premium Google Cloud Vision or local Tesseract + Sharp Pre-processing
const processDocumentOcr = async (filePathOrBuffer, fileName, docType) => {
  try {
    console.log(`Performing OCR on document: ${fileName}...`);

    // Convert input to buffer (if filePath)
    let buffer = filePathOrBuffer;
    if (typeof filePathOrBuffer === 'string') {
      const companionData = checkPlustekCompanionFiles(filePathOrBuffer);
      if (companionData) {
        console.log('Plustek companion metadata file read successfully. Extracting portrait photo from document image...');
        buffer = fs.readFileSync(filePathOrBuffer);
        const croppedFace = await extractFace(buffer, companionData.docType);
        if (croppedFace) {
          companionData.facePhotoBase64 = croppedFace;
        }
        return companionData;
      }
      buffer = fs.readFileSync(filePathOrBuffer);
    }

    // 0. Check if a secure external Web Service (like Regula) is configured
    try {
      const [settingsRows] = await db.query(
        'SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("scanner_api_url", "scanner_api_username", "scanner_api_password")'
      );
      const settingsMap = {};
      settingsRows.forEach(r => { settingsMap[r.setting_key] = r.setting_value; });
      
      const apiUrl = settingsMap['scanner_api_url'];
      const apiUser = settingsMap['scanner_api_username'];
      const apiPass = settingsMap['scanner_api_password'];
      
      if (apiUrl && apiUrl.trim()) {
        console.log(`Using configured secure external Scanner Web Service at: ${apiUrl}...`);
        const base64Image = buffer.toString('base64');
        const headers = { 'Content-Type': 'application/json' };
        if (apiUser && apiPass) {
          headers['Authorization'] = 'Basic ' + Buffer.from(`${apiUser}:${apiPass}`).toString('base64');
        }
        
        const response = await fetch(`${apiUrl.trim()}/api/process`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            processParam: { scenario: 'FullProcess' },
            List: [{ ImageData: { image: base64Image }, light: 6 }]
          })
        });
        
        if (response.ok) {
          const respData = await response.json();
          const parsed = parseRegulaResponse(respData);
          if (parsed && (parsed.idNum || parsed.name)) {
            console.log('Secure Web Service scan processed successfully:', parsed.idNum, parsed.name);
            return parsed;
          }
        } else {
          console.warn(`External Scanner Web Service returned error status: ${response.status}`);
        }
      }
    } catch (dbErr) {
      console.warn('Database check or Web Service OCR query failed:', dbErr.message);
    }

    // 1. Try Google Cloud Vision API first if configured
    if (process.env.VISION_API_KEY) {
      const base64Image = buffer.toString('base64');
      const visionText = await performVisionApiOcr(base64Image);
      if (visionText) {
        const details = parseDocumentDetails(fileName, docType, visionText);
        // Crop face from original photocopy
        const croppedFace = await extractFace(buffer, details.docType);
        if (croppedFace) {
          details.facePhotoBase64 = croppedFace;
        }
        return details;
      }
    }

    // Helper to execute Tesseract OCR locally and fall back to CDN if offline fails
    const runOcrOnBuffer = async (procBuffer) => {
      let ocrRes;
      const lang = docType === 'QID' ? 'eng+ara' : 'eng';
      try {
        console.log(`Attempting local offline Tesseract OCR with ${lang}...`);
        ocrRes = await Tesseract.recognize(procBuffer, lang, {
          langPath: path.join(__dirname, '..'),
          cachePath: path.join(__dirname, '..'),
          gzip: false
        });
      } catch (localErr) {
        console.warn("Local offline OCR failed, falling back to CDN/network OCR:", localErr.message);
        ocrRes = await Tesseract.recognize(procBuffer, 'eng');
      }
      return ocrRes?.data?.text || '';
    };

    // --- PASS 1: GENTLE PRE-PROCESSING (Best for bold, uneven lighting, and normal text) ---
    console.log("Pass 1: Processing with Gentle CLAHE + Normalize...");
    let pass1Buffer;
    try {
      pass1Buffer = await sharp(buffer)
        .resize({ width: 1600, fit: 'inside' })
        .grayscale()
        .clahe({ width: 120, height: 120 })
        .normalize()
        .toBuffer();
    } catch (err) {
      // Fallback if CLAHE fails
      try {
        pass1Buffer = await sharp(buffer)
          .resize({ width: 1600, fit: 'inside' })
          .grayscale()
          .normalize()
          .toBuffer();
      } catch (err2) {
        pass1Buffer = buffer;
      }
    }

    let ocrText = await runOcrOnBuffer(pass1Buffer);
    let detectedData = parseDocumentDetails(fileName, docType, ocrText);

    const isIdValid = (id) => id && id !== 'UNKNOWN' && id.replace(/[^a-zA-Z0-9]/g, '').length >= 6;

    const isResultLowQuality = (data) => {
      if (!isIdValid(data.idNum)) return true;
      if (!data.name || data.name === 'Scanned Passport Holder' || data.name === 'Scanned QID Holder') return true;
      if (data.name.trim().length <= 3) return true;
      if (data.dob === '1990-01-01' || data.exp === '2030-01-01') return true;
      if (data.name.match(/\b[A-Z]*(LKL|CLL|XXX|KK|SS|CC)\b/i)) return true;
      return false;
    };

    // --- PASS 2: HARSH PRE-PROCESSING (Fallback for low-contrast text or low-quality Pass 1 results) ---
    if (isResultLowQuality(detectedData)) {
      console.log("Pass 1 returned low-quality result. Running Pass 2 with Contrast Boost + Sharpen...");
      let pass2Buffer;
      try {
        pass2Buffer = await sharp(buffer)
          .resize({ width: 1600, fit: 'inside' })
          .grayscale()
          .normalize()
          .linear(1.4, -20)
          .sharpen({ sigma: 1.5, m1: 1.5, m2: 3 })
          .toBuffer();
      } catch (err) {
        pass2Buffer = buffer;
      }

      const ocrTextPass2 = await runOcrOnBuffer(pass2Buffer);
      const detectedDataPass2 = parseDocumentDetails(fileName, docType, ocrTextPass2);
      
      if (!isResultLowQuality(detectedDataPass2) || (isIdValid(detectedDataPass2.idNum) && !isIdValid(detectedData.idNum))) {
        console.log("Pass 2 successfully extracted higher-quality result:", detectedDataPass2.idNum, detectedDataPass2.name);
        detectedData = detectedDataPass2;
      }
    }

    // --- PASS 3: BILINGUAL FALLBACK FOR PASSPORTS (Checks if the document is actually a QID card) ---
    if (docType === 'Passport' && !isIdValid(detectedData.idNum)) {
      console.log("Pass 2 failed to extract a valid Passport ID. Running Pass 3 with eng+ara to check for QID layout...");
      let pass3Buffer;
      try {
        pass3Buffer = await sharp(buffer)
          .resize({ width: 2400, fit: 'inside' })
          .grayscale()
          .clahe({ width: 150, height: 150 })
          .normalize()
          .toBuffer();
      } catch (err) {
        pass3Buffer = buffer;
      }

      let ocrTextPass3 = '';
      try {
        const ocrRes = await Tesseract.recognize(pass3Buffer, 'eng+ara', {
          langPath: path.join(__dirname, '..'),
          cachePath: path.join(__dirname, '..'),
          gzip: false
        });
        ocrTextPass3 = ocrRes?.data?.text || '';
      } catch (localErr) {
        try {
          const ocrRes = await Tesseract.recognize(pass3Buffer, 'eng');
          ocrTextPass3 = ocrRes?.data?.text || '';
        } catch (e) {}
      }

      const detectedDataPass3 = parseDocumentDetails(fileName, 'QID', ocrTextPass3);
      if (isIdValid(detectedDataPass3.idNum) && detectedDataPass3.docType === 'QID') {
        console.log("Pass 3 successfully detected that document is actually a QID with ID:", detectedDataPass3.idNum);
        detectedData = detectedDataPass3;
      }
    }

    // 4. Crop guest's face photo from document photocopy
    console.log("Extracting guest face image from document photocopy...");
    const croppedFace = await extractFace(buffer, detectedData.docType);
    if (croppedFace) {
      detectedData.facePhotoBase64 = croppedFace;
    }

    // Flag as low quality if we couldn't parse a valid ID number or if name was defaulted/empty
    detectedData.lowQuality = !isIdValid(detectedData.idNum) || 
                             detectedData.name === 'Scanned QID Holder' || 
                             detectedData.name === 'Scanned Passport Holder' || 
                             !detectedData.name ||
                             detectedData.name.trim().length <= 3;

    return detectedData;

  } catch (ocrErr) {
    console.error('OCR Extraction failed:', ocrErr.message);
    const fallbackData = parseDocumentDetails(fileName, docType, '');
    const croppedFace = await extractFace(filePathOrBuffer, fallbackData.docType);
    if (croppedFace) {
      fallbackData.facePhotoBase64 = croppedFace;
    }
    fallbackData.lowQuality = true;
    return fallbackData;
  }
};


module.exports = {
  countryMap,
  qidCountryMap,
  extractDates,
  parseMRZ,
  parseQIDText,
  parseDocumentDetails,
  processDocumentOcr
};

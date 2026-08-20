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
        const words = str.split(/\s+/).filter(w => {
          const clean = w.replace(/[^A-Za-z]/g, '');
          return clean.length >= 2 && /^[A-Za-z]+$/.test(clean);
        });
        return words.length;
      };

      const formatNameCandidate = (s) => s.toUpperCase().replace(/0/g, 'O').replace(/1/g, 'I').replace(/[^A-Z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();

      const scoreInline = getUppercaseScore(cleanInline);
      const scoreNext = getUppercaseScore(cleanNext);

      if (scoreNext > scoreInline && scoreNext >= 2) {
        return formatNameCandidate(cleanNext);
      } else if (cleanInline.length > 3 && scoreInline >= 1) {
        return formatNameCandidate(cleanInline);
      } else if (cleanNext.length > 3 && scoreNext >= 1) {
        return formatNameCandidate(cleanNext);
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
    const words = cleaned.split(/\s+/).filter(w => w.replace(/[^A-Za-z]/g, '').length >= 2);
    if (words.length < 2) continue;
    const upperWords = words.map(w => w.toUpperCase());
    if (upperWords.some(w => qidHeaderWords.has(w))) continue;
    const normalized = upperWords.join(' ').replace(/[^A-Z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (normalized.length >= 8 && normalized.length <= 55) {
      return normalized;
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

const PLACEHOLDER_NAMES = new Set([
  'Scanned Passport Holder', 'Scanned QID Holder',
  'Uploaded QID Holder', 'Uploaded Passport Holder'
]);

const QID_HEADER_WORDS = new Set(['STATE', 'QATAR', 'CARD', 'RESIDENCY', 'CIVIL', 'REGISTER',
  'NATIONAL', 'IDENTITY', 'MINISTRY', 'INTERIOR', 'PERMIT', 'WORK', 'PASS', 'HOLDER',
  'DATE', 'BIRTH', 'EXPIRY', 'NATIONALITY', 'GENDER', 'OCCUPATION', 'ADDRESS', 'VALID',
  'ISSUED', 'ISSUE', 'PLACE', 'PHOTO', 'SIGNATURE', 'NUMBER', 'SERIAL', 'BARCODE',
  'PASSPORT', 'SURNAME', 'GIVEN', 'AUTHORITY', 'SEX', 'OFFICIAL', 'OFFICE', 'BEARER',
  'OF', 'THE', 'AND', 'FOR', 'RESIDENT', 'RESIDENCE', 'PERSONAL', 'DOCUMENT', 'DOB',
  'EXP', 'VALIDITY', 'MOI', 'SPONSOR', 'PROFESSION', 'TYPE', 'ID', 'INDIA', 'PERMIT']);

const filterMrzLinesFromText = (ocrText) => {
  return ocrText.split('\n').filter(l => {
    const clean = l.replace(/\s/g, '').toUpperCase();
    const isMrzCandidate = (clean.startsWith('P') || clean.startsWith('V') || clean.match(/^[A-Z0-9<]{9,}\d/)) && clean.length >= 20;
    const hasLowercase = /[a-z]/.test(l);
    const hasPunct = /[,.?@#$!%&*()_+={}\[\]]/.test(l);
    return !(isMrzCandidate && !hasLowercase && !hasPunct);
  }).join('\n');
};

const normalizeQidDigits = (raw) => String(raw || '')
  .replace(/[OoQqD]/g, '0').replace(/[IliT|!]/g, '1').replace(/[Zz]/g, '2')
  .replace(/[Ss]/g, '5').replace(/[Bb]/g, '8').replace(/\D/g, '');

const isValidQidNumber = (qid) => qid && qid.length === 11 && /^[23]/.test(qid) && /^\d{3}$/.test(qid.substring(3, 6));

const pushQidCandidate = (candidates, raw, labeled, lineIndex = 0) => {
  const digits = normalizeQidDigits(raw);
  if (digits.length === 11 && /^[23]/.test(digits) && isValidQidNumber(digits)) {
    candidates.push({ qid: digits, score: (labeled ? 100 : 0) + Math.max(0, 8 - lineIndex) + (qidCountryMap[digits.substring(3, 6)] ? 50 : 0) });
    return;
  }
  if (digits.length > 11) {
    for (let j = 0; j <= digits.length - 11; j++) {
      const sub = digits.substring(j, j + 11);
      if (isValidQidNumber(sub)) {
        candidates.push({ qid: sub, score: (labeled ? 100 : 0) + Math.max(0, 8 - lineIndex) + (qidCountryMap[sub.substring(3, 6)] ? 50 : 0) });
      }
    }
  }
};

const extractQidNumberFromText = (ocrText) => {
  const lines = ocrText.split('\n');
  const nonMrz = filterMrzLinesFromText(ocrText);
  const idLabelPattern = /(?:QID|ID\s*\.?\s*NO|ID\s*NUMBER|PERSONAL\s*NO|DOCUMENT\s*NO|الرقم|رقم)/i;
  const candidates = [];

  for (let i = 0; i < lines.length; i++) {
    if (!idLabelPattern.test(lines[i])) continue;
    for (let j = 0; j < 3 && i + j < lines.length; j++) {
      const line = lines[i + j];
      const localPattern = /([23][0-9OoIliT|!\s\-]{9,18})/g;
      let match;
      while ((match = localPattern.exec(line)) !== null) {
        pushQidCandidate(candidates, match[1], true, i + j);
      }
    }
  }

  let match;
  const spacedPattern = /\b([23])\s*([0-9OoIliT|!]{3})\s*([0-9OoIliT|!]{3})\s*([0-9OoIliT|!]{4})\b/g;
  while ((match = spacedPattern.exec(nonMrz)) !== null) {
    pushQidCandidate(candidates, match.slice(1).join(''), false);
  }
  const globalPattern = /\b([23][0-9OoIliT|!]{10})\b/g;
  while ((match = globalPattern.exec(nonMrz)) !== null) {
    pushQidCandidate(candidates, match[1], false);
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].qid;
};

const normalizeLatinName = (str) => String(str || '').toUpperCase()
  .replace(/0/g, 'O').replace(/1/g, 'I').replace(/[^A-Z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();

const cleanExtractedName = (str) => {
  let n = normalizeLatinName(str);
  n = n.replace(/^(?:FULL\s*)?NAME\s+/i, '').replace(/^AME\s+/i, '').trim();
  n = n.replace(/\s+(?:NAME|NAM|AME)\s*$/i, '').trim();
  // Drop trailing single-letter OCR noise (e.g. "PUTHOOR B")
  n = n.replace(/\s+[A-Z]$/i, '').trim();
  return n;
};

const scoreLatinName = (str) => {
  const normalized = normalizeLatinName(str);
  if (!normalized || normalized.length < 5) return 0;
  const words = normalized.split(/\s+/).filter(w => w.length >= 2);
  if (words.length < 2) return 0;
  if (words.some(w => QID_HEADER_WORDS.has(w))) return 0;
  if (/\d/.test(str)) return 0;
  return words.length * 15 + Math.min(normalized.length, 45);
};

const extractQidNameFromText = (ocrText) => {
  const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
  let bestName = '';
  let bestScore = 0;
  const nameLabelPattern = /(?:^|\b)(?:NAME|FULL\s*NAME|NAM|AME|الاسم)\b/i;

  for (let i = 0; i < lines.length; i++) {
    if (!nameLabelPattern.test(lines[i])) continue;
    const inline = lines[i].replace(/full\s*name/i, '').replace(/\bname\b/i, '').replace(/الاسم/g, '')
      .replace(/[^A-Za-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    const nextLine = (lines[i + 1] || '').replace(/[^A-Za-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    const next2 = (lines[i + 2] || '').replace(/[^A-Za-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    for (const candidate of [nextLine, next2, inline]) {
      const score = scoreLatinName(candidate);
      if (score > bestScore) { bestScore = score; bestName = normalizeLatinName(candidate); }
    }
  }

  // Qatar Residency Permit prints the full name in the bottom name bar
  const bottomStart = Math.max(0, Math.floor(lines.length * 0.65));
  for (let i = bottomStart; i < lines.length; i++) {
    const latinChars = (lines[i].match(/[A-Za-z]/g) || []).length;
    const totalChars = lines[i].replace(/\s/g, '').length;
    if (totalChars === 0 || latinChars / totalChars < 0.5) continue;
    const cleaned = lines[i].replace(/[^A-Za-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    const score = scoreLatinName(cleaned) + 20;
    if (score > bestScore) { bestScore = score; bestName = normalizeLatinName(cleaned); }
  }

  for (const line of lines) {
    const latinChars = (line.match(/[A-Za-z]/g) || []).length;
    const totalChars = line.replace(/\s/g, '').length;
    if (totalChars === 0 || latinChars / totalChars < 0.55) continue;
    const cleaned = line.replace(/[^A-Za-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    const score = scoreLatinName(cleaned);
    if (score > bestScore) { bestScore = score; bestName = normalizeLatinName(cleaned); }
  }

  return bestName;
};

const extractQidNationality = (ocrText, countryCode) => {
  let nationality = qidCountryMap[countryCode] || '';
  const natCountries = ['INDIA', 'PAKISTAN', 'QATAR', 'NEPAL', 'BANGLADESH', 'PHILIPPINES', 'SRI LANKA',
    'EGYPT', 'JORDAN', 'LEBANON', 'SYRIA', 'YEMEN', 'SUDAN', 'USA', 'UNITED STATES', 'UNITED KINGDOM'];
  const upper = ocrText.toUpperCase();
  for (const c of natCountries) {
    if (upper.includes(c)) return c;
  }
  const lines = ocrText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/nationality|nationalité|الجنسية/i.test(lines[i])) {
      for (let j = i; j <= i + 2 && j < lines.length; j++) {
        const clean = lines[j].replace(/nationality|nationalité|الجنسية/gi, '').replace(/[^A-Za-z\s]/g, ' ').trim().toUpperCase();
        for (const c of natCountries) {
          if (clean.includes(c)) return c;
        }
        if (clean.length >= 4 && clean.length <= 25 && /^[A-Z\s]+$/.test(clean)) return clean;
      }
    }
  }
  return nationality || 'Qatari';
};

const looksLikeFilename = (id, fileName) => {
  if (!id) return true;
  const upper = String(id).toUpperCase();
  if (/PAGE|JPG|JPEG|PNG|PDF|SCAN|IMAGE|PHOTO|DSC|IMG|CAMERA|RONNY/i.test(upper) && !/^[23]\d{10}$/.test(upper)) return true;
  if (fileName) {
    const base = path.basename(fileName, path.extname(fileName)).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (base && upper === base) return true;
    if (base && upper.includes(base) && base.length > 6) return true;
  }
  const digits = (upper.match(/\d/g) || []).length;
  const letters = (upper.match(/[A-Z]/g) || []).length;
  if (letters >= 5 && digits < 4) return true;
  return false;
};

const parseQIDText = (ocrText) => {
  const qid = extractQidNumberFromText(ocrText);
  if (!qid) return null;

  const countryCode = qid.substring(3, 6);
  const firstDigit = qid[0];
  const century = firstDigit === '2' ? '19' : '20';
  const birthYear = parseInt(`${century}${qid.substring(1, 3)}`);

  const nameLines = ocrText.split('\n');
  const foundDates = extractDates(ocrText);

  let dob = `${birthYear}-01-01`;
  const dobMatch = foundDates.find(d => d.year === birthYear);
  if (dobMatch) {
    dob = dobMatch.iso;
  } else {
    const dobLine = nameLines.find(l => /D\.?O\.?B|DOB|BIRTH|الميلاد/i.test(l));
    if (dobLine) {
      const lineDates = extractDates(dobLine);
      if (lineDates.length > 0) dob = lineDates[0].iso;
    }
  }

  let exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const expLine = nameLines.find(l => /EXP|EXPIRY|VALI|الصلاحية/i.test(l));
  if (expLine) {
    const lineDates = extractDates(expLine);
    if (lineDates.length > 0) exp = lineDates[0].iso;
  } else if (foundDates.length >= 2) {
    const sorted = [...foundDates].sort((a, b) => a.year - b.year);
    exp = sorted[sorted.length - 1].iso;
  }

  const name = cleanExtractedName(extractQidNameFromText(ocrText) || extractNameWithFallback(ocrText)) || 'Scanned QID Holder';
  const nationality = extractQidNationality(ocrText, countryCode);

  return { name, idNum: qid, docType: 'QID', nat: nationality, dob, exp };
};

// Main entry point for document OCR details detection
const parseDocumentDetails = (fileName, docType, ocrText = '') => {
  const combined = `${fileName} ${ocrText}`.toLowerCase();

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

  // When user selected QID, parse QID layout before passport MRZ
  if (docType === 'QID') {
    const qidEarly = parseQIDText(ocrText);
    if (qidEarly) {
      return {
        ...qidEarly,
        phone: '',
        facePhotoBase64: null,
        raw: `OCR Parsed from Qatar ID:\nName: ${qidEarly.name}\nQID No: ${qidEarly.idNum}\nNationality: ${qidEarly.nat}\nDOB: ${qidEarly.dob}\nExpiry: ${qidEarly.exp}`
      };
    }
  }

  // 1. Try standard Passport MRZ parsing (skip for explicit QID when no MRZ indicators)
  const mrzData = (docType === 'QID' && !ocrText.includes('P<') && !ocrText.includes('V<'))
    ? null
    : parseMRZ(ocrText);
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
      facePhotoBase64: null,
      raw: `OCR Parsed from Passport MRZ:\nName: ${mrzData.name}\nPassport No: ${mrzData.idNum}\nNationality: ${mrzData.nat}\nDOB: ${mrzData.dob}\nExpiry: ${mrzData.exp}`
    };
  }

  // 2. Try standard Qatar ID layout parsing
  const qidData = parseQIDText(ocrText);
  if (qidData) {
    return {
      ...qidData,
      phone: '',
      facePhotoBase64: null,
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
      facePhotoBase64: null,
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

  // Extract ID / Passport Number from text
  const qidMatch = extractQidNumberFromText(ocrText);
  if (qidMatch) {
    detectedId = qidMatch;
    detectedDocType = 'QID';
    detectedNat = extractQidNationality(ocrText, qidMatch.substring(3, 6));
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

  // Extract Name using QID-aware helper when applicable
  const rawName = (detectedDocType === 'QID' || docType === 'QID')
    ? (extractQidNameFromText(ocrText) || extractNameWithFallback(ocrText))
    : extractNameWithFallback(ocrText);
  detectedName = cleanExtractedName(rawName);

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

  // Final clean fallbacks if still empty — never use filename as ID number
  if (!detectedId || looksLikeFilename(detectedId, fileName)) {
    detectedId = docType === 'QID' ? '' : (detectedId && !looksLikeFilename(detectedId, fileName) ? detectedId : '');
  }
  if (!detectedName || PLACEHOLDER_NAMES.has(detectedName)) {
    detectedName = docType === 'QID' ? 'Uploaded QID Holder' : 'Uploaded Passport Holder';
  }

  return {
    name: detectedName,
    idNum: detectedId,
    docType: detectedDocType,
    nat: detectedNat,
    dob: detectedDob,
    exp: detectedExp,
    phone: '',
    facePhotoBase64: null,
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

// Helper to detect human skin tones (YCbCr + RGB thresholding)
const isSkinColor = (r, g, b) => {
  if (r < 35 || g < 20 || b < 10) return false;
  if (r <= g && r <= b) return false;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  return cr >= 130 && cr <= 185 && cb >= 72 && cb <= 135;
};

// Robust face extraction for both QID and Passport scans (including flatbed A4 scans, camera photos, and card crops)
const extractFace = async (bufferOrPath, docType) => {
  try {
    let buffer = bufferOrPath;
    const isFilePath = typeof bufferOrPath === 'string';
    if (isFilePath) buffer = fs.readFileSync(bufferOrPath);

    // Rotate EXIF only when reading from a file path (the OCR pipeline pre-rotates buffers).
    // Skipping redundant rotate() saves ~1s per face-crop call.
    const { data: rotBuf, info } = isFilePath
      ? await sharp(buffer).rotate().toBuffer({ resolveWithObject: true })
      : await sharp(buffer).toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    if (!w || !h || w < 20 || h < 20) return null;

    // Build 120x80 downsampled skin map for sliding window analysis
    const gw = 120, gh = 80;
    const raw = await sharp(rotBuf)
      .resize(gw, gh, { fit: 'fill' })
      .toColourspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer();

    const skin = new Uint8Array(gw * gh);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const idx = (y * gw + x) * 3;
        if (isSkinColor(raw[idx], raw[idx + 1], raw[idx + 2])) {
          skin[y * gw + x] = 1;
        }
      }
    }

    const isLandscape = w >= h;
    const isQid = docType === 'QID';

    // Window proportions for ID / Passport portrait photo (standard ~3:4 aspect ratio)
    const winW = Math.max(10, Math.round(gw * (isLandscape ? 0.15 : 0.28)));
    const winH = Math.max(12, Math.round(gh * (isLandscape ? 0.28 : 0.18)));

    let bestScore = 0;
    let bestX = -1, bestY = -1;

    for (let y = 0; y <= gh - winH; y++) {
      for (let x = 0; x <= gw - winW; x++) {
        let count = 0;
        for (let dy = 0; dy < winH; dy++) {
          for (let dx = 0; dx < winW; dx++) {
            count += skin[(y + dy) * gw + (x + dx)];
          }
        }
        const density = count / (winW * winH);
        if (density < 0.12) continue;

        const xCenter = (x + winW / 2) / gw;
        const yCenter = (y + winH / 2) / gh;

        let posWeight = 1.0;
        if (isQid) {
          // Qatar ID card portrait is on the right side of the card
          if (xCenter > 0.55) posWeight *= 1.5;
          else if (xCenter > 0.40) posWeight *= 1.1;
          else posWeight *= 0.5;

          if (yCenter > 0.10 && yCenter < 0.90) posWeight *= 1.2;
        } else {
          // Passport portrait is on the left side of the data page
          if (xCenter < 0.45) posWeight *= 1.5;
          else if (xCenter < 0.60) posWeight *= 1.1;
          else posWeight *= 0.5;

          if (yCenter > 0.10 && yCenter < 0.90) posWeight *= 1.2;
        }

        const score = density * posWeight;
        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
        }
      }
    }

    let crop;
    // Lower threshold to 0.10 so grayscale/lower-DPI scans from other devices
    // still get a face region detected instead of always falling back to fixed crop.
    if (bestX >= 0 && bestScore > 0.10) {
      // Add generous margin around detected face (20% padding)
      const padX = Math.round(winW * 0.20);
      const padY = Math.round(winH * 0.20);
      const fx = Math.max(0, bestX - padX);
      const fy = Math.max(0, bestY - padY);
      const fw = Math.min(gw - fx, winW + padX * 2);
      const fh = Math.min(gh - fy, winH + padY * 2);

      crop = {
        left: Math.max(0, Math.round((fx / gw) * w)),
        top: Math.max(0, Math.round((fy / gh) * h)),
        width: Math.max(20, Math.round((fw / gw) * w)),
        height: Math.max(20, Math.round((fh / gh) * h))
      };
    } else {
      // High-accuracy fallback layout if skin detection didn't meet threshold (e.g. grayscale scans)
      if (isQid) {
        crop = {
          left: Math.round(w * (isLandscape ? 0.70 : 0.50)),
          top: Math.round(h * (isLandscape ? 0.18 : 0.08)),
          width: Math.round(w * (isLandscape ? 0.26 : 0.45)),
          height: Math.round(h * (isLandscape ? 0.55 : 0.35))
        };
      } else {
        crop = {
          left: Math.round(w * 0.04),
          top: Math.round(h * (isLandscape ? 0.18 : 0.60)),
          width: Math.round(w * (isLandscape ? 0.35 : 0.45)),
          height: Math.round(h * (isLandscape ? 0.55 : 0.30))
        };
      }
    }

    // Clamp crop area strictly within image bounds
    const clampLeft = Math.max(0, Math.min(w - 20, crop.left));
    const clampTop = Math.max(0, Math.min(h - 20, crop.top));
    const clampW = Math.max(20, Math.min(w - clampLeft, crop.width));
    const clampH = Math.max(20, Math.min(h - clampTop, crop.height));

    const faceBuffer = await sharp(rotBuf)
      .extract({ left: clampLeft, top: clampTop, width: clampW, height: clampH })
      .resize({ width: 240, height: 240, fit: 'cover', position: 'centre' })
      .jpeg({ quality: 88 })
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

    // Resolve Tesseract lang data path — prefer local backend copy (eng.traineddata),
    // fall back to the tesseract.js bundled traineddata so it works on any device.
    const localLangDir = path.join(__dirname, '..');
    const localEngData = path.join(localLangDir, 'eng.traineddata');
    const langDir = fs.existsSync(localEngData) ? localLangDir : undefined;

    const OCR_OPTS = {
      ...(langDir ? { langPath: langDir, cachePath: langDir } : {}),
      gzip: false,
      tessedit_pageseg_mode: '6'
    };

    const runOcrOnBuffer = async (procBuffer, lang = 'eng') => {
      try {
        const ocrRes = await Tesseract.recognize(procBuffer, lang, OCR_OPTS);
        return ocrRes?.data?.text || '';
      } catch (localErr) {
        console.warn('Local OCR failed, retrying eng:', localErr.message);
        try {
          const ocrRes = await Tesseract.recognize(procBuffer, 'eng', OCR_OPTS);
          return ocrRes?.data?.text || '';
        } catch (e) {
          return '';
        }
      }
    };

    const isQidIdValid = (id) => /^[23]\d{10}$/.test(String(id || '').replace(/\D/g, ''));
    const isIdValid = (id, dtype) => {
      if (!id || id === 'UNKNOWN' || looksLikeFilename(id, fileName)) return false;
      const clean = id.replace(/[^a-zA-Z0-9]/g, '');
      if (clean.length < 6) return false;
      if (dtype === 'QID' || docType === 'QID') return isQidIdValid(clean);
      return true;
    };

    const isResultLowQuality = (data) => {
      if (!data) return true;
      if (!isIdValid(data.idNum, data.docType)) return true;
      if (!data.name || PLACEHOLDER_NAMES.has(data.name)) return true;
      if (data.name.trim().length <= 3) return true;
      // A valid QID number + name is a usable result even without a DOB.
      if (data.name.match(/\b[A-Z]*(LKL|CLL|XXX|KK|SS|CC)\b/i)) return true;
      return false;
    };

    // ── STEP 0: Rotate ONCE (EXIF) + smart DPI-aware resize ─────────────────────
    // High-DPI scans (600dpi) produce huge images (3000x4000+) that make Tesseract
    // extremely slow. We auto-detect oversized images and scale down to ~1200px wide
    // (Tesseract sweet spot). Low-DPI / small images are left at native resolution.
    // We do this ONE TIME and reuse `rotatedBuffer` across all passes — no re-rotate.
    let rotatedBuffer;
    try {
      const rawMeta = await sharp(buffer).metadata();
      const rawW = rawMeta.width || 0;
      const rawH = rawMeta.height || 0;
      // Target 1200px wide — optimal for Tesseract speed vs accuracy.
      // For very small images (<900px) we still upscale slightly (1000px) to help OCR.
      const targetW = Math.max(rawW, rawH) < 900 ? 1000 : 1200;
      rotatedBuffer = await sharp(buffer)
        .rotate()  // auto-rotate by EXIF — only needed here
        .resize({ width: targetW, fit: 'inside', withoutEnlargement: false })
        .toBuffer();
      const meta = await sharp(rotatedBuffer).metadata();
      console.log(`Image: ${rawW}x${rawH} → rotated+resized to ${meta.width}x${meta.height} (target ${targetW}px)`);
    } catch (err) {
      console.warn('Rotate/resize failed, using raw buffer:', err.message);
      rotatedBuffer = buffer;
    }

    // ── STEP 1: Start face crop in PARALLEL with OCR pre-processing ──────────────
    // We pass the already-rotated buffer so extractFace doesn't re-rotate.
    const faceCropPromise = extractFace(rotatedBuffer, docType);

    // ── PASS 1: Normalize + sharpen on pre-rotated buffer (fast, ~5-8s) ─────────
    console.log('Pass 1: Fast OCR...');
    let pass1Buffer;
    try {
      pass1Buffer = await sharp(rotatedBuffer)
        .grayscale()
        .normalize()
        .sharpen({ sigma: 1 })
        .toBuffer();
    } catch (err) {
      pass1Buffer = rotatedBuffer;
    }

    let ocrText = await runOcrOnBuffer(pass1Buffer, 'eng');
    let detectedData = parseDocumentDetails(fileName, docType, ocrText);

    // ── PASS 2: Contrast boost only if Pass 1 failed ─────────────────────────────
    // Reuses rotatedBuffer (no second rotate) — saves ~3-5s.
    if (isResultLowQuality(detectedData)) {
      console.log('Pass 2: Contrast boost OCR...');
      let pass2Buffer;
      try {
        pass2Buffer = await sharp(rotatedBuffer)
          .grayscale()
          .normalize()
          .linear(1.5, -30)
          .sharpen({ sigma: 1.5, m1: 1.5, m2: 3 })
          .toBuffer();
      } catch (err) {
        pass2Buffer = pass1Buffer;
      }
      const ocrTextPass2 = await runOcrOnBuffer(pass2Buffer, 'eng');
      const detectedDataPass2 = parseDocumentDetails(fileName, docType, ocrTextPass2);
      if (!isResultLowQuality(detectedDataPass2) ||
          (isIdValid(detectedDataPass2.idNum, detectedDataPass2.docType) && !isIdValid(detectedData.idNum, detectedData.docType))) {
        detectedData = detectedDataPass2;
        ocrText = ocrTextPass2; // keep best text for pass 3 reuse
      }
    }

    // ── PASS 3: Passport-only QID cross-check ────────────────────────────────────
    // Reuses already-computed ocrText — NO extra Tesseract call needed (saves ~15-20s).
    if (docType === 'Passport' && !isIdValid(detectedData.idNum, detectedData.docType)) {
      console.log('Pass 3: QID cross-check on existing OCR text (no re-scan)...');
      const detectedDataPass3 = parseDocumentDetails(fileName, 'QID', ocrText);
      if (isIdValid(detectedDataPass3.idNum, 'QID') && detectedDataPass3.docType === 'QID') {
        detectedData = detectedDataPass3;
      }
    }

    // ── AWAIT parallel face crop ──────────────────────────────────────────────────
    console.log('Applying face crop...');
    const croppedFace = await faceCropPromise;
    if (croppedFace) {
      detectedData.facePhotoBase64 = croppedFace;
    }

    detectedData.lowQuality = isResultLowQuality(detectedData) ||
      PLACEHOLDER_NAMES.has(detectedData.name);

    return detectedData;

  } catch (ocrErr) {
    console.error('OCR Extraction failed:', ocrErr.message);
    const fallbackData = parseDocumentDetails(fileName, docType, '');
    if (looksLikeFilename(fallbackData.idNum, fileName)) fallbackData.idNum = '';
    try {
      const faceInput = typeof filePathOrBuffer === 'string' ? filePathOrBuffer : filePathOrBuffer;
      const croppedFace = await extractFace(faceInput, docType);
      if (croppedFace) fallbackData.facePhotoBase64 = croppedFace;
    } catch (faceErr) {
      console.warn('Face crop in fallback failed:', faceErr.message);
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

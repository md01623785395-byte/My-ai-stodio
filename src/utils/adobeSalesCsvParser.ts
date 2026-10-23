/**
 * Adobe Stock Contributor Sales CSV Parser
 * Priority 7.0, 7.0.1, 7.0.2 & 7.0.3: Robust Client-side parsing without assumptions
 *
 * Supports:
 * 1. Official Adobe Stock Contributor "downloads.csv" / "downloads (n).csv" exports
 * 2. Header-detected path (handles aliases, metadata headers, BOM, quotes)
 * 3. Headerless / Raw data-first path (infers column positions from data types)
 * 4. European decimal commas (0,33 -> 0.33) and multiple delimiters (comma, semicolon, tab)
 * 5. Deterministic duplicate prevention without hallucinating missing data
 */

import {
  AdobeSaleRecord,
  ColumnMappingOverride,
  ParseSalesCSVResult,
} from '../types/salesAnalytics';

// Exact and token-based aliases for Adobe Stock Contributor headers
const ASSET_ID_ALIASES = [
  'asset id',
  'asset_id',
  'assetid',
  'media id',
  'media_id',
  'mediaid',
  'content id',
  'content_id',
  'contentid',
  'file id',
  'file_id',
  'fileid',
  'item id',
  'item_id',
  'itemid',
  'asset #',
  'media #',
  'item #',
  'asset',
  'media',
  'item',
  'id',
];

const DATE_ALIASES = [
  'date',
  'sale date',
  'sale_date',
  'saledate',
  'transaction date',
  'transaction_date',
  'timestamp',
  'date of sale',
  'date_of_sale',
  'download date',
  'downloaddate',
  'license date',
  'order date',
];

const LICENSE_ALIASES = [
  'license',
  'license type',
  'license_type',
  'licensetype',
  'plan',
  'subscription',
  'type of license',
  'license plan',
];

const ROYALTY_ALIASES = [
  'royalty',
  'royalties',
  'net royalty',
  'net_royalty',
  'gross royalty',
  'gross_royalty',
  'earnings',
  'amount',
  'royalty (usd)',
  'royalty ($)',
  'royalty_usd',
  'royalty amount',
  'royalty_amount',
  'payout',
  'commission',
  'contributor royalty',
  'net earnings',
  'gross earnings',
];

const TITLE_ALIASES = [
  'title',
  'asset title',
  'asset_title',
  'name',
  'filename',
  'file_name',
  'media title',
];

const ASSET_TYPE_ALIASES = [
  'asset type',
  'asset_type',
  'media type',
  'media_type',
  'content type',
  'content_type',
  'type',
];

const COUNTRY_ALIASES = [
  'country',
  'customer country',
  'customer_country',
  'buyer country',
  'buyer_country',
];

/**
 * Normalizes a header string for alias matching:
 * lowercase, removes punctuation/quotes/BOM, collapses spaces.
 */
function cleanHeaderString(header: string): string {
  return header
    .replace(/^[\uFEFF\u00EF\u00BB\u00BF\u200B]+/, '')
    .replace(/["']/g, '')
    .toLowerCase()
    .replace(/[_\-/#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matches a column name against an alias list.
 * Prioritizes exact matches, then token/word boundary matches.
 * Avoids substring false positives (e.g. "paid" matching "id").
 */
function matchesAlias(colNameClean: string, aliases: string[]): boolean {
  for (const alias of aliases) {
    const cleanAlias = cleanHeaderString(alias);
    if (colNameClean === cleanAlias) return true;
  }

  // Word boundary or token check for compound aliases
  for (const alias of aliases) {
    const cleanAlias = cleanHeaderString(alias);
    if (cleanAlias.length > 2) {
      const regex = new RegExp(`(^|\\s)${cleanAlias}(\\s|$)`, 'i');
      if (regex.test(colNameClean)) return true;
    } else if (cleanAlias === 'id') {
      // For 'id', ensure it's a standalone word like 'media id' or 'asset id'
      if (/(^|\s)id(\s|$)/i.test(colNameClean)) return true;
    }
  }

  return false;
}

/**
 * Auto-detect delimiter by evaluating candidate characters across first 10 rows.
 */
export function detectDelimiter(text: string): string {
  const clean = text.replace(/^[\uFEFF\u00EF\u00BB\u00BF\u200B]+/, '');
  const lines = clean
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 10);

  if (lines.length === 0) return ',';

  const candidates = [',', ';', '\t', '|'];
  const scores: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };

  for (const delim of candidates) {
    let fieldCount = -1;
    let consistentLines = 0;

    for (const line of lines) {
      const count = (line.split(delim) || []).length;
      if (count > 1) {
        if (fieldCount === -1) {
          fieldCount = count;
          consistentLines++;
        } else if (Math.abs(count - fieldCount) <= 1) {
          consistentLines++;
        }
      }
    }
    scores[delim] = consistentLines * (fieldCount > 1 ? fieldCount : 1);
  }

  let best = ',';
  let maxScore = -1;
  for (const delim of candidates) {
    if (scores[delim] > maxScore) {
      maxScore = scores[delim];
      best = delim;
    }
  }

  return maxScore > 0 ? best : ',';
}

/**
 * Robust RFC 4180 CSV tokenizer
 */
export function tokenizeCSV(rawCsv: string): string[][] {
  if (!rawCsv || typeof rawCsv !== 'string') return [];

  // Strip UTF-8 BOM and leading zero-width chars
  const text = rawCsv.replace(/^[\uFEFF\u00EF\u00BB\u00BF\u200B]+/, '');
  if (!text.trim()) return [];

  const delimiter = detectDelimiter(text);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes date string into YYYY-MM-DD
 */
export function normalizeDate(rawDate: string): string {
  if (!rawDate) return '';
  const trimmed = rawDate.trim().replace(/["']/g, '');
  if (!trimmed) return '';

  // Excel serial date (e.g. 35000 to 60000 -> 1995 to 2064)
  if (/^\d{5}$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    if (serial >= 35000 && serial <= 60000) {
      const utcMs = (serial - 25569) * 86400 * 1000;
      const d = new Date(utcMs);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // MM/DD/YYYY or DD/MM/YYYY or DD.MM.YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const y = slashMatch[3];
    if (p1 > 12) {
      // Must be DD/MM/YYYY
      const d = String(p1).padStart(2, '0');
      const m = String(p2).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    // Default standard MM/DD/YYYY
    const m = String(p1).padStart(2, '0');
    const d = String(p2).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Standard Date parse fallback (e.g. "May 18, 2024" or "18-May-2024")
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    if (y >= 2000 && y <= 2100) {
      return `${y}-${m}-${d}`;
    }
  }

  return '';
}

/**
 * Parses numeric royalty string
 */
export function parseRoyalty(rawRoyalty: string): number {
  if (!rawRoyalty) return 0;
  let cleaned = rawRoyalty
    .trim()
    .replace(/["']/g, '')
    .replace(/[$€£¥৳\s]/g, '')
    .replace(/\b(USD|EUR|GBP|BDT|CAD|AUD)\b/gi, '')
    .trim();
  if (!cleaned) return 0;

  // Check for European decimal comma: e.g. "0,33", "3,30", "12,50"
  if (/^\d+,\d{1,4}$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    // US thousands comma (e.g. "1,250.50")
    cleaned = cleaned.replace(/,/g, '');
  } else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    // European thousands dot (e.g. "1.250,50")
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.round(val * 10000) / 10000;
}

/**
 * Value-Based Type Evaluators for Positional / Headerless Parsing
 */
function isDateValue(val: string): boolean {
  if (!val) return false;
  const clean = val.trim().replace(/["']/g, '');
  if (/^\d{6,12}$/.test(clean)) return false; // purely numeric asset ID
  return normalizeDate(clean).length > 0;
}

function isAssetIdValue(val: string): boolean {
  if (!val) return false;
  const clean = val.trim().replace(/["']/g, '');
  return /^\d{6,12}$/.test(clean);
}

function isRoyaltyValue(val: string): boolean {
  if (!val) return false;
  const clean = val.trim().replace(/["']/g, '');
  if (/^\d{6,12}$/.test(clean)) return false; // That's an asset ID
  // Has currency symbol or numeric decimal format
  if (/^[$€£¥৳]\s*\d+([.,]\d{1,4})?$/.test(clean)) return true;
  if (/^\d+[.,]\d{1,4}$/.test(clean)) {
    const num = parseRoyalty(clean);
    return !isNaN(num) && num >= 0 && num < 10000;
  }
  return false;
}

function isLicenseValue(val: string): boolean {
  if (!val) return false;
  const clean = val.toLowerCase().trim().replace(/["']/g, '');
  return (
    clean.includes('standard') ||
    clean.includes('subscription') ||
    clean.includes('sub') ||
    clean.includes('extended') ||
    clean.includes('ext') ||
    clean.includes('enhanced') ||
    clean.includes('on demand') ||
    clean.includes('od') ||
    clean.includes('credit') ||
    clean.includes('enterprise') ||
    clean.includes('free') ||
    clean.includes('custom')
  );
}

function isTitleValue(val: string): boolean {
  if (!val) return false;
  const clean = val.trim().replace(/["']/g, '');
  if (isDateValue(clean) || isAssetIdValue(clean) || isRoyaltyValue(clean)) return false;
  return clean.length >= 6 && /\s/.test(clean);
}

interface ColumnMapping {
  assetIdCol: number;
  dateCol: number;
  royaltyCol: number;
  licenseCol: number;
  titleCol: number;
  assetTypeCol: number;
  countryCol: number;
  headerRowIndex: number;
  detectedHeaders: {
    assetIdHeader: string;
    dateHeader: string;
    licenseHeader: string;
    royaltyHeader: string;
    titleHeader?: string;
    assetTypeHeader?: string;
    countryHeader?: string;
  };
}

interface ExplicitHeaderResult {
  mapping?: ColumnMapping;
  missingHeaders?: string[];
  headerRowText?: string;
}

/**
 * Strategy 1: Header Row Scan
 * Scans rows 0 through 4 to find an explicit header row.
 */
function detectExplicitHeaderRow(rows: string[][]): ExplicitHeaderResult | null {
  const maxScan = Math.min(rows.length, 5);

  for (let r = 0; r < maxScan; r++) {
    const row = rows[r];
    if (row.length < 2) continue;

    // Check if this row looks like actual sales data (if it has date, numeric asset ID, and royalty)
    const hasDataValues =
      row.some((c) => isDateValue(c)) &&
      row.some((c) => isAssetIdValue(c)) &&
      row.some((c) => isRoyaltyValue(c));

    if (hasDataValues) {
      continue;
    }

    const headerMap: Record<string, number> = {};
    row.forEach((col, idx) => {
      const clean = cleanHeaderString(col);
      if (clean) headerMap[clean] = idx;
    });

    const findCol = (aliases: string[]): { name: string; index: number } | null => {
      // 1. Exact match
      for (const [colClean, idx] of Object.entries(headerMap)) {
        for (const alias of aliases) {
          if (colClean === cleanHeaderString(alias)) {
            return { name: row[idx], index: idx };
          }
        }
      }
      // 2. Token match
      for (const [colClean, idx] of Object.entries(headerMap)) {
        if (matchesAlias(colClean, aliases)) {
          return { name: row[idx], index: idx };
        }
      }
      return null;
    };

    const assetIdCol = findCol(ASSET_ID_ALIASES);
    const dateCol = findCol(DATE_ALIASES);
    const royaltyCol = findCol(ROYALTY_ALIASES);

    // If at least one primary header matches and the row has text headers
    const matchedCount = (assetIdCol ? 1 : 0) + (dateCol ? 1 : 0) + (royaltyCol ? 1 : 0);

    if (matchedCount === 3) {
      const licenseCol = findCol(LICENSE_ALIASES);
      const titleCol = findCol(TITLE_ALIASES);
      const assetTypeCol = findCol(ASSET_TYPE_ALIASES);
      const countryCol = findCol(COUNTRY_ALIASES);

      return {
        mapping: {
          assetIdCol: assetIdCol!.index,
          dateCol: dateCol!.index,
          royaltyCol: royaltyCol!.index,
          licenseCol: licenseCol ? licenseCol.index : -1,
          titleCol: titleCol ? titleCol.index : -1,
          assetTypeCol: assetTypeCol ? assetTypeCol.index : -1,
          countryCol: countryCol ? countryCol.index : -1,
          headerRowIndex: r,
          detectedHeaders: {
            assetIdHeader: assetIdCol!.name,
            dateHeader: dateCol!.name,
            royaltyHeader: royaltyCol!.name,
            licenseHeader: licenseCol ? licenseCol.name : 'অনুপস্থিত (Unknown)',
            titleHeader: titleCol?.name,
            assetTypeHeader: assetTypeCol?.name,
            countryHeader: countryCol?.name,
          },
        },
      };
    }

    // If 1 or 2 matched in this row, it is definitely a header row with missing required columns!
    if (matchedCount >= 1 && r === 0) {
      const missing: string[] = [];
      if (!assetIdCol) missing.push('Asset ID / Media ID');
      if (!dateCol) missing.push('Sale Date / Date');
      if (!royaltyCol) missing.push('Royalty / Earnings');

      return {
        missingHeaders: missing,
        headerRowText: row.join(' | '),
      };
    }
  }

  return null;
}

/**
 * Strategy 2: Positional / Value-Format Inference (for Headerless CSV or data at row 0)
 */
function inferPositionalMapping(rows: string[][]): ColumnMapping | null {
  if (rows.length === 0) return null;

  const sampleRows = rows.slice(0, 10).filter((r) => r.length >= 2);
  if (sampleRows.length === 0) return null;

  const columnCount = Math.max(...sampleRows.map((r) => r.length));
  if (columnCount < 2) return null;

  const dateScores: number[] = new Array(columnCount).fill(0);
  const assetIdScores: number[] = new Array(columnCount).fill(0);
  const royaltyScores: number[] = new Array(columnCount).fill(0);
  const licenseScores: number[] = new Array(columnCount).fill(0);
  const titleScores: number[] = new Array(columnCount).fill(0);

  sampleRows.forEach((row) => {
    for (let c = 0; c < columnCount; c++) {
      const cell = row[c] || '';
      if (isDateValue(cell)) dateScores[c]++;
      if (isAssetIdValue(cell)) assetIdScores[c]++;
      if (isRoyaltyValue(cell)) royaltyScores[c]++;
      if (isLicenseValue(cell)) licenseScores[c]++;
      if (isTitleValue(cell)) titleScores[c]++;
    }
  });

  const threshold = Math.max(1, Math.floor(sampleRows.length * 0.4));

  // Determine Date column
  let dateCol = -1;
  let maxDate = 0;
  for (let c = 0; c < columnCount; c++) {
    if (dateScores[c] > maxDate && dateScores[c] >= threshold) {
      maxDate = dateScores[c];
      dateCol = c;
    }
  }

  // Determine Asset ID column
  let assetIdCol = -1;
  let maxAsset = 0;
  for (let c = 0; c < columnCount; c++) {
    if (c === dateCol) continue;
    if (assetIdScores[c] > maxAsset && assetIdScores[c] >= threshold) {
      maxAsset = assetIdScores[c];
      assetIdCol = c;
    }
  }

  // Determine Royalty column
  let royaltyCol = -1;
  let maxRoyalty = 0;
  for (let c = 0; c < columnCount; c++) {
    if (c === dateCol || c === assetIdCol) continue;
    if (royaltyScores[c] > maxRoyalty && royaltyScores[c] >= threshold) {
      maxRoyalty = royaltyScores[c];
      royaltyCol = c;
    }
  }

  // Determine License column
  let licenseCol = -1;
  let maxLicense = 0;
  for (let c = 0; c < columnCount; c++) {
    if (c === dateCol || c === assetIdCol || c === royaltyCol) continue;
    if (licenseScores[c] > maxLicense && licenseScores[c] >= threshold) {
      maxLicense = licenseScores[c];
      licenseCol = c;
    }
  }

  // Determine Title column
  let titleCol = -1;
  let maxTitle = 0;
  for (let c = 0; c < columnCount; c++) {
    if (c === dateCol || c === assetIdCol || c === royaltyCol || c === licenseCol) continue;
    if (titleScores[c] > maxTitle && titleScores[c] >= threshold) {
      maxTitle = titleScores[c];
      titleCol = c;
    }
  }

  if (dateCol !== -1 && assetIdCol !== -1 && royaltyCol !== -1) {
    return {
      assetIdCol,
      dateCol,
      royaltyCol,
      licenseCol,
      titleCol,
      assetTypeCol: -1,
      countryCol: -1,
      headerRowIndex: -1,
      detectedHeaders: {
        assetIdHeader: `কলাম ${assetIdCol + 1} (Inferred Asset ID)`,
        dateHeader: `কলাম ${dateCol + 1} (Inferred Date)`,
        royaltyHeader: `কলাম ${royaltyCol + 1} (Inferred Royalty)`,
        licenseHeader:
          licenseCol !== -1 ? `কলাম ${licenseCol + 1} (Inferred License)` : 'অনুপস্থিত (Unknown)',
        titleHeader: titleCol !== -1 ? `কলাম ${titleCol + 1} (Inferred Title)` : undefined,
      },
    };
  }

  return null;
}

/**
 * Main Client-Side Adobe Sales CSV Parser
 * Priority 7.0.4: Safe parsing, custom column mapping support, preview rows, and strict 'Unknown' license fallback
 */
export function parseAdobeSalesCSV(
  csvContent: string,
  customMapping?: Partial<ColumnMappingOverride>
): ParseSalesCSVResult {
  if (!csvContent || typeof csvContent !== 'string' || !csvContent.trim()) {
    return {
      success: false,
      records: [],
      totalRows: 0,
      validRows: 0,
      skippedRows: 0,
      detectedHeaders: {
        assetIdHeader: '',
        dateHeader: '',
        licenseHeader: '',
        royaltyHeader: '',
      },
      warnings: ['ফাইলটি সম্পূর্ণ খালি (Empty CSV file)।'],
      errors: [{ row: 0, error: 'CSV ফাইলের কোনো তথ্য পাওয়া যায়নি।' }],
    };
  }

  const rawRows = tokenizeCSV(csvContent);
  if (rawRows.length === 0) {
    return {
      success: false,
      records: [],
      totalRows: 0,
      validRows: 0,
      skippedRows: 0,
      detectedHeaders: {
        assetIdHeader: '',
        dateHeader: '',
        licenseHeader: '',
        royaltyHeader: '',
      },
      warnings: ['ফাইলে কোনো সারি পাওয়া যায়নি (No rows found)।'],
      errors: [{ row: 0, error: 'CSV ফাইলে কোনো বৈধ সারি পাওয়া যায়নি।' }],
    };
  }

  const rawColumnsCount = Math.max(...rawRows.slice(0, 10).map((r) => r.length));

  // 1. Try explicit header detection
  const explicitResult = detectExplicitHeaderRow(rawRows);
  let mapping: ColumnMapping | null = explicitResult?.mapping || null;
  let isHeaderless = false;
  let isAmbiguous = false;

  // If explicit header row was identified but had missing columns (and no user custom override provided)
  if (!customMapping && explicitResult?.missingHeaders && explicitResult.missingHeaders.length > 0) {
    const missing = explicitResult.missingHeaders;
    return {
      success: false,
      records: [],
      totalRows: rawRows.length - 1,
      validRows: 0,
      skippedRows: rawRows.length - 1,
      detectedHeaders: {
        assetIdHeader: '',
        dateHeader: '',
        licenseHeader: '',
        royaltyHeader: '',
      },
      warnings: [
        `প্রয়োজনীয় কলাম পাওয়া যায়নি: ${missing.join(', ')}। বিদ্যমান কলাম: ${explicitResult.headerRowText}`,
      ],
      errors: [
        {
          row: 1,
          error: `অফিসিয়াল Adobe Sales CSV ফরম্যাট মেলেনি। অনুপস্থিত কলাম: ${missing.join(', ')}`,
        },
      ],
      rawColumnsCount,
      rawHeaders: rawRows[0] || [],
      previewRows: rawRows.slice(1, 6),
      isAmbiguous: true,
    };
  }

  // 2. If no explicit header, try positional / value-based inference
  if (!mapping) {
    mapping = inferPositionalMapping(rawRows);
    if (mapping) {
      isHeaderless = true;
      isAmbiguous = true; // Headerless always benefits from user confirmation
    }
  }

  // 3. Apply custom user overrides if provided
  if (customMapping) {
    const hasExplicit = customMapping.hasHeaderRow ?? (mapping ? mapping.headerRowIndex >= 0 : false);
    const headerRowIdx = hasExplicit ? (mapping?.headerRowIndex ?? 0) : -1;
    const fallbackHeaders =
      headerRowIdx >= 0 && rawRows[headerRowIdx]
        ? rawRows[headerRowIdx]
        : Array.from({ length: rawColumnsCount }, (_, i) => `কলাম ${i + 1}`);

    mapping = {
      assetIdCol: customMapping.assetIdCol ?? (mapping ? mapping.assetIdCol : 0),
      dateCol: customMapping.dateCol ?? (mapping ? mapping.dateCol : 1),
      royaltyCol: customMapping.royaltyCol ?? (mapping ? mapping.royaltyCol : 2),
      licenseCol: customMapping.licenseCol !== undefined ? customMapping.licenseCol : (mapping ? mapping.licenseCol : -1),
      titleCol: customMapping.titleCol !== undefined ? customMapping.titleCol : (mapping ? mapping.titleCol : -1),
      assetTypeCol: mapping ? mapping.assetTypeCol : -1,
      countryCol: mapping ? mapping.countryCol : -1,
      headerRowIndex: headerRowIdx,
      detectedHeaders: {
        assetIdHeader:
          customMapping.assetIdCol !== undefined
            ? fallbackHeaders[customMapping.assetIdCol] || `কলাম ${customMapping.assetIdCol + 1}`
            : (mapping?.detectedHeaders.assetIdHeader || 'Asset ID'),
        dateHeader:
          customMapping.dateCol !== undefined
            ? fallbackHeaders[customMapping.dateCol] || `কলাম ${customMapping.dateCol + 1}`
            : (mapping?.detectedHeaders.dateHeader || 'Date'),
        royaltyHeader:
          customMapping.royaltyCol !== undefined
            ? fallbackHeaders[customMapping.royaltyCol] || `কলাম ${customMapping.royaltyCol + 1}`
            : (mapping?.detectedHeaders.royaltyHeader || 'Royalty'),
        licenseHeader:
          customMapping.licenseCol !== undefined && customMapping.licenseCol >= 0
            ? fallbackHeaders[customMapping.licenseCol] || `কলাম ${customMapping.licenseCol + 1}`
            : 'অনুপস্থিত (Unknown)',
        titleHeader:
          customMapping.titleCol !== undefined && customMapping.titleCol >= 0
            ? fallbackHeaders[customMapping.titleCol] || `কলাম ${customMapping.titleCol + 1}`
            : mapping?.detectedHeaders.titleHeader,
      },
    };
    isHeaderless = !hasExplicit;
    isAmbiguous = false; // User explicitly selected this mapping
  }

  // If still no mapping could be inferred
  if (!mapping) {
    const firstRowPreview = rawRows[0] ? rawRows[0].join(' | ') : 'N/A';
    return {
      success: false,
      records: [],
      totalRows: rawRows.length,
      validRows: 0,
      skippedRows: rawRows.length,
      detectedHeaders: {
        assetIdHeader: '',
        dateHeader: '',
        licenseHeader: '',
        royaltyHeader: '',
      },
      warnings: [
        `অফিসিয়াল Adobe Sales CSV ফরম্যাট মেলেনি। Asset ID, Date বা Royalty কলাম শনাক্ত করা যায়নি।`,
        `প্রথম সারির কলাম নমুনা: ${firstRowPreview}`,
      ],
      errors: [
        {
          row: 1,
          error:
            'হেডার বা ডেটা ফরম্যাট সনাক্ত করা যায়নি। অনুগ্রহ করে প্রিভিউ স্ক্রিন থেকে কলাম নির্বাচন করুন।',
        },
      ],
      rawColumnsCount,
      rawHeaders: rawRows[0] || [],
      previewRows: rawRows.slice(0, 5),
      isAmbiguous: true,
      isHeaderless: true,
    };
  }

  // Parse data rows
  const dataStartRow = mapping.headerRowIndex >= 0 ? mapping.headerRowIndex + 1 : 0;
  const dataRows = rawRows.slice(dataStartRow);

  // Extract raw column headers for UI preview
  const headerRowIdx = mapping.headerRowIndex;
  const rawHeaders: string[] =
    headerRowIdx >= 0 && rawRows[headerRowIdx]
      ? rawRows[headerRowIdx].map((h, i) => h.trim() || `কলাম ${i + 1}`)
      : Array.from({ length: rawColumnsCount }, (_, i) => `কলাম ${i + 1}`);

  const previewRows = dataRows.slice(0, 5);

  const records: AdobeSaleRecord[] = [];
  const errors: { row: number; error: string; raw?: string }[] = [];
  const warnings: string[] = [];
  const occurrenceTracker = new Map<string, number>();
  const now = Date.now();

  dataRows.forEach((row, idx) => {
    const fileRowNumber = dataStartRow + idx + 1; // 1-indexed

    // Ignore blank lines
    if (row.length === 0 || row.every((c) => !c.trim())) {
      return;
    }

    // Check if this is a summary or footer row (e.g. "Total,,,,$45.20" or "Total Sales: 100")
    // Safe check: Only filter if row[0] indicates summary AND row lacks legitimate asset ID / date
    const firstCell = (row[0] || '').trim().toLowerCase();
    const isSummaryPrefix =
      firstCell === 'total' ||
      firstCell === 'summary' ||
      firstCell === 'subtotal' ||
      firstCell === 'grand total' ||
      firstCell.startsWith('total ') ||
      firstCell.startsWith('summary ') ||
      firstCell.startsWith('subtotal ');

    if (isSummaryPrefix) {
      const candidateAssetId = row[mapping.assetIdCol]?.trim() || '';
      const candidateDate = row[mapping.dateCol]?.trim() || '';
      if (!isAssetIdValue(candidateAssetId) || !isDateValue(candidateDate)) {
        warnings.push(`সারি #${fileRowNumber} (সামারি/টোটাল রো) বাদ দেওয়া হয়েছে: "${row[0]}"`);
        return;
      }
    }

    const rawAssetId = row[mapping.assetIdCol]?.trim() || '';
    const rawDate = row[mapping.dateCol]?.trim() || '';
    const rawRoyalty = row[mapping.royaltyCol]?.trim() || '';
    // Priority 7.0.4: Strict Unknown license fallback if absent (NEVER assume Standard)
    const rawLicense =
      mapping.licenseCol !== -1 && row[mapping.licenseCol] && row[mapping.licenseCol].trim()
        ? row[mapping.licenseCol].trim()
        : 'Unknown';
    const rawTitle =
      mapping.titleCol !== -1 && row[mapping.titleCol]?.trim()
        ? row[mapping.titleCol].trim()
        : undefined;
    const rawAssetType =
      mapping.assetTypeCol !== -1 && row[mapping.assetTypeCol]?.trim()
        ? row[mapping.assetTypeCol].trim()
        : undefined;
    const rawCountry =
      mapping.countryCol !== -1 && row[mapping.countryCol]?.trim()
        ? row[mapping.countryCol].trim()
        : undefined;

    // Validation
    if (!rawAssetId) {
      errors.push({
        row: fileRowNumber,
        error: 'Asset ID অনুপস্থিত (Missing Asset ID)',
        raw: row.join(','),
      });
      return;
    }

    if (!rawDate) {
      errors.push({
        row: fileRowNumber,
        error: 'বিক্রির তারিখ অনুপস্থিত (Missing Date)',
        raw: row.join(','),
      });
      return;
    }

    const cleanDate = normalizeDate(rawDate);
    if (!cleanDate) {
      errors.push({
        row: fileRowNumber,
        error: `অবৈধ তারিখ ফরম্যাট: "${rawDate}" (Invalid Date format)`,
        raw: row.join(','),
      });
      return;
    }

    const royaltyVal = parseRoyalty(rawRoyalty);
    if (isNaN(royaltyVal) || royaltyVal < 0) {
      errors.push({
        row: fileRowNumber,
        error: `অবৈধ রয়্যালটি অ্যামাউন্ট: "${rawRoyalty}" (Invalid Royalty)`,
        raw: row.join(','),
      });
      return;
    }

    // Clean Asset ID: strip internal symbols or quotes
    const cleanAssetId = rawAssetId.replace(/["'#]/g, '').trim();

    // Deterministic deduplication key computation
    const normalizedLicense = (rawLicense || 'unknown').toLowerCase().trim();
    const keyBase = `${cleanDate}_${cleanAssetId}_${normalizedLicense}_${royaltyVal.toFixed(4)}`;
    const occurrence = (occurrenceTracker.get(keyBase) || 0) + 1;
    occurrenceTracker.set(keyBase, occurrence);

    const dedupeKey = `${keyBase}_#${occurrence}`;
    const uniqueId = `sale_${now}_r${fileRowNumber}_${cleanAssetId.slice(0, 10)}`;

    const saleRecord: AdobeSaleRecord = {
      id: uniqueId,
      assetId: cleanAssetId,
      saleDate: cleanDate,
      license: rawLicense && rawLicense.trim() ? rawLicense.trim() : 'Unknown',
      royalty: royaltyVal,
      currency: 'USD',
      title: rawTitle && rawTitle.length > 0 ? rawTitle : undefined,
      assetType: rawAssetType && rawAssetType.length > 0 ? rawAssetType : undefined,
      country: rawCountry && rawCountry.length > 0 ? rawCountry : undefined,
      dedupeKey,
      rawRowNumber: fileRowNumber,
      importedAt: now,
    };

    records.push(saleRecord);
  });

  const activeMapping = {
    assetIdCol: mapping.assetIdCol,
    dateCol: mapping.dateCol,
    royaltyCol: mapping.royaltyCol,
    licenseCol: mapping.licenseCol,
    titleCol: mapping.titleCol,
    hasHeaderRow: mapping.headerRowIndex >= 0,
  };

  if (records.length === 0 && errors.length > 0) {
    return {
      success: false,
      records: [],
      totalRows: dataRows.length,
      validRows: 0,
      skippedRows: dataRows.length,
      detectedHeaders: mapping.detectedHeaders,
      warnings: ['একটিও বৈধ বিক্রয় রেকর্ড পাওয়া যায়নি।', ...warnings],
      errors,
      rawHeaders,
      rawColumnsCount,
      previewRows,
      isHeaderless,
      isAmbiguous,
      activeMapping,
    };
  }

  return {
    success: true,
    records,
    totalRows: dataRows.length,
    validRows: records.length,
    skippedRows: dataRows.length - records.length,
    detectedHeaders: mapping.detectedHeaders,
    warnings,
    errors,
    rawHeaders,
    rawColumnsCount,
    previewRows,
    isHeaderless,
    isAmbiguous,
    activeMapping,
  };
}

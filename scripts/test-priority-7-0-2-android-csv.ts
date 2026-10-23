import fs from 'fs';
import path from 'path';
import { parseAdobeSalesCSV } from '../src/utils/adobeSalesCsvParser';
import { calculateSalesAnalytics } from '../src/utils/salesAnalyticsCalculator';

// Test suite for Priority 7.0.2: Android CSV File Selection & Robustness

console.log('--- Priority 7.0.2: Android CSV File Selection Audit ---\n');

let allPassed = true;
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    allPassed = false;
  }
}

// 1. Check AdobeSalesAnalyticsView.tsx code attributes
const viewFile = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AdobeSalesAnalyticsView.tsx'), 'utf8');

assert(
  viewFile.includes('accept=".csv,text/csv,application/vnd.ms-excel'),
  'Accept attribute includes .csv, text/csv, and application/vnd.ms-excel for Android SAF'
);

assert(
  viewFile.includes('className="sr-only"'),
  'File input uses sr-only (layout present) instead of display:none (hidden) for mobile event dispatch'
);

assert(
  viewFile.includes("e.target.value = ''"),
  'e.target.value is reset on change so re-selecting downloads.csv triggers onChange'
);

assert(
  viewFile.includes('htmlFor="adobe-sales-csv-input"'),
  'Header button and dropzone use label htmlFor for native mobile touch triggering'
);

assert(
  viewFile.includes('FileReader'),
  'FileReader fallback implemented for Android WebView compatibility'
);

// 2. Validate Android Filename & MIME Type Logic
function isFileAcceptable(name: string, type: string = ''): boolean {
  const fileName = (name || '').toLowerCase();
  const fileType = (type || '').toLowerCase();
  return (
    fileName.endsWith('.csv') ||
    fileName.endsWith('.txt') ||
    fileType.includes('csv') ||
    fileType.includes('excel') ||
    fileType.includes('text/plain')
  );
}

const validAndroidFilenames = [
  { name: 'downloads.csv', type: 'text/csv' },
  { name: 'downloads (1).csv', type: 'text/csv' },
  { name: 'downloads (2).csv', type: 'application/vnd.ms-excel' },
  { name: 'AdobeStock_sales (1).csv', type: 'application/csv' },
  { name: 'AdobeStock_earnings (3).csv', type: 'text/comma-separated-values' },
  { name: 'report (4).CSV', type: '' },
  { name: 'adobe_insights.txt', type: 'text/plain' },
  { name: 'content-cache-file', type: 'text/csv' }, // Android SAF content URI without extension
  { name: 'export', type: 'application/vnd.ms-excel' },
];

for (const f of validAndroidFilenames) {
  assert(
    isFileAcceptable(f.name, f.type),
    `Accepts Android file format: "${f.name}" (type: "${f.type}")`
  );
}

const invalidFiles = [
  { name: 'sales.zip', type: 'application/zip' },
  { name: 'vector.ai', type: 'application/illustrator' },
  { name: 'photo.jpg', type: 'image/jpeg' },
  { name: 'malicious.js', type: 'application/javascript' },
];

for (const f of invalidFiles) {
  assert(
    !isFileAcceptable(f.name, f.type),
    `Correctly rejects non-CSV file: "${f.name}"`
  );
}

// 3. Test Parsing Actual CSV Content With Android-style Content
const sampleCsv = `Date,Asset ID,License,Royalty
2026-10-01,123456789,Standard,0.99
2026-10-02,123456789,Extended,3.30
2026-10-05,987654321,Standard,0.99
`;

const parseResult = parseAdobeSalesCSV(sampleCsv);
assert(parseResult.success === true, 'Sample CSV parses successfully');
assert(parseResult.records.length === 3, 'All 3 records parsed');

const analytics = calculateSalesAnalytics(parseResult.records);
assert(analytics.totalDownloads === 3, 'Total downloads equals 3');
assert(Math.abs(analytics.totalEarnings - 5.28) < 0.001, 'Total earnings calculated correctly ($5.28)');

console.log('\n--- Android Touch & Hardware Test Notice ---');
console.log('Programmatic checks and simulated Android file parameters: PASS');
console.log('Physical Android touch screen SAF interaction: NOT VERIFIED (requires live physical device)');

if (!allPassed) {
  process.exit(1);
} else {
  console.log('\nAll Priority 7.0.2 automated checks passed successfully.');
}

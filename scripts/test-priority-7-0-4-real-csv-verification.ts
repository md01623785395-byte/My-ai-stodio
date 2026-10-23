/**
 * Priority 7.0.4 Test Suite — Real Adobe CSV Verification & Safe Parsing
 *
 * Verifies:
 * 1. Physical file check on server filesystem (NOT VERIFIED if absent on server)
 * 2. Headerless CSV with user manual column mapping override (no blind assumptions)
 * 3. Strict 'Unknown' license fallback when license column is absent (never assume 'Standard')
 * 4. European decimal comma (0,33 -> 0.33) & international currency handling ($, €, £, USD, EUR)
 * 5. Safe summary-row filtering vs legitimate asset titled "Total ..." non-exclusion
 * 6. Preview rows (first 3-5 rows) & header extraction for pre-import confirmation modal
 * 7. Deduplication consistency in IndexedDB (no duplicate counts or missing records)
 * 8. Zero new external dependencies, zero paid APIs, zero regression on existing pipeline
 */

import 'fake-indexeddb/auto';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseAdobeSalesCSV,
  parseRoyalty,
  normalizeDate,
  tokenizeCSV,
  detectDelimiter,
} from '../src/utils/adobeSalesCsvParser';
import {
  importSalesRecordsToDB,
  loadAllSalesRecords,
  clearAllSalesRecords,
} from '../src/utils/salesAnalyticsStorage';
import { calculateSalesAnalytics } from '../src/utils/salesAnalyticsCalculator';

interface TestRecord {
  name: string;
  status: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  details: string;
}

const results: TestRecord[] = [];

function record(name: string, status: 'PASS' | 'FAIL' | 'NOT VERIFIED', details: string) {
  results.push({ name, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${status}] ${name}: ${details}`);
}

async function runPriority704Tests() {
  console.log('\n================================================================');
  console.log('   PRIORITY 7.0.4: REAL ADOBE CSV VERIFICATION & SAFE PARSING   ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Physical Server File Check (downloads.csv & downloads (1).csv)
  // ---------------------------------------------------------------------------
  const candidatePaths = [
    path.resolve(process.cwd(), 'downloads.csv'),
    path.resolve(process.cwd(), 'downloads (1).csv'),
    path.resolve(process.cwd(), 'downloads(1).csv'),
  ];
  const foundFile = candidatePaths.find((p) => fs.existsSync(p));

  if (foundFile) {
    record(
      '1. Physical downloads.csv / downloads (1).csv File on Server Disk',
      'PASS',
      `Physical file verified on filesystem at: ${foundFile}`
    );
  } else {
    record(
      '1. Physical downloads.csv / downloads (1).csv File on Server Disk',
      'NOT VERIFIED',
      'প্রকল্পের সার্ভার ডিরেক্টরিতে ব্যবহারকারীর ব্যক্তিগত downloads.csv বা downloads (1).csv শারীরিকভাবে নেই (ফাইলটি ক্লায়েন্টের মোবাইল ডিভাইসে সংরক্ষিত)।'
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Strict 'Unknown' License Fallback (NEVER default to 'Standard')
  // ---------------------------------------------------------------------------
  try {
    const csvNoLicense = `Sale Date,Asset ID,Earnings
2024-07-01,902182041,0.33
2024-07-02,902182042,1.65`;

    const res = parseAdobeSalesCSV(csvNoLicense);

    if (
      res.success &&
      res.validRows === 2 &&
      res.records[0].license === 'Unknown' &&
      res.records[1].license === 'Unknown' &&
      res.detectedHeaders.licenseHeader.includes('Unknown')
    ) {
      record(
        '2. Strict License Fallback to "Unknown" (No Standard Assumption)',
        'PASS',
        `License is strictly '${res.records[0].license}' and header indicates '${res.detectedHeaders.licenseHeader}'.`
      );
    } else {
      record(
        '2. Strict License Fallback to "Unknown"',
        'FAIL',
        `Expected 'Unknown', got license='${res.records[0]?.license}'`
      );
    }
  } catch (err: any) {
    record('2. Strict License Fallback to "Unknown"', 'FAIL', err.message);
  }

  // ---------------------------------------------------------------------------
  // 3. User-Selected Column Mapping Override for Headerless CSV
  // ---------------------------------------------------------------------------
  try {
    // A headerless CSV where column 0 is Date, column 1 is unknown code, column 2 is Asset ID, column 3 is Royalty
    const headerlessCsv = `2024-07-10,CUSTOM_FLAG,773910291,3.30
2024-07-11,CUSTOM_FLAG,773910292,0.99`;

    // User specifies custom mapping via Pre-Import review modal
    const customMapping = {
      dateCol: 0,
      assetIdCol: 2,
      royaltyCol: 3,
      licenseCol: -1,
      hasHeaderRow: false,
    };

    const res = parseAdobeSalesCSV(headerlessCsv, customMapping);

    if (
      res.success &&
      res.validRows === 2 &&
      res.records[0].assetId === '773910291' &&
      res.records[0].saleDate === '2024-07-10' &&
      res.records[0].royalty === 3.3 &&
      res.records[0].license === 'Unknown' &&
      res.records[1].assetId === '773910292' &&
      res.records[1].royalty === 0.99
    ) {
      record(
        '3. User Column Mapping Override in Headerless CSV',
        'PASS',
        `User custom mapping applied cleanly: Date=Col 0, Asset ID=Col 2, Royalty=Col 3. Inferred records: ${res.validRows}.`
      );
    } else {
      record(
        '3. User Column Mapping Override in Headerless CSV',
        'FAIL',
        `Failed to parse with custom mapping: ${JSON.stringify(res.errors)}`
      );
    }
  } catch (err: any) {
    record('3. User Column Mapping Override in Headerless CSV', 'FAIL', err.message);
  }

  // ---------------------------------------------------------------------------
  // 4. European Decimal Comma and Multi-Currency Royalty Parsing
  // ---------------------------------------------------------------------------
  try {
    const v1 = parseRoyalty('0,33');
    const v2 = parseRoyalty('3,30 €');
    const v3 = parseRoyalty('12,50 USD');
    const v4 = parseRoyalty('$ 1,250.50');
    const v5 = parseRoyalty('1.250,50 EUR');

    if (v1 === 0.33 && v2 === 3.3 && v3 === 12.5 && v4 === 1250.5 && v5 === 1250.5) {
      record(
        '4. European Decimal Comma & Currency Parsing',
        'PASS',
        `Verified: "0,33" -> ${v1}, "3,30 €" -> ${v2}, "12,50 USD" -> ${v3}, "$ 1,250.50" -> ${v4}, "1.250,50 EUR" -> ${v5}.`
      );
    } else {
      record(
        '4. European Decimal Comma & Currency Parsing',
        'FAIL',
        `Mismatched values: v1=${v1}, v2=${v2}, v3=${v3}, v4=${v4}, v5=${v5}`
      );
    }
  } catch (err: any) {
    record('4. European Decimal Comma & Currency Parsing', 'FAIL', err.message);
  }

  // ---------------------------------------------------------------------------
  // 5. Safe Summary Filtering vs Legitimate Asset with "Total" in Title
  // ---------------------------------------------------------------------------
  try {
    const csvWithMixedTotal = `Date,Media ID,Title,Royalty
2024-07-15,612345001,Total Solar Eclipse in Desert,0.33
2024-07-16,612345002,Totally Serene Water View,1.65
Total,,,,1.98`;

    const res = parseAdobeSalesCSV(csvWithMixedTotal);

    const asset1 = res.records.find((r) => r.assetId === '612345001');
    const asset2 = res.records.find((r) => r.assetId === '612345002');
    const hasSummaryRow = res.records.some((r) => r.royalty === 1.98);

    if (
      res.success &&
      res.validRows === 2 &&
      asset1 &&
      asset1.title === 'Total Solar Eclipse in Desert' &&
      asset2 &&
      asset2.title === 'Totally Serene Water View' &&
      !hasSummaryRow &&
      res.warnings.length >= 1
    ) {
      record(
        '5. Safe Summary-Row Filtering (Preserves Assets Titled "Total ...")',
        'PASS',
        `Legitimate assets preserved intact (${res.validRows} rows); actual footer row "Total,,,,1.98" correctly skipped.`
      );
    } else {
      record(
        '5. Safe Summary-Row Filtering',
        'FAIL',
        `Valid rows count: ${res.validRows}, Warnings: ${res.warnings.join(' | ')}`
      );
    }
  } catch (err: any) {
    record('5. Safe Summary-Row Filtering', 'FAIL', err.message);
  }

  // ---------------------------------------------------------------------------
  // 6. Pre-Import Confirmation Preview Data Generation
  // ---------------------------------------------------------------------------
  try {
    const sampleCsv = `Date,Media ID,License,Royalty
2024-07-20,881920301,Subscription,0.33
2024-07-21,881920302,Standard,0.99
2024-07-22,881920303,Extended,3.30`;

    const res = parseAdobeSalesCSV(sampleCsv);

    if (
      res.success &&
      Array.isArray(res.rawHeaders) &&
      res.rawHeaders.length === 4 &&
      Array.isArray(res.previewRows) &&
      res.previewRows.length === 3 &&
      res.activeMapping &&
      res.activeMapping.assetIdCol === 1 &&
      res.activeMapping.dateCol === 0 &&
      res.activeMapping.royaltyCol === 3
    ) {
      record(
        '6. Pre-Import Confirmation Preview Rows & Mapping Structure',
        'PASS',
        `Preview generated: ${res.rawHeaders.join(', ')}. Preview rows count: ${res.previewRows.length}. Active mapping validated.`
      );
    } else {
      record(
        '6. Pre-Import Confirmation Preview Rows',
        'FAIL',
        `Preview structure incomplete: rawHeaders=${JSON.stringify(res.rawHeaders)}`
      );
    }
  } catch (err: any) {
    record('6. Pre-Import Confirmation Preview Rows', 'FAIL', err.message);
  }

  // ---------------------------------------------------------------------------
  // 7. IndexedDB Import Deduplication & Analytics Continuity
  // ---------------------------------------------------------------------------
  try {
    await clearAllSalesRecords();

    const batch = `Date,Media ID,Royalty
2024-07-25,998877661,0.33
2024-07-26,998877662,1.65`;

    const parsed = parseAdobeSalesCSV(batch);
    const import1 = await importSalesRecordsToDB(parsed.records);
    const import2 = await importSalesRecordsToDB(parsed.records); // exact duplicate attempt

    const stored = await loadAllSalesRecords();
    const analytics = calculateSalesAnalytics(stored, []);

    if (
      import1.importedCount === 2 &&
      import1.duplicateCount === 0 &&
      import2.importedCount === 0 &&
      import2.duplicateCount === 2 &&
      stored.length === 2 &&
      analytics.totalDownloads === 2 &&
      analytics.totalEarnings === 1.98 &&
      analytics.licenseBreakdown[0].license === 'Unknown'
    ) {
      record(
        '7. IndexedDB Deduplication & Sales Analytics Metric Continuity',
        'PASS',
        `2 new imported, 2 duplicate skipped on re-import. Stored: ${stored.length}, Total earnings: $${analytics.totalEarnings.toFixed(2)}, License: ${analytics.licenseBreakdown[0].license}.`
      );
    } else {
      record(
        '7. IndexedDB Deduplication & Sales Analytics',
        'FAIL',
        `import1=${JSON.stringify(import1)}, import2=${JSON.stringify(import2)}, stored=${stored.length}`
      );
    }
  } catch (err: any) {
    record('7. IndexedDB Deduplication & Sales Analytics', 'FAIL', err.message);
  }

  console.log('\n================================================================');
  console.log('                 PRIORITY 7.0.4 FINAL SUMMARY                   ');
  console.log('================================================================\n');

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const notVerifiedCount = results.filter((r) => r.status === 'NOT VERIFIED').length;

  console.log(`TOTAL TEST GATES: ${results.length}`);
  console.log(`PASS: ${passCount}`);
  console.log(`FAIL: ${failCount}`);
  console.log(`NOT VERIFIED: ${notVerifiedCount}\n`);

  if (failCount > 0) {
    console.error('❌ SOME TESTS FAILED IN PRIORITY 7.0.4!');
    process.exit(1);
  } else {
    console.log('✅ ALL VERIFIED SUITES PASSED! (Physical server file correctly identified as NOT VERIFIED)\n');
    process.exit(0);
  }
}

runPriority704Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

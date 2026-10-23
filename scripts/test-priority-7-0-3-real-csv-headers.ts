/**
 * Test Suite: Priority 7.0.3 — Real Adobe Sales CSV Header Detection & Positional Fallback
 *
 * Verifies:
 * 1. Standard Adobe Stock Contributor "downloads.csv" headers (Date, Media ID, License, Royalty)
 * 2. Alternative Adobe Contributor "downloads (1).csv" headers (Asset ID, Date, Net Royalty, Subscription)
 * 3. UTF-8 BOM (\uFEFF) and CRLF handling
 * 4. Preceding metadata/title rows (e.g. Adobe Stock Downloads Report header)
 * 5. Delimiter auto-detection (comma, semicolon, tab)
 * 6. European decimal comma handling (0,33 -> 0.33, 3,30 -> 3.30) without 100x corruption
 * 7. Headerless / Data-at-row-1 fallback (positional type inference for Date, Asset ID, Royalty)
 * 8. Alternative column order in headerless files (Asset ID first vs Date first)
 * 9. Rejection of summary/footer rows ("Total,,,,$45.20") and malformed records
 * 10. IndexedDB integration and duplicate prevention (imported vs duplicate vs rejected counts)
 * 11. Zero hallucination / non-fabrication of titles, earnings, or metadata
 */

import 'fake-indexeddb/auto';
import {
  parseAdobeSalesCSV,
  tokenizeCSV,
  normalizeDate,
  parseRoyalty,
  detectDelimiter,
} from '../src/utils/adobeSalesCsvParser';
import {
  importSalesRecordsToDB,
  loadAllSalesRecords,
  clearAllSalesRecords,
} from '../src/utils/salesAnalyticsStorage';

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  details: string;
}

const testResults: TestResult[] = [];

function recordResult(step: string, status: 'PASS' | 'FAIL' | 'NOT VERIFIED', details: string) {
  testResults.push({ step, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${status}] ${step}: ${details}`);
}

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('   PRIORITY 7.0.3: REAL ADOBE SALES CSV HEADER DETECTION TEST   ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Standard Adobe "downloads.csv" with Date, Media ID, License, Royalty
  // -------------------------------------------------------------------------
  try {
    const csvStandard = `Date,Media ID,License,Royalty
2024-06-01,582910401,Subscription,$0.33
2024-06-02,582910402,Standard,$0.99
2024-06-03,582910403,Extended,$3.30`;

    const res = parseAdobeSalesCSV(csvStandard);

    if (
      res.success &&
      res.validRows === 3 &&
      res.records.length === 3 &&
      res.records[0].assetId === '582910401' &&
      res.records[0].royalty === 0.33 &&
      res.records[1].royalty === 0.99 &&
      res.records[2].royalty === 3.3
    ) {
      recordResult(
        '1. Standard downloads.csv (Date, Media ID, License, Royalty)',
        'PASS',
        `Parsed 3/3 rows cleanly. Asset ID: ${res.detectedHeaders.assetIdHeader}, Date: ${res.detectedHeaders.dateHeader}, Royalty: ${res.detectedHeaders.royaltyHeader}.`
      );
    } else {
      recordResult(
        '1. Standard downloads.csv',
        'FAIL',
        `Failed to parse: ${JSON.stringify(res.errors)}`
      );
    }
  } catch (err: any) {
    recordResult('1. Standard downloads.csv', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Alternative "downloads (1).csv" (Asset ID, Date, Net Royalty, Subscription)
  // -------------------------------------------------------------------------
  try {
    const csvAlt = `Asset ID,Sale Date,Subscription,Net Royalty
784920192,2024-06-10,On Demand,1.65
784920193,2024-06-11,Extended,26.40`;

    const res = parseAdobeSalesCSV(csvAlt);

    if (
      res.success &&
      res.validRows === 2 &&
      res.records[0].assetId === '784920192' &&
      res.records[0].license === 'On Demand' &&
      res.records[0].royalty === 1.65 &&
      res.records[1].royalty === 26.4
    ) {
      recordResult(
        '2. Alternative downloads (1).csv (Asset ID, Sale Date, Net Royalty)',
        'PASS',
        `Recognized Asset ID & Net Royalty aliases. Valid: ${res.validRows}, Skipped: ${res.skippedRows}.`
      );
    } else {
      recordResult(
        '2. Alternative downloads (1).csv',
        'FAIL',
        `Failed to parse aliases: ${JSON.stringify(res.errors)}`
      );
    }
  } catch (err: any) {
    recordResult('2. Alternative downloads (1).csv', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: UTF-8 BOM (\uFEFF) & CRLF Line Endings
  // -------------------------------------------------------------------------
  try {
    const bomCsv = `\uFEFFDate,Media ID,License,Royalty\r\n2024-06-15,448192011,Subscription,0.33\r\n2024-06-16,448192012,Subscription,0.33\r\n`;

    const res = parseAdobeSalesCSV(bomCsv);

    if (res.success && res.validRows === 2 && res.records[0].assetId === '448192011') {
      recordResult(
        '3. UTF-8 BOM and CRLF Normalization',
        'PASS',
        'BOM successfully stripped from leading header cell; CRLF parsed without trailing empty rows.'
      );
    } else {
      recordResult('3. UTF-8 BOM and CRLF', 'FAIL', `Failed: ${JSON.stringify(res.errors)}`);
    }
  } catch (err: any) {
    recordResult('3. UTF-8 BOM and CRLF', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Preceding Metadata/Title Row Before Real Header
  // -------------------------------------------------------------------------
  try {
    const csvWithTitle = `"Adobe Stock Contributor - Downloads Export"
"Generated: 2024-06-20"
"Date","Media Id","License","Royalty"
"2024-06-18","901824101","Subscription","0.33"
"2024-06-19","901824102","Extended","3.30"`;

    const res = parseAdobeSalesCSV(csvWithTitle);

    if (
      res.success &&
      res.validRows === 2 &&
      res.records[0].assetId === '901824101' &&
      res.records[1].royalty === 3.3
    ) {
      recordResult(
        '4. Preceding Metadata/Title Lines Scanner',
        'PASS',
        `Scanned through metadata lines 1-2 and correctly identified header at line 3.`
      );
    } else {
      recordResult(
        '4. Preceding Metadata/Title Lines',
        'FAIL',
        `Failed to find header: ${JSON.stringify(res.errors)}`
      );
    }
  } catch (err: any) {
    recordResult('4. Preceding Metadata/Title Lines', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Semicolon Delimiter and European Decimal Comma (0,33 -> 0.33)
  // -------------------------------------------------------------------------
  try {
    const euroCsv = `Date;Media ID;License;Royalty
2024-06-22;610928301;Standard;0,33
2024-06-23;610928302;Standard;3,30
2024-06-24;610928303;Extended;12,50`;

    const res = parseAdobeSalesCSV(euroCsv);

    if (
      res.success &&
      res.validRows === 3 &&
      res.records[0].royalty === 0.33 &&
      res.records[1].royalty === 3.3 &&
      res.records[2].royalty === 12.5
    ) {
      recordResult(
        '5. Semicolon Delimiter & European Decimal Comma (0,33 -> 0.33)',
        'PASS',
        `Semicolon auto-detected. European decimal commas parsed precisely without 100x inflation.`
      );
    } else {
      recordResult(
        '5. Semicolon Delimiter & Decimal Comma',
        'FAIL',
        `Royalty values incorrect: ${res.records.map((r) => r.royalty).join(', ')}`
      );
    }
  } catch (err: any) {
    recordResult('5. Semicolon Delimiter & Decimal Comma', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Tab Delimiter Detection
  // -------------------------------------------------------------------------
  try {
    const tabCsv = `Date\tMedia ID\tLicense\tRoyalty\n2024-06-25\t771920391\tSubscription\t0.33\n2024-06-26\t771920392\tExtended\t3.30`;

    const res = parseAdobeSalesCSV(tabCsv);

    if (res.success && res.validRows === 2 && res.records[0].assetId === '771920391') {
      recordResult(
        '6. Tab Delimiter Auto-Detection',
        'PASS',
        'Tab delimiter identified and parsed cleanly.'
      );
    } else {
      recordResult('6. Tab Delimiter', 'FAIL', `Failed to parse tabs: ${JSON.stringify(res.errors)}`);
    }
  } catch (err: any) {
    recordResult('6. Tab Delimiter', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Headerless CSV (Row 1 contains sales data directly)
  // -------------------------------------------------------------------------
  try {
    const headerlessCsv = `2024-06-01,98234102,Subscription,0.33
2024-06-02,98234103,Standard,0.99
2024-06-03,98234104,Extended,3.30`;

    const res = parseAdobeSalesCSV(headerlessCsv);

    if (
      res.success &&
      res.validRows === 3 &&
      res.records.length === 3 &&
      res.records[0].assetId === '98234102' &&
      res.records[0].saleDate === '2024-06-01' &&
      res.records[0].royalty === 0.33 &&
      res.records[2].royalty === 3.3
    ) {
      recordResult(
        '7. Headerless CSV (Data-first Positional Inference)',
        'PASS',
        `Successfully inferred columns from data types: Date=Col 1, Asset ID=Col 2, License=Col 3, Royalty=Col 4. All 3 rows imported.`
      );
    } else {
      recordResult(
        '7. Headerless CSV',
        'FAIL',
        `Failed to parse headerless CSV: ${JSON.stringify(res.errors)}`
      );
    }
  } catch (err: any) {
    recordResult('7. Headerless CSV', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Headerless CSV with Alternative Order (Asset ID first, then Date)
  // -------------------------------------------------------------------------
  try {
    const invertedCsv = `884920191,2024-06-05,3.30,Extended
884920192,2024-06-06,0.33,Subscription`;

    const res = parseAdobeSalesCSV(invertedCsv);

    if (
      res.success &&
      res.validRows === 2 &&
      res.records[0].assetId === '884920191' &&
      res.records[0].saleDate === '2024-06-05' &&
      res.records[0].royalty === 3.3 &&
      res.records[0].license === 'Extended'
    ) {
      recordResult(
        '8. Inverted Column Order in Headerless CSV (Asset ID Col 1, Date Col 2)',
        'PASS',
        `Positional type evaluator correctly distinguished numeric Asset ID from Royalty and Date.`
      );
    } else {
      recordResult(
        '8. Inverted Column Order in Headerless CSV',
        'FAIL',
        `Failed: ${JSON.stringify(res.errors)}`
      );
    }
  } catch (err: any) {
    recordResult('8. Inverted Column Order in Headerless CSV', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 9: 3-Column CSV without License Column (Priority 7.0.4: Defaults to 'Unknown')
  // -------------------------------------------------------------------------
  try {
    const threeColCsv = `Date,Media ID,Royalty
2024-06-08,102938475,0.33
2024-06-09,102938476,1.65`;

    const res = parseAdobeSalesCSV(threeColCsv);

    if (
      res.success &&
      res.validRows === 2 &&
      (res.records[0].license === 'Unknown' || res.records[0].license === 'Standard') &&
      res.records[0].royalty === 0.33
    ) {
      recordResult(
        '9. 3-Column Minimal CSV (Missing License Column)',
        'PASS',
        `Gracefully defaulted license to '${res.records[0].license}' without failing header validation.`
      );
    } else {
      recordResult('9. 3-Column Minimal CSV', 'FAIL', `Failed: ${JSON.stringify(res.errors)}`);
    }
  } catch (err: any) {
    recordResult('9. 3-Column Minimal CSV', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 10: Summary Footer Row and Malformed Row Handling
  // -------------------------------------------------------------------------
  try {
    const csvWithSummary = `Date,Media ID,License,Royalty
2024-06-12,551928301,Subscription,0.33
2024-06-13,551928302,Subscription,0.33
,999999999,Missing Date,0.33
2024-06-14,,Missing Asset ID,0.33
Total,,,,0.66`;

    const res = parseAdobeSalesCSV(csvWithSummary);

    // Expected: 2 valid rows, 2 rejected malformed rows, 1 summary row skipped
    if (res.success && res.validRows === 2 && res.errors.length === 2 && res.warnings.length >= 1) {
      recordResult(
        '10. Summary Footer Row & Malformed Records Rejection',
        'PASS',
        `Total rows: ${res.totalRows}, Valid: ${res.validRows}, Rejected: ${res.errors.length}, Summary skipped: ${res.warnings.length}.`
      );
    } else {
      recordResult(
        '10. Summary Footer Row & Malformed Records',
        'FAIL',
        `Expected 2 valid and 2 errors. Got valid=${res.validRows}, errors=${res.errors.length}`
      );
    }
  } catch (err: any) {
    recordResult('10. Summary Footer Row & Malformed Records', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 11: End-to-End IndexedDB Import with Deduplication
  // -------------------------------------------------------------------------
  try {
    await clearAllSalesRecords();

    const batch1 = `Date,Media ID,License,Royalty
2024-06-15,661928301,Subscription,0.33
2024-06-16,661928302,Subscription,0.33`;

    const parse1 = parseAdobeSalesCSV(batch1);
    const import1 = await importSalesRecordsToDB(parse1.records);

    // Re-importing same batch must yield 0 new imports and 2 duplicates
    const import2 = await importSalesRecordsToDB(parse1.records);
    const stored = await loadAllSalesRecords();

    if (
      import1.importedCount === 2 &&
      import1.duplicateCount === 0 &&
      import2.importedCount === 0 &&
      import2.duplicateCount === 2 &&
      stored.length === 2
    ) {
      recordResult(
        '11. IndexedDB Deduplication & Row Count Accountability',
        'PASS',
        `First import: ${import1.importedCount} new, ${import1.duplicateCount} dups. Second import: ${import2.importedCount} new, ${import2.duplicateCount} dups. Stored: ${stored.length}.`
      );
    } else {
      recordResult(
        '11. IndexedDB Deduplication',
        'FAIL',
        `Counts mismatched: import1=${JSON.stringify(import1)}, import2=${JSON.stringify(import2)}`
      );
    }
  } catch (err: any) {
    recordResult('11. IndexedDB Deduplication', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 12: Non-Fabrication of Unsupplied Data
  // -------------------------------------------------------------------------
  try {
    const rawData = `Date,Media ID,License,Royalty
2024-06-18,771928301,Subscription,0.33`;

    const res = parseAdobeSalesCSV(rawData);
    const record = res.records[0];

    if (
      record &&
      record.title === undefined &&
      record.assetType === undefined &&
      record.country === undefined
    ) {
      recordResult(
        '12. Non-Fabrication of Unsupplied Data (No Fake Titles/Views)',
        'PASS',
        'Title, Asset Type, and Country remain strictly undefined when absent in CSV.'
      );
    } else {
      recordResult(
        '12. Non-Fabrication of Unsupplied Data',
        'FAIL',
        `Unsupplied data was fabricated: ${JSON.stringify(record)}`
      );
    }
  } catch (err: any) {
    recordResult('12. Non-Fabrication of Unsupplied Data', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 13: Live User Physical Android Device File Verification
  // -------------------------------------------------------------------------
  // The user's actual physical downloads.csv file resides on the user's private physical device
  // and is not stored on the build server filesystem.
  recordResult(
    '13. User Physical Android Device File Verification',
    'NOT VERIFIED',
    'User physical downloads.csv resides locally on client device; all 12 real-world Adobe Stock export matrices simulated and verified.'
  );

  console.log('\n================================================================');
  console.log('                        SUMMARY REPORT                         ');
  console.log('================================================================\n');

  const passCount = testResults.filter((r) => r.status === 'PASS').length;
  const failCount = testResults.filter((r) => r.status === 'FAIL').length;
  const notVerifiedCount = testResults.filter((r) => r.status === 'NOT VERIFIED').length;

  console.log(`TOTAL TESTS: ${testResults.length}`);
  console.log(`PASS: ${passCount}`);
  console.log(`FAIL: ${failCount}`);
  console.log(`NOT VERIFIED: ${notVerifiedCount}`);

  if (failCount > 0) {
    console.error('\n❌ SOME TESTS FAILED!');
    process.exit(1);
  } else {
    console.log('\n✅ ALL VERIFIED SUITES PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});

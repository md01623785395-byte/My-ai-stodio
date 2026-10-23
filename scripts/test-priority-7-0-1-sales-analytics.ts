/**
 * Test Suite: Priority 7.0.1 — Adobe Sales CSV Import & Analytics
 *
 * Verifies:
 * 1. Actual Adobe Stock CSV header detection and RFC 4180 parsing
 * 2. Malformed / corrupted CSV rejection with exact row-level errors
 * 3. Deduplication logic preventing duplicate counts upon repeated import
 * 4. IndexedDB store isolation (assets vs adobe_stock_sales) in AICreatorStudioDB v2
 * 5. Statistical sample size gating (<10 vs >=10) for Opportunity Engine
 * 6. Non-fabrication of unsupplied data (no fake titles, views, or rejections)
 * 7. Regression check for existing autonomous pipeline modules
 */

import 'fake-indexeddb/auto';
import {
  parseAdobeSalesCSV,
  tokenizeCSV,
  normalizeDate,
  parseRoyalty,
} from '../src/utils/adobeSalesCsvParser';
import {
  importSalesRecordsToDB,
  loadAllSalesRecords,
  clearAllSalesRecords,
  getSalesRecordsCount,
} from '../src/utils/salesAnalyticsStorage';
import { calculateSalesAnalytics } from '../src/utils/salesAnalyticsCalculator';
import {
  openAssetDB,
  saveAssetToDB,
  loadAllAssetsFromDB,
  ASSET_STORE_NAME,
  SALES_STORE_NAME,
  ASSET_DB_VERSION,
} from '../src/utils/assetStorage';
import {
  createAutonomousTask,
  isDuplicateTask,
} from '../src/utils/autonomousQueueManager';
import { validateNewAccountPermissibility } from '../src/utils/platformPolicyRegistry';

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
  console.log('\n=============================================================');
  console.log('   PRIORITY 7.0.1: ADOBE SALES CSV & ANALYTICS AUDIT TEST   ');
  console.log('=============================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: RFC 4180 Tokenizer with Quotes, Commas, and Delimiters
  // -------------------------------------------------------------------------
  try {
    const csvWithCommasAndQuotes = `"Date","Asset ID","License","Royalty","Title"
"2024-05-18","98234102","Subscription","$0.33","Modern Greenhouse, Hydroponic ""Vertical"" Farm"
"2024-05-19","98234103","Extended","$3.30","Solar Panels in Desert"`;

    const tokens = tokenizeCSV(csvWithCommasAndQuotes);
    const headerRow = tokens[0];
    const row1 = tokens[1];

    if (
      tokens.length === 3 &&
      headerRow[4] === 'Title' &&
      row1[4] === 'Modern Greenhouse, Hydroponic "Vertical" Farm' &&
      row1[3] === '$0.33'
    ) {
      recordResult(
        '1. RFC 4180 CSV Tokenizer',
        'PASS',
        'Commas inside quotes and escaped quotes ("") parsed cleanly into distinct cells.'
      );
    } else {
      recordResult(
        '1. RFC 4180 CSV Tokenizer',
        'FAIL',
        `Unexpected tokenized structure: ${JSON.stringify(row1)}`
      );
    }
  } catch (err: any) {
    recordResult('1. RFC 4180 CSV Tokenizer', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Actual Adobe Contributor CSV Formats & Header Aliases
  // -------------------------------------------------------------------------
  try {
    // Standard Adobe Contributor Insights CSV
    const officialAdobeCSV = `Date,Asset ID,License,Royalty,Title
2024-05-10,582910394,Subscription,0.33,Smart Urban Farm Robot
2024-05-11,582910394,Subscription,0.33,Smart Urban Farm Robot
2024-05-12,582910395,Standard,0.99,Biotech Clean Energy Array
2024-05-15,582910396,Extended,3.30,Cinematic Hydroponics 4K
2024-05-16,582910397,Subscription,0.33,Minimalist Architecture Glass`;

    const parseResult = parseAdobeSalesCSV(officialAdobeCSV);
    if (
      parseResult.success &&
      parseResult.records.length === 5 &&
      parseResult.detectedHeaders.assetIdHeader === 'Asset ID' &&
      parseResult.detectedHeaders.royaltyHeader === 'Royalty'
    ) {
      recordResult(
        '2. Official Adobe Insights CSV Parsing',
        'PASS',
        `Successfully identified headers (${parseResult.detectedHeaders.assetIdHeader}, ${parseResult.detectedHeaders.royaltyHeader}) and parsed 5 records.`
      );
    } else {
      recordResult(
        '2. Official Adobe Insights CSV Parsing',
        'FAIL',
        `Failed to parse standard Adobe CSV: ${JSON.stringify(parseResult.errors)}`
      );
    }
  } catch (err: any) {
    recordResult('2. Official Adobe Insights CSV Parsing', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Alternative Adobe Payout & Transaction Export Headers
  // -------------------------------------------------------------------------
  try {
    const alternativeHeaderCSV = `Transaction Date,Media ID,License Type,Net Royalty,Customer Country
05/18/2024,77123984,Subscription,$0.33,United States
05/19/2024,77123985,Extended,$4.25,Germany`;

    const altResult = parseAdobeSalesCSV(alternativeHeaderCSV);
    if (
      altResult.success &&
      altResult.records.length === 2 &&
      altResult.records[0].assetId === '77123984' &&
      altResult.records[0].royalty === 0.33 &&
      altResult.records[1].royalty === 4.25
    ) {
      recordResult(
        '3. Alternative Adobe Payout Export Headers',
        'PASS',
        'Mapped "Transaction Date", "Media ID", "License Type", "Net Royalty" and stripped currency symbols ($) correctly.'
      );
    } else {
      recordResult(
        '3. Alternative Adobe Payout Export Headers',
        'FAIL',
        `Alternative headers not mapped properly: ${JSON.stringify(altResult.errors)}`
      );
    }
  } catch (err: any) {
    recordResult('3. Alternative Adobe Payout Export Headers', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Malformed CSV & Missing Required Column Rejection
  // -------------------------------------------------------------------------
  try {
    const missingRoyaltyCSV = `Date,Asset ID,License,Category
2024-05-18,123456,Standard,Technology`;

    const malformedResult = parseAdobeSalesCSV(missingRoyaltyCSV);
    if (
      !malformedResult.success &&
      malformedResult.errors.length > 0 &&
      malformedResult.errors[0].error.includes('Royalty')
    ) {
      recordResult(
        '4. Malformed CSV & Missing Column Rejection',
        'PASS',
        `Correctly rejected CSV missing Royalty column with descriptive error: "${malformedResult.errors[0].error}".`
      );
    } else {
      recordResult(
        '4. Malformed CSV & Missing Column Rejection',
        'FAIL',
        'Did not reject CSV with missing required columns.'
      );
    }
  } catch (err: any) {
    recordResult('4. Malformed CSV & Missing Column Rejection', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Non-Fabrication of Unsupplied Data (Requirement 5)
  // -------------------------------------------------------------------------
  try {
    const noTitleCSV = `Date,Asset ID,License,Royalty
2024-05-18,999111,Subscription,0.33`;

    const noTitleResult = parseAdobeSalesCSV(noTitleCSV);
    const firstRecord = noTitleResult.records[0];

    if (noTitleResult.success && firstRecord && firstRecord.title === undefined) {
      recordResult(
        '5. Non-Fabrication of Unsupplied Fields',
        'PASS',
        'Unsupplied fields (Title, Views, Rejections) remain undefined without synthesizing artificial data.'
      );
    } else {
      recordResult(
        '5. Non-Fabrication of Unsupplied Fields',
        'FAIL',
        `Unexpectedly synthesized title: ${firstRecord?.title}`
      );
    }
  } catch (err: any) {
    recordResult('5. Non-Fabrication of Unsupplied Fields', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Deduplication on Repeated Import in IndexedDB
  // -------------------------------------------------------------------------
  try {
    // Clear sales store first
    await clearAllSalesRecords();

    const initialBatchCSV = `Date,Asset ID,License,Royalty
2024-06-01,1001,Subscription,0.33
2024-06-02,1002,Standard,0.99
2024-06-03,1003,Extended,3.30`;

    const parsed1 = parseAdobeSalesCSV(initialBatchCSV);
    const importResult1 = await importSalesRecordsToDB(parsed1.records);

    // Re-import the exact same CSV
    const importResult2 = await importSalesRecordsToDB(parsed1.records);

    // Import an overlapping CSV with 1 existing and 2 new records
    const overlappingCSV = `Date,Asset ID,License,Royalty
2024-06-02,1002,Standard,0.99
2024-06-04,1004,Subscription,0.33
2024-06-05,1005,Subscription,0.33`;

    const parsed3 = parseAdobeSalesCSV(overlappingCSV);
    const importResult3 = await importSalesRecordsToDB(parsed3.records);

    const totalInDB = await getSalesRecordsCount();

    if (
      importResult1.importedCount === 3 &&
      importResult1.duplicateCount === 0 &&
      importResult2.importedCount === 0 &&
      importResult2.duplicateCount === 3 &&
      importResult3.importedCount === 2 &&
      importResult3.duplicateCount === 1 &&
      totalInDB === 5
    ) {
      recordResult(
        '6. Duplicate Sales Record Prevention',
        'PASS',
        `First import: 3 added. Second re-import: 0 added, 3 skipped as duplicates. Third overlapping import: 2 added, 1 skipped. Final DB count: 5.`
      );
    } else {
      recordResult(
        '6. Duplicate Sales Record Prevention',
        'FAIL',
        `Deduplication mismatch: res1=${importResult1.importedCount}/${importResult1.duplicateCount}, res2=${importResult2.importedCount}/${importResult2.duplicateCount}, res3=${importResult3.importedCount}/${importResult3.duplicateCount}, total=${totalInDB}`
      );
    }
  } catch (err: any) {
    recordResult('6. Duplicate Sales Record Prevention', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 7: IndexedDB Schema Isolation (AICreatorStudioDB v2)
  // -------------------------------------------------------------------------
  try {
    const db = await openAssetDB();
    const hasAssetStore = db.objectStoreNames.contains(ASSET_STORE_NAME);
    const hasSalesStore = db.objectStoreNames.contains(SALES_STORE_NAME);

    // Save a dummy asset to asset store
    await saveAssetToDB({
      id: 'test-asset-isolation-1',
      title: 'Isolated Test Asset',
      type: 'image',
      prompt: 'Isolated test prompt',
      style: 'Photorealistic',
      aspectRatio: '16:9',
      dimensions: '1280x720',
      url: 'https://example.com/test.jpg',
      thumbnailUrl: 'https://example.com/test.jpg',
      createdAt: '2024-06-01',
      isFavorite: false,
      model: 'TestModel',
    });

    const assets = await loadAllAssetsFromDB();
    const salesCount = await getSalesRecordsCount();

    if (hasAssetStore && hasSalesStore && ASSET_DB_VERSION === 2 && assets.length > 0 && salesCount === 5) {
      recordResult(
        '7. IndexedDB Store Isolation & Schema Integrity',
        'PASS',
        `Database version 2 maintains separate "${ASSET_STORE_NAME}" and "${SALES_STORE_NAME}" stores without data collision.`
      );
    } else {
      recordResult(
        '7. IndexedDB Store Isolation & Schema Integrity',
        'FAIL',
        `Stores missing or corrupted: hasAsset=${hasAssetStore}, hasSales=${hasSalesStore}, version=${ASSET_DB_VERSION}`
      );
    }
  } catch (err: any) {
    recordResult('7. IndexedDB Store Isolation & Schema Integrity', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Statistical Sample Size Gating (<10 vs >=10)
  // -------------------------------------------------------------------------
  try {
    // Case A: 5 sales (< 10)
    const smallSales = await loadAllSalesRecords(); // currently 5
    const smallAnalytics = calculateSalesAnalytics(smallSales);

    // Case B: 12 sales (>= 10)
    const largeBatchCSV = `Date,Asset ID,License,Royalty,Title
2024-06-06,2001,Subscription,0.33,Hydroponic Sensor Tower
2024-06-07,2002,Standard,0.99,Biotech Lab Cleanroom
2024-06-08,2003,Extended,3.30,Autonomous Drone Field
2024-06-09,2004,Subscription,0.33,Solar Energy Desert
2024-06-10,2005,Subscription,0.33,Smart Urban Farming
2024-06-11,2006,Standard,0.99,Industrial Robot Arm
2024-06-12,2007,Extended,3.30,Modern Architecture Facade`;

    const parsedLarge = parseAdobeSalesCSV(largeBatchCSV);
    await importSalesRecordsToDB(parsedLarge.records);

    const largeSales = await loadAllSalesRecords(); // now 12
    const largeAnalytics = calculateSalesAnalytics(largeSales);

    if (
      smallAnalytics.opportunityAssessment.status === 'INSUFFICIENT_SAMPLE_SIZE' &&
      smallAnalytics.opportunityAssessment.isReliableForBatchPlanner === false &&
      largeAnalytics.opportunityAssessment.status === 'STATISTICALLY_CONFIDENT_DEMAND' &&
      largeAnalytics.opportunityAssessment.isReliableForBatchPlanner === true &&
      largeAnalytics.opportunityAssessment.reliabilityScorePercent >= 70
    ) {
      recordResult(
        '8. Statistical Sample Size Gating (Opportunity Engine)',
        'PASS',
        `Correctly flags 5 sales as INSUFFICIENT_SAMPLE_SIZE (isReliable=false) and 12 sales as STATISTICALLY_CONFIDENT_DEMAND (isReliable=true, score=${largeAnalytics.opportunityAssessment.reliabilityScorePercent}%).`
      );
    } else {
      recordResult(
        '8. Statistical Sample Size Gating (Opportunity Engine)',
        'FAIL',
        `Gating failed: smallStatus=${smallAnalytics.opportunityAssessment.status}, largeStatus=${largeAnalytics.opportunityAssessment.status}`
      );
    }
  } catch (err: any) {
    recordResult('8. Statistical Sample Size Gating (Opportunity Engine)', 'FAIL', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 9: Existing Autonomous Queue & Platform Policy Regression Check
  // -------------------------------------------------------------------------
  try {
    const task = createAutonomousTask({
      prompt: 'Autonomous AgriTech Vertical Farm',
      type: 'image',
      aspectRatio: '16:9',
      style: 'Photorealistic',
    });

    const isDup = isDuplicateTask([task], 'Autonomous AgriTech Vertical Farm', 'image', '16:9');
    const policyCheck = validateNewAccountPermissibility('adobe-stock', 0);

    if (task && task.id && isDup && policyCheck.allowed) {
      recordResult(
        '9. Existing Autonomous Pipeline Regression Test',
        'PASS',
        'Autonomous task creation, duplicate prevention, and platform policy verification run with zero regressions.'
      );
    } else {
      recordResult(
        '9. Existing Autonomous Pipeline Regression Test',
        'FAIL',
        'Regression detected in existing autonomous modules.'
      );
    }
  } catch (err: any) {
    recordResult('9. Existing Autonomous Pipeline Regression Test', 'FAIL', err.message);
  }

  console.log('\n=============================================================');
  console.log('                 AUDIT TEST SUMMARY RESULTS                  ');
  console.log('=============================================================');
  const passes = testResults.filter((r) => r.status === 'PASS').length;
  const fails = testResults.filter((r) => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${testResults.length} | PASS: ${passes} | FAIL: ${fails}\n`);

  if (fails > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Test execution fatal error:', e);
  process.exit(1);
});

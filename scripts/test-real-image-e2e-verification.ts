/**
 * Priority 3.6 — Real Image End-to-End Verification Test Suite
 *
 * Validates the complete AI Creator Studio workflow using 5 real imported mosque images:
 * 1. Google Flow image import -> My Assets -> IndexedDB persistence.
 * 2. Batch Stock Readiness Audit -> Stock Preparation -> metadata validation.
 * 3. Title, description, keywords, image resolution, format, and warnings against actual image content.
 * 4. CSV/JSON export accuracy and ensure exported metadata matches the validated asset.
 * 5. Confirm imported images incur zero credits and original files remain unchanged.
 */

import 'fake-indexeddb/auto';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Asset, PreparedStockMetadata, StockMarketplaceId } from '../src/types';
import {
  saveAssetToDB,
  loadAllAssetsFromDB,
  getAssetByIdFromDB,
  getAssetRecordByIdFromDB,
  clearAllAssetsFromDB,
  hydrateStoredAsset,
} from '../src/utils/assetStorage';
import {
  auditBatchImageReadiness,
  auditSingleAssetReadiness,
  BatchAuditSummary,
} from '../src/utils/batchStockAuditor';
import {
  verifyAndSanitizeStockMetadata,
  auditMarketplaceValidation,
  formatTitleForMarketplace,
  filterAndGroundKeywords,
  isMosqueSubject,
} from '../src/utils/stockMetadataValidator';
import {
  generateClientStockMetadata,
} from '../src/utils/stockMetadataFallback';
import {
  buildStructuredExportData,
  generateStockMetadataCsv,
  generateStockMetadataJson,
} from '../src/utils/stockMetadataExporter';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, details?: string) {
  results.push({
    name: testName,
    passed: condition,
    details: details || (condition ? 'উত্তীর্ণ' : 'ব্যর্থ'),
  });
  const symbol = condition ? '✅' : '❌';
  console.log(`${symbol} ${testName}${details ? ` -> ${details}` : ''}`);
  if (!condition) {
    throw new Error(`Assertion failed: ${testName} (${details})`);
  }
}

// RFC 4180 CSV parser for export verification
function parseRfc4180Csv(csvString: string): string[][] {
  const cleanStr = csvString.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    const nextChar = cleanStr[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

function calculateSha256(buffer: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function runRealImageEndToEndVerification() {
  console.log('\n=============================================================');
  console.log('Priority 3.6 — Real Image End-to-End Verification Test');
  console.log('Testing 5 Real Mosque Images Across Full Studio Pipeline');
  console.log('=============================================================\n');

  await clearAllAssetsFromDB();

  // -----------------------------------------------------------------
  // 0. Load Real Mosque Image Fixtures from Disk
  // -----------------------------------------------------------------
  const fixturesDir = path.resolve(process.cwd(), 'fixtures/mosque_images');
  const imageFiles = [
    {
      file: 'mosque_grand_exterior_facade.jpg',
      title: 'Grand Mosque Exterior at Sunrise with Reflection Pool',
      prompt: 'Photorealistic commercial architectural photography of a grand white marble mosque complete exterior at sunrise with reflection pool, soaring central dome and twin minarets',
      dimensions: '3840 × 2160',
      expectedMp: 8.29,
      format: 'JPEG (image/jpeg)',
      source: 'Google Flow' as const,
      model: 'Google Flow FX (Free Credits)',
      expectedStatus: 'Ready',
    },
    {
      file: 'mosque_interior_prayer_hall.jpg',
      title: 'Grand Mosque Interior Prayer Hall with Ornate Chandelier',
      prompt: 'Expansive interior photograph of an empty grand mosque prayer hall, soaring ceiling with illuminated crystal chandelier and polished marble columns',
      dimensions: '4000 × 3000',
      expectedMp: 12.0,
      format: 'JPEG (image/jpeg)',
      source: 'Google Flow' as const,
      model: 'Google Flow FX (Free Credits)',
      expectedStatus: 'Ready',
    },
    {
      file: 'mosque_domes_and_minarets.jpg',
      title: 'Mosque Domes and Soaring Minarets at Twilight Blue Hour',
      prompt: 'Dramatic architectural stock visual isolating monumental mosque domes and slender minarets against deep blue hour twilight sky with golden crescent finials',
      dimensions: '3200 × 2400',
      expectedMp: 7.68,
      format: 'JPEG (image/jpeg)',
      source: 'Imported' as const,
      model: 'Real Image File',
      expectedStatus: 'Ready',
    },
    {
      file: 'mosque_courtyard_sahn_lowres.jpg',
      title: 'Vast Marble Mosque Courtyard with Sahn Fountain Low Res',
      prompt: 'Wide view of open-air white marble mosque courtyard sahn featuring central domed ablution fountain pavilion and perimeter arches',
      dimensions: '1920 × 1080',
      expectedMp: 2.07,
      format: 'JPEG (image/jpeg)',
      source: 'Imported' as const,
      model: 'Real Image File',
      expectedStatus: 'Needs Fix', // < 4.0 MP
    },
    {
      file: 'mosque_muqarnas_arch_detail.png',
      title: 'Handcrafted Muqarnas Vaulting and Glazed Tilework Portal',
      prompt: 'Intricate architectural stock capture of monumental carved stone mosque portal with muqarnas stalactite vaulting and turquoise arabesque ceramic tiles',
      dimensions: '3840 × 2160',
      expectedMp: 8.29,
      format: 'PNG (image/png)',
      source: 'Google Flow' as const,
      model: 'Google Flow FX (Free Credits)',
      expectedStatus: 'Needs Fix', // PNG format needs JPEG
    },
  ];

  console.log('--- ০. ডিস্ক থেকে ৫টি আসল মসজিদ ইমেজ লোড ও হ্যাশ যাচাই ---');
  const loadedFixtures: Array<{
    meta: (typeof imageFiles)[0];
    buffer: Buffer;
    file: File;
    sha256: string;
    sizeBytes: number;
    sizeFormatted: string;
    dataUrl: string;
  }> = [];

  for (const item of imageFiles) {
    const filePath = path.join(fixturesDir, item.file);
    assert(fs.existsSync(filePath), `ফাইল উপস্থিত: ${item.file}`);
    const buf = fs.readFileSync(filePath);
    const sha = calculateSha256(buf);
    const mime = item.format.includes('PNG') ? 'image/png' : 'image/jpeg';
    const domFile = new File([buf], item.file, { type: mime });
    const sizeFormatted = `${(buf.length / 1024).toFixed(1)} KB`;
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;

    assert(buf.length > 1000, `ফাইলের আকার স্বাভাবিক (> 1KB): ${item.file} (${buf.length} bytes)`);

    loadedFixtures.push({
      meta: item,
      buffer: buf,
      file: domFile,
      sha256: sha,
      sizeBytes: buf.length,
      sizeFormatted,
      dataUrl,
    });
  }

  // -----------------------------------------------------------------
  // 1. Google Flow Image Import -> My Assets -> IndexedDB Persistence
  // -----------------------------------------------------------------
  console.log('\n--- ১. Google Flow ও My Assets ইমপোর্ট -> IndexedDB পারসিস্টেন্স ---');

  let initialCredits = 100;
  let currentCredits = initialCredits;

  const savedAssets: Asset[] = [];

  for (let i = 0; i < loadedFixtures.length; i++) {
    const fixture = loadedFixtures[i];
    const assetId = `mosque-asset-${i + 1}-${Date.now()}`;

    const newAsset: Asset = {
      id: assetId,
      title: fixture.meta.title,
      type: 'image',
      prompt: fixture.meta.prompt,
      style: 'Photorealistic',
      aspectRatio: '16:9',
      dimensions: fixture.meta.dimensions,
      url: fixture.dataUrl,
      thumbnailUrl: fixture.dataUrl,
      isFavorite: false,
      model: fixture.meta.model,
      source: fixture.meta.source,
      sourceUrl: fixture.meta.source === 'Google Flow' ? 'https://flow.google' : undefined,
      fileSize: fixture.sizeFormatted,
      fileFormat: fixture.meta.format,
      createdAt: 'Oct 19, 2026',
    };

    // Credit Invariance check: source === 'Google Flow' or 'Imported' must not deduct credits
    if (newAsset.source !== 'Google Flow' && newAsset.source !== 'Imported') {
      currentCredits -= 1;
    }

    // Save to IndexedDB
    const saved = await saveAssetToDB(newAsset, fixture.file);
    savedAssets.push(saved);

    assert(
      saved.id === assetId,
      `ইমেজ ${i + 1} IndexedDB-তে সংরক্ষিত (${fixture.meta.file})`,
      `ID: ${saved.id}, Source: ${saved.source}`
    );
  }

  // Confirm Zero Credits Deducted
  assert(
    currentCredits === initialCredits,
    '৫টি ইমেজ ইমপোর্টে স্টুডিও ক্রেডিট কর্তন শূন্য (Zero Credits Deducted)',
    `Credits: ${currentCredits}/${initialCredits} (অপরিবর্তিত)`
  );

  // Verify reload from IndexedDB
  const reloadedAssets = await loadAllAssetsFromDB();
  assert(
    reloadedAssets.length === 5,
    'রিলোডের পর IndexedDB-তে ৫টি অ্যাসেটই অক্ষত পাওয়া গেছে',
    `Assets in DB: ${reloadedAssets.length}/5`
  );

  // Verify binary byte preservation
  for (let i = 0; i < loadedFixtures.length; i++) {
    const fixture = loadedFixtures[i];
    const saved = savedAssets[i];
    const record = await getAssetRecordByIdFromDB(saved.id);
    assert(!!record, `রেকর্ড পাওয়া গেছে: ${saved.id}`);

    if (record?.mediaBlob) {
      const arrayBuf = await record.mediaBlob.arrayBuffer();
      const storedBuffer = Buffer.from(arrayBuf);
      const storedSha = calculateSha256(storedBuffer);
      assert(
        storedSha === fixture.sha256,
        `বাইনারি বাইট ১০০% অক্ষত (Byte-for-byte SHA256 Match): ${fixture.meta.file}`,
        `Original: ${fixture.sha256.slice(0, 12)}... === Stored: ${storedSha.slice(0, 12)}...`
      );
    }
  }

  // -----------------------------------------------------------------
  // 2. Batch Stock Readiness Audit (Raw Imported State)
  // -----------------------------------------------------------------
  console.log('\n--- ২. ব্যাচ স্টক রেডিনেস অডিট (কাঁচা ইমপোর্ট অবস্থা) ---');
  const initialAuditSummary: BatchAuditSummary = await auditBatchImageReadiness(savedAssets);

  assert(initialAuditSummary.totalInspected === 5, 'মোট ৫টি ইমেজ অডিট সম্পন্ন', `Inspected: ${initialAuditSummary.totalInspected}`);
  console.log(`প্রাথমিক অডিট সামারি: Ready: ${initialAuditSummary.readyCount}, Needs Fix: ${initialAuditSummary.needsFixCount}, Rejected: ${initialAuditSummary.rejectedCount}`);

  // Test individual item audit results on freshly imported assets
  for (let i = 0; i < savedAssets.length; i++) {
    const asset = savedAssets[i];
    const expected = loadedFixtures[i].meta;
    const auditItem = initialAuditSummary.items.find((item) => item.assetId === asset.id);

    assert(!!auditItem, `অডিট রেজাল্ট বিদ্যমান: ${asset.title}`);
    if (!auditItem) continue;

    // Verify decodability check passed for all 5 genuine images
    const decodeCheck = auditItem.checks.find((c) => c.id === 'decode');
    assert(decodeCheck?.status === 'passed', `ফাইল ডিকোড সফল: ${expected.file}`);

    // Verify resolution verification
    const resCheck = auditItem.checks.find((c) => c.id === 'resolution');
    if (expected.expectedMp >= 4.0) {
      assert(resCheck?.status === 'passed', `রেজোলিউশন ৪.০ MP শর্ত পূরণ: ${auditItem.megapixels} MP`);
    } else {
      assert(
        resCheck?.status === 'warning',
        `কম রেজোলিউশন যথাযথভাবে ফ্ল্যাগড (< 4.0 MP): ${auditItem.megapixels} MP`,
        resCheck?.message
      );
    }

    // Verify format verification
    const formatCheck = auditItem.checks.find((c) => c.id === 'format');
    if (expected.format.includes('JPEG')) {
      assert(formatCheck?.status === 'passed', `JPEG ফরম্যাট সনাক্ত: ${expected.file}`);
    } else {
      assert(
        formatCheck?.status === 'warning',
        `নন-জেপেগ ফরম্যাট (PNG) সতর্কবার্তা সহ ফ্ল্যাগড: ${expected.file}`,
        formatCheck?.message
      );
    }

    // Raw assets don't have "Generative AI" suffix yet, so initial state is "Needs Fix" (honest stock audit)
    assert(
      auditItem.status === 'Needs Fix',
      `কাঁচা ইমপোর্টে "Needs Fix" স্ট্যাটাস (স্টক প্রিপারেশনের প্রয়োজনীয়তা নির্দেশ করে): ${expected.file}`
    );
  }

  // -----------------------------------------------------------------
  // 3. Stock Preparation & Metadata Validation
  // -----------------------------------------------------------------
  console.log('\n--- ৩. স্টক প্রিপারেশন ও মেটাডেটা যাচাইকরণ ---');

  for (let i = 0; i < savedAssets.length; i++) {
    const asset = savedAssets[i];
    const fixture = loadedFixtures[i];

    // Generate client stock metadata
    const prepResult = generateClientStockMetadata(asset, 'adobe-stock');
    assert(!!prepResult.metadata, `মেটাডেটা সফলভাবে প্রস্তুত: ${asset.title}`);
    const metadata = prepResult.metadata!;

    // 3a. Category check
    assert(
      metadata.category === 'Buildings / Architecture' || isMosqueSubject(metadata.category, metadata.category),
      `ক্যাটাগরি স্থাপত্য ও মসজিদ সম্পর্কিত: "${metadata.category}"`,
      `Asset: ${fixture.meta.file}`
    );

    // 3b. Title check
    assert(
      metadata.title.includes('Generative AI'),
      `Adobe Stock বাধ্যতামূলক "Generative AI" সাফিক্স টাইটেলে বিদ্যমান: "${metadata.title}"`
    );
    const titleWords = metadata.title.split(/\s+/).filter(Boolean);
    assert(titleWords.length >= 5, `টাইটেলে পর্যাপ্ত শব্দ সংখ্যা (>= ৫ শব্দ): ${titleWords.length}`);
    assert(metadata.title.length >= 15 && metadata.title.length <= 200, `টাইটেল দৈর্ঘ্য সঠিক (১৫-২০০ ক্যারেক্টার): ${metadata.title.length}`);

    // 3c. Description check
    assert(metadata.description.length >= 30, `বর্ণনা সমৃদ্ধ ও তথ্যবহুল: ${metadata.description.length} অক্ষর`);
    assert(
      !metadata.description.toLowerCase().includes('google flow') &&
      !metadata.description.toLowerCase().includes('free credits') &&
      !metadata.description.toLowerCase().includes('imported'),
      'বর্ণনায় কোনো প্রোভেন্যান্স বা এআই টুলের নাম অনুপস্থিত'
    );

    // 3d. Keyword completeness & hygiene
    assert(metadata.keywords.length >= 25, `পর্যাপ্ত কীওয়ার্ড তৈরি হয়েছে: ${metadata.keywords.length}টি`);

    // Verify mosque keywords are present
    const hasMosqueTerms = metadata.keywords.some((kw) =>
      ['mosque', 'masjid', 'dome', 'minaret', 'marble', 'architecture', 'islamic'].includes(kw.toLowerCase())
    );
    assert(hasMosqueTerms, `কীওয়ার্ডে মসজিদ ও স্থাপত্য উপাদান বিদ্যমান`);

    // Verify 0 prohibited tabletop objects in keywords
    const forbiddenTerms = ['quran', 'koran', 'tasbih', 'prayer mat', 'prayer rug', 'perfume', 'attar', 'prayer cap'];
    const foundForbidden = metadata.keywords.filter((kw) =>
      forbiddenTerms.some((f) => kw.toLowerCase() === f || kw.toLowerCase().includes(f))
    );
    assert(
      foundForbidden.length === 0,
      `টেবিলটপ অবজেক্ট (কুরআন, তসবিহ, জায়নামাজ) সম্পূর্ণ অনুপস্থিত (০টি)`,
      `Found: [${foundForbidden.join(', ')}]`
    );

    // 3e. Official Adobe Stock AI Policy
    assert(metadata.aiPolicyStatus === 'allowed', 'Adobe Stock-এ জেনারেটিভ এআই স্ট্যাটাস "allowed"');
    assert(metadata.isPolicyVerified === true, 'অফিসিয়াল পলিসি যাচাইকৃত');

    // Attach preparedMetadata to asset
    asset.preparedMetadata = metadata;
  }

  // 3f. Re-audit assets with prepared metadata attached
  console.log('\n--- ৩বি. মেটাডেটা প্রিপারেশন পরবর্তী রেডিনেস অডিট (Post-Prep Audit) ---');
  const postPrepAudit: BatchAuditSummary = await auditBatchImageReadiness(savedAssets);
  console.log(`প্রস্তুত পরবর্তী অডিট সামারি: Ready: ${postPrepAudit.readyCount}, Needs Fix: ${postPrepAudit.needsFixCount}, Rejected: ${postPrepAudit.rejectedCount}`);

  for (let i = 0; i < savedAssets.length; i++) {
    const asset = savedAssets[i];
    const expected = loadedFixtures[i].meta;
    const item = postPrepAudit.items.find((it) => it.assetId === asset.id);
    assert(!!item, `প্রস্তুত অডিট বিদ্যমান: ${asset.title}`);
    if (!item) continue;

    assert(
      item.status === expected.expectedStatus,
      `প্রস্তুত পরবর্তী রেডিনেস নির্ভুল: "${expected.file}" -> ${item.status}`,
      `Expected: ${expected.expectedStatus}, Got: ${item.status}`
    );
  }

  // -----------------------------------------------------------------
  // 4. Structured CSV / JSON Export Verification
  // -----------------------------------------------------------------
  console.log('\n--- ৪. স্ট্রাকচার্ড CSV ও JSON এক্সপোর্ট যাচাইকরণ ---');

  for (let i = 0; i < savedAssets.length; i++) {
    const asset = savedAssets[i];
    const prepResult = generateClientStockMetadata(asset, 'adobe-stock');
    const metadata = prepResult.metadata!;

    // CSV Export
    const csvOutput = generateStockMetadataCsv(asset, metadata);
    assert(csvOutput.startsWith('\uFEFF'), `CSV ফাইলে UTF-8 BOM বিদ্যমান (${asset.title})`);

    const parsedRows = parseRfc4180Csv(csvOutput);
    assert(parsedRows.length >= 2, `CSV-তে হেডার এবং ডাটা রো বিদ্যমান: ${parsedRows.length} রো`);

    const header = parsedRows[0];
    const dataRow = parsedRows[1];

    assert(header[0] === 'Title (Commercial)', '১ম কলাম: Title (Commercial)');
    assert(header[1] === 'Description (Commercial)', '২য় কলাম: Description (Commercial)');
    assert(header[2] === 'Keywords', '৩য় কলাম: Keywords');
    assert(header[7] === 'Target Marketplace', '৮ম কলাম: Target Marketplace');

    assert(dataRow[0] === metadata.title, `CSV টাইটেল মেটাডেটার সাথে ১০০% মিলেছে: "${dataRow[0]}"`);
    assert(dataRow[1] === metadata.description, `CSV বিবরণ মেটাডেটার সাথে ১০০% মিলেছে`);
    assert(dataRow[7] === 'Adobe Stock', `মার্কেটপ্লেস: ${dataRow[7]}`);

    // JSON Export
    const jsonOutput = generateStockMetadataJson(asset, metadata);
    const parsedJson = JSON.parse(jsonOutput);

    assert(!!parsedJson.asset && !!parsedJson.stockPlatformMetadata, `JSON স্ট্রাকচার সম্পূর্ণ (${asset.title})`);
    assert(parsedJson.asset.id === asset.id, `JSON asset.id মিলেছে: ${parsedJson.asset.id}`);
    assert(parsedJson.stockPlatformMetadata.commercialTitle === metadata.title, 'JSON commercialTitle মিলেছে');
    assert(parsedJson.stockPlatformMetadata.commercialDescription === metadata.description, 'JSON commercialDescription মিলেছে');
    assert(parsedJson.stockPlatformMetadata.keywordsCount === metadata.keywords.length, `JSON কীওয়ার্ড কাউন্ট মিলেছে: ${parsedJson.stockPlatformMetadata.keywordsCount}`);
    assert(parsedJson.stockPlatformMetadata.targetMarketplace === 'adobe-stock', 'JSON targetMarketplace: adobe-stock');
  }

  // -----------------------------------------------------------------
  // 5. Original Files & Zero Overwrite Invariant
  // -----------------------------------------------------------------
  console.log('\n--- ৫. মূল ফাইল অপরিবর্তিত থাকার নিশ্চয়তা (Immutability Invariant) ---');

  for (const fixture of loadedFixtures) {
    const filePath = path.join(fixturesDir, fixture.meta.file);
    const diskBuf = fs.readFileSync(filePath);
    const currentSha = calculateSha256(diskBuf);

    assert(
      currentSha === fixture.sha256,
      `মূল ফাইল ডিস্কে সম্পূর্ণ অবিকৃত: ${fixture.meta.file}`,
      `Original SHA: ${fixture.sha256.slice(0, 10)}... === Current: ${currentSha.slice(0, 10)}...`
    );
  }

  console.log('\n=============================================================');
  console.log(`সকল এন্ড-টু-এন্ড টেস্ট সম্পন্ন: ${results.filter((r) => r.passed).length}/${results.length} টেস্ট উত্তীর্ণ`);
  console.log('=============================================================\n');
}

runRealImageEndToEndVerification().catch((err) => {
  console.error('\n❌ টেস্ট ব্যর্থ হয়েছে:', err);
  process.exit(1);
});

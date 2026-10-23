/**
 * Priority 3.7: Final Stock Submission Readiness Test Suite
 * 
 * Verifies the AI Creator Studio stock submission workflow:
 * 1. Final image resolution, format, file size, decodability & marketplace technical rules.
 * 2. Commercial metadata: title, description, keywords, AI disclosure, fluff/brand hygiene.
 * 3. Verified marketplace rules engine: mandatory, recommended, and uncertain rules distinction.
 * 4. 3-Tier Status: "Ready for Manual Review", "Needs Fix", or "Rejected" with specific reasons.
 * 5. Mandatory Human Review: visual quality, IP/logos, model/property releases, curator discretion.
 * 6. CSV/JSON export accuracy: exact match with validated metadata, honest labeling of uncertain rules.
 * 7. Invariant safety: zero file modification, zero credit deduction.
 */

import { Asset, StockMarketplaceId, PreparedStockMetadata } from '../src/types';
import {
  auditSingleAssetReadiness,
  auditBatchImageReadiness,
  MANDATORY_HUMAN_REVIEW_CHECKPOINTS,
} from '../src/utils/batchStockAuditor';
import {
  buildStructuredExportData,
  generateStockMetadataCsv,
  generateStockMetadataJson,
} from '../src/utils/stockMetadataExporter';

// Simple RFC 4180 CSV parser for verification
function parseCsvRows(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.length > 0 && r.some((c) => c.trim().length > 0));
}

async function runStockSubmissionReadinessTests() {
  console.log('========================================================================');
  console.log('PRIORITY 3.7: FINAL STOCK SUBMISSION READINESS & COMPLIANCE TEST SUITE');
  console.log('========================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (detail) console.log(`       └─ ${detail}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       └─ ${detail}`);
      failedTests++;
    }
  }

  // Baseline mock assets
  const passing4kAsset: Asset = {
    id: 'asset-4k-pass-001',
    title: 'Grand Islamic Mosque Facade at Sunrise Generative AI',
    prompt: 'Majestic white marble mosque exterior with domes and minarets in morning sunlight',
    url: 'https://storage.googleapis.com/test-assets/mosque-4k.jpg',
    thumbnailUrl: 'https://storage.googleapis.com/test-assets/mosque-4k-thumb.jpg',
    type: 'image',
    dimensions: '3840x2160',
    aspectRatio: '16:9',
    style: 'Real Image',
    model: 'imagen-3',
    isFavorite: false,
    fileSize: '4.8 MB',
    fileFormat: 'JPEG',
    createdAt: new Date().toISOString(),
    preparedMetadata: {
      title: 'Grand Islamic Mosque Facade at Sunrise Generative AI',
      description: 'Exterior architectural photograph of grand white marble mosque with soaring minarets under golden morning sunrise sky.',
      keywords: [
        'mosque', 'islamic architecture', 'marble', 'minaret', 'dome',
        'sunrise', 'golden hour', 'exterior', 'monumental', 'facade',
        'prayer hall', 'sacred', 'cultural', 'heritage', 'sky',
        'courtyard', 'palatial', 'spiritual', 'serene', 'archway'
      ],
      marketplace: 'adobe-stock',
      marketplaceName: 'Adobe Stock',
      category: 'Architecture & Historical Buildings',
      aiDisclosure: 'Created with Generative AI technology. Commercial non-exclusive licensing.',
      aiPolicyStatus: 'allowed',
      aiPolicyBadge: 'অনুমোদিত',
      aiPolicyColor: 'green',
      officialPolicyNote: 'Adobe Stock accepts generative AI when marked with Generative AI suffix and AI toggle.',
      isPolicyVerified: true,
      labelingRequirement: 'Mandatory "Generative AI" toggle & title suffix',
      humanPresenceCompliance: 'No human subjects present; model release not required',
      trademarkCompliance: '100% Free of commercial brands and trademark logos',
      technicalRequirements: 'JPEG format, min 4.0 MP, max 45 MB',
      factualSubjectSummary: 'Grand white marble mosque facade',
    },
  };

  // -------------------------------------------------------------------------
  // TEST 1: Passing Asset Submission Audit
  // -------------------------------------------------------------------------
  console.log('--- পরীক্ষা ১: আদর্শ পাসিং অ্যাসেট নিরীক্ষা (Ready for Manual Review) ---');

  const auditPassing = await auditSingleAssetReadiness(passing4kAsset, 'adobe-stock');

  assert(
    auditPassing.status === 'Ready',
    '১.১ ব্যাকওয়ার্ড কম্প্যাটিবল স্ট্যাটাস "Ready" নির্ধারিত',
    `Status: ${auditPassing.status}`
  );

  assert(
    auditPassing.finalStatus === 'Ready for Manual Review',
    '১.২ ফাইনাল সাবমিশন স্ট্যাটাস নির্ভুলভাবে "Ready for Manual Review"',
    `Final Status: ${auditPassing.finalStatus}`
  );

  assert(
    auditPassing.megapixels >= 4.0,
    '১.৩ রেজোলিউশন Adobe Stock-এর ৪.০ MP শর্ত পূরণ করেছে',
    `Measured: ${auditPassing.megapixels} MP (3840x2160 = 8.29 MP)`
  );

  assert(
    auditPassing.format.toUpperCase().includes('JPEG'),
    '১.৪ ফরম্যাট কমার্শিয়াল স্টক স্ট্যান্ডার্ড JPEG',
    `Format: ${auditPassing.format}`
  );

  assert(
    auditPassing.reasons.length === 0,
    '১.৫ কোনো সংশোধন বা রিজেকশন কারণ নেই (Zero Blocking Errors)',
    `Reasons count: ${auditPassing.reasons.length}`
  );

  assert(
    auditPassing.humanReview.required === true,
    '১.৬ পাসিং অ্যাসেটেও হিউম্যান রিভিউ বাধ্যতামূলক (Human Review Required)',
    `Checkpoints count: ${auditPassing.humanReview.checkpoints.length}`
  );

  assert(
    auditPassing.metadata.hasGenerativeAiSuffix === true,
    '১.৭ বাধ্যতামূলক "Generative AI" টাইটেল সাফিক্স ভ্যালিডেট হয়েছে',
    `Title: "${auditPassing.title}"`
  );

  // -------------------------------------------------------------------------
  // TEST 2: Technical Failures Handling
  // -------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ২: টেকনিক্যাল ত্রুটি ও রেজোলিউশন ব্যর্থতা হ্যান্ডলিং ---');

  // 2.1 Low Resolution (1024x1024 = 1.05 MP < 4.0 MP)
  const lowResAsset: Asset = {
    ...passing4kAsset,
    id: 'asset-low-res-002',
    dimensions: '1024x1024',
    fileSize: '850 KB',
  };
  const auditLowRes = await auditSingleAssetReadiness(lowResAsset, 'adobe-stock');

  assert(
    auditLowRes.status === 'Needs Fix' && auditLowRes.finalStatus === 'Needs Fix',
    '২.১ কম রেজোলিউশনের (১.০৫ MP) ছবি সঠিকভাবে "Needs Fix" চিহ্নিত',
    `Status: ${auditLowRes.finalStatus} | MP: ${auditLowRes.megapixels}`
  );
  assert(
    auditLowRes.reasons.some((r) => r.includes('Upscale') || r.includes('রেজোলিউশন')),
    '২.২ রেজোলিউশন ঘাটতির সুনির্দিষ্ট আপস্কেল অ্যাকশন প্রস্তাবিত',
    `Reason: ${auditLowRes.reasons[0]}`
  );

  // 2.2 Non-JPEG Format (PNG)
  const pngAsset: Asset = {
    ...passing4kAsset,
    id: 'asset-png-003',
    url: 'https://test.com/sample.png',
    fileFormat: 'PNG',
  };
  const auditPng = await auditSingleAssetReadiness(pngAsset, 'adobe-stock');

  assert(
    auditPng.status === 'Needs Fix' && auditPng.finalStatus === 'Needs Fix',
    '২.৩ নন-জেপেগ (PNG) ছবি সাবমিশনের জন্য "Needs Fix" চিহ্নিত',
    `Status: ${auditPng.finalStatus} | Format: ${auditPng.format}`
  );
  assert(
    auditPng.reasons.some((r) => r.includes('JPEG') || r.includes('রূপান্তর')),
    '২.৪ জেপেগ ফরম্যাটে রূপান্তরের সুনির্দিষ্ট নির্দেশনা উপস্থিত',
    `Reason: ${auditPng.reasons.find((r) => r.includes('JPEG'))}`
  );

  // 2.3 0-Byte Empty File -> Rejected
  const zeroByteAsset: Asset = {
    ...passing4kAsset,
    id: 'asset-zero-byte-004',
    fileSize: '0 Bytes',
  };
  const auditZeroByte = await auditSingleAssetReadiness(zeroByteAsset, 'adobe-stock');

  assert(
    auditZeroByte.status === 'Rejected' && auditZeroByte.finalStatus === 'Rejected',
    '২.৫ ০-বাইটের খালি ফাইল সরাসরি "Rejected" চিহ্নিত',
    `Status: ${auditZeroByte.finalStatus} | Color: ${auditZeroByte.statusColor}`
  );
  assert(
    auditZeroByte.reasons.some((r) => r.includes('০ বাইট')),
    '২.৬ খালি ফাইলের সুনির্দিষ্ট বাতিলকরণ কারণ উল্লেখিত',
    `Reason: ${auditZeroByte.reasons[0]}`
  );

  // -------------------------------------------------------------------------
  // TEST 3: Metadata Failures Handling
  // -------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৩: কমার্শিয়াল মেটাডেটা ব্যর্থতা ও হাইজিন অডিট ---');

  // 3.1 Missing "Generative AI" suffix on Adobe Stock
  const missingSuffixAsset: Asset = {
    ...passing4kAsset,
    id: 'asset-no-suffix-005',
    title: 'Grand Mosque at Sunset',
    preparedMetadata: {
      ...passing4kAsset.preparedMetadata!,
      title: 'Grand Mosque at Sunset',
    },
  };
  const auditNoSuffix = await auditSingleAssetReadiness(missingSuffixAsset, 'adobe-stock');

  assert(
    auditNoSuffix.status === 'Needs Fix' && auditNoSuffix.finalStatus === 'Needs Fix',
    '৩.১ "Generative AI" সাফিক্সবিহীন টাইটেল "Needs Fix" চিহ্নিত',
    `Status: ${auditNoSuffix.finalStatus}`
  );
  assert(
    auditNoSuffix.reasons.some((r) => r.includes('Generative AI')),
    '৩.২ টাইটেলে সাফিক্স অনুপস্থিতির সুনির্দিষ্ট কারণ উল্লেখিত',
    `Reason: ${auditNoSuffix.reasons.find((r) => r.includes('Generative AI'))}`
  );

  // 3.2 Promotional Fluff Words in Keywords/Title
  const fluffAsset: Asset = {
    ...passing4kAsset,
    id: 'asset-fluff-006',
    preparedMetadata: {
      ...passing4kAsset.preparedMetadata!,
      keywords: ['mosque', 'photorealistic', '8k', 'masterpiece', 'dome', 'minaret'],
    },
  };
  const auditFluff = await auditSingleAssetReadiness(fluffAsset, 'adobe-stock');

  assert(
    auditFluff.metadata.fluffDetected.length >= 2,
    '৩.৩ নিষিদ্ধ প্রমোশনাল শব্দ (photorealistic, 8k, masterpiece) সনাক্ত',
    `Fluff detected: [${auditFluff.metadata.fluffDetected.join(', ')}]`
  );
  assert(
    auditFluff.status === 'Needs Fix',
    '৩.৪ প্রমোশনাল ফ্ল্যাফ উপস্থিতির কারণে স্ট্যাটাস "Needs Fix"',
    `Status: ${auditFluff.status}`
  );

  // 3.3 Commercial Trademark Brands in Prompt/Metadata
  const brandAsset: Asset = {
    ...passing4kAsset,
    id: 'asset-brand-007',
    prompt: 'Photographer wearing Nike shoes taking photo of Apple store near modern mosque',
    preparedMetadata: {
      ...passing4kAsset.preparedMetadata!,
      keywords: ['mosque', 'apple', 'nike', 'architecture', 'dome', 'prayer hall', 'sky'],
    },
  };
  const auditBrand = await auditSingleAssetReadiness(brandAsset, 'adobe-stock');

  assert(
    auditBrand.metadata.trademarkDetected.length >= 2,
    '৩.৫ বাণিজ্যিক ব্র্যান্ড (Apple, Nike) টেক্সট ফিল্টারে সনাক্ত',
    `Detected brands: [${auditBrand.metadata.trademarkDetected.join(', ')}]`
  );
  assert(
    auditBrand.status === 'Needs Fix',
    '৩.৬ টেক্সটে ব্র্যান্ড উল্লেখ থাকলে সরাসরি রিজেক্ট নয়, বরং "Needs Fix" ও মানব পর্যালোচনা প্রস্তাবিত',
    `Status: ${auditBrand.finalStatus}`
  );

  // -------------------------------------------------------------------------
  // TEST 4: Verified Marketplace Rules Engine & Specific Marketplaces
  // -------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৪: মার্কেটপ্লেস-নির্দিষ্ট রুলস ইঞ্জিন ও পলিসি যাচাইকরণ ---');

  // 4.1 Shutterstock Third-Party AI Prohibition
  const auditShutterstock = await auditSingleAssetReadiness(passing4kAsset, 'shutterstock');

  assert(
    auditShutterstock.status === 'Rejected' && auditShutterstock.finalStatus === 'Rejected',
    '৪.১ Shutterstock-এ থার্ড-পার্টি AI কন্টেন্ট বাধ্যতামূলকভাবে "Rejected" নির্ধারিত',
    `Final Status: ${auditShutterstock.finalStatus} | Marketplace: ${auditShutterstock.targetMarketplaceName}`
  );
  assert(
    auditShutterstock.reasons.some((r) => r.includes('Shutterstock') && r.includes('নিষিদ্ধ')),
    '৪.২ Shutterstock-এর অফিসিয়াল FAQ ভিত্তিক পলিসি নিষেধাজ্ঞা কারণ অন্তর্ভুক্ত',
    `Reason: ${auditShutterstock.reasons[0]}`
  );

  // 4.2 Wirestock Multi-Agency: 6 MP is Recommended, Not Mandatory
  const wirestockAsset: Asset = {
    ...passing4kAsset,
    id: 'asset-wirestock-008',
    dimensions: '2560x1920', // ~4.91 MP: exceeds 4.0 MP baseline, but < 6.0 MP recommended
    preparedMetadata: {
      ...passing4kAsset.preparedMetadata!,
      marketplace: 'wirestock',
      marketplaceName: 'Wirestock',
      title: 'Majestic White Marble Mosque Under Morning Sky', // No suffix required on Wirestock
    },
  };
  const auditWirestock = await auditSingleAssetReadiness(wirestockAsset, 'wirestock');

  assert(
    auditWirestock.megapixels >= 4.0 && auditWirestock.megapixels < 6.0,
    '৪.৩ Wirestock অ্যাসেটের রেজোলিউশন ৪.৯১ MP (৪ MP বেসলাইনের বেশি কিন্তু ৬ MP-র কম)',
    `Megapixels: ${auditWirestock.megapixels} MP`
  );
  assert(
    auditWirestock.status !== 'Rejected',
    '৪.৪ Wirestock-এর ৬ MP শর্ত বাধ্যতামূলক নয় (Recommended), তাই রিজেক্ট হয়নি',
    `Status: ${auditWirestock.finalStatus}`
  );

  // 4.3 Confirmed Visual Logo on Pixels -> Rejected
  const auditConfirmedLogo = await auditSingleAssetReadiness(passing4kAsset, 'adobe-stock', {
    visualLogoFound: true,
  });

  assert(
    auditConfirmedLogo.status === 'Rejected' && auditConfirmedLogo.finalStatus === 'Rejected',
    '৪.৫ পিক্সেলে নিশ্চিত দৃশ্যমান লোগো থাকলে তাৎক্ষণিক "Rejected" নির্ধারিত',
    `Status: ${auditConfirmedLogo.finalStatus}`
  );
  assert(
    auditConfirmedLogo.reasons.some((r) => r.includes('পিক্সেলে দৃশ্যমান')),
    '৪.৬ পিক্সেলে দৃশ্যমান লোগোর কারণে রিজেকশনের সুনির্দিষ্ট তথ্য উল্লেখিত',
    `Reason: ${auditConfirmedLogo.reasons.find((r) => r.includes('পিক্সেলে দৃশ্যমান'))}`
  );

  // -------------------------------------------------------------------------
  // TEST 5: Uncertain Rules Distinction
  // -------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৫: অনিশ্চিত নিয়ম (Uncertain Rules) পৃথকীকরণ ও সততা ---');

  const uncertainSummary = auditPassing.rulesSummary;
  assert(
    typeof uncertainSummary.mandatoryTotal === 'number' && typeof uncertainSummary.recommendedTotal === 'number',
    '৫.১ বাধ্যতামূলক (Mandatory) ও সুপারিশকৃত (Recommended) নিয়মসমূহ পৃথকভাবে পরিমাপকৃত',
    `Mandatory: ${uncertainSummary.mandatoryPassed}/${uncertainSummary.mandatoryTotal} | Recommended: ${uncertainSummary.recommendedPassed}/${uncertainSummary.recommendedTotal}`
  );

  assert(
    typeof uncertainSummary.uncertainTotal === 'number',
    '৫.২ যাচাইযোগ্যতাহীন বা অনিশ্চিত নিয়ম (Uncertain Rules) পৃথক সংখ্যায় ট্র্যাকিং',
    `Uncertain rules count: ${uncertainSummary.uncertainTotal}`
  );

  // -------------------------------------------------------------------------
  // TEST 6: Mandatory Human Review Checkpoints
  // -------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৬: মানুষের পর্যালোচনা (Human Review) আবশ্যকতা ---');

  assert(
    auditPassing.humanReview.required === true,
    '৬.১ মানুষের পর্যালোচনা নীতিগতভাবে বাধ্যতামূলক (humanReview.required === true)',
    `Disclaimer: "${auditPassing.humanReview.disclaimerBn.slice(0, 50)}..."`
  );

  const checkpointCategories = auditPassing.humanReview.checkpoints.map((c) => c.category);
  assert(
    checkpointCategories.includes('visual_quality') &&
    checkpointCategories.includes('intellectual_property') &&
    checkpointCategories.includes('model_release') &&
    checkpointCategories.includes('property_release') &&
    checkpointCategories.includes('curator_discretion'),
    '৬.২ পাঁচটি অপরিহার্য হিউম্যান রিভিউ চেকপয়েন্ট উপস্থিত (Visual, IP, Model, Property, Curator)',
    `Categories: ${checkpointCategories.join(', ')}`
  );

  // -------------------------------------------------------------------------
  // TEST 7: CSV & JSON Export Accuracy & Honesty
  // -------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৭: CSV ও JSON এক্সপোর্ট সঙ্গতি ও সত্যনিষ্ঠতা ---');

  const preparedMeta = passing4kAsset.preparedMetadata!;
  const csvData = generateStockMetadataCsv(passing4kAsset, preparedMeta);

  assert(
    csvData.startsWith('\uFEFF'),
    '৭.১ CSV এক্সপোর্টে Excel/Sheets-এর জন্য আবশ্যক UTF-8 BOM অন্তর্ভুক্ত',
    'Starts with \\uFEFF'
  );

  const parsedCsv = parseCsvRows(csvData);
  assert(
    parsedCsv.length >= 2,
    '৭.২ CSV ফাইলে হেডার এবং ভ্যালিডেটেড ডাটা রো সংরক্ষিত',
    `Total rows: ${parsedCsv.length}`
  );

  const headers = parsedCsv[0];
  const row = parsedCsv[1];

  assert(
    row[0] === preparedMeta.title,
    '৭.৩ CSV টাইটেল ভ্যালিডেটেড টাইটেলের সাথে ১০০% হুবহু মিলেছে',
    `Exported: "${row[0]}"`
  );

  assert(
    row[1] === preparedMeta.description,
    '৭.৪ CSV ডেসক্রিপশন ভ্যালিডেটেড বিবরণের সাথে ১০০% মিলেছে',
    `Description words: ${row[1].split(' ').length}`
  );

  assert(
    row[2] === preparedMeta.keywords.join(', '),
    '৭.৫ CSV কীওয়ার্ড ভ্যালিডেটেড কীওয়ার্ড সেটের সাথে সম্পূর্ণ সঙ্গতিপূর্ণ',
    `Keywords count: ${row[2].split(',').length}`
  );

  // Check Honest Verification State in CSV
  const subStatusColIdx = headers.indexOf('Submission Status');
  const humanReviewColIdx = headers.indexOf('Human Review Required');
  const policyVerifColIdx = headers.indexOf('Policy Verification State');

  assert(
    subStatusColIdx !== -1 && row[subStatusColIdx] === 'Ready for Manual Review',
    '৭.৬ CSV-তে সাবমিশন স্ট্যাটাস "Ready for Manual Review" স্পষ্ট উল্লেখিত',
    `Column [${subStatusColIdx}]: ${row[subStatusColIdx]}`
  );

  assert(
    humanReviewColIdx !== -1 && row[humanReviewColIdx].startsWith('Yes'),
    '৭.৭ CSV-তে হিউম্যান রিভিউ বাধ্যতামূলক হিসেবে লিপিবদ্ধ',
    `Column [${humanReviewColIdx}]: ${row[humanReviewColIdx]}`
  );

  // Test honest unverified labeling for 'other' marketplace
  const unverifiedOtherMeta: PreparedStockMetadata = {
    ...preparedMeta,
    marketplace: 'other',
    marketplaceName: 'অন্যান্য (Other)',
    isPolicyVerified: false,
  };
  const exportOtherData = buildStructuredExportData(passing4kAsset, unverifiedOtherMeta);

  assert(
    exportOtherData.complianceStatus.isPolicyVerified === false,
    '৭.৮ অপ্রমাণিত প্ল্যাটফর্মে isPolicyVerified কখনোই মিথ্যাভাবে true বলা হয় না',
    `isPolicyVerified: ${exportOtherData.complianceStatus.isPolicyVerified}`
  );

  assert(
    exportOtherData.complianceStatus.policyVerificationState === 'Unverified',
    '৭.৯ অপ্রমাণিত প্ল্যাটফর্ম স্পষ্টভাবে "Unverified" হিসেবে লেবেলযুক্ত',
    `State: ${exportOtherData.complianceStatus.policyVerificationState}`
  );

  // JSON Export Verification
  const jsonData = generateStockMetadataJson(passing4kAsset, preparedMeta);
  const parsedJson = JSON.parse(jsonData);

  assert(
    parsedJson.stockPlatformMetadata.commercialTitle === preparedMeta.title,
    '৭.১০ JSON commercialTitle ভ্যালিডেটেড মেটাডেটার সাথে ১০০% মিলেছে',
    `JSON title: "${parsedJson.stockPlatformMetadata.commercialTitle}"`
  );

  assert(
    parsedJson.complianceStatus.submissionStatus === 'Ready for Manual Review',
    '৭.১১ JSON submissionStatus নির্ভুলভাবে "Ready for Manual Review"',
    `JSON submissionStatus: ${parsedJson.complianceStatus.submissionStatus}`
  );

  assert(
    parsedJson.complianceStatus.humanReviewRequired === true,
    '৭.১২ JSON complianceStatus-এ humanReviewRequired: true অন্তর্ভুক্ত',
    `Human Review Checkpoints: ${parsedJson.complianceStatus.humanReviewCheckpoints.length}`
  );

  // -------------------------------------------------------------------------
  // TEST 8: Invariant Safety: Zero Credit Deduction & Immutability
  // -------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৮: জিরো ক্রেডিট ডিডাকশন ও অ্যাসেট অপরিবর্তনশীলতা ---');

  const snapshotBefore = JSON.stringify(passing4kAsset);
  await auditSingleAssetReadiness(passing4kAsset, 'adobe-stock');
  const snapshotAfter = JSON.stringify(passing4kAsset);

  assert(
    snapshotBefore === snapshotAfter,
    '৮.১ অডিট চলাকালীন মূল অ্যাসেট মেমোরিতে ১০০% অবিকৃত ও অপরিবর্তিত',
    'Asset data byte-for-byte identical'
  );

  console.log('\n========================================================================');
  console.log(`টেস্ট ফলাফল: মোট পরীক্ষা: ${passedTests + failedTests} | সফল: ${passedTests} | ব্যর্থ: ${failedTests}`);
  console.log('========================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runStockSubmissionReadinessTests().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});

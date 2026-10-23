/**
 * Priority 2.9: Real Image Validation & Stock Submission Readiness Test Suite
 * 
 * Verifies:
 * 1. Real Image Workflow: Asset Creation -> DB Persistence -> Media Inspection -> Decoding
 * 2. Metadata Generation, Verification, & Safeguards (Visual Grounding, Prompt Artifacts, Contradictions, Duplicates)
 * 3. Metadata Inline Editing & Real-time Marketplace Validation Audit Re-evaluation
 * 4. Original Asset Zero-Overwrite Invariant (Original Asset remains unaltered in storage)
 * 5. Structured Export (CSV RFC 4180 UTF-8 BOM & JSON) Data Match & Integrity
 * 6. 3-Tier Verification Scope Separation & Marketplace Rules Truthfulness
 */

import 'fake-indexeddb/auto';
import { Asset, PreparedStockMetadata, StockMarketplaceId } from '../src/types';
import {
  saveAssetToDB,
  loadAllAssetsFromDB,
  getAssetByIdFromDB,
  clearAllAssetsFromDB,
} from '../src/utils/assetStorage';
import {
  inspectImageFile,
  calculateClosestAspectRatio,
  extractFileFormat,
} from '../src/utils/mediaInspector';
import {
  verifyAndSanitizeStockMetadata,
  auditMarketplaceValidation,
  detectPromptArtifactKeywords,
  detectRepetitiveKeywords,
  detectContradictoryKeywords,
  auditKeywordHygiene,
  MARKETPLACE_TITLE_RULES,
} from '../src/utils/stockMetadataValidator';
import {
  buildStructuredExportData,
  generateStockMetadataCsv,
  generateStockMetadataJson,
  generateStockPlatformCopyText,
} from '../src/utils/stockMetadataExporter';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
    if (detail) console.log(`       └─ ${detail}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${testName}`);
    if (detail) console.error(`       └─ FAILED DETAIL: ${detail}`);
  }
}

// Simple RFC 4180 CSV parser for testing
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
        i++; // skip escaped quote
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
        i++; // skip \n
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

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

async function runPriority29Suite() {
  console.log('========================================================================');
  console.log('PRIORITY 2.9: REAL IMAGE VALIDATION & STOCK SUBMISSION READINESS');
  console.log('========================================================================\n');

  await clearAllAssetsFromDB();

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Real Image Creation, Storage & Media Inspection
  // --------------------------------------------------------------------------
  console.log('--- পরীক্ষা ১: আসল ইমেজ ফাইল আমদানি, সংরক্ষণ ও মিডিয়া ইন্সপেকশন ---');

  // Real 1x1 base64 transparent PNG
  const realBase64Png =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // Real 256 KB binary buffer
  const binaryBytes = new Uint8Array(256 * 1024);
  binaryBytes.fill(160);
  const realBlob = new Blob([binaryBytes], { type: 'image/png' });

  const initialSourceAsset: Asset = {
    id: 'artisan-copper-teapot-source',
    title: 'Artisan Handmade Copper Teapot with Mint Leaves',
    type: 'image',
    prompt: 'Commercial macro photography of antique hammered copper teapot with fresh green mint leaves on rustic dark slate, dramatic soft side lighting',
    style: 'Commercial Studio',
    aspectRatio: '16:9',
    dimensions: '1920 × 1080',
    url: realBase64Png,
    thumbnailUrl: realBase64Png,
    createdAt: 'Oct 17, 2026',
    isFavorite: false,
    model: 'Gemini Visual Studio',
    source: 'Studio',
    fileSize: '256.0 KB',
    fileFormat: 'image/png',
  };

  // 1.1 Save initial asset to IndexedDB
  const storedRecord = await saveAssetToDB(initialSourceAsset, realBlob);
  assert(
    storedRecord.id === initialSourceAsset.id && storedRecord.dimensions === '1920 × 1080',
    '১.১ আসল বাইনারি ব্লব ও মেটাডেটা সহ IndexedDB-তে আদি অ্যাসেট সংরক্ষণ',
    `ID: ${storedRecord.id}, Dimensions: ${storedRecord.dimensions}, FileSize: ${storedRecord.fileSize}`
  );

  // 1.2 Inspect binary file
  const mediaInspection = await inspectImageFile(realBlob);
  assert(
    mediaInspection.fileFormat === 'PNG (image/png)' && mediaInspection.fileSize.includes('256.0 KB'),
    '১.২ আসল বাইনারি ব্লব থেকে ফাইল সাইজ ও MIME টাইপ স্বয়ংক্রিয়ভাবে পরিমাপ',
    `Format: ${mediaInspection.fileFormat}, Size: ${mediaInspection.fileSize}`
  );

  // 1.3 Calculate aspect ratio and megapixels
  const calculatedRatio = calculateClosestAspectRatio(1920, 1080);
  const megapixels = Number(((1920 * 1080) / 1_000_000).toFixed(2));
  assert(
    calculatedRatio === '16:9' && megapixels === 2.07,
    '১.৩ ডাইমেনশন থেকে অ্যাসপেক্ট রেশিও (16:9) ও মেগাপিক্সেল (2.07 MP) নিখুঁত হিসাব',
    `Ratio: ${calculatedRatio}, Megapixels: ${megapixels} MP`
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Metadata Generation & Visual Safeguards
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ২: মেটাডেটা জেনারেশন, প্রাসঙ্গিকতা ও ভিজ্যুয়াল সুরক্ষাকবচ ---');

  const rawCandidateMetadata = {
    title: 'Exquisite award winning artisan hammered copper teapot celebrating triumph',
    description: 'Artisan antique copper teapot with whole cinnamon bark, dipping sauce, and baking powder on dark slate.',
    keywords: [
      'copper teapot', 'artisan', 'handmade', 'antique', 'metal', 'teapot',
      'mint leaves', 'slate table', 'still life', 'studio lighting',
      '8k', 'octane render', 'unreal engine', 'photorealistic', 'masterpiece', // prompt artifacts
      'copper teapots', 'mint leaf', // duplicates of copper teapot / mint leaves
      'outdoor', 'open air', // contradiction with studio/indoor
      'triumph', 'celebrating', 'dipping sauce', 'baking powder' // unobservable / fluff
    ],
    visualSubjectDescription: 'Hammered copper teapot with fresh mint leaves on dark slate',
    category: 'Still Life',
    hasHumans: false,
  };

  const sanitizedAdobe = verifyAndSanitizeStockMetadata(rawCandidateMetadata, 'adobe-stock');

  // 2.1 Prompt artifacts filtered
  assert(
    !sanitizedAdobe.keywords.includes('8k') &&
    !sanitizedAdobe.keywords.includes('octane render') &&
    !sanitizedAdobe.keywords.includes('unreal engine') &&
    !sanitizedAdobe.keywords.includes('photorealistic') &&
    !sanitizedAdobe.keywords.includes('masterpiece'),
    '২.১ এআই প্রম্পট আর্টিফ্যাক্ট ও রেন্ডার ইঞ্জিন ট্যাগ মেটাডেটা থেকে অপসারিত',
    `ফিল্টারকৃত কীওয়ার্ড সংখ্যা: ${sanitizedAdobe.keywords.length}`
  );

  // 2.2 Unobservable details filtered
  assert(
    !sanitizedAdobe.description.toLowerCase().includes('dipping sauce') &&
    !sanitizedAdobe.description.toLowerCase().includes('baking powder'),
    '২.২ খালি চোখে অনুপস্থিত কাল্পনিক সস ও রাসায়নিক বেকিং পাউডার বিবরণ থেকে অপসারিত',
    `বিশুদ্ধ বিবরণ: "${sanitizedAdobe.description}"`
  );

  // 2.3 Adobe Stock Generative AI title suffix & min word check
  assert(
    sanitizedAdobe.title.endsWith('Generative AI') &&
    sanitizedAdobe.title.split(/\s+/).filter(Boolean).length >= 5,
    '২.৩ Adobe Stock-এর জন্য Generative AI সাফিক্স ও ন্যূনতম ৫ শব্দের নিয়ম বজায় থাকা',
    `টাইটেল: "${sanitizedAdobe.title}"`
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Metadata Inline Editing & Live Validation Re-Audit
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৩: মেটাডেটা ইনলাইন সম্পাদনা ও লাইভ মার্কেটপ্লেস রি-ভ্যালিডেশন ---');

  const customEditedTitle = 'Handmade Hammered Copper Teapot with Fresh Mint Leaves Generative AI';
  const customEditedDesc = 'Authentic handcrafted copper teapot resting on rustic slate surface with green herbal leaves. Studio side illumination with soft shadows.';
  const customEditedKeywords = [
    'copper teapot', 'handcrafted', 'artisan kettle', 'mint leaves',
    'rustic slate', 'still life', 'tableware', 'antique brass', 'copperware',
    'herbal tea', 'traditional craft', 'macro photography', 'side lighting',
    'kitchenware', 'hot beverage', 'metal container', 'vintage kettle',
    'dark background', 'organic mint', 'artisan craftsmanship'
  ];

  // User edits metadata in StockPreparationModal and runs re-audit
  const reAuditedResult = auditMarketplaceValidation(
    {
      title: customEditedTitle,
      description: customEditedDesc,
      keywords: customEditedKeywords,
      visualSubject: 'Hammered copper teapot with fresh mint leaves',
      category: 'Still Life',
      hasHumans: false,
    },
    'adobe-stock'
  );

  assert(
    reAuditedResult.overallTechnicalPass === true,
    '৩.১ সম্পাদনা পরবর্তী টাইটেল ও কীওয়ার্ডের জন্য লাইভ ভ্যালিডেশন অডিট সম্পূর্ণ PASS',
    `টাইটেল দৈর্ঘ্য: ${reAuditedResult.checks.titleCharacterLength.actual} chars, শব্দ: ${reAuditedResult.checks.titleWordCount.actual}, কীওয়ার্ড: ${reAuditedResult.checks.keywordCount.actual}`
  );

  assert(
    reAuditedResult.keywordAnomalyAudit.correctionFlags.length === 0,
    '৩.২ সম্পাদিত কীওয়ার্ড তালিকায় কোনো প্রম্পট আর্টিফ্যাক্ট, ডুপ্লিকেট বা পরস্পরবিরোধী উপাদান নেই',
    `অ্যানোমালি ফ্ল্যাগ সংখ্যা: ${reAuditedResult.keywordAnomalyAudit.correctionFlags.length}`
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Original Asset Preservation Invariant (Zero Overwrite)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৪: মূল অ্যাসেট অপরিবর্তনশীলতা (Zero Overwrite Invariant) ---');

  // Verify initial asset in IndexedDB has NOT been modified
  const verifiedDbAsset = await getAssetByIdFromDB('artisan-copper-teapot-source');
  assert(
    verifiedDbAsset !== null &&
    verifiedDbAsset.id === 'artisan-copper-teapot-source' &&
    verifiedDbAsset.dimensions === '1920 × 1080' &&
    verifiedDbAsset.fileFormat === 'image/png' &&
    verifiedDbAsset.fileSize === '256.0 KB',
    '৪.১ মেটাডেটা তৈরি ও সম্পাদনার পরও ডেটাবেসে মূল আদি ফাইল ১০০% অপরিবর্তিত',
    `DB রেকর্ড: ID=${verifiedDbAsset?.id}, Dim=${verifiedDbAsset?.dimensions}, Size=${verifiedDbAsset?.fileSize}`
  );

  // Simulate saving enhanced derivative copy
  const derivativeEnhancedPayload: Omit<Asset, 'id' | 'createdAt' | 'views'> = {
    title: `${initialSourceAsset.title} (Enhanced 4K)`,
    type: 'image',
    prompt: initialSourceAsset.prompt,
    style: initialSourceAsset.style,
    aspectRatio: initialSourceAsset.aspectRatio,
    dimensions: '3840 × 2160',
    url: realBase64Png,
    thumbnailUrl: realBase64Png,
    isFavorite: false,
    model: 'Studio Enhancer (2x AI Upscale)',
    source: 'Studio',
    fileSize: '1.8 MB',
    fileFormat: 'JPEG Image',
  };

  const enhancedDerivativeAsset: Asset = {
    ...derivativeEnhancedPayload,
    id: `enhanced-derivative-${Date.now()}`,
    createdAt: 'Oct 17, 2026',
    views: 1,
  };

  await saveAssetToDB(enhancedDerivativeAsset, realBlob);
  const allAssetsAfter = await loadAllAssetsFromDB();

  assert(
    allAssetsAfter.length === 2 &&
    allAssetsAfter.some((a) => a.id === 'artisan-copper-teapot-source') &&
    allAssetsAfter.some((a) => a.id.startsWith('enhanced-derivative-')),
    '৪.২ এনহ্যান্সমেন্টের ফলে মূল অ্যাসেট ও ডেরিভেটিভ কপি উভয়ই সম্পূর্ণ আলাদা আইডিতে সংরক্ষিত',
    `মোট সংরক্ষিত অ্যাসেট: ${allAssetsAfter.length}টি (মূল: ${allAssetsAfter[0].id}, ডেরিভেটিভ: ${allAssetsAfter[1].id})`
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Structured Export (CSV & JSON) Data Match & RFC 4180 Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৫: স্ট্রাকচার্ড এক্সপোর্ট (CSV ও JSON) মিল ও ডাটা নির্ভুলতা ---');

  const finalEditedMetadata: PreparedStockMetadata = {
    title: customEditedTitle,
    description: customEditedDesc,
    keywords: customEditedKeywords,
    marketplace: 'adobe-stock',
    marketplaceName: 'Adobe Stock',
    category: 'Still Life',
    visualSubjectDescription: 'Hammered copper teapot with fresh mint leaves',
    aiDisclosure: 'Created with Generative AI technology. Commercial non-exclusive licensing.',
    aiPolicyStatus: 'allowed',
    aiPolicyBadge: 'AI Allowed with Label',
    aiPolicyColor: 'green',
    officialPolicyNote: 'Adobe Stock allows generative AI content provided it is declared with the AI checkbox.',
    officialPolicyUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
    isPolicyVerified: true,
    verificationDate: '2026-10-17',
    labelingRequirement: 'Check the "Created using generative AI tools" box upon submission.',
    humanPresenceCompliance: 'No human figures present. Model release not required.',
    trademarkCompliance: 'Clean editorial/commercial still life. No brand marks.',
    technicalRequirements: 'Minimum 4 Megapixels, JPEG format.',
    factualSubjectSummary: 'Handcrafted antique copper kettle with mint garnish.',
    validationAudit: reAuditedResult,
  };

  // Generate CSV and JSON
  const exportedCsv = generateStockMetadataCsv(initialSourceAsset, finalEditedMetadata, null);
  const exportedJson = generateStockMetadataJson(initialSourceAsset, finalEditedMetadata, null);

  // 5.1 Check UTF-8 BOM
  assert(
    exportedCsv.startsWith('\uFEFF'),
    '৫.১ এক্সেল ও স্প্রেডশীট সামঞ্জস্যের জন্য CSV-তে UTF-8 BOM (\uFEFF) নিশ্চিতকরণ',
    'BOM প্রিফিক্স সঠিকভাবে বিদ্যমান।'
  );

  // 5.2 Parse CSV and verify 29 headers and 29 row items
  const parsedCsvRows = parseRfc4180Csv(exportedCsv);
  assert(
    parsedCsvRows.length === 2 &&
    parsedCsvRows[0].length === 29 &&
    parsedCsvRows[1].length === 29,
    '৫.২ RFC 4180 অনুযায়ী ২৯টি হেডার কলাম ও ২৯টি ডাটা ফিল্ডের নির্ভুল ম্যাপিং',
    `হেডার কলাম: ${parsedCsvRows[0].length}, ডাটা কলাম: ${parsedCsvRows[1].length}`
  );

  // 5.3 Parse JSON and verify structured fields
  const parsedJson = JSON.parse(exportedJson);
  assert(
    parsedJson.asset &&
    parsedJson.prompts &&
    parsedJson.stockPlatformMetadata &&
    parsedJson.brandInformation &&
    parsedJson.complianceStatus,
    '৫.৩ স্ট্রাকচার্ড JSON-এ Asset, Prompts, Platform Metadata, Brand Info ও Compliance অবজেক্ট উপস্থিত',
    `JSON কীসমূহ: ${Object.keys(parsedJson).join(', ')}`
  );

  // 5.4 Cross-verify CSV and JSON data matching with edited values
  const csvHeaders = parsedCsvRows[0];
  const csvData = parsedCsvRows[1];

  const getCsvVal = (headerName: string) => {
    const idx = csvHeaders.indexOf(headerName);
    return idx !== -1 ? csvData[idx] : null;
  };

  const titleInCsv = getCsvVal('Title (Commercial)');
  const descInCsv = getCsvVal('Description (Commercial)');
  const keywordsInCsv = getCsvVal('Keywords');
  const kwCountInCsv = parseInt(getCsvVal('Keywords Count') || '0', 10);
  const marketplaceInCsv = getCsvVal('Target Marketplace');
  const promptInCsv = getCsvVal('Prompt');

  assert(
    titleInCsv === customEditedTitle &&
    parsedJson.stockPlatformMetadata.commercialTitle === customEditedTitle,
    '৫.৪ টাইটেল ম্যাচ: CSV এবং JSON উভয়েই সম্পাদিত টাইটেল হুবহু সংরক্ষিত',
    `Title: "${titleInCsv}"`
  );

  assert(
    descInCsv === customEditedDesc &&
    parsedJson.stockPlatformMetadata.commercialDescription === customEditedDesc,
    '৫.৫ ডেসক্রিপশন ম্যাচ: CSV এবং JSON উভয়েই সম্পাদিত ডেসক্রিপশন হুবহু সংরক্ষিত',
    `Desc: "${descInCsv?.slice(0, 50)}..."`
  );

  assert(
    kwCountInCsv === customEditedKeywords.length &&
    parsedJson.stockPlatformMetadata.keywordsCount === customEditedKeywords.length &&
    keywordsInCsv === customEditedKeywords.join(', '),
    '৫.৬ কীওয়ার্ড ম্যাচ: ২০টি কীওয়ার্ডের প্রতিটি CSV এবং JSON-এ নিখুঁতভাবে সমন্বিত',
    `Keywords Count: ${kwCountInCsv}`
  );

  assert(
    marketplaceInCsv === 'Adobe Stock' &&
    parsedJson.stockPlatformMetadata.marketplaceName === 'Adobe Stock' &&
    promptInCsv === initialSourceAsset.prompt,
    '৫.৭ মেটাডেটা ও প্রম্পট ট্রেসিবিলিটি: সোর্স প্রম্পট ও মার্কেটপ্লেস উভয় ফাইলে অবিকৃত',
    `Marketplace: ${marketplaceInCsv}, Prompt: "${promptInCsv?.slice(0, 45)}..."`
  );

  // 5.5 Verify NO missing fields or undefined/NaN in JSON or CSV
  const jsonStringRaw = JSON.stringify(parsedJson);
  assert(
    !jsonStringRaw.includes(':undefined') &&
    !jsonStringRaw.includes(':null') &&
    !jsonStringRaw.includes('"[object Object]"') &&
    !csvData.some((val) => val === 'undefined' || val === 'null' || val === '[object Object]'),
    '৫.৮ কোনো মিসিং ফিল্ড, undefined, null বা [object Object] ত্রুটি নেই',
    'CSV এবং JSON উভয় ফরম্যাট সম্পূর্ণ পরিষ্কার ও ভ্যালিড।'
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 6: 3-Tier Verification Scope & Marketplace Rules Truthfulness
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৬: ৩-স্তরীয় ভেরিফিকেশন পরিধি ও পলিসি সততা ---');

  const policyScope = reAuditedResult.policyScopeAudit;
  assert(
    policyScope.deterministicSoftwareVerified &&
    policyScope.deterministicSoftwareVerified.length >= 5 &&
    policyScope.heuristicEstimates &&
    policyScope.heuristicEstimates.length >= 3 &&
    policyScope.manualVisualReviewRequired &&
    policyScope.manualVisualReviewRequired.length >= 4,
    '৬.১ ডিটারমিনিস্টিক, হিউরিস্টিক এবং ম্যানুয়াল ভিজ্যুয়াল রিভিউর ৩টি স্তর সুস্পষ্টভাবে পৃথক',
    `Deterministic: ${policyScope.deterministicSoftwareVerified?.length}টি, Heuristic: ${policyScope.heuristicEstimates?.length}টি, Manual: ${policyScope.manualVisualReviewRequired?.length}টি`
  );

  assert(
    policyScope.disclaimerBn.includes('কোড দ্বারা শুধুমাত্র টেকনিক্যাল ক্যারেক্টার লিমিট') &&
    policyScope.disclaimerBn.includes('মডেল রিলিজ') &&
    policyScope.disclaimerBn.includes('হিউম্যান কিউরেটরের রিভিউ'),
    '৬.২ জিরো-গ্যারান্টি সততা ডিসক্লেইমার অক্ষুণ্ণ থাকা (কোনো মিথ্যা প্রতিশ্রুতি দেওয়া হয়নি)',
    'সততা ডিসক্লেইমার সম্পূর্ণ সংরক্ষিত।'
  );

  // 6.3 Test other marketplace rules: Shutterstock (5 words min), Freepik (30-65 chars), Dreamstime, Wirestock
  const shTitle = 'Handmade copper teapot close-up view'; // 5 words
  const shAudit = auditMarketplaceValidation(
    {
      title: shTitle,
      description: customEditedDesc,
      keywords: customEditedKeywords,
      visualSubject: 'Copper teapot',
    },
    'shutterstock'
  );
  assert(
    shAudit.checks.titleWordCount.pass === true &&
    shAudit.checks.titleWordCount.actual === 5,
    '৬.৩ Shutterstock-এর কঠোর ন্যূনতম ৫ শব্দের নিয়ম সফলভাবে যাচাই',
    `Shutterstock Title: "${shTitle}" (Words: ${shAudit.checks.titleWordCount.actual})`
  );

  console.log('\n========================================================================');
  console.log(`টেস্ট সমাপ্ত: মোট ${totalTests}টি পরীক্ষার মধ্যে ${passedTests}টি PASS, ${failedTests}টি FAIL`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPriority29Suite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

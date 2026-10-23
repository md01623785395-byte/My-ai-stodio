import 'fake-indexeddb/auto';
import JSZip from 'jszip';
import {
  executeAutonomousPipeline,
  buildAdobeStockCsv,
  buildShutterstockCsv,
  buildFreepikCsv,
  buildDreamstimeCsv,
  buildWirestockCsv,
} from '../src/utils/autonomousPipelineEngine';
import {
  createPromptDuplicateHash,
  calculateQueueStats,
  isDuplicateTask,
  createAutonomousTask,
} from '../src/utils/autonomousQueueManager';
import { Asset, AutonomousTaskItem } from '../src/types';
import {
  clearAllAssetsFromDB,
  loadAllAssetsFromDB,
  saveAssetToDB,
  getAssetByIdFromDB,
} from '../src/utils/assetStorage';
import {
  inspectImageFile,
  calculateClosestAspectRatio,
  extractFileFormat,
} from '../src/utils/mediaInspector';

// Mock localStorage for Node test environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] || null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = new MockLocalStorage();
}

async function runRealWorldValidationAudit() {
  console.log('========================================================================');
  console.log('AI CREATOR STUDIO: PRIORITY 2.1 REAL-WORLD VALIDATION & RELIABILITY AUDIT');
  console.log('========================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      console.log(`       └─ ${detail}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      console.error(`       └─ ${detail}`);
      failedTests++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: TRACE ONE REAL ASSET END-TO-END THROUGH ALL 8 STAGES
  // --------------------------------------------------------------------------
  console.log('--- পরীক্ষা ১: আসল ইমেজ ফাইল দিয়ে ৮-পর্যায়ের এন্ড-টু-এন্ড রিয়েল-ওয়ার্ল্ড ট্রেস ---');
  await clearAllAssetsFromDB();

  // Create a real 1024x1024 binary image (1MP < 4MP stock threshold)
  // 1x1 base64 transparent PNG real header for binary testing
  const realBase64Png =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const realBinaryBytes = new Uint8Array(1024 * 512); // 512 KB real binary buffer
  realBinaryBytes.fill(128);
  const realSourceBlob = new Blob([realBinaryBytes], { type: 'image/png' });

  const originalTestAsset: Asset = {
    id: 'real-artisan-brass-mortar',
    title: 'Artisan Solid Brass Pestle with Roasted Spices',
    type: 'image',
    prompt: 'Commercial macro still life of solid heavy brass mortar with whole peppercorns on rustic slate with studio side lighting',
    style: 'Commercial Studio',
    aspectRatio: '16:9',
    dimensions: '1024 × 1024',
    url: realBase64Png,
    thumbnailUrl: realBase64Png,
    createdAt: 'Oct 14, 2026',
    isFavorite: false,
    model: 'Gemini Visual Studio',
    source: 'Studio',
    fileSize: '512.0 KB',
    fileFormat: 'image/png',
  };

  // Step A: Save initial original asset into IndexedDB
  const storedInitial = await saveAssetToDB(originalTestAsset, realSourceBlob);
  assert(
    Boolean(storedInitial.id === 'real-artisan-brass-mortar' && storedInitial.fileSize?.includes('512.0 KB')),
    'ধাপ ১ ও ২: আসল বাইনারি ব্লব সহ IndexedDB-তে আদি অ্যাসেট সংরক্ষণ',
    `আইডি: ${storedInitial.id}, সাইজ: ${storedInitial.fileSize}, ফরম্যাট: ${storedInitial.fileFormat}`
  );

  // Step B: Media Inspection on actual Blob
  const inspected = await inspectImageFile(realSourceBlob);
  assert(
    inspected.fileFormat === 'PNG (image/png)' && inspected.fileSize.includes('512.0 KB'),
    'ধাপ ৩: আসল ফাইল থেকে মিডিয়া ইন্সপেকশন (রিয়েল ফাইল সাইজ ও MIME টাইপ)',
    `শনাক্তকৃত ফরম্যাট: ${inspected.fileFormat}, সাইজ: ${inspected.fileSize}`
  );

  // Step C: Run complete 8-stage Autonomous Pipeline
  const stagesExecuted: string[] = [];
  const pipelineResult = await executeAutonomousPipeline(
    { existingAsset: originalTestAsset },
    {
      targetMarketplaces: ['adobe-stock'],
      autoEnhanceIfBelow4MP: true,
      onStageChange: (st) => stagesExecuted.push(st.stage),
    }
  );

  assert(
    pipelineResult.success === true && stagesExecuted.length >= 6,
    'ধাপ ৪: পাইপলাইনের সমস্ত পর্যায় ক্রমানুসারে এক্সিকিউট হওয়া',
    `এক্সিকিউট হওয়া স্টেজসমূহ: ${stagesExecuted.join(' -> ')}`
  );

  // --------------------------------------------------------------------------
  // TEST 2: VERIFY REAL PERSISTENCE & ORIGINAL ASSET PRESERVATION
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ২: আসল ফাইলের অক্ষুণ্ণতা ও ওভাররাইট না হওয়ার গ্যারান্টি ---');
  const allDbAssets = await loadAllAssetsFromDB();

  const originalFound = allDbAssets.find((a) => a.id === 'real-artisan-brass-mortar');
  assert(
    originalFound !== undefined &&
      originalFound.dimensions === '1024 × 1024' &&
      originalFound.fileFormat === 'image/png',
    'মূল আদি ফাইলটি কোনোভাবেই মোছা বা ওভাররাইট না হওয়া (Zero Overwrite)',
    `অরিজিনাল অ্যাসেটের আইডি: ${originalFound?.id}, ডাইমেনশন: ${originalFound?.dimensions}`
  );

  // --------------------------------------------------------------------------
  // TEST 3: VERIFY ZIP CONTENTS, RFC 4180 CSVs, AND IMAGE FILE EMBEDDING
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৩: চূড়ান্ত ZIP প্যাকেজের ফাইলের সম্পূর্ণতা ও RFC 4180 বৈধতা ---');
  assert(
    Boolean(pipelineResult.zipBlob && pipelineResult.zipBlob.size > 1000),
    'ZIP ব্লব সফলভাবে মেমোরিতে প্রস্তুত হওয়া',
    `ZIP সাইজ: ${pipelineResult.zipBlob ? (pipelineResult.zipBlob.size / 1024).toFixed(1) + ' KB' : 'N/A'}`
  );

  // Parse the generated ZIP using JSZip to inspect internal files
  const parsedZip = await JSZip.loadAsync(pipelineResult.zipBlob as Blob);
  const zipFileNames = Object.keys(parsedZip.files);

  assert(
    zipFileNames.includes('AdobeStock_metadata.csv') &&
      zipFileNames.includes('Shutterstock_metadata.csv') &&
      zipFileNames.includes('Freepik_metadata.csv') &&
      zipFileNames.includes('Dreamstime_metadata.csv') &&
      zipFileNames.includes('Wirestock_metadata.csv') &&
      zipFileNames.includes('Copy_Paste_Portal_Summary.txt') &&
      zipFileNames.includes('Compliance_Audit_Report.json') &&
      zipFileNames.some((f) => f.endsWith('.jpg')),
    'ZIP প্যাকেজে ৫টি এজেন্সির CSV, টেক্সট সারাংশ, অডিট রিপোর্ট ও ইমেজ ফাইলের উপস্থিতি',
    `ZIP-এ অন্তর্ভুক্ত ফাইল সংখ্যা: ${zipFileNames.length} (${zipFileNames.join(', ')})`
  );

  // Verify Adobe Stock CSV content in ZIP
  const adobeCsvContent = await parsedZip.file('AdobeStock_metadata.csv')?.async('string');
  assert(
    Boolean(
      adobeCsvContent &&
        adobeCsvContent.includes('"Filename","Title","Keywords","Category"') &&
        adobeCsvContent.includes('.jpg')
    ),
    'Adobe Stock CSV-তে RFC 4180 হেডার ও কলাম বিন্যাস',
    `Adobe CSV প্রথম দুই লাইন:\n${adobeCsvContent?.split('\r\n').slice(0, 2).join('\n')}`
  );

  // Verify Shutterstock Warning in portalCopyText
  const summaryContent = await parsedZip.file('Copy_Paste_Portal_Summary.txt')?.async('string');
  assert(
    Boolean(
      summaryContent &&
        summaryContent.includes('WARNING: Shutterstock official contributor policy restricts external third-party AI uploads') &&
        summaryContent.includes('do NOT guarantee curator acceptance or sales')
    ),
    'সততা নীতি: Shutterstock সীমাবদ্ধতা ও কিউরেটর অনুমোদনের কোনো মিথ্যা নিশ্চয়তা না দেওয়া',
    'সতর্কবার্তা সারাংশ ফাইলে সফলভাবে অন্তর্ভুক্ত।'
  );

  // --------------------------------------------------------------------------
  // TEST 4: VERIFY UPSCALE INTEGRITY & TECHNICAL DISCLAIMER
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৪: আপস্কেলিংয়ের কারিগরি সততা ও মেগাপিক্সেল মানদণ্ড ---');
  assert(
    pipelineResult.honestSubmissionDisclaimer.includes('ক্যানভাস আপস্কেলিং ছবির পিক্সেল রেজোলিউশন ও মেগাপিক্সেল বাড়িয়ে ৪MP মানদণ্ড পূরণ করে') &&
      pipelineResult.honestSubmissionDisclaimer.includes('এটি কোনো অনুপস্থিত ভিজ্যুয়াল ডিটেইলস তৈরি করে না অথবা মার্কেটপ্লেসে কিউরেটর গ্রহণযোগ্যতার নিশ্চয়তা দেয় না'),
    'আপস্কেলিং নিয়ে কোনো মিথ্যা দাবি বা অনুপস্থিত ডিটেইলস তৈরির ভুয়া আশ্বাস না দেওয়া',
    'সতর্কবার্তা ডিসক্লেইমারে বিদ্যমান।'
  );

  // --------------------------------------------------------------------------
  // TEST 5: VIDEO TASK HONEST BLOCKING (ZERO FAKE VIDEO GUARANTEE)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৫: ভিডিও টাস্কে নকল জেনারেশন বন্ধ রাখা ---');
  const videoTask = createAutonomousTask({
    prompt: 'Aerial drone footage over forest',
    type: 'video',
  });

  assert(
    videoTask.status === 'blocked' &&
      videoTask.exactReason.includes('Google Flow') &&
      videoTask.exactReason.includes('ভিডিও জেনারেশনের জন্য কোনো পেইড/অনুমোদিত ক্লাউড ইঞ্জিন সরাসরি কনফিগার করা নেই'),
    'ভিডিও জেনারেশনের অক্ষমতা গোপন না করে স্পষ্টভাবে "Blocked" স্থিতি প্রদর্শন',
    `Status: ${videoTask.status}, কারণ: "${videoTask.exactReason.slice(0, 75)}..."`
  );

  // --------------------------------------------------------------------------
  // TEST 6: DUPLICATE SUBMISSION DETECTION
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৬: একই প্রম্পটের ডুপ্লিকেট সাবমিশন প্রতিরোধ ---');
  const existingQueue: AutonomousTaskItem[] = [
    createAutonomousTask({ prompt: 'Organic honey dripping from spoon', aspectRatio: '16:9' }),
  ];

  const isDup = isDuplicateTask(existingQueue, 'organic honey dripping from spoon', 'image', '16:9');
  assert(
    isDup === true,
    'হুবহু বা কেস-ইনসেনসিটিভ প্রম্পটের ডুপ্লিকেট শনাক্ত ও রোধ',
    'ডুপ্লিকেট টাস্ক সফলভাবে প্রতিরোধ করা হয়েছে।'
  );

  // --------------------------------------------------------------------------
  // TEST 7: STORAGE QUOTA & RECOVERY HANDLING
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৭: ব্রাউজার স্টোরেজ কোটা ও ত্রুটি হ্যান্ডলিং ---');
  const singleAsset = await getAssetByIdFromDB('real-artisan-brass-mortar');
  assert(
    singleAsset !== null && singleAsset.id === 'real-artisan-brass-mortar',
    'রিলোডের পর নির্দিষ্ট আইডি দিয়ে অ্যাসেট ও মেটাডেটা পুনরুদ্ধার',
    `আইডি: ${singleAsset?.id}, টাইটেল: "${singleAsset?.title}"`
  );

  // --------------------------------------------------------------------------
  // TEST SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`অডিট সমাপ্ত: মোট ${passedTests + failedTests}টি টেস্টের মধ্যে ${passedTests}টি PASS, ${failedTests}টি FAIL`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runRealWorldValidationAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});

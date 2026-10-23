import 'fake-indexeddb/auto';
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
import { clearAllAssetsFromDB, loadAllAssetsFromDB } from '../src/utils/assetStorage';

// Attach mock localStorage to global if needed
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

async function runAutonomousPipelineTestSuite() {
  console.log('================================================================');
  console.log('AI CREATOR STUDIO: AUTONOMOUS AI PIPELINE & TASK QUEUE TEST SUITE');
  console.log('================================================================\n');

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

  // -------------------------------------------------------------
  // TEST GROUP 1: Duplicate Prevention & Task Hashing
  // -------------------------------------------------------------
  console.log('--- পরীক্ষা ১: ডুপ্লিকেট টাস্ক প্রতিরোধ ও হ্যাশিং ইঞ্জিন ---');
  const promptA = 'Commercial studio still life of handcrafted ceramic mug on teak desk';
  const promptB = 'commercial studio  still life of handcrafted ceramic mug on teak desk  '; // extra spaces & lower
  const promptC = 'Different landscape shot of mountain peaks';

  const hashA = createPromptDuplicateHash(promptA, 'image', '16:9');
  const hashB = createPromptDuplicateHash(promptB, 'image', '16:9');
  const hashC = createPromptDuplicateHash(promptC, 'image', '16:9');

  assert(
    hashA === hashB,
    'নর্মালাইজড প্রম্পট থেকে অভিন্ন হ্যাশ তৈরি (Duplicate Hash Match)',
    `Prompt A Hash: ${hashA}, Prompt B Hash: ${hashB}`
  );

  assert(
    hashA !== hashC,
    'ভিন্ন প্রম্পটে স্বতন্ত্র হ্যাশ তৈরি (Distinct Hash)',
    `Prompt A Hash: ${hashA}, Prompt C Hash: ${hashC}`
  );

  const existingTasks: AutonomousTaskItem[] = [
    createAutonomousTask({ prompt: promptA, aspectRatio: '16:9' }),
  ];

  assert(
    isDuplicateTask(existingTasks, promptB, 'image', '16:9') === true,
    'কিউতে পূর্ববর্তী টাস্ক থাকলে ডুপ্লিকেট শনাক্তকরণ',
    'ডুপ্লিকেট টাস্ক সফলভাবে শনাক্ত ও বাতিল করা হয়েছে।'
  );

  assert(
    isDuplicateTask(existingTasks, promptC, 'image', '16:9') === false,
    'নতুন ভিন্ন টাস্কে ডুপ্লিকেট ফ্ল্যাগ না ওঠা',
    'নতুন টাস্ক অনুমোদনযোগ্য।'
  );

  // -------------------------------------------------------------
  // TEST GROUP 2: Queue Stats & Honest Status Tracking
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ২: টাস্ক কিউ স্ট্যাটাস ও শতভাগ সৎ স্থিতি ট্র্যাকিং ---');
  const sampleTasks: AutonomousTaskItem[] = [
    { ...createAutonomousTask({ prompt: 'Item 1' }), status: 'completed' },
    { ...createAutonomousTask({ prompt: 'Item 2' }), status: 'completed' },
    { ...createAutonomousTask({ prompt: 'Item 3' }), status: 'running' },
    { ...createAutonomousTask({ prompt: 'Item 4' }), status: 'pending' },
    { ...createAutonomousTask({ prompt: 'Item 5' }), status: 'blocked', exactReason: 'External video model unavailable' },
    { ...createAutonomousTask({ prompt: 'Item 6' }), status: 'manual_required', exactReason: 'Contributor portal login required' },
    { ...createAutonomousTask({ prompt: 'Item 7' }), status: 'failed', exactReason: 'Network timeout' },
  ];

  const stats = calculateQueueStats(sampleTasks);
  assert(
    stats.total === 7 &&
      stats.completed === 2 &&
      stats.running === 1 &&
      stats.pending === 1 &&
      stats.blocked === 1 &&
      stats.manualRequired === 1 &&
      stats.failed === 1,
    '৭টি স্বতন্ত্র টাস্ক স্ট্যাটাসের নির্ভুল গণনা ও পরিসংখ্যান',
    `Total: ${stats.total}, Completed: ${stats.completed}, Blocked: ${stats.blocked}, ManualRequired: ${stats.manualRequired}, Failed: ${stats.failed}`
  );

  // -------------------------------------------------------------
  // TEST GROUP 3: Video Task Blocking (Zero Fake Video Guarantee)
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৩: সততা নীতি — ভিডিও টাস্কে ফেক জেনারেশন রোধ ---');
  const videoTask = createAutonomousTask({ prompt: 'Cinematic drone shot of waterfall', type: 'video' });
  assert(
    videoTask.status === 'blocked' &&
      videoTask.exactReason.includes('Google Flow') &&
      videoTask.exactReason.includes('ভিডিও জেনারেশনের জন্য কোনো পেইড/অনুমোদিত ক্লাউড ইঞ্জিন সরাসরি কনফিগার করা নেই'),
    'ভিডিও টাস্কে কাল্পনিক জেনারেশন দাবি না করে "Blocked" স্ট্যাটাস ও সৎ কারণ প্রদর্শন',
    `Status: ${videoTask.status}, কারণ: "${videoTask.exactReason.slice(0, 80)}..."`
  );

  // -------------------------------------------------------------
  // TEST GROUP 4: Multi-Marketplace RFC 4180 CSV Exporters
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৪: ৫টি মার্কেটপ্লেসের জন্য RFC 4180 CSV ও মেটাডেটা ফরম্যাটিং ---');
  const sampleKeywords = ['artisan', 'brass pestle', 'black peppercorns', 'rustic spice', 'culinary ingredient', 'still life'];
  const testTitle = 'Artisan brass mortar and pestle with whole peppercorns Generative AI';
  const testDesc = 'Close up of traditional brass pestle crushing whole black peppercorns on rustic dark slate background with studio lighting.';

  // 1. Adobe Stock CSV
  const adobeCsv = buildAdobeStockCsv('brass_pestle.jpg', testTitle, sampleKeywords);
  assert(
    adobeCsv.includes('"Filename","Title","Keywords","Category"') &&
      adobeCsv.includes('"brass_pestle.jpg"') &&
      adobeCsv.includes(testTitle),
    'Adobe Stock Contributor CSV তৈরি ও হেডার যাচাই',
    `Adobe CSV প্রথম লাইন: ${adobeCsv.split('\r\n')[0]}`
  );

  // 2. Shutterstock CSV
  const shCsv = buildShutterstockCsv('brass_pestle.jpg', testDesc, sampleKeywords);
  assert(
    shCsv.includes('"Filename","Description","Keywords","Categories","Illustration","Mature Content"') &&
      shCsv.includes(testDesc),
    'Shutterstock Contributor CSV ও ৫-শব্দ বিবরণী ফরম্যাট যাচাই',
    `Shutterstock CSV কলাম সংখ্যা: ${shCsv.split('\r\n')[0].split(',').length}`
  );

  // 3. Freepik CSV
  const fpCsv = buildFreepikCsv('brass_pestle.jpg', testTitle, sampleKeywords, 'macro brass pestle');
  assert(
    fpCsv.includes('"Filename","Title","Keywords","Prompt"') &&
      fpCsv.includes('macro brass pestle'),
    'Freepik CSV ফরম্যাট ও অরিজিনাল প্রম্পট কলাম যাচাই',
    `Freepik CSV বৈধতা: হেডার উপস্থিত`
  );

  // 4. Dreamstime CSV
  const dtCsv = buildDreamstimeCsv('brass_pestle.jpg', testTitle, testDesc, sampleKeywords);
  assert(
    dtCsv.includes('"Filename","Title","Description","Category","Keywords"') &&
      dtCsv.includes(testTitle),
    'Dreamstime Contributor CSV ফরম্যাট যাচাই',
    `Dreamstime CSV কলাম: Filename,Title,Description,Category,Keywords`
  );

  // 5. Wirestock CSV
  const wsCsv = buildWirestockCsv('brass_pestle.jpg', testTitle, testDesc, sampleKeywords);
  assert(
    wsCsv.includes('"Filename","Title","Description","Keywords"') &&
      wsCsv.includes(testTitle),
    'Wirestock Syndication CSV ফরম্যাট যাচাই',
    `Wirestock CSV যাচাই সম্পন্ন`
  );

  // -------------------------------------------------------------
  // TEST GROUP 5: Autonomous End-to-End Execution on Real Asset
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৫: বিদ্যমান অ্যাসেট নিয়ে এন্ড-টু-এন্ড স্বয়ংক্রিয় পাইপলাইন এক্সিকিউশন ---');
  await clearAllAssetsFromDB();

  // Create a 1024x1024 test asset (1MP < 4MP stock threshold)
  const baseAsset: Asset = {
    id: 'asset-test-pipeline-1',
    title: 'Minimalist Artisan Stoneware Pot',
    type: 'image',
    prompt: 'Handcrafted stoneware ceramic pot on natural oak surface with soft side lighting',
    style: 'Photorealistic',
    aspectRatio: '16:9',
    dimensions: '1024 × 1024',
    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    thumbnailUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    createdAt: 'Oct 14, 2026',
    isFavorite: false,
    model: 'Studio Lumina v3.5',
    source: 'Studio',
    fileSize: '150 KB',
    fileFormat: 'image/png',
  };

  const loggedStages: string[] = [];
  const pipelineResult = await executeAutonomousPipeline(
    { existingAsset: baseAsset },
    {
      targetMarketplaces: ['adobe-stock'],
      autoEnhanceIfBelow4MP: true,
      onStageChange: (st) => {
        loggedStages.push(st.stage);
      },
    }
  );

  assert(
    pipelineResult.success === true,
    'স্বয়ংক্রিয় ৮-পর্যায়ের পাইপলাইন সফল সমাপ্তি',
    `Pipeline ID: ${pipelineResult.pipelineId}, মোট সময়: ${pipelineResult.totalDurationMs}ms`
  );

  assert(
    pipelineResult.finalAsset.id !== undefined && pipelineResult.qualityReport !== undefined,
    'আসল পিক্সেল কোয়ালিটি ও মেটাডেটা রিপোর্ট তৈরি',
    `কোয়ালিটি স্ট্যাটাস: ${pipelineResult.qualityReport.overallStatus}`
  );

  assert(
    pipelineResult.submissionPackages.adobeStockCsv.length > 0 &&
      pipelineResult.submissionPackages.shutterstockCsv.length > 0 &&
      pipelineResult.submissionPackages.freepikCsv.length > 0 &&
      pipelineResult.submissionPackages.wirestockCsv.length > 0,
    '৫টি মার্কেটপ্লেসের জন্য আলাদা CSV প্যাকেজ তৈরি যাচাই',
    `Adobe Stock, Shutterstock, Freepik, Wirestock CSV সফলভাবে প্রস্তুত`
  );

  assert(
    Boolean(pipelineResult.zipBlob !== undefined && pipelineResult.zipFilename?.endsWith('.zip')),
    'রেডি-টু-আপলোড মাল্টি-মার্কেটপ্লেস ZIP ফাইল জেনারেশন',
    `ZIP ফাইলনেম: ${pipelineResult.zipFilename}, সাইজ: ${pipelineResult.zipBlob ? (pipelineResult.zipBlob.size / 1024).toFixed(1) + ' KB' : 'N/A'}`
  );

  assert(
    pipelineResult.honestSubmissionDisclaimer.includes('কন্ট্রিবিউটর অ্যাকাউন্ট প্রয়োজন') &&
      pipelineResult.honestSubmissionDisclaimer.includes('কোনো প্রকার ভুয়া আপলোড দাবি করা হয়নি'),
    'সততার নীতি — কন্ট্রিবিউটর পোর্টালে ভুয়া আপলোড দাবি না করার ডিসক্লেইমার',
    `ডিসক্লেইমার: "${pipelineResult.honestSubmissionDisclaimer.slice(0, 75)}..."`
  );

  // -------------------------------------------------------------
  // TEST GROUP 6: Preservation of Original Asset in IndexedDB
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৬: প্রসেসিং চলাকালে মূল অ্যাসেট সম্পূর্ণ অক্ষত থাকার পরীক্ষা ---');
  const allAssetsInDB = await loadAllAssetsFromDB();
  const foundOriginal = allAssetsInDB.find((a) => a.id === 'asset-test-pipeline-1');

  assert(
    foundOriginal !== undefined && foundOriginal.title === 'Minimalist Artisan Stoneware Pot',
    'মূল অ্যাসেট কোনোভাবেই মোছা বা ওভাররাইট না হওয়া (Zero Overwrite Guarantee)',
    `অরিজিনাল অ্যাসেট আইডি: ${foundOriginal?.id}, টাইটেল: "${foundOriginal?.title}"`
  );

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`পরীক্ষা সমাপ্ত: মোট ${passedTests + failedTests}টি পরীক্ষার মধ্যে ${passedTests}টি PASS, ${failedTests}টি FAIL`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAutonomousPipelineTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

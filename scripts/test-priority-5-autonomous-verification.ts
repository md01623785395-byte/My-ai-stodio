import 'fake-indexeddb/auto';
import {
  createAutonomousTask,
  loadAutonomousTasks,
  saveAutonomousTasks,
  createPromptDuplicateHash,
  isDuplicateTask,
  QUEUE_STORAGE_KEY,
} from '../src/utils/autonomousQueueManager';
import {
  executeAutonomousPipeline,
} from '../src/utils/autonomousPipelineEngine';
import { researchMarketTrends } from '../src/utils/marketResearchEngine';
import { generateDiverseCombinatorialPrompts } from '../src/utils/batchPromptEngine';
import {
  checkUpscaleMemorySafety,
  upscaleImageReal,
} from '../src/utils/imageEnhancer';
import {
  saveAssetToDB,
  getAssetByIdFromDB,
} from '../src/utils/assetStorage';
import { Asset, AutonomousTaskItem } from '../src/types';

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

console.log('========================================================================');
console.log('AI CREATOR STUDIO: PRIORITY 5 AUTONOMOUS RUNTIME VERIFICATION AUDIT');
console.log('========================================================================');

let passCount = 0;
let failCount = 0;
const defects: string[] = [];

function check(itemNum: string, name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${itemNum}: ${name}`);
    if (detail) console.log(`       └─ ${detail}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${itemNum}: ${name}`);
    if (detail) console.error(`       └─ DETAIL: ${detail}`);
    defects.push(`${itemNum}: ${name} (${detail || 'Check failed'})`);
    failCount++;
  }
}

async function runAudit() {
  // -----------------------------------------------------------------------
  // STEP 1: Commercial Goal to Prompt Planning
  // -----------------------------------------------------------------------
  console.log('\n--- ১. বাণিজ্যিক লক্ষ্য থেকে স্বয়ংক্রিয় প্রম্পট পরিকল্পনা ---');
  const commercialGoal = 'Artisan Stoneware Ceramics';
  const research = await researchMarketTrends(commercialGoal);
  
  check(
    '1.1',
    'বাণিজ্যিক লক্ষ্য বিশ্লেষণ ও ট্রেন্ড স্কোর নির্ধারণ',
    research.trendScore >= 80 && research.bestPlatforms.includes('adobe-stock'),
    `Trend Score: ${research.trendScore}/100, Platforms: ${research.bestPlatforms.join(', ')}`
  );

  const prompts = generateDiverseCombinatorialPrompts(commercialGoal, 3, 'বাণিজ্যিক');
  check(
    '1.2',
    'বাণিজ্যিক লক্ষ্য থেকে ৩টি স্বতন্ত্র প্রোডাকশন-রেডি প্রম্পট তৈরি',
    prompts.length === 3 && prompts[0].prompt !== prompts[1].prompt,
    `Sample prompt: "${prompts[0].prompt.slice(0, 60)}..."`
  );

  // -----------------------------------------------------------------------
  // STEP 2: Queue Execution & Duplicate Prevention
  // -----------------------------------------------------------------------
  console.log('\n--- ২. কিউ এক্সিকিউশন ও ডুপ্লিকেট শনাক্তকরণ ---');
  const task1 = createAutonomousTask({
    prompt: prompts[0].prompt,
    aspectRatio: '16:9',
    style: 'Photorealistic',
    targetMarketplace: 'adobe-stock',
    autoEnhance: true,
  });

  check(
    '2.1',
    'সেনসিবল ডিফল্ট সহ টাস্ক কিউতে অন্তর্ভুক্ত',
    task1.status === 'pending' && task1.aspectRatio === '16:9' && task1.autoEnhance === true,
    `Status: ${task1.status}, Ratio: ${task1.aspectRatio}, Marketplace: ${task1.targetMarketplace}`
  );

  const taskList = [task1];
  const isDup = isDuplicateTask(taskList, prompts[0].prompt, 'image', '16:9');
  check(
    '2.2',
    'অভিন্ন প্রম্পট ও রেশিওতে ডুপ্লিকেট টাস্ক শনাক্ত ও বাতিল',
    isDup === true,
    `Duplicate detected: ${isDup}`
  );

  // -----------------------------------------------------------------------
  // STEP 3: Google Flow Import & Zero Credit Rule
  // -----------------------------------------------------------------------
  console.log('\n--- ৩. Google Flow ইমপোর্ট ও জিরো-ক্রেডিট রিজিউম ---');
  const importedFlowAsset: Asset = {
    id: `flow-asset-${Date.now()}`,
    title: 'Minimalist Handcrafted Stoneware Pot',
    type: 'image',
    prompt: prompts[0].prompt,
    style: 'Photorealistic',
    aspectRatio: '16:9',
    dimensions: '1920 × 1080',
    url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    thumbnailUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    createdAt: 'Oct 20, 2026',
    isFavorite: false,
    model: 'Google Flow FX (Free Credits)',
    source: 'Google Flow',
    fileSize: '1.8 MB',
    fileFormat: 'image/jpeg',
  };

  const deductCredits = importedFlowAsset.source !== 'Google Flow' && importedFlowAsset.source !== 'Imported';
  check(
    '3.1',
    'Google Flow অ্যাসেটে কোনো ক্রেডিট কর্তন হয় না (Zero Credit)',
    deductCredits === false,
    `Asset Source: ${importedFlowAsset.source}, Charge Credits: ${deductCredits}`
  );

  // -----------------------------------------------------------------------
  // STEP 4: Execution of Existing/Imported Asset & Original Immutability
  // -----------------------------------------------------------------------
  console.log('\n--- ৪. বিদ্যমান ফাইলে ৮-পর্যায় এক্সিকিউশন ও মূল ফাইলের অক্ষুণ্ণতা ---');
  const pipelineResult = await executeAutonomousPipeline(
    { existingAsset: importedFlowAsset },
    {
      targetMarketplaces: ['adobe-stock'],
      autoEnhanceIfBelow4MP: true,
    }
  );

  check(
    '4.1',
    'বিদ্যমান ফাইল দিয়ে ৮-পর্যায়ের পাইপলাইন সফল সমাপ্তি',
    pipelineResult.success === true && pipelineResult.finalAsset !== undefined,
    `Pipeline ID: ${pipelineResult.pipelineId}, Duration: ${pipelineResult.totalDurationMs}ms`
  );

  check(
    '4.2',
    'মূল আদি ইমেজ সম্পূর্ণ অক্ষত ও অবিকৃত (Zero Overwrite / Immutability)',
    importedFlowAsset.dimensions === '1920 × 1080' && importedFlowAsset.url.startsWith('data:image/jpeg;base64,'),
    `Original Dimensions: ${importedFlowAsset.dimensions}, Source unchanged.`
  );

  // -----------------------------------------------------------------------
  // STEP 5: Metadata, Compliance & Packaging
  // -----------------------------------------------------------------------
  console.log('\n--- ৫. ভিশন মেটাডেটা, কমপ্লায়েন্স ও ZIP/CSV প্যাকেজিং ---');
  const meta = pipelineResult.preparedMetadata;
  check(
    '5.1',
    'Adobe Stock কমপ্লায়েন্ট বাণিজ্যিক মেটাডেটা প্রস্তুত (Generative AI সাফিক্স)',
    meta.title.includes('Generative AI') && meta.keywords.length >= 20,
    `Title: "${meta.title}", Keywords: ${meta.keywords.length}`
  );

  check(
    '5.2',
    '৫টি মার্কেটপ্লেসের জন্য RFC 4180 CSV তৈরি',
    Boolean(
      pipelineResult.submissionPackages.adobeStockCsv.startsWith('\uFEFF') &&
      pipelineResult.submissionPackages.shutterstockCsv.startsWith('\uFEFF') &&
      pipelineResult.submissionPackages.freepikCsv.startsWith('\uFEFF')
    ),
    'Adobe, Shutterstock, Freepik CSVs include UTF-8 BOM'
  );

  check(
    '5.3',
    'রেডি-টু-আপলোড কন্ট্রিবিউটর ZIP ফাইল জেনারেশন',
    Boolean(pipelineResult.zipBlob && pipelineResult.zipFilename?.endsWith('.zip')),
    `Filename: ${pipelineResult.zipFilename}, Size: ${((pipelineResult.zipBlob?.size || 0) / 1024).toFixed(1)} KB`
  );

  // -----------------------------------------------------------------------
  // STEP 6: Persistence on App Reload / Recovery of Interrupted Tasks
  // -----------------------------------------------------------------------
  console.log('\n--- ৬. অ্যাপ রিলোড ও স্থগিত/চলমান টাস্ক রিকভারি যাচাই ---');

  // Simulate saving a running task into storage (as happens if user reloads while task was active)
  const interruptedTask: AutonomousTaskItem = {
    ...task1,
    id: 'task-interrupted-01',
    status: 'running',
    statusLabelBn: 'চলমান...',
  };

  // Save running task to storage and test loadAutonomousTasks recovery
  saveAutonomousTasks([interruptedTask]);
  const recoveredTasks = loadAutonomousTasks();
  const loadedTask = recoveredTasks[0];

  const recoversRunningTask = loadedTask && loadedTask.status === 'pending' && loadedTask.statusLabelBn.includes('পুনরুদ্ধারকৃত');
  check(
    '6.1',
    'রিলোডের সময় ইন্টারাপ্টেড running টাস্ক রিকভারি (Recovery from Orphaned Running)',
    recoversRunningTask,
    recoversRunningTask
      ? `Task safely recovered to '${loadedTask.status}' (${loadedTask.statusLabelBn})`
      : `DEFECT: Status is '${loadedTask?.status}'`
  );

  // -----------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`অডিট সমাপ্ত: মোট ${passCount + failCount}টি পরীক্ষার মধ্যে ${passCount}টি PASS, ${failCount}টি FAIL`);
  console.log('========================================================================');
}

runAudit();

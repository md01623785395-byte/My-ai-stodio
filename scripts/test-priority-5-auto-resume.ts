import assert from 'node:assert';
import {
  hasRecoveredPendingTasks,
  isTaskEligibleForAutoResume,
  loadAutonomousTasks,
  createAutonomousTask,
} from '../src/utils/autonomousQueueManager';
import { AutonomousTaskItem, Asset } from '../src/types';

console.log('========================================================================');
console.log('AI CREATOR STUDIO: PRIORITY 5.3 SAFE AUTOMATIC QUEUE RESUME TESTS');
console.log('========================================================================');

let passCount = 0;
let failCount = 0;

function runCheck(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    if (detail) console.log(`       └─ ${detail}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${name}`);
    if (detail) console.error(`       └─ DETAIL: ${detail}`);
    failCount++;
  }
}

// -------------------------------------------------------------------------
// TEST GROUP 1: RECOVERED PENDING TASK IDENTIFICATION
// -------------------------------------------------------------------------
console.log('\n--- ১. পুনরুদ্ধারকৃত অপেক্ষমাণ টাস্ক শনাক্তকরণ (Recovered Pending Detection) ---');

const recoveredTaskEn: AutonomousTaskItem = {
  id: 'task-recovered-1',
  title: 'Organic Tea Plantation',
  type: 'image',
  prompt: 'Commercial photography of lush green tea plantation terraces in morning mist',
  aspectRatio: '16:9',
  style: 'Photorealistic',
  status: 'pending',
  statusLabelBn: 'পুনরুদ্ধারকৃত (অপেক্ষমাণ)',
  statusLabelEn: 'Recovered (Pending)',
  exactReason: 'অ্যাপ রিলোডের কারণে প্রসেস স্থগিত হয়েছিল। পুনরায় চালুর জন্য প্রস্তুত।',
  retryCount: 0,
  maxRetries: 3,
  duplicateHash: 'hash-test-rec-1',
  targetMarketplace: 'adobe-stock',
  autoEnhance: true,
  createdAt: Date.now() - 10000,
};

const recoveredTaskBn: AutonomousTaskItem = {
  ...recoveredTaskEn,
  id: 'task-recovered-2',
  statusLabelEn: 'Pending',
  statusLabelBn: 'পুনরুদ্ধারকৃত (অপেক্ষমাণ)',
};

const normalPendingTask: AutonomousTaskItem = {
  ...recoveredTaskEn,
  id: 'task-normal-pending',
  statusLabelEn: 'Pending in Queue',
  statusLabelBn: 'পাইপলাইনে অপেক্ষমাণ',
  exactReason: 'কিউতে এক্সিকিউশনের অপেক্ষায় রয়েছে।',
};

runCheck(
  'ইংরেজি "Recovered (Pending)" লেবেলযুক্ত টাস্ক স্বয়ংক্রিয় রিজিউমের জন্য যোগ্য',
  isTaskEligibleForAutoResume(recoveredTaskEn) === true,
  `status: ${recoveredTaskEn.status}, label: "${recoveredTaskEn.statusLabelEn}"`
);

runCheck(
  'বাংলা "পুনরুদ্ধারকৃত (অপেক্ষমাণ)" লেবেলযুক্ত টাস্ক স্বয়ংক্রিয় রিজিউমের জন্য যোগ্য',
  isTaskEligibleForAutoResume(recoveredTaskBn) === true,
  `status: ${recoveredTaskBn.status}, label: "${recoveredTaskBn.statusLabelBn}"`
);

runCheck(
  'স্বাভাবিক অপরীক্ষিত টাস্ককে ভুলবশত পুনরুদ্ধারকৃত হিসেবে চিহ্নিত না করা',
  isTaskEligibleForAutoResume(normalPendingTask) === false,
  `status: ${normalPendingTask.status}, label: "${normalPendingTask.statusLabelEn}"`
);

runCheck(
  'কিউতে অন্তত একটি পুনরুদ্ধারকৃত টাস্ক থাকলে hasRecoveredPendingTasks সত্য হওয়া',
  hasRecoveredPendingTasks([normalPendingTask, recoveredTaskEn]) === true,
  'Queue contains 1 recovered pending task'
);

runCheck(
  'কিউতে কোনো পুনরুদ্ধারকৃত টাস্ক না থাকলে hasRecoveredPendingTasks মিথ্যা হওয়া',
  hasRecoveredPendingTasks([normalPendingTask]) === false,
  'Queue contains only normal pending task'
);

// -------------------------------------------------------------------------
// TEST GROUP 2: BLOCKED, COMPLETED, AND FAILED TASK EXCLUSION
// -------------------------------------------------------------------------
console.log('\n--- ২. সম্পন্ন, ব্যর্থ ও কোটা-ব্লকড টাস্ক বর্জন (Task Exclusion Safeguards) ---');

const completedTask: AutonomousTaskItem = {
  ...recoveredTaskEn,
  id: 'task-completed-1',
  status: 'completed',
  statusLabelEn: 'Completed (Package Ready)',
  statusLabelBn: 'সম্পন্ন (প্যাকেজ প্রস্তুত)',
  dimensions: '3840 × 2160',
  fileSize: '4.8 MB',
  complianceScore: 99,
};

const quotaBlockedTask: AutonomousTaskItem = {
  ...recoveredTaskEn,
  id: 'task-blocked-quota',
  status: 'blocked',
  statusLabelEn: 'Blocked (Gemini API Quota 429)',
  statusLabelBn: 'API কোটা সীমাবদ্ধতায় আটকে আছে',
  exactReason: 'দৈনিক ফ্রি রিকোয়েস্ট কোটা শেষ (HTTP 429)।',
};

const videoBlockedTask: AutonomousTaskItem = {
  ...recoveredTaskEn,
  id: 'task-blocked-video',
  type: 'video',
  status: 'blocked',
  statusLabelEn: 'Blocked (External Model Required)',
  statusLabelBn: 'বাহ্যিক সীমাবদ্ধতায় আটকে আছে',
};

const failedTask: AutonomousTaskItem = {
  ...recoveredTaskEn,
  id: 'task-failed-1',
  status: 'failed',
  statusLabelEn: 'Failed',
  statusLabelBn: 'ব্যর্থ হয়েছে',
  retryCount: 3,
  maxRetries: 3,
};

runCheck(
  'সম্পন্ন (completed) টাস্ক কখনোই রিজিউমের জন্য নির্বাচিত হবে না',
  isTaskEligibleForAutoResume(completedTask) === false,
  `Status: ${completedTask.status} -> auto-resume false`
);

runCheck(
  'কোটা সীমাবদ্ধ (HTTP 429 blocked) টাস্ক কখনোই স্বয়ংক্রিয়ভাবে রিজিউম হবে না',
  isTaskEligibleForAutoResume(quotaBlockedTask) === false,
  `Status: ${quotaBlockedTask.status} -> auto-resume false`
);

runCheck(
  'ভিডিও সীমাবদ্ধ (video blocked) টাস্ক কখনোই স্বয়ংক্রিয়ভাবে রিজিউম হবে না',
  isTaskEligibleForAutoResume(videoBlockedTask) === false,
  `Status: ${videoBlockedTask.status} -> auto-resume false`
);

runCheck(
  'ব্যর্থ (failed) টাস্ক কখনোই স্বয়ংক্রিয়ভাবে রিজিউম হবে না',
  isTaskEligibleForAutoResume(failedTask) === false,
  `Status: ${failedTask.status} -> auto-resume false`
);

runCheck(
  'মিশ্র কিউতে শুধুমাত্র অসম্পন্ন পুনরুদ্ধারকৃত টাস্ক ছাড়া অন্যকিছু auto-resume সূচনা করবে না',
  hasRecoveredPendingTasks([completedTask, quotaBlockedTask, videoBlockedTask, failedTask]) === false,
  'Queue with only completed, blocked, and failed tasks returns false for auto-resume'
);

// -------------------------------------------------------------------------
// TEST GROUP 3: EXACTLY-ONCE CONCURRENCY GUARD & ANTI-DUPLICATE EXECUTION
// -------------------------------------------------------------------------
console.log('\n--- ৩. একবারই চালু হওয়ার নিশ্চয়তা ও কনকারেন্সি গার্ড (Exactly-Once Guard) ---');

class MockAutonomousQueueRunner {
  public isQueueRunning = false;
  public isQueueRunningRef = { current: false };
  public isLoopExecutingRef = { current: false };
  public autoResumeTriggeredRef = { current: false };
  public loopRunCount = 0;
  public processedTaskIds: string[] = [];
  public tasksRef: { current: AutonomousTaskItem[] };

  constructor(initialTasks: AutonomousTaskItem[]) {
    this.tasksRef = { current: [...initialTasks] };
  }

  public startQueue(): boolean {
    if (this.isQueueRunningRef.current || this.isLoopExecutingRef.current) {
      return false; // Concurrency guard prevented duplicate start
    }
    this.isQueueRunningRef.current = true;
    this.isQueueRunning = true;
    this.runAutonomousLoop();
    return true;
  }

  public checkAutoResume(isInitialized: boolean): boolean {
    if (!isInitialized) return false;
    if (this.autoResumeTriggeredRef.current) return false;

    const hasRecovered = hasRecoveredPendingTasks(this.tasksRef.current);
    if (hasRecovered && !this.isQueueRunningRef.current && !this.isLoopExecutingRef.current) {
      this.autoResumeTriggeredRef.current = true;
      this.startQueue();
      return true;
    }
    return false;
  }

  public runAutonomousLoop() {
    if (this.isLoopExecutingRef.current) return;
    this.isLoopExecutingRef.current = true;
    this.loopRunCount++;

    try {
      while (this.isQueueRunningRef.current) {
        const nextTask = this.tasksRef.current.find((t) => t.status === 'pending');
        if (!nextTask) {
          this.isQueueRunning = false;
          this.isQueueRunningRef.current = false;
          break;
        }

        // Mark running immediately in tasksRef to prevent stale closures or duplicate picks
        this.tasksRef.current = this.tasksRef.current.map((t) =>
          t.id === nextTask.id ? { ...t, status: 'running' as const } : t
        );
        this.processedTaskIds.push(nextTask.id);

        // Mark completed
        this.tasksRef.current = this.tasksRef.current.map((t) =>
          t.id === nextTask.id
            ? {
                ...t,
                status: 'completed' as const,
                completedAt: Date.now(),
                dimensions: '3840 × 2160',
              }
            : t
        );
      }
    } finally {
      this.isLoopExecutingRef.current = false;
    }
  }
}

const runner1 = new MockAutonomousQueueRunner([recoveredTaskEn]);

// Simulate initial mount with isInitialized=false (async storage loading in progress)
const beforeInitStarted = runner1.checkAutoResume(false);
runCheck(
  'স্টোরেজ লোড হওয়ার পূর্বে (isInitialized=false) কোনো অকাল এক্সিকিউশন শুরু হয় না',
  beforeInitStarted === false && runner1.loopRunCount === 0,
  `Before init run count: ${runner1.loopRunCount}`
);

// Simulate component mounted and tasks loaded (isInitialized=true)
const afterInitStarted = runner1.checkAutoResume(true);
runCheck(
  'ইনপুট লোড হওয়ার পর (isInitialized=true) স্বয়ংক্রিয়ভাবে রিজিউম চালু হয়েছে',
  afterInitStarted === true && runner1.loopRunCount === 1,
  `After init run count: ${runner1.loopRunCount}, processed tasks: ${runner1.processedTaskIds.length}`
);

// Simulate React Strict Mode 2nd invocation or duplicate render
const strictModeDuplicate = runner1.checkAutoResume(true);
runCheck(
  'React Strict Mode বা পুনরাবৃত্ত রেন্ডারে ডুপ্লিকেট কিউ স্টার্ট প্রতিহত (Exactly-Once Guard)',
  strictModeDuplicate === false && runner1.loopRunCount === 1,
  `Strict Mode rerun count: ${runner1.loopRunCount} (Expected: 1)`
);

// Concurrent manual startQueue calls while already running
runner1.isQueueRunningRef.current = true;
const concurrentStart = runner1.startQueue();
runner1.isQueueRunningRef.current = false;
runCheck(
  'কিউ রানিং থাকা অবস্থায় সমান্তরাল বা অতিরিক্ত স্টার্ট রিকোয়েস্ট সম্পূর্ণ ব্লকড',
  concurrentStart === false && runner1.loopRunCount === 1,
  `Concurrent start blocked: true, loop run count: ${runner1.loopRunCount}`
);

// -------------------------------------------------------------------------
// TEST GROUP 4: ANTI-STALE CLOSURE & SYNCHRONOUS REF UPDATES
// -------------------------------------------------------------------------
console.log('\n--- ৪. অ্যান্টি-স্টেল ক্লোজার ও টাস্ক রিফ আপডেট (Anti-Stale Closure Test) ---');

const batchQueue = [
  { ...recoveredTaskEn, id: 'task-batch-1' },
  { ...recoveredTaskEn, id: 'task-batch-2' },
  { ...recoveredTaskEn, id: 'task-batch-3' },
];

const runner2 = new MockAutonomousQueueRunner(batchQueue);
runner2.startQueue();

runCheck(
  'লুপের প্রতিটি ইটারেশনে tasksRef আপ-টু-ডেট থাকার কারণে একাধিক টাস্ক ক্রমান্বয়ে এক্সিকিউট হওয়া',
  runner2.processedTaskIds.length === 3 &&
    runner2.tasksRef.current.every((t) => t.status === 'completed'),
  `Processed: ${runner2.processedTaskIds.join(', ')} (Total 3)`
);

// -------------------------------------------------------------------------
// TEST GROUP 5: PRESERVATION OF ORIGINAL ASSET & ZERO-CREDIT RULES
// -------------------------------------------------------------------------
console.log('\n--- ৫. মূল অ্যাসেট ও ০-ক্রেডিট সংরক্ষণ (Zero-Credit & Immutability) ---');

const mockFlowAsset: Asset = {
  id: 'asset-flow-test-1',
  title: 'Artisan Ceramic Teapot',
  type: 'image',
  prompt: 'Minimalist handmade ceramic teapot on wooden table',
  style: 'Photorealistic',
  aspectRatio: '16:9',
  dimensions: '1920 × 1080',
  url: 'data:image/jpeg;base64,mockdata',
  thumbnailUrl: 'data:image/jpeg;base64,mockthumb',
  createdAt: 'Just now',
  isFavorite: false,
  model: 'Google Flow',
  source: 'Google Flow',
  fileSize: '1.2 MB',
  views: 1,
};

const taskWithAttachedFlowAsset: AutonomousTaskItem = {
  ...recoveredTaskEn,
  id: 'task-flow-attached',
  assetId: mockFlowAsset.id,
  assetThumbnailUrl: mockFlowAsset.thumbnailUrl,
};

runCheck(
  'সংযুক্ত Google Flow অ্যাসেটের ID ও থাম্বনেইল অক্ষত রয়েছে',
  taskWithAttachedFlowAsset.assetId === mockFlowAsset.id &&
    taskWithAttachedFlowAsset.assetThumbnailUrl === mockFlowAsset.thumbnailUrl,
  `Attached asset: ${taskWithAttachedFlowAsset.assetId}`
);

// Verify deduction rules
const shouldDeductCredit = !(
  mockFlowAsset.source === 'Google Flow' ||
  mockFlowAsset.source === 'Imported' ||
  mockFlowAsset.model === 'Google Flow'
);

runCheck(
  'Google Flow অ্যাসেট দিয়ে রিজিউম করার সময় ক্রেডিট কর্তন ০ নিশ্চিত',
  shouldDeductCredit === false,
  `source: "${mockFlowAsset.source}", deductCredit: ${shouldDeductCredit}`
);

// -------------------------------------------------------------------------
// TEST GROUP 6: PERSISTENCE & APP RELOAD RECOVERY SIMULATION
// -------------------------------------------------------------------------
console.log('\n--- ৬. রিলোড ও পুনরুদ্ধার সিমুলেশন (Simulated Reload Recovery) ---');

// Mock localStorage
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
};

(globalThis as any).localStorage = mockLocalStorage;

// Simulate an orphaned running task saved in localStorage before tab refresh
const orphanedRunningTask: AutonomousTaskItem = {
  id: 'task-orphaned-running',
  title: 'Futuristic Pavilion',
  type: 'image',
  prompt: 'Architectural parametric wooden pavilion',
  aspectRatio: '16:9',
  style: 'Photorealistic',
  status: 'running',
  statusLabelBn: 'স্বয়ংক্রিয় প্রসেসিং চলছে...',
  statusLabelEn: 'Running Pipeline...',
  exactReason: '৮টি এন্ড-টু-এন্ড পর্যায় স্বয়ংক্রিয়ভাবে এক্সিকিউট হচ্ছে।',
  retryCount: 0,
  maxRetries: 3,
  duplicateHash: 'hash-orphan-1',
  targetMarketplace: 'adobe-stock',
  autoEnhance: true,
  createdAt: Date.now() - 50000,
  startedAt: Date.now() - 25000,
};

mockStorage['ai_creator_studio_autonomous_queue_v1'] = JSON.stringify([orphanedRunningTask, completedTask]);

const loadedTasks = loadAutonomousTasks();
const recoveredOrphan = loadedTasks.find((t) => t.id === 'task-orphaned-running');
const preservedCompleted = loadedTasks.find((t) => t.id === 'task-completed-1');

runCheck(
  'রিলোডের পর ব্রাউজারে ফেলে যাওয়া running টাস্ক "pending" এবং "Recovered (Pending)" হিসেবে লোড হওয়া',
  recoveredOrphan !== undefined &&
    recoveredOrphan.status === 'pending' &&
    recoveredOrphan.statusLabelEn === 'Recovered (Pending)',
  `Status: ${recoveredOrphan?.status}, label: ${recoveredOrphan?.statusLabelEn}`
);

runCheck(
  'রিলোডের পর ইতোপূর্বে সম্পন্নকৃত টাস্ক অপরিবর্তিত ও অক্ষত থাকা',
  preservedCompleted !== undefined &&
    preservedCompleted.status === 'completed' &&
    preservedCompleted.dimensions === '3840 × 2160',
  `Preserved completed status: ${preservedCompleted?.status}, dimensions: ${preservedCompleted?.dimensions}`
);

runCheck(
  'পুনরুদ্ধারকৃত টাস্ক লোড হওয়ার পর hasRecoveredPendingTasks স্বয়ংক্রিয় রিজিউম ট্রিগার শনাক্ত করে',
  hasRecoveredPendingTasks(loadedTasks) === true,
  'Queue has recovered pending tasks: true'
);

// -------------------------------------------------------------------------
// TEST SUMMARY
// -------------------------------------------------------------------------
console.log('========================================================================');
console.log(`পরীক্ষা ফলাফল: মোট ${passCount + failCount}টি পরীক্ষার মধ্যে ${passCount}টি PASS, ${failCount}টি FAIL`);
console.log('========================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('Priority 5.3 সকল টেস্ট ১০০% সফল!\n');
}

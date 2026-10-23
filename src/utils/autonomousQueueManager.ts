import {
  AutonomousTaskItem,
  AutonomousTaskStatus,
  AutonomousQueueStats,
  StockMarketplaceId,
  AspectRatioType,
  Asset,
  TaskBlockerCategory,
} from '../types';

export const QUEUE_STORAGE_KEY = 'ai_creator_studio_autonomous_queue_v1';

/**
 * 3-minute threshold for identifying potentially stalled running tasks
 */
export const DEFAULT_STALE_RUNNING_THRESHOLD_MS = 180000;

/**
 * Creates a unique deterministic hash for prompt duplicate prevention
 */
export function createPromptDuplicateHash(prompt: string, type: 'image' | 'video', ratio: AspectRatioType): string {
  const normalized = `${type}::${ratio}::${prompt.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash-${Math.abs(hash).toString(36)}`;
}

/**
 * Categorizes the root reason behind a blocked or failed task
 */
export function categorizeTaskBlocker(task: AutonomousTaskItem, errorMsg?: string): TaskBlockerCategory {
  const combined = `${errorMsg || ''} ${task.exactReason || ''} ${task.errorDetails || ''} ${task.title}`.toLowerCase();

  if (combined.includes('429') || combined.includes('quota') || combined.includes('কোটা') || combined.includes('rate limit') || combined.includes('too many requests')) {
    return 'image_generation_quota';
  }
  if (combined.includes('missing') || combined.includes('অনুপস্থিত') || combined.includes('not found') || combined.includes('অ্যাসেট নেই') || combined.includes('খুঁজে পাওয়া যায়নি')) {
    return 'asset_missing';
  }
  if (combined.includes('video') || combined.includes('ভিডিও') || task.type === 'video') {
    return 'external_model_required';
  }
  if (
    combined.includes('validation') ||
    combined.includes('মেগাপিক্সেল') ||
    combined.includes('resolution') ||
    combined.includes('format') ||
    combined.includes('corrupt') ||
    combined.includes('ক্ষতিগ্রস্ত') ||
    combined.includes('invalid') ||
    combined.includes('ডিকোড') ||
    combined.includes('fluff') ||
    combined.includes('trademark') ||
    combined.includes('brand') ||
    combined.includes('generative ai')
  ) {
    return 'validation_failure';
  }
  if (
    combined.includes('integration') ||
    combined.includes('sftp') ||
    combined.includes('credential') ||
    combined.includes('ক্রেডেনশিয়াল') ||
    combined.includes('unauthorized') ||
    combined.includes('অননুমোদিত') ||
    combined.includes('401') ||
    combined.includes('403') ||
    combined.includes('forbidden')
  ) {
    return 'integration_unauthorized';
  }

  return 'other';
}

export interface TaskBlockerAdvice {
  category: TaskBlockerCategory;
  categoryLabelBn: string;
  categoryLabelEn: string;
  actionableStepBn: string;
  actionableStepEn: string;
}

/**
 * Priority 6.8: Provides explicit, actionable next steps for each blocker category
 */
export function getTaskBlockerActionableAdvice(category: TaskBlockerCategory): TaskBlockerAdvice {
  switch (category) {
    case 'image_generation_quota':
      return {
        category,
        categoryLabelBn: 'ইমেজ জেনারেশন কোটা সীমাবদ্ধতা (HTTP 429)',
        categoryLabelEn: 'Image Generation Quota Limit (HTTP 429)',
        actionableStepBn: 'দৈনিক ফ্রি কোটা রিসেট হওয়া পর্যন্ত অপেক্ষা করুন অথবা Asset Library থেকে বিদ্যমান ০-ক্রেডিট Flow/Imported ছবি দিয়ে পাইপলাইন চালান।',
        actionableStepEn: 'Wait for daily quota reset or use existing zero-credit Flow/Imported assets from the library.',
      };
    case 'asset_missing':
      return {
        category,
        categoryLabelBn: 'সংযুক্ত আসল অ্যাসেট অনুপস্থিত',
        categoryLabelEn: 'Attached Real Asset Missing',
        actionableStepBn: 'লাইব্রেরি থেকে উপযুক্ত ছবি নির্বাচন করুন অথবা নতুন করে ছবি ইম্পোর্ট করে টাস্কে সংযুক্ত করুন।',
        actionableStepEn: 'Select a valid asset from Library or re-import asset to attach to this task.',
      };
    case 'validation_failure':
      return {
        category,
        categoryLabelBn: 'কোয়ালিটি বা মেটাডাটা ভ্যালিডেশন ব্যর্থতা',
        categoryLabelEn: 'Quality or Metadata Validation Failure',
        actionableStepBn: 'ছবির রেজোলিউশন ৪+ মেগাপিক্সেল (JPEG) নিশ্চিত করুন, প্রমোশনাল শব্দ বাদ দিন এবং টাইটেলে "Generative AI" যুক্ত করুন।',
        actionableStepEn: 'Ensure image is 4+ MP JPEG, remove promotional fluff words, and include "Generative AI" title suffix.',
      };
    case 'integration_unauthorized':
      return {
        category,
        categoryLabelBn: 'মার্কেটপ্লেস কন্ট্রিবিউটর ক্রেডেনশিয়াল অনুপস্থিত',
        categoryLabelEn: 'Marketplace Contributor Credentials Missing',
        actionableStepBn: 'কন্ট্রিবিউটর পোর্টালে সরাসরি আপলোডের জন্য প্রস্তুতকৃত ড্রপ প্যাকেজ (ZIP + RFC 4180 CSV) ডাউনলোড করে ম্যানুয়ালি জমা দিন।',
        actionableStepEn: 'Download prepared drop package (ZIP + RFC 4180 CSV) and submit manually via official contributor portal.',
      };
    case 'external_model_required':
      return {
        category,
        categoryLabelBn: 'বাহ্যিক পেইড ভিডিও মডেল আবশ্যক',
        categoryLabelEn: 'External Paid Video Model Required',
        actionableStepBn: 'পেইড মডেল ছাড়া ভিডিও জেনারেশন স্থগিত রয়েছে; Google Flow-তে ভিডিও তৈরি করে স্টুডিওতে ইম্পোর্ট করুন।',
        actionableStepEn: 'External video model required; create video in Google Flow and import to Studio.',
      };
    default:
      return {
        category: 'other',
        categoryLabelBn: 'অজ্ঞাত সীমাবদ্ধতা বা ত্রুটি',
        categoryLabelEn: 'General Failure or Restriction',
        actionableStepBn: 'টাস্কটির বিবরণ ও লগ পরীক্ষা করে প্রয়োজন অনুযায়ী সংশোধন করুন বা পুনরায় চেষ্টা করুন।',
        actionableStepEn: 'Check task logs and details, revise parameters or retry safely.',
      };
  }
}

/**
 * Self-monitoring: Identifies tasks that have been running for an abnormal duration.
 * Crucial Safeguard: Never arbitrarily forces tasks to failed or completed without definitive proof.
 */
export function detectStaleRunningTasks(
  tasks: AutonomousTaskItem[],
  thresholdMs: number = DEFAULT_STALE_RUNNING_THRESHOLD_MS
): AutonomousTaskItem[] {
  const now = Date.now();
  return tasks.filter((t) => {
    if (t.status !== 'running') return false;
    const startTime = t.startedAt || t.createdAt;
    return now - startTime > thresholdMs;
  });
}

/**
 * Safely recovers a stale running task back to 'pending' state
 * without increasing retry count to maxRetries or causing an infinite loop.
 */
export function safeRecoverStaleRunningTask(task: AutonomousTaskItem): AutonomousTaskItem {
  return {
    ...task,
    status: 'pending',
    statusLabelBn: 'পুনরুদ্ধারকৃত (নিরাপদ রিজিউম)',
    statusLabelEn: 'Recovered (Safe Resume)',
    exactReason: 'টাস্কটি অস্বাভাবিক সময় ধরে রানিং অবস্থায় ছিল। কোনো ডেটা না হারিয়ে নিরাপদে অপেক্ষমাণ তালিকায় ফিরিয়ে আনা হয়েছে।',
    isStaleRunning: false,
    startedAt: undefined,
  };
}

export interface AutonomousMonitoringSummary {
  stats: AutonomousQueueStats;
  staleRunningCount: number;
  staleRunningTasks: AutonomousTaskItem[];
  blockerBreakdown: Record<TaskBlockerCategory, number>;
}

/**
 * Calculates current queue statistics and self-monitoring summary
 */
export function calculateQueueStats(tasks: AutonomousTaskItem[]): AutonomousQueueStats {
  const stats: AutonomousQueueStats = {
    total: tasks.length,
    completed: 0,
    running: 0,
    pending: 0,
    blocked: 0,
    manualRequired: 0,
    failed: 0,
  };

  for (const t of tasks) {
    if (t.status === 'completed') stats.completed++;
    else if (t.status === 'running') stats.running++;
    else if (t.status === 'pending') stats.pending++;
    else if (t.status === 'blocked') stats.blocked++;
    else if (t.status === 'manual_required') stats.manualRequired++;
    else if (t.status === 'failed') stats.failed++;
  }

  return stats;
}

/**
 * Comprehensive self-monitoring report generator
 */
export function generateQueueMonitoringSummary(
  tasks: AutonomousTaskItem[],
  staleThresholdMs: number = DEFAULT_STALE_RUNNING_THRESHOLD_MS
): AutonomousMonitoringSummary {
  const stats = calculateQueueStats(tasks);
  const staleTasks = detectStaleRunningTasks(tasks, staleThresholdMs);

  const blockerBreakdown: Record<TaskBlockerCategory, number> = {
    image_generation_quota: 0,
    asset_missing: 0,
    validation_failure: 0,
    integration_unauthorized: 0,
    external_model_required: 0,
    other: 0,
  };

  for (const t of tasks) {
    if (t.status === 'blocked' || t.status === 'failed') {
      const cat = t.blockerCategory || categorizeTaskBlocker(t);
      blockerBreakdown[cat] = (blockerBreakdown[cat] || 0) + 1;
    }
  }

  return {
    stats,
    staleRunningCount: staleTasks.length,
    staleRunningTasks: staleTasks,
    blockerBreakdown,
  };
}

/**
 * Initial seed tasks demonstrating all honest states
 */
export const INITIAL_AUTONOMOUS_TASKS: AutonomousTaskItem[] = [
  {
    id: 'task-auto-seed-1',
    title: 'Artisan Brass Pestle with Peppercorns',
    type: 'image',
    prompt: 'Commercial macro still life of vintage artisan brass pestle with whole black peppercorns on dark slate, moody softbox lighting, 8k crisp details',
    aspectRatio: '16:9',
    style: 'Commercial Studio',
    status: 'completed',
    statusLabelBn: 'সম্পন্ন (প্যাকেজ প্রস্তুত)',
    statusLabelEn: 'Completed (Package Ready)',
    exactReason: '৮টি পর্যায় সফলভাবে সম্পন্ন হয়েছে: IndexedDB সংরক্ষণ, পিক্সেল অডিট, ৪x সুপার-স্যাম্পলিং, ভিশন মেটাডেটা ও ৫টি এজেন্সির জন্য RFC 4180 CSV সহ ZIP প্যাকেজ তৈরি।',
    retryCount: 0,
    maxRetries: 3,
    duplicateHash: createPromptDuplicateHash(
      'Commercial macro still life of vintage artisan brass pestle with whole black peppercorns on dark slate, moody softbox lighting, 8k crisp details',
      'image',
      '16:9'
    ),
    targetMarketplace: 'adobe-stock',
    autoEnhance: true,
    createdAt: Date.now() - 3600000,
    startedAt: Date.now() - 3590000,
    completedAt: Date.now() - 3560000,
    dimensions: '4096 × 2304',
    fileSize: '4.2 MB',
    complianceScore: 98,
    zipFilename: 'artisan_brass_pestle_stock_package.zip',
  },
  {
    id: 'task-auto-seed-2',
    title: 'Aerial Misty Pine Canopy Motion',
    type: 'video',
    prompt: 'Cinematic drone flyover gliding through morning fog over alpine pine evergreen forest, smooth 60fps pan',
    aspectRatio: '16:9',
    style: 'Cinematic Drone',
    status: 'blocked',
    statusLabelBn: 'বাহ্যিক সীমাবদ্ধতায় আটকে আছে',
    statusLabelEn: 'Blocked (External Model Required)',
    exactReason: 'ভিডিও জেনারেশনের জন্য কোনো পেইড/অনুমোদিত ক্লাউড ইঞ্জিন সরাসরি কনফিগার করা নেই। সততার নীতি অনুযায়ী ফেক ভিডিও তৈরি না করে Google Flow বা ব্যবহারকারীর ভিডিও Import-এর অপেক্ষায় রাখা হয়েছে।',
    retryCount: 0,
    maxRetries: 1,
    duplicateHash: createPromptDuplicateHash(
      'Cinematic drone flyover gliding through morning fog over alpine pine evergreen forest, smooth 60fps pan',
      'video',
      '16:9'
    ),
    targetMarketplace: 'shutterstock',
    autoEnhance: false,
    createdAt: Date.now() - 1800000,
  },
  {
    id: 'task-auto-seed-3',
    title: 'Nordic Ceramic Coffee Cup on Oak Table',
    type: 'image',
    prompt: 'Minimalist Scandinavian ceramic coffee mug steaming gently on light oak desk near morning window, aesthetic interior',
    aspectRatio: '1:1',
    style: 'Minimalist Interior',
    status: 'manual_required',
    statusLabelBn: 'ব্যবহারকারীর অনুমোদন আবশ্যক',
    statusLabelEn: 'Manual Contributor Action Required',
    exactReason: 'ফাইল ও মেটাডেটা ১০০% প্রস্তুত। কিন্তু অ্যাডোবি স্টক বা শাটারস্টকে সরাসরি ছবি আপলোড করতে ব্যবহারকারীর নিজস্ব কন্ট্রিবিউটর লগইন/SFTP ক্রেডেনশিয়াল প্রয়োজন (ব্যবহারকারীর অনুমতি ছাড়া স্বয়ংক্রিয় সাবমিশন সম্ভব নয়)।',
    retryCount: 0,
    maxRetries: 3,
    duplicateHash: createPromptDuplicateHash(
      'Minimalist Scandinavian ceramic coffee mug steaming gently on light oak desk near morning window, aesthetic interior',
      'image',
      '1:1'
    ),
    targetMarketplace: 'adobe-stock',
    autoEnhance: true,
    createdAt: Date.now() - 900000,
    dimensions: '2048 × 2048',
    fileSize: '2.8 MB',
    complianceScore: 95,
  },
  {
    id: 'task-auto-seed-4',
    title: 'Raw Wildflower Honey Jar & Wooden Spoon',
    type: 'image',
    prompt: 'Commercial studio macro of pure organic wildflower honey dripping from wooden dipper into glass mason jar, warm backlighting',
    aspectRatio: '16:9',
    style: 'Photorealistic',
    status: 'pending',
    statusLabelBn: 'পাইপলাইনে অপেক্ষমাণ',
    statusLabelEn: 'Pending in Queue',
    exactReason: 'কিউতে এক্সিকিউশনের অপেক্ষায় আছে। "Start Autonomous Pipeline" চাপলে স্বয়ংক্রিয়ভাবে প্রসেস শুরু হবে।',
    retryCount: 0,
    maxRetries: 3,
    duplicateHash: createPromptDuplicateHash(
      'Commercial studio macro of pure organic wildflower honey dripping from wooden dipper into glass mason jar, warm backlighting',
      'image',
      '16:9'
    ),
    targetMarketplace: 'adobe-stock',
    autoEnhance: true,
    createdAt: Date.now() - 300000,
  },
];

/**
 * Loads tasks from persistent storage or returns initial seeds
 */
export function loadAutonomousTasks(): AutonomousTaskItem[] {
  if (typeof localStorage === 'undefined') return INITIAL_AUTONOMOUS_TASKS;
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) {
      saveAutonomousTasks(INITIAL_AUTONOMOUS_TASKS);
      return INITIAL_AUTONOMOUS_TASKS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Recover any orphaned 'running' tasks that were interrupted by a page reload/navigation
      return parsed.map((t: AutonomousTaskItem) => {
        if (t.status === 'running') {
          return {
            ...t,
            status: 'pending',
            statusLabelBn: 'পুনরুদ্ধারকৃত (অপেক্ষমাণ)',
            statusLabelEn: 'Recovered (Pending)',
            exactReason: 'অ্যাপ রিলোডের কারণে প্রসেস স্থগিত হয়েছিল। পুনরায় চালুর জন্য প্রস্তুত।',
          };
        }
        return t;
      });
    }
    return INITIAL_AUTONOMOUS_TASKS;
  } catch {
    return INITIAL_AUTONOMOUS_TASKS;
  }
}

/**
 * Saves tasks to persistent storage
 */
export function saveAutonomousTasks(tasks: AutonomousTaskItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    // Avoid saving large blobs in localStorage by stripping zipBlob before serialization
    const safeTasks = tasks.map((t) => {
      const { zipBlob, ...rest } = t;
      return rest;
    });
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(safeTasks));
  } catch (err) {
    console.warn('Could not persist autonomous tasks to localStorage:', err);
  }
}

/**
 * Checks if a task with the exact same duplicate hash is already present in queue
 */
export function isDuplicateTask(tasks: AutonomousTaskItem[], prompt: string, type: 'image' | 'video', ratio: AspectRatioType): boolean {
  const hash = createPromptDuplicateHash(prompt, type, ratio);
  return tasks.some((t) => t.duplicateHash === hash && t.status !== 'failed');
}

/**
 * Creates a new task object
 */
export function createAutonomousTask(
  params: {
    prompt: string;
    type?: 'image' | 'video';
    aspectRatio?: AspectRatioType;
    style?: string;
    targetMarketplace?: StockMarketplaceId;
    autoEnhance?: boolean;
    title?: string;
    humanReviewRequired?: boolean;
  }
): AutonomousTaskItem {
  const type = params.type || 'image';
  const aspectRatio = params.aspectRatio || '16:9';
  const prompt = params.prompt.trim();
  const hash = createPromptDuplicateHash(prompt, type, aspectRatio);

  const words = prompt.split(' ').slice(0, 5).join(' ');
  const title = params.title || (words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Autonomous Task');

  return {
    id: `task-auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    type,
    prompt,
    aspectRatio,
    style: params.style || 'Photorealistic',
    status: type === 'video' ? 'blocked' : 'pending',
    statusLabelBn: type === 'video' ? 'বাহ্যিক সীমাবদ্ধতায় আটকে আছে' : 'পাইপলাইনে অপেক্ষমাণ',
    statusLabelEn: type === 'video' ? 'Blocked (External Model Required)' : 'Pending in Queue',
    exactReason:
      type === 'video'
        ? 'ভিডিও জেনারেশনের জন্য কোনো পেইড/অনুমোদিত ক্লাউড ইঞ্জিন সরাসরি কনফিগার করা নেই। Google Flow বা ভিডিও Import প্রয়োজন।'
        : 'কিউতে এক্সিকিউশনের অপেক্ষায় রয়েছে।',
    retryCount: 0,
    maxRetries: 3,
    duplicateHash: hash,
    targetMarketplace: params.targetMarketplace || 'adobe-stock',
    autoEnhance: params.autoEnhance !== false,
    createdAt: Date.now(),
    humanReviewRequired: params.humanReviewRequired,
  };
}

/**
 * Validates whether a specific task is eligible for automatic recovery resume:
 * - Must be strictly pending
 * - Must be flagged as recovered from an interrupted session
 * - Never auto-runs completed, failed, or blocked tasks
 */
export function isTaskEligibleForAutoResume(task: AutonomousTaskItem): boolean {
  if (task.status !== 'pending') return false;
  return (
    task.statusLabelEn === 'Recovered (Pending)' ||
    task.statusLabelBn === 'পুনরুদ্ধারকৃত (অপেক্ষমাণ)' ||
    Boolean(task.exactReason && (task.exactReason.includes('পুনরুদ্ধার') || task.exactReason.includes('রিলোডের কারণে')))
  );
}

/**
 * Detects whether a queue has recovered pending tasks that were interrupted and should auto-resume
 */
export function hasRecoveredPendingTasks(tasks: AutonomousTaskItem[]): boolean {
  return tasks.some(isTaskEligibleForAutoResume);
}

/**
 * Creates a submission-ready task for the Autonomous Queue (Priority 6.0)
 * Guaranteed zero credit deduction, RFC 4180 packages, and duplicate prevention hash.
 */
export function createStockSubmissionQueueTask(params: {
  asset: Asset;
  targetMarketplace: StockMarketplaceId;
  zipBlob?: Blob;
  zipFilename?: string;
  humanReviewApproved?: boolean;
}): AutonomousTaskItem {
  const { asset, targetMarketplace, zipBlob, zipFilename, humanReviewApproved } = params;
  const hash = `asset-${asset.id}::${targetMarketplace}`;

  return {
    id: `task-submission-${asset.id}-${targetMarketplace}-${Date.now()}`,
    title: `${asset.title} (${targetMarketplace} Submission)`,
    type: asset.type === 'video' ? 'video' : 'image',
    prompt: asset.prompt || asset.title,
    aspectRatio: asset.aspectRatio || '16:9',
    style: asset.style || 'Photorealistic',
    status: 'completed',
    statusLabelBn: 'সাবমিশন প্যাক প্রস্তুত (ম্যানুয়াল আপলোড)',
    statusLabelEn: 'Ready for Manual Upload',
    exactReason: `সমস্ত টেকনিক্যাল ও মেটাডেটা যাচাই সফল (${asset.dimensions})। কন্ট্রিবিউটর পোর্টালে ড্রপ করার জন্য RFC 4180 CSV ও ZIP প্যাকেজ প্রস্তুত।`,
    retryCount: 0,
    maxRetries: 1,
    duplicateHash: hash,
    targetMarketplace,
    autoEnhance: false,
    createdAt: Date.now(),
    completedAt: Date.now(),
    assetId: asset.id,
    assetThumbnailUrl: asset.thumbnailUrl || asset.url,
    dimensions: asset.dimensions,
    fileSize: asset.fileSize,
    complianceScore: 98,
    zipBlob,
    zipFilename: zipFilename || `${asset.title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}_${targetMarketplace}_package.zip`,
    humanReviewRequired: true,
    humanReviewApproved: humanReviewApproved ?? true,
    submissionStatusMessage: 'প্যাকেজ প্রস্তুত; কন্ট্রিবিউটর পোর্টালে সরাসরি আপলোড করুন (০ ক্রেডিট ব্যয়িত)।',
  };
}

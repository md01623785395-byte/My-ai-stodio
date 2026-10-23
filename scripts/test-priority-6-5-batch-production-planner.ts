/**
 * Priority 6.5 — Autonomous Batch Production Planner Test Suite
 * 
 * Verifies:
 * 1. Prioritized Batch Plan creation using Opportunity scores, Asset Library, Duplicate checks, Quality, and Marketplace Rules.
 * 2. Detailed batch transparency: topic, required asset count, reusable assets, recommended prompts, expected cost (0 credits), and blockers.
 * 3. Smart Asset Reuse: suitable library assets are reused without redundant re-generation (0 credits).
 * 4. Rigorous Duplicate Prevention: identical/near-identical prompts and assets are filtered; real output verification.
 * 5. Strict User Authorization Ceiling: batches never exceed user-approved quantity (e.g. ceiling = 5, 10). No Paid APIs or billing.
 * 6. Safe halt on blockers (Quota, Asset Missing, Unauthorized Integration) with actionable next steps.
 * 7. Anti-hype integrity: offline curated data source, no baseless sales guarantees, truthful upload boundary (NOT VERIFIED).
 */

import { Asset, AutonomousTaskItem } from '../src/types';
import {
  generateAutonomousBatchProductionPlan,
  dispatchBatchProductionPlanToQueue,
} from '../src/utils/autonomousBatchPlanner';
import { createAutonomousTask, createPromptDuplicateHash } from '../src/utils/autonomousQueueManager';

async function runPriority65Audit() {
  console.log('========================================================================');
  console.log('PRIORITY 6.5: AUTONOMOUS BATCH PRODUCTION PLANNER AUDIT');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  let notVerifiedCount = 0;

  function assertPass(name: string, detail?: string) {
    console.log(`[PASS] ${name}`);
    if (detail) console.log(`       └─ ${detail}`);
    passed++;
  }

  function assertFail(name: string, detail?: string) {
    console.error(`[FAIL] ${name}`);
    if (detail) console.error(`       └─ ${detail}`);
    failed++;
  }

  function markNotVerified(name: string, reason: string) {
    console.log(`[NOT VERIFIED] ${name}`);
    console.log(`       └─ ${reason}`);
    notVerifiedCount++;
  }

  // Sample Assets
  const reusableMosqueAsset: Asset = {
    id: 'asset-batch-mosque-01',
    title: 'Modern Grand Mosque Courtyard Generative AI',
    prompt: 'Grand contemporary marble mosque courtyard with geometric arabesque carved arches, morning mist, 4k, no people',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80',
    type: 'image',
    dimensions: '3840 × 2160',
    aspectRatio: '16:9',
    style: 'Photorealistic',
    model: 'imagen-3',
    createdAt: new Date().toISOString(),
    isFavorite: true,
    source: 'Google Flow',
  };

  const reusableCeramicAsset: Asset = {
    id: 'asset-batch-ceramic-02',
    title: 'Handcrafted Terracotta Stoneware Pitcher Generative AI',
    prompt: 'Artisanal handcrafted terracotta pitcher with raw speckled matte clay texture on natural linen, studio lighting, no people',
    url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=300&q=80',
    type: 'image',
    dimensions: '3840 × 2560',
    aspectRatio: '3:2',
    style: 'Photorealistic',
    model: 'imagen-3',
    createdAt: new Date().toISOString(),
    isFavorite: false,
    source: 'Imported',
  };

  const sampleLibrary: Asset[] = [reusableMosqueAsset, reusableCeramicAsset];

  // ---------------------------------------------------------------------------
  // 1. PRIORITIZED BATCH PRODUCTION PLAN GENERATION
  // ---------------------------------------------------------------------------
  console.log('--- ১. অগ্রাধিকারভিত্তিক ব্যাচ প্রোডাকশন প্ল্যান তৈরি ---');

  const batchPlan = generateAutonomousBatchProductionPlan({
    assets: sampleLibrary,
    existingTasks: [],
    targetMarketplace: 'adobe-stock',
    userApprovedQuantity: 10,
  });

  if (batchPlan && batchPlan.items.length === 10) {
    assertPass(
      '১.১ সুযোগের স্কোর ও মার্কেটপ্লেস নিয়মের ভিত্তিতে ১০টি অ্যাসেটের ব্যাচ প্ল্যান তৈরি হয়েছে',
      `Plan ID: ${batchPlan.id} | Total planned: ${batchPlan.totalPlannedItems}`
    );
  } else {
    assertFail('১.১ ব্যাচ প্ল্যান তৈরিতে ব্যর্থ বা আইটেম সংখ্যায় অসঙ্গতি');
  }

  // ---------------------------------------------------------------------------
  // 2. DETAILED BATCH METRICS & TRANSPARENT COSTING
  // ---------------------------------------------------------------------------
  console.log('\n--- ২. ব্যাচ বিবরণ, প্রত্যাশিত খরচ ও ব্লকার প্রদর্শন ---');

  const hasCostTransparency = batchPlan.costTransparencyBn.includes('খরচ নিশ্চিত জানা না থাকলে অনুমানকে বাস্তব মূল্য হিসেবে দেখানো নিষিদ্ধ');
  const zeroTotalCost = batchPlan.totalCreditCost === 0;

  if (hasCostTransparency && zeroTotalCost) {
    assertPass(
      '২.১ খরচের স্বচ্ছতা বজায় রাখা হয়েছে (অনুমানকে বাস্তব মূল্য না বলা ও ০ ক্রেডিট পলিসি)',
      `Total cost: ${batchPlan.totalCreditCost} Credits | Statement: "${batchPlan.costTransparencyBn.slice(0, 60)}..."`
    );
  } else {
    assertFail('২.১ খরচের স্বচ্ছতা ও জিরো-ক্রেডিট পলিসিতে ত্রুটি');
  }

  const hasBlocker = batchPlan.blockersIdentified.some((b) => b.includes('লাইভ থার্ড-পার্টি'));
  if (hasBlocker) {
    assertPass(
      '২.২ লাইভ ট্রেন্ড স্ক্র্যাপার অনুপস্থিতি স্পষ্টভাবে ব্লকার হিসেবে প্রদর্শিত',
      `Blocker: ${batchPlan.blockersIdentified[0]}`
    );
  } else {
    assertFail('২.২ ব্লকার প্রদর্শন অনুপস্থিত');
  }

  // ---------------------------------------------------------------------------
  // 3. SMART ASSET REUSE WITHOUT RE-GENERATION
  // ---------------------------------------------------------------------------
  console.log('\n--- ৩. বিদ্যমান উপযুক্ত অ্যাসেট পুনঃব্যবহার ও ০ ক্রেডিট নিশ্চিতকরণ ---');

  const reusedItems = batchPlan.items.filter((i) => i.isReusedAsset);
  if (reusedItems.length === 2 && reusedItems.every((i) => i.expectedCreditCost === 0)) {
    assertPass(
      '৩.১ লাইব্রেরিতে বিদ্যমান ২টি উপযুক্ত অ্যাসেট পুনঃব্যবহার করে নতুন জেনারেশন পরিহার করা হয়েছে',
      `Reused: ${reusedItems.map((r) => r.reusedAssetTitle).join(', ')}`
    );
  } else {
    assertFail('৩.১ উপযুক্ত অ্যাসেটের স্মার্ট পুনঃব্যবহারে ব্যর্থ');
  }

  // ---------------------------------------------------------------------------
  // 4. DUPLICATE PREVENTION & REAL COMPLETION VALIDATION
  // ---------------------------------------------------------------------------
  console.log('\n--- ৪. ডুপ্লিকেট প্রতিরোধ ও বাস্তব ফলাফল যাচাই ---');

  // Verify all planned items have unique duplicate hashes
  const hashes = new Set(batchPlan.items.map((i) => i.duplicateHash));
  if (hashes.size === batchPlan.items.length) {
    assertPass(
      '৪.১ ব্যাচের প্রতিটি আইটেমের ডুপ্লিকেট হ্যাশ সম্পূর্ণ অনন্য ও বৈচিত্র্যপূর্ণ',
      `Unique hashes: ${hashes.size} / ${batchPlan.items.length}`
    );
  } else {
    assertFail('৪.১ ব্যাচের অভ্যন্তরে ডুপ্লিকেট প্রম্পট শনাক্ত হয়েছে');
  }

  // Test dispatching with an existing active task in queue
  const existingActiveTask: AutonomousTaskItem = {
    ...createAutonomousTask({ prompt: batchPlan.items[0].prompt }),
    duplicateHash: batchPlan.items[0].duplicateHash,
    status: 'pending',
  };

  const dispatchResult = dispatchBatchProductionPlanToQueue(batchPlan, [existingActiveTask]);

  if (
    dispatchResult.skippedDuplicatesCount === 1 &&
    dispatchResult.actualDispatchedCount === 9
  ) {
    assertPass(
      '৪.২ কিউতে বিদ্যমান টাস্কের সাথে মিলে যাওয়া আইটেম ডুপ্লিকেট হিসেবে সফলভাবে বাদ দেওয়া হয়েছে',
      `Skipped duplicates: ${dispatchResult.skippedDuplicatesCount} | Actual dispatched: ${dispatchResult.actualDispatchedCount}`
    );
  } else {
    assertFail('৪.২ ডুপ্লিকেট ফিল্টারিংয়ে ব্যর্থ');
  }

  // ---------------------------------------------------------------------------
  // 5. STRICT USER-AUTHORIZED QUANTITY CEILING
  // ---------------------------------------------------------------------------
  console.log('\n--- ৫. ব্যবহারকারীর অনুমোদিত পরিমাণের সীমা (Strict Ceiling) ---');

  const smallCeilingPlan = generateAutonomousBatchProductionPlan({
    assets: sampleLibrary,
    existingTasks: [],
    targetMarketplace: 'adobe-stock',
    userApprovedQuantity: 5, // Strict limit = 5
  });

  if (smallCeilingPlan.items.length === 5 && smallCeilingPlan.userApprovedQuantity === 5) {
    assertPass(
      '৫.১ ব্যবহারকারীর অনুমোদিত ৫টি সীমার চেয়ে ১টিও বেশি আইটেম প্ল্যান করা হয়নি',
      `Planned: ${smallCeilingPlan.items.length} === Ceiling: ${smallCeilingPlan.userApprovedQuantity}`
    );
  } else {
    assertFail('৫.১ অনুমোদিত পরিমাণের সীমা লঙ্ঘিত হয়েছে');
  }

  const smallDispatch = dispatchBatchProductionPlanToQueue(smallCeilingPlan, []);
  if (smallDispatch.actualDispatchedCount === 5) {
    assertPass(
      '৫.২ কিউতে প্রেরণের সময়ও অনুমোদিত সিলিং শতভাগ মেনে চলা হয়েছে',
      `Dispatched: ${smallDispatch.actualDispatchedCount} <= Ceiling: 5`
    );
  } else {
    assertFail('৫.২ কিউতে প্রেরণে সীমা লঙ্ঘিত হয়েছে');
  }

  // ---------------------------------------------------------------------------
  // 6. SAFE HALT ON BLOCKERS & ACTIONABLE ADVICE
  // ---------------------------------------------------------------------------
  console.log('\n--- ৬. কোটা বা ইন্টিগ্রেশন ব্লকারে নিরাপদ থামা ও পরবর্তী করণীয় ---');

  const quotaBlockedTask: AutonomousTaskItem = {
    ...createAutonomousTask({ prompt: 'Blocked prompt' }),
    status: 'blocked',
    blockerCategory: 'image_generation_quota',
    exactReason: 'HTTP 429 Quota Exceeded',
  };

  const planWithQuotaBlocker = generateAutonomousBatchProductionPlan({
    assets: sampleLibrary,
    existingTasks: [quotaBlockedTask],
    targetMarketplace: 'adobe-stock',
    userApprovedQuantity: 10,
  });

  const hasQuotaWarning = planWithQuotaBlocker.blockersIdentified.some((b) => b.includes('কোটা লিমিট'));
  const hasActionableAdvice = planWithQuotaBlocker.nextActionAdviceBn.includes('কোটা ব্লকার শনাক্ত');

  if (hasQuotaWarning && hasActionableAdvice) {
    assertPass(
      '৬.১ কোটা ব্লকার শনাক্ত হলে নিরাপদে সতর্কবার্তা ও পরবর্তী করণীয় প্রদর্শিত হয়েছে',
      `Advice: "${planWithQuotaBlocker.nextActionAdviceBn}"`
    );
  } else {
    assertFail('৬.১ কোটা ব্লকার সুরক্ষায় ঘাটতি');
  }

  // ---------------------------------------------------------------------------
  // 7. ANTI-HYPE INTEGRITY & HONEST BOUNDARIES (NOT VERIFIED)
  // ---------------------------------------------------------------------------
  console.log('\n--- ৭. বিক্রির ভিত্তিহীন গ্যারান্টি পরিহার ও বাস্তব সীমানা (NOT VERIFIED) ---');

  const disclaimerPresent = batchPlan.disclaimerBn.includes('বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না');
  if (disclaimerPresent) {
    assertPass(
      '৭.১ বিক্রির ভিত্তিহীন গ্যারান্টি পরিহার করে সঠিক ডিসক্লেইমার বজায় রয়েছে',
      `Disclaimer: "${batchPlan.disclaimerBn}"`
    );
  } else {
    assertFail('৭.১ বিক্রির গ্যারান্টিযুক্ত দাবি শনাক্ত হয়েছে');
  }

  markNotVerified(
    '৭.২ মার্কেটপ্লেসে সরাসরি অটোমেটেড রিমোট SFTP/API আপলোড',
    'মার্কেটপ্লেসের আসল লাইভ কন্ট্রিবিউটর একাউন্ট ও SFTP/API ক্রেডেনশিয়াল ছাড়া রিমোট নেটওয়ার্ক আপলোড নিষিদ্ধ ও অসম্ভব। ড্রপ প্যাকেজ (ZIP + RFC 4180 CSV) সম্পূর্ণ প্রস্তুত।'
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`অডিট ফলাফল: PASS: ${passed} | FAIL: ${failed} | NOT VERIFIED: ${notVerifiedCount}`);
  console.log('========================================================================\n');

  if (failed === 0) {
    console.log('Priority 6.5 Autonomous Batch Production Planner Audit সম্পূর্ণ সফল!');
  } else {
    process.exit(1);
  }
}

runPriority65Audit().catch((err) => {
  console.error('Priority 6.5 Audit failed with error:', err);
  process.exit(1);
});

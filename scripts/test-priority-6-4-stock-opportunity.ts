/**
 * Priority 6.4 — Autonomous Stock Opportunity & Asset Selection Test Suite
 * 
 * Verifies:
 * 1. Analysis of commercial stock opportunities using approved curated data & honest disclosure of absent live scraper API (Blocker).
 * 2. Asset prioritization scoring based on utility, originality, duplicate risk, technical quality & marketplace rules.
 * 3. People-avoidance filter prioritizing architecture, nature, business backgrounds & Islamic architecture.
 * 4. Smart Asset Reuse: sending suitable library assets to pipeline with 0 credit without redundant generation.
 * 5. Anti-hype verification: no baseless sales guarantees, clear data provenance & explicit disclaimer.
 * 6. Zero Generation Credit invariant for Google Flow / Imported / Reused assets.
 * 7. Truthful upload boundary (NOT VERIFIED without live contributor credentials).
 */

import { Asset, AutonomousTaskItem } from '../src/types';
import {
  CURATED_STOCK_OPPORTUNITIES,
  scoreAssetForStockOpportunity,
  evaluateAllStockOpportunities,
  dispatchOpportunityToAutonomousQueue,
  detectPeopleInSubject,
  OPPORTUNITY_ENGINE_BLOCKERS,
} from '../src/utils/stockOpportunityEngine';
import { createAutonomousTask } from '../src/utils/autonomousQueueManager';

async function runPriority64Audit() {
  console.log('========================================================================');
  console.log('PRIORITY 6.4: AUTONOMOUS STOCK OPPORTUNITY & ASSET SELECTION AUDIT');
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

  // ---------------------------------------------------------------------------
  // 1. COMMERCIAL DEMAND SIGNAL ANALYSIS & DATA SOURCE PROVENANCE
  // ---------------------------------------------------------------------------
  console.log('--- ১. বাণিজ্যিক চাহিদা বিশ্লেষণ ও ডেটা উৎসের স্বচ্ছতা ---');

  if (CURATED_STOCK_OPPORTUNITIES.length >= 5) {
    assertPass(
      '১.১ অনুমোদিত অভ্যন্তরীণ কিউরেটেড ডেটাসেট থেকে বাণিজ্যিক সুযোগ লোড হয়েছে',
      `মোট সুযোগ ক্যাটাগরি: ${CURATED_STOCK_OPPORTUNITIES.length}টি`
    );
  } else {
    assertFail('১.১ বাণিজ্যিক সুযোগ ক্যাটাগরি অনুপস্থিত');
  }

  const allHaveSource = CURATED_STOCK_OPPORTUNITIES.every(
    (opp) => opp.dataSource && opp.dataSource.includes('বাণিজ্যিক স্টক প্যাটার্ন রেজিস্ট্রি')
  );
  if (allHaveSource) {
    assertPass(
      '১.২ প্রতিটি সুযোগের অনুমোদিত ডেটা উৎস ও রেফারেন্স বিদ্যমান',
      `Data source: ${CURATED_STOCK_OPPORTUNITIES[0].dataSource}`
    );
  } else {
    assertFail('১.২ ডেটা উৎসের বিবরণে ঘাটতি');
  }

  const blockerIdentified = OPPORTUNITY_ENGINE_BLOCKERS.LIVE_TREND_SCRAPER_ABSENT.isBlocker === true;
  if (blockerIdentified) {
    assertPass(
      '১.৩ লাইভ ট্রেন্ড স্ক্র্যাপার API অনুপস্থিতি স্পষ্ট Blocker হিসেবে ঘোষিত',
      `Blocker: ${OPPORTUNITY_ENGINE_BLOCKERS.LIVE_TREND_SCRAPER_ABSENT.titleBn}`
    );
  } else {
    assertFail('১.৩ লাইভ স্ক্র্যাপার অনুপস্থিতি Blocker হিসেবে ঘোষণা করা হয়নি');
  }

  // ---------------------------------------------------------------------------
  // 2. PEOPLE AVOIDANCE FILTER & SAFE COMMERCIAL SUBJECTS
  // ---------------------------------------------------------------------------
  console.log('\n--- ২. মানুষের ছবি বর্জন ও পেশাদার/ইসলামিক স্থাপত্য অগ্রাধিকার ---');

  const textWithPeople = 'Portrait of smiling young businesswoman holding tablet in busy office';
  const textWithoutPeople = 'Grand modern marble mosque courtyard reflecting sunrise in serene water basin, no people';

  const detectedPeople = detectPeopleInSubject(textWithPeople);
  const detectedNoPeople = !detectPeopleInSubject(textWithoutPeople);

  if (detectedPeople && detectedNoPeople) {
    assertPass(
      '২.১ মানুষের ছবি/মুখ শনাক্তকরণ ফিল্টার নির্ভুলভাবে কাজ করছে',
      'মানুষযুক্ত প্রম্পট শনাক্ত = TRUE, মানুষহীন স্থাপত্য প্রম্পট শনাক্ত = FALSE'
    );
  } else {
    assertFail('২.১ মানুষ শনাক্তকরণ ফিল্টারে ত্রুটি');
  }

  // Priority subjects presence
  const hasIslamic = CURATED_STOCK_OPPORTUNITIES.some((opp) => opp.category === 'islamic_heritage');
  const hasArchitecture = CURATED_STOCK_OPPORTUNITIES.some((opp) => opp.category === 'architecture');
  const hasBackground = CURATED_STOCK_OPPORTUNITIES.some((opp) => opp.category === 'business_background');
  const hasNature = CURATED_STOCK_OPPORTUNITIES.some((opp) => opp.category === 'nature');

  if (hasIslamic && hasArchitecture && hasBackground && hasNature) {
    assertPass(
      '২.২ মানুষ এড়িয়ে ইসলামিক স্থাপত্য, বায়োফিলিক আর্কিটেকচার, প্রকৃতি ও ব্যবসায়িক ব্যাকগ্রাউন্ড অগ্রাধিকার প্রাপ্ত',
      'Categories: islamic_heritage, architecture, business_background, nature verified'
    );
  } else {
    assertFail('২.২ অগ্রাধিকারযোগ্য ক্যাটাগরি অনুপস্থিত');
  }

  // ---------------------------------------------------------------------------
  // 3. ASSET PRIORITIZATION MULTI-METRIC SCORING
  // ---------------------------------------------------------------------------
  console.log('\n--- ৩. উপযোগিতা, মৌলিকত্ব, ডুপ্লিকেট ঝুঁকি ও কোয়ালিটি ভিত্তিক অ্যাসেট স্কোরিং ---');

  const highCommercialAsset: Asset = {
    id: 'asset-audit-mosque-01',
    title: 'Modern Grand Mosque Marble Courtyard Archway Generative AI',
    prompt:
      'Grand contemporary marble mosque courtyard with intricate geometric arabesque arches reflecting golden sunrise light in shallow pool, clean architectural lines, morning mist, 4k, no people',
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

  const riskyAssetWithPeople: Asset = {
    id: 'asset-audit-person-02',
    title: 'Business Woman Smiling in Office with Apple Laptop',
    prompt: 'Portrait of smiling woman holding Apple MacBook pro on wooden desk in busy office',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    type: 'image',
    dimensions: '1920 × 1080',
    aspectRatio: '16:9',
    style: 'Photorealistic',
    model: 'imagen-3',
    createdAt: new Date().toISOString(),
    isFavorite: false,
    source: 'Studio',
  };

  const highScore = scoreAssetForStockOpportunity(highCommercialAsset, [highCommercialAsset, riskyAssetWithPeople], []);
  const lowScore = scoreAssetForStockOpportunity(riskyAssetWithPeople, [highCommercialAsset, riskyAssetWithPeople], []);

  if (highScore.overallScore >= 80 && highScore.priorityRank === 'High Commercial') {
    assertPass(
      '৩.১ ইসলামিক স্থাপত্য ও বাণিজ্যিক বিষয় উচ্চ অগ্রাধিকার (High Commercial) অর্জন করেছে',
      `Score: ${highScore.overallScore}/100 | Rank: ${highScore.priorityRankBn}`
    );
  } else {
    assertFail('৩.১ উচ্চ বাণিজ্যিক অ্যাসেটের স্কোর প্রত্যাশিত মানদণ্ডে পৌঁছায়নি');
  }

  if (lowScore.hasPeople && lowScore.overallScore < highScore.overallScore) {
    assertPass(
      '৩.২ মানুষ ও ট্রেডমার্ক সংবলিত অ্যাসেট পেনাল্টি পেয়ে নিম্ন অগ্রাধিকার প্রাপ্ত হয়েছে',
      `Score: ${lowScore.overallScore}/100 | Has People: ${lowScore.hasPeople} | Compliance: ${lowScore.marketplaceComplianceScore}`
    );
  } else {
    assertFail('৩.২ মানুষযুক্ত অ্যাসেটকে উপযুক্ত পেনাল্টি দেওয়া হয়নি');
  }

  // ---------------------------------------------------------------------------
  // 4. SMART ASSET REUSE VS REDUNDANT GENERATION
  // ---------------------------------------------------------------------------
  console.log('\n--- ৪. স্মার্ট অ্যাসেট পুনঃব্যবহার ও অপ্রয়োজনীয় জেনারেশন পরিহার ---');

  const evaluations = evaluateAllStockOpportunities([highCommercialAsset], [], 'adobe-stock');
  const islamicOppEval = evaluations.find((e) => e.opportunity.category === 'islamic_heritage');

  if (islamicOppEval && islamicOppEval.reuseExistingAsset && islamicOppEval.matchingAsset?.id === highCommercialAsset.id) {
    assertPass(
      '৪.১ লাইব্রেরিতে উপযুক্ত অ্যাসেট থাকায় পুনরায় জেনারেট না করে বিদ্যমান অ্যাসেট পুনঃব্যবহারের সুপারিশ',
      `Matching Asset: "${islamicOppEval.matchingAsset.title}" | Reuse: ${islamicOppEval.reuseExistingAsset}`
    );
  } else {
    assertFail('৪.১ বিদ্যমান অ্যাসেটের স্মার্ট পুনঃব্যবহারে ব্যর্থ');
  }

  const architectureOppEval = evaluations.find((e) => e.opportunity.category === 'clean_beauty');
  if (architectureOppEval && !architectureOppEval.reuseExistingAsset) {
    assertPass(
      '৪.২ উপযুক্ত অ্যাসেট না থাকলে নতুন প্রম্পট তৈরি বা গুগল ফ্লো ব্যবহারের নির্দেশনা দেওয়া হয়েছে',
      `Prompt ready: "${architectureOppEval.suggestedPrompt.slice(0, 60)}..."`
    );
  } else {
    assertFail('৪.২ অনুপস্থিত ক্যাটাগরিতে নতুন জেনারেশন প্রস্তাবনায় ব্যর্থ');
  }

  // ---------------------------------------------------------------------------
  // 5. DIRECT DISPATCH TO AUTONOMOUS PIPELINE WITH 0 CREDITS
  // ---------------------------------------------------------------------------
  console.log('\n--- ৫. পাইপলাইনে টাস্ক প্রেরণ ও ০ ক্রেডিট নিশ্চয়তা ---');

  if (islamicOppEval) {
    const dispatchedTask = dispatchOpportunityToAutonomousQueue({
      opportunity: islamicOppEval.opportunity,
      asset: islamicOppEval.matchingAsset,
      targetMarketplace: 'adobe-stock',
    });

    if (
      dispatchedTask.status === 'pending' &&
      dispatchedTask.assetId === highCommercialAsset.id &&
      dispatchedTask.targetMarketplace === 'adobe-stock' &&
      dispatchedTask.statusLabelBn.includes('স্মার্ট অ্যাসেট নির্বাচন')
    ) {
      assertPass(
        '৫.১ বিদ্যমান অ্যাসেট সরাসরি অটোনোমাস কিউতে সফলভাবে প্রেরিত হয়েছে',
        `Task ID: ${dispatchedTask.id} | AssetId: ${dispatchedTask.assetId}`
      );
    } else {
      assertFail('৫.১ পাইপলাইনে টাস্ক প্রেরণে ত্রুটি');
    }
  }

  // ---------------------------------------------------------------------------
  // 6. ZERO CREDIT INVARIANT ON GOOGLE FLOW / IMPORTED / REUSED ASSETS
  // ---------------------------------------------------------------------------
  console.log('\n--- ৬. Google Flow, Imported ও পুনঃব্যবহারকৃত অ্যাসেটে ০ ক্রেডিট নিশ্চয়তা ---');

  const isZeroCredit = islamicOppEval?.dispatchCreditDeduction === 0;
  if (isZeroCredit) {
    assertPass(
      '৬.১ বিদ্যমান লাইব্রেরি ও গুগল ফ্লো অ্যাসেট প্রসেসিংয়ে ক্রেডিট ডিডাকশন শতভাগ ০ (Invariant Pass)',
      `dispatchCreditDeduction: ${islamicOppEval?.dispatchCreditDeduction}`
    );
  } else {
    assertFail('৬.১ ক্রেডিট কর্তন নিয়মে ত্রুটি');
  }

  // ---------------------------------------------------------------------------
  // 7. ANTI-HYPE INTEGRITY & HONEST BOUNDARIES (NOT VERIFIED)
  // ---------------------------------------------------------------------------
  console.log('\n--- ৭. বিক্রির ভিত্তিহীন গ্যারান্টি পরিহার ও বাস্তব সীমানা (NOT VERIFIED) ---');

  const allHaveDisclaimer = CURATED_STOCK_OPPORTUNITIES.every(
    (opp) =>
      opp.disclaimerBn &&
      opp.disclaimerBn.includes('বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না')
  );

  if (allHaveDisclaimer) {
    assertPass(
      '৭.১ বিক্রির নিশ্চয়তা বা ভিত্তিহীন ট্রেন্ড দাবি পরিহার করে স্পষ্ট ডিসক্লেইমার যুক্ত করা হয়েছে',
      'Disclaimer: "স্টক প্ল্যাটফর্মের অ্যালগরিদম ও ক্রেতার চাহিদার ওপর ডাউনলোড নির্ভরশীল; বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না।"'
    );
  } else {
    assertFail('৭.১ ডিসক্লেইমারে ভিত্তিহীন দাবি পাওয়া গেছে');
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
    console.log('Priority 6.4 Autonomous Stock Opportunity & Asset Selection Audit সম্পূর্ণ সফল!');
  } else {
    process.exit(1);
  }
}

runPriority64Audit().catch((err) => {
  console.error('Priority 6.4 Audit failed with error:', err);
  process.exit(1);
});

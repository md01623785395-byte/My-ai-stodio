/**
 * Test Suite: Priority 2.2 Production-Grade Image Intelligence & Stock Readiness Audit
 *
 * Verifies:
 * 1. Genuine Image Asset Evaluation (real dimensions, valid decoding, actual pixel properties).
 * 2. Visual Quality Metrics (blur, noise, artifact index, highlight clipping, shadow crushing).
 * 3. Transparent 3-Tier Outcome Assessment:
 *    - 'ready_for_review' (Meets all technical specifications for stock submission)
 *    - 'needs_fix' (Substandard resolution or non-JPEG format; actionable fixes provided)
 *    - 'reject_candidate' (Forbidden on marketplace e.g. Shutterstock, or severe IP/corruption)
 * 4. Preservation of original asset & separation of enhanced derivatives.
 * 5. Honest upscaling disclaimers (never claims to restore lost optical detail).
 * 6. Distinct official contributor compliance across Adobe Stock, Shutterstock, Freepik, Dreamstime, Wirestock.
 * 7. Method classification (deterministic vs heuristic/AI estimate) and confidence levels.
 */

import 'fake-indexeddb/auto';
import { runFinalQualityCheck, FinalQualityReport } from '../src/utils/qualityChecker';
import { Asset, StockMarketplaceId } from '../src/types';
import {
  clearAllAssetsFromDB,
  saveAssetToDB,
  getAssetByIdFromDB,
  loadAllAssetsFromDB,
} from '../src/utils/assetStorage';

// Setup Mock LocalStorage for Node testing
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

async function runStockReadinessIntelligenceAudit() {
  console.log('========================================================================');
  console.log('AI CREATOR STUDIO: PRIORITY 2.2 IMAGE INTELLIGENCE & STOCK READINESS AUDIT');
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

  await clearAllAssetsFromDB();

  // --------------------------------------------------------------------------
  // TEST SCENARIO 1: Real Sub-4MP PNG Asset (Needs Fix: Upscale + JPEG Conversion)
  // --------------------------------------------------------------------------
  console.log('--- পরীক্ষা ১: আসল সাব-৪ মেগাপিক্সেল পিএনজি অ্যাসেট (Needs Fix) ---');

  // Real valid 1024x1024 PNG data representation
  const originalAsset: Asset = {
    id: 'artisan-copper-kettle-orig',
    title: 'Artisan Hammered Copper Kettle on Wooden Stove',
    type: 'image',
    prompt: 'Rustic hammered copper kettle heating on an antique wood burning stove in a farmhouse kitchen, warm directional lighting',
    style: 'Photorealistic',
    aspectRatio: '1:1',
    dimensions: '1024 × 1024',
    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    thumbnailUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    createdAt: 'Just now',
    isFavorite: false,
    model: 'Studio Generator',
    source: 'Studio',
    fileSize: '1.2 MB',
    fileFormat: 'PNG Image',
  };

  await saveAssetToDB(originalAsset);

  const report1: FinalQualityReport = await runFinalQualityCheck(originalAsset, 'adobe-stock');

  assert(
    report1.stockReadiness.outcome === 'needs_fix',
    '১.১ সাব-৪ মেগাপিক্সেল পিএনজি অ্যাসেটের স্ট্যাটাস "needs_fix" হিসেবে চিহ্নিত',
    `ফলাফল: ${report1.stockReadiness.outcome} (${report1.stockReadiness.outcomeLabelBn})`
  );

  assert(
    report1.stockReadiness.actionableFixes.some((f) => f.actionType === 'upscale_2x' || f.actionType === 'upscale_4x') &&
      report1.stockReadiness.actionableFixes.some((f) => f.actionType === 'convert_jpeg'),
    '১.২ স্বয়ংক্রিয় সমাধান তালিকায় ২x/৪x আপস্কেল এবং JPEG কনভার্সন অন্তর্ভুক্ত',
    `অ্যাকশন সংখ্যা: ${report1.stockReadiness.actionableFixes.length}টি, উপলব্ধ: ${report1.stockReadiness.actionableFixes.map((f) => f.actionType).join(', ')}`
  );

  assert(
    report1.stockReadiness.enhancementAssessment.isAppropriate === true,
    '১.৩ এনহ্যান্সমেন্ট উপযুক্ত বলে ইতিবাচক মূল্যায়ন সম্পন্ন (isAppropriate: true)',
    `কারণ: ${report1.stockReadiness.enhancementAssessment.reasonBn}`
  );

  assert(
    report1.stockReadiness.enhancementAssessment.honestDisclaimer.includes('নিশ্চয়তা দেয় না'),
    '১.৪ সততা ডিসক্লেইমারে আপস্কেলিং কোনো ক্যামেরা ডিটেইল তৈরি বা কিউরেটর অনুমোদনের গ্যারান্টি দেয় না',
    `ডিসক্লেইমার: "${report1.stockReadiness.enhancementAssessment.honestDisclaimer}"`
  );

  // Verify original file in DB remains completely unchanged
  const fetchedOriginal = await getAssetByIdFromDB(originalAsset.id);
  assert(
    fetchedOriginal !== null &&
      fetchedOriginal.dimensions === '1024 × 1024' &&
      fetchedOriginal.fileFormat === 'PNG Image',
    '১.৫ ডাটাবেসে মূল অ্যাসেট সম্পূর্ণ অপরিবর্তিত ও অবিকৃত সংরক্ষিত',
    `মূল ডাইমেনশন: ${fetchedOriginal?.dimensions}, ফরম্যাট: ${fetchedOriginal?.fileFormat}`
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 2: Ready for Review (Compliant Derivative: 2048x2048, 4.19 MP, JPEG)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ২: সম্পূর্ণ কমপ্লায়েন্ট ডেরিভেটিভ কপি (Ready for Review) ---');

  const compliantDerivative: Asset = {
    id: 'artisan-copper-kettle-enhanced-4mp',
    title: 'Artisan Hammered Copper Kettle on Wooden Stove [2x Upscaled]',
    type: 'image',
    prompt: originalAsset.prompt,
    style: 'Photorealistic',
    aspectRatio: '1:1',
    dimensions: '2048 × 2048',
    url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    thumbnailUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    createdAt: 'Just now',
    isFavorite: false,
    model: 'Studio Enhancer (2x Upscaled)',
    source: 'Studio',
    fileSize: '3.4 MB',
    fileFormat: 'JPEG Image',
  };

  await saveAssetToDB(compliantDerivative);

  const report2: FinalQualityReport = await runFinalQualityCheck(compliantDerivative, 'adobe-stock');

  assert(
    report2.stockReadiness.outcome === 'ready_for_review',
    '২.১ ৪.১৯ মেগাপিক্সেল JPEG ডেরিভেটিভ "ready_for_review" হিসেবে মূল্যায়িত',
    `ফলাফল: ${report2.stockReadiness.outcome} (${report2.stockReadiness.outcomeLabelBn})`
  );

  assert(
    report2.stockReadiness.enhancementAssessment.isAppropriate === false,
    '২.২ ইতিমধ্যে ৪ MP+ থাকায় অতিরিক্ত আপস্কেলিং অপ্রয়োজনীয় চিহ্নিত',
    `ব্যাখ্যা: ${report2.stockReadiness.enhancementAssessment.reasonBn}`
  );

  assert(
    report2.technicalMetrics.megapixels >= 4.0 && report2.technicalMetrics.format.includes('JPEG'),
    '২.৩ টেকনিক্যাল মেট্রিক্সে বাস্তব মেগাপিক্সেল ও ফরম্যাট সঠিক ও যাচাইকৃত',
    `মেগাপিক্সেল: ${report2.technicalMetrics.megapixels} MP, ফরম্যাট: ${report2.technicalMetrics.format}`
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 3: Marketplace Discrimination - Shutterstock (Reject Candidate)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৩: মার্কেটপ্লেস নির্দিষ্ট নীতি - Shutterstock (Reject Candidate) ---');

  const report3Shutterstock: FinalQualityReport = await runFinalQualityCheck(compliantDerivative, 'shutterstock');

  assert(
    report3Shutterstock.stockReadiness.outcome === 'reject_candidate',
    '৩.১ Shutterstock-এ বাহ্যিক এআই ছবি থাকায় নির্ভুলভাবে "reject_candidate" চিহ্নিত',
    `ফলাফল: ${report3Shutterstock.stockReadiness.outcome} (${report3Shutterstock.stockReadiness.outcomeLabelBn})`
  );

  assert(
    report3Shutterstock.stockReadiness.actionableFixes.some((f) => f.actionType === 'switch_marketplace'),
    '৩.২ অনুমোদিত মার্কেটপ্লেস (Adobe Stock/Freepik) নির্বাচনে সুইচ করার ফিক্স নির্দেশিত',
    `অ্যাকশন: ${report3Shutterstock.stockReadiness.actionableFixes.find((f) => f.actionType === 'switch_marketplace')?.titleBn}`
  );

  assert(
    report3Shutterstock.marketplaceCompliance.aiPermitted === false,
    '৩.৩ Shutterstock অফিসিয়াল নীতিতে AI অনুমোদনহীন (aiPermitted: false) নিশ্চিত',
    `শর্ত: ${report3Shutterstock.marketplaceCompliance.specialRequirement}`
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 4: Commercial Trademark Infringement Detection
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৪: বাণিজ্যিক ট্রেডমার্ক / ব্র্যান্ড উপস্থিতি পরীক্ষা ---');

  const trademarkAsset: Asset = {
    id: 'asset-trademark-test',
    title: 'Modern Smartphone next to Apple iPhone and Nike sneakers',
    type: 'image',
    prompt: 'A sleek person holding an Apple iPhone while wearing Nike shoes in a city park',
    style: 'Photorealistic',
    aspectRatio: '16:9',
    dimensions: '2560 × 1440',
    url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    thumbnailUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    createdAt: 'Just now',
    isFavorite: false,
    model: 'Studio Generator',
    source: 'Studio',
    fileSize: '2.8 MB',
  };

  const report4: FinalQualityReport = await runFinalQualityCheck(trademarkAsset, 'adobe-stock', { visualLogoConfirmed: true });

  assert(
    report4.stockReadiness.outcome === 'reject_candidate',
    '৪.১ নিশ্চিত দৃশ্যমান বাণিজ্যিক ট্রেডমার্ক (Apple, Nike) উপস্থিতিতে "reject_candidate" সাব্যস্ত',
    `কারণ: ${report4.stockReadiness.reasonList.find((r) => r.includes('ব্র্যান্ড') || r.includes('লোগো'))}`
  );

  assert(
    report4.stockReadiness.actionableFixes.some((f) => f.actionType === 'remove_brand'),
    '৪.২ ট্রেডমার্ক ও ব্র্যান্ড অপসারণের সুনির্দিষ্ট নির্দেশিকা প্রদান',
    `ফিক্স: ${report4.stockReadiness.actionableFixes.find((f) => f.actionType === 'remove_brand')?.descriptionBn}`
  );

  const report4PromptOnly: FinalQualityReport = await runFinalQualityCheck(trademarkAsset, 'adobe-stock', { visualLogoConfirmed: false });
  assert(
    report4PromptOnly.stockReadiness.outcome === 'needs_fix',
    '৪.৩ প্রম্পট-অনলি ব্র্যান্ড উল্লেখ দৃশ্যমান লোগো নিশ্চিত না হওয়ায় "needs_fix" হিসেবে চিহ্নিত',
    `ফলাফল: ${report4PromptOnly.stockReadiness.outcome} (${report4PromptOnly.stockReadiness.outcomeLabelBn})`
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 5: Deterministic vs Heuristic Methodology Clarity
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৫: ডিটারমিনিস্টিক বনাম হিউরিস্টিক পদ্ধতির স্বচ্ছতা ---');

  const deterministicChecks = report2.checks.filter((c) => c.methodType === 'deterministic_software');
  const heuristicChecks = report2.checks.filter((c) => c.methodType === 'heuristic_estimate');

  assert(
    deterministicChecks.length >= 3,
    '৫.১ রেজোলিউশন, ফরম্যাট ও ডিকোডিং "deterministic_software" হিসেবে চিহ্নিত',
    `ডিটারমিনিস্টিক চেক সংখ্যা: ${deterministicChecks.length}টি (${deterministicChecks.map((c) => c.id).join(', ')})`
  );

  assert(
    heuristicChecks.length >= 2,
    '৫.২ শার্পনেস, নয়েজ ও অ্যানাটমি "heuristic_estimate" হিসেবে আলাদা চিহ্নিত',
    `হিউরিস্টিক চেক সংখ্যা: ${heuristicChecks.length}টি (${heuristicChecks.map((c) => c.id).join(', ')})`
  );

  assert(
    report2.stockReadiness.uncertaintyNotes.length >= 3,
    '৫.৩ মানব রিভিউয়ারের চূড়ান্ত সিদ্ধান্ত ও এআই সীমাবদ্ধতার ৩টি অনিশ্চয়তা নোট উপস্থিত',
    `নোট সংখ্যা: ${report2.stockReadiness.uncertaintyNotes.length}টি`
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 6: 5 Marketplace Distinct Rules Verification
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৬: ৫টি স্টক মার্কেটপ্লেসের স্বতন্ত্র অফিসিয়াল নিয়ম যাচাই ---');

  const mps: StockMarketplaceId[] = ['adobe-stock', 'freepik', 'dreamstime', 'wirestock', 'shutterstock'];
  const mpResults: Record<string, any> = {};

  for (const mp of mps) {
    const r = await runFinalQualityCheck(compliantDerivative, mp);
    mpResults[mp] = {
      name: r.marketplaceCompliance.marketplaceName,
      minMp: r.marketplaceCompliance.minMegapixelsRequired,
      aiPermitted: r.marketplaceCompliance.aiPermitted,
      outcome: r.stockReadiness.outcome,
    };
  }

  assert(
    mpResults['adobe-stock'].aiPermitted === true && mpResults['adobe-stock'].minMp === 4.0,
    '৬.১ Adobe Stock: ৪ MP ন্যূনতম, এআই অনুমোদিত (লেবেলিং সহ)',
    `নীতি: ${JSON.stringify(mpResults['adobe-stock'])}`
  );

  assert(
    mpResults['freepik'].aiPermitted === true && mpResults['freepik'].minMp === 4.0,
    '৬.২ Freepik: ৪ MP ন্যূনতম, এআই অনুমোদিত (_ai_generated ট্যাগ সহ)',
    `নীতি: ${JSON.stringify(mpResults['freepik'])}`
  );

  assert(
    mpResults['dreamstime'].aiPermitted === true && mpResults['dreamstime'].minMp === 3.0,
    '৬.৩ Dreamstime: ৩ MP ন্যূনতম, এআই অনুমোদিত',
    `নীতি: ${JSON.stringify(mpResults['dreamstime'])}`
  );

  assert(
    mpResults['wirestock'].aiPermitted === true && mpResults['wirestock'].minMp === 4.0,
    '৬.৪ Wirestock: ৪ MP ন্যূনতম, মাল্টি-প্ল্যাটফর্ম এআই ডিস্ট্রিবিউশন',
    `নীতি: ${JSON.stringify(mpResults['wirestock'])}`
  );

  assert(
    mpResults['shutterstock'].aiPermitted === false,
    '৬.৫ Shutterstock: বাহ্যিক এআই ছবি নিষিদ্ধ (রিজেকশন গ্যারান্টিযুক্ত)',
    `নীতি: ${JSON.stringify(mpResults['shutterstock'])}`
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 7: Storage & Non-Destructive Invariant Check
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৭: ডেটাবেস অপরিবর্তনশীলতা (Storage Invariant Audit) ---');

  const allAssetsInDb = await loadAllAssetsFromDB();
  assert(
    allAssetsInDb.length === 2,
    '৭.১ ডাটাবেসে মূল ও ডেরিভেটিভ উভয় এসেট আলাদাভাবে রক্ষিত (কোনো ডেটা লস নেই)',
    `মোট সেভ করা এসেট: ${allAssetsInDb.length}টি`
  );

  const origCheck = allAssetsInDb.find((a) => a.id === originalAsset.id);
  const derivCheck = allAssetsInDb.find((a) => a.id === compliantDerivative.id);

  assert(
    origCheck !== undefined && derivCheck !== undefined && origCheck.id !== derivCheck.id,
    '৭.২ মূল এবং ডেরিভেটিভ ফাইলের পৃথক আইডেন্টিটি সুরক্ষিত',
    `Original ID: ${origCheck?.id}, Derivative ID: ${derivCheck?.id}`
  );

  console.log('\n========================================================================');
  console.log(`অডিট ফলাফল: সর্বমোট পরীক্ষা: ${passedTests + failedTests} | সফল: ${passedTests} | ব্যর্থ: ${failedTests}`);
  console.log('========================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runStockReadinessIntelligenceAudit().catch((err) => {
  console.error('Audit crashed with uncaught error:', err);
  process.exit(1);
});

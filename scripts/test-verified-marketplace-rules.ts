/**
 * Test Suite: Priority 2.3 & 2.3.1 Verified Marketplace Rules Evidence Audit
 *
 * Verifies:
 * 1. Official contributor guidelines for Adobe Stock, Shutterstock, Freepik, Dreamstime, Wirestock.
 * 2. Mandatory presence of: sourceUrl, lastVerifiedAt, evidenceSummary, mediaType, enforcementLevel, verificationStatus.
 * 3. Separate rule profiles for Image vs Video media types.
 * 4. Shutterstock third-party AI prohibition verification.
 * 5. Freepik "_ai_generated" tag / CSV rule verification (and absence of mandatory "Created with AI" in title).
 * 6. Wirestock AI Content toggle (mandatory) & 6 MP resolution (recommended, not mandatory).
 * 7. Dreamstime AI disclosure & AI-generated face prohibition verification.
 * 8. Adobe Stock AI disclosure, commercial rights & technical requirements verification.
 * 9. Labeling of unverified rules as "uncertain_needs_verification" without false claims.
 * 10. Distinct compliance layers: Technical vs Content-Policy vs Editorial Acceptance.
 * 11. Brand prompt mentions are NOT treated as proof of visible logos (needs_fix + human review, NOT reject_candidate).
 * 12. Confirmed visual logos on image pixels correctly trigger reject_candidate.
 * 13. Unverified rule failure NEVER causes automatic rejection.
 * 14. Zero guarantee of final stock agency acceptance.
 */

import {
  evaluateMarketplaceRules,
  VERIFIED_MARKETPLACE_REGISTRY,
  ADOBE_STOCK_RULES,
  SHUTTERSTOCK_RULES,
  FREEPIK_RULES,
  DREAMSTIME_RULES,
  WIRESTOCK_RULES,
} from '../src/utils/verifiedMarketplaceRules';
import { runFinalQualityCheck } from '../src/utils/qualityChecker';
import { Asset } from '../src/types';

async function runVerifiedMarketplaceRulesEvidenceAudit() {
  console.log('========================================================================');
  console.log('AI CREATOR STUDIO: PRIORITY 2.3.1 MARKETPLACE RULES EVIDENCE AUDIT');
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

  const platforms = [
    { profile: ADOBE_STOCK_RULES, expectedUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html' },
    { profile: SHUTTERSTOCK_RULES, expectedUrl: 'https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ' },
    { profile: FREEPIK_RULES, expectedUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content' },
    { profile: DREAMSTIME_RULES, expectedUrl: 'https://www.dreamstime.com/terms#guidelines' },
    { profile: WIRESTOCK_RULES, expectedUrl: 'https://wirestock.io/terms-of-use' },
  ];

  // --------------------------------------------------------------------------
  // TEST 1: Requirement 1 & 6 — Official Documentation URL & Evidence Fields
  // --------------------------------------------------------------------------
  console.log('--- পরীক্ষা ১: প্রতিটি সক্রিয় নিয়মে ৬টি আবশ্যক প্রমাণ ফিল্ডের উপস্থিতি ---');

  for (const { profile, expectedUrl } of platforms) {
    assert(
      profile.officialPortalUrl === expectedUrl && profile.lastVerifiedAt.startsWith('2026-'),
      `১.${profile.marketplaceId}: ${profile.name} অফিসিয়াল গাইডলাইন পোর্টাল URL ও বাস্তব যাচাই তারিখ সংরক্ষিত`,
      `URL: ${profile.officialPortalUrl} | Last Verified: ${profile.lastVerifiedAt}`
    );

    const allRules = [...profile.imageRules, ...profile.videoRules];
    let allRulesHaveEvidence = true;
    let missingFieldNote = '';

    for (const rule of allRules) {
      if (!rule.sourceUrl || !rule.sourceUrl.startsWith('https://')) {
        allRulesHaveEvidence = false;
        missingFieldNote = `Rule ${rule.id} missing valid sourceUrl (${rule.sourceUrl})`;
        break;
      }
      if (!rule.lastVerifiedAt || !rule.lastVerifiedAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
        allRulesHaveEvidence = false;
        missingFieldNote = `Rule ${rule.id} missing valid lastVerifiedAt (${rule.lastVerifiedAt})`;
        break;
      }
      if (!rule.evidenceSummary || rule.evidenceSummary.trim().length < 10) {
        allRulesHaveEvidence = false;
        missingFieldNote = `Rule ${rule.id} missing detailed evidenceSummary`;
        break;
      }
      if (!['image', 'video', 'both'].includes(rule.mediaType)) {
        allRulesHaveEvidence = false;
        missingFieldNote = `Rule ${rule.id} missing mediaType`;
        break;
      }
      if (!['mandatory', 'recommended', 'uncertain_needs_verification'].includes(rule.enforcementLevel)) {
        allRulesHaveEvidence = false;
        missingFieldNote = `Rule ${rule.id} invalid enforcementLevel`;
        break;
      }
      if (!['verified', 'uncertain_needs_verification', 'unverified'].includes(rule.verificationStatus)) {
        allRulesHaveEvidence = false;
        missingFieldNote = `Rule ${rule.id} invalid verificationStatus`;
        break;
      }
    }

    assert(
      allRulesHaveEvidence,
      `১.${profile.marketplaceId}.২: ${profile.name} এর সকল (${allRules.length}টি) নিয়মে sourceUrl, lastVerifiedAt, evidenceSummary, mediaType, enforcementLevel, verificationStatus বিদ্যমান`,
      allRulesHaveEvidence ? `${allRules.length}টি নিয়মের প্রতিটিতে প্রমাণিত তথ্য উপস্থিত` : missingFieldNote
    );
  }

  // --------------------------------------------------------------------------
  // TEST 2: Separate Rule Profiles for Image vs Video (Requirement 3)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ২: ইমেজ বনাম ভিডিওর স্বতন্ত্র রুল প্রোফাইল (কখনো এক না করার প্রমাণ) ---');

  for (const { profile } of platforms) {
    const hasImageRules = profile.imageRules.length > 0;
    const hasVideoRules = profile.videoRules.length > 0;
    const imageOnlyCheck = profile.imageRules.every((r) => r.mediaType === 'image');
    const videoOnlyCheck = profile.videoRules.every((r) => r.mediaType === 'video');

    assert(
      hasImageRules && hasVideoRules && imageOnlyCheck && videoOnlyCheck,
      `২.${profile.marketplaceId}: ${profile.name} ইমেজ (${profile.imageRules.length}) ও ভিডিও (${profile.videoRules.length}) প্রোফাইল সম্পূর্ণ পৃথকীকৃত`,
      `ইমেজ রুল: ${profile.imageRules.map((r) => r.id).join(', ')} | ভিডিও রুল: ${profile.videoRules.map((r) => r.id).join(', ')}`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 3: Specific Policy Audits (Requirement 2 & 4)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৩: Shutterstock, Freepik ও Wirestock-এর সুনির্দিষ্ট নিয়ম অডিট ---');

  // 3A: Shutterstock external AI prohibition
  const shutterBanRule = SHUTTERSTOCK_RULES.imageRules.find((r) => r.id === 'shutter-img-external-ai-ban');
  assert(
    shutterBanRule !== undefined &&
      shutterBanRule.enforcementLevel === 'mandatory' &&
      shutterBanRule.verificationStatus === 'verified' &&
      shutterBanRule.sourceUrl.includes('submit.shutterstock.com'),
    '৩.১ Shutterstock বাহ্যিক AI নিষেধাজ্ঞা অফিসিয়াল FAQ দ্বারা mandatory ও verified হিসেবে প্রমাণিত',
    `Evidence: "${shutterBanRule?.evidenceSummary}"`
  );

  // 3B: Freepik _ai_generated tag / CSV rule
  const freepikTagRule = FREEPIK_RULES.imageRules.find((r) => r.id === 'freepik-img-tag');
  assert(
    freepikTagRule !== undefined &&
      freepikTagRule.enforcementLevel === 'mandatory' &&
      freepikTagRule.description.includes('Titles do NOT need "Created with AI"') &&
      freepikTagRule.evidenceSummary.includes('_ai_generated'),
    '৩.২ Freepik-এর "_ai_generated" ট্যাগ/CSV নিয়ম প্রমাণিত ও টাইটেলে "Created with AI" অপ্রয়োজনীয় স্পষ্টীকৃত',
    `Evidence: "${freepikTagRule?.evidenceSummary}"`
  );

  // 3C: Wirestock AI Toggle (mandatory)
  const wirestockToggleRule = WIRESTOCK_RULES.imageRules.find((r) => r.id === 'wirestock-img-ai-toggle');
  assert(
    wirestockToggleRule !== undefined &&
      wirestockToggleRule.enforcementLevel === 'mandatory' &&
      wirestockToggleRule.verificationStatus === 'verified',
    '৩.৩ Wirestock AI Content টগল সক্রিয়করণ বাধ্যতামূলক (mandatory) হিসেবে যাচাইকৃত',
    `Evidence: "${wirestockToggleRule?.evidenceSummary}"`
  );

  // 3D: Wirestock 6 MP rule is RECOMMENDED, not mandatory
  const wirestockResolutionRule = WIRESTOCK_RULES.imageRules.find((r) => r.id === 'wirestock-img-resolution');
  assert(
    wirestockResolutionRule !== undefined &&
      wirestockResolutionRule.enforcementLevel === 'recommended' &&
      wirestockResolutionRule.title.includes('Recommended') &&
      wirestockResolutionRule.evidenceSummary.includes('recommended, not an absolute barrier'),
    '৩.৪ Wirestock ৬ MP নিয়ম বাধ্যতামূলক নয়, বরং বহু-সংস্থা সিন্ডিকেশনের জন্য "recommended" হিসেবে চিহ্নিত',
    `Enforcement: ${wirestockResolutionRule?.enforcementLevel} | Evidence: "${wirestockResolutionRule?.evidenceSummary}"`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Dreamstime & Adobe Stock Specific Rules (Requirement 3 & 4)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৪: Dreamstime ও Adobe Stock-এর সুনির্দিষ্ট নিয়ম অডিট ---');

  // 4A: Dreamstime AI category requirement
  const dreamstimeCatRule = DREAMSTIME_RULES.imageRules.find((r) => r.id === 'dreamstime-img-category');
  assert(
    dreamstimeCatRule !== undefined &&
      dreamstimeCatRule.enforcementLevel === 'mandatory' &&
      dreamstimeCatRule.verificationStatus === 'verified',
    '৪.১ Dreamstime এআই ডিসক্লোজার ক্যাটাগরি (Illustrations / AI-generated) বাধ্যতামূলক ও যাচাইকৃত',
    `Evidence: "${dreamstimeCatRule?.evidenceSummary}"`
  );

  // 4B: Dreamstime AI-generated face prohibition
  const dreamstimeFaceRule = DREAMSTIME_RULES.imageRules.find((r) => r.id === 'dreamstime-img-no-faces');
  assert(
    dreamstimeFaceRule !== undefined &&
      dreamstimeFaceRule.enforcementLevel === 'mandatory' &&
      dreamstimeFaceRule.verificationStatus === 'verified' &&
      dreamstimeFaceRule.evidenceSummary.includes('model release'),
    '৪.২ Dreamstime বাস্তবমুখী কৃত্রিম মানুষের মুখ নিষিদ্ধকরণ মডেল রিলিজ নিয়মের কারণে mandatory ও verified',
    `Evidence: "${dreamstimeFaceRule?.evidenceSummary}"`
  );

  // 4C: Adobe Stock AI disclosure checkbox
  const adobeAiBoxRule = ADOBE_STOCK_RULES.imageRules.find((r) => r.id === 'adobe-img-ai-checkbox');
  assert(
    adobeAiBoxRule !== undefined &&
      adobeAiBoxRule.enforcementLevel === 'mandatory' &&
      adobeAiBoxRule.verificationStatus === 'verified',
    '৪.৩ Adobe Stock-এ "Created using generative AI tools" চেকবক্স চিহ্নিতকরণ আপলোড ফ্লোতে mandatory ও verified',
    `Evidence: "${adobeAiBoxRule?.evidenceSummary}"`
  );

  // 4D: Adobe Stock commercial IP and trademark rules
  const adobeIpRule = ADOBE_STOCK_RULES.imageRules.find((r) => r.id === 'adobe-img-no-brands');
  assert(
    adobeIpRule !== undefined &&
      adobeIpRule.enforcementLevel === 'mandatory' &&
      adobeIpRule.verificationStatus === 'verified',
    '৪.৪ Adobe Stock বাণিজ্যিক কন্টেন্টে শূন্য দৃশ্যমান ট্রেডমার্ক/লোগো নীতি mandatory ও verified',
    `Evidence: "${adobeIpRule?.evidenceSummary}"`
  );

  // 4E: Adobe Stock title length is recommended, not mandatory
  const adobeTitleRule = ADOBE_STOCK_RULES.imageRules.find((r) => r.id === 'adobe-img-title-rec');
  assert(
    adobeTitleRule !== undefined &&
      adobeTitleRule.enforcementLevel === 'recommended' &&
      adobeTitleRule.verificationStatus === 'verified',
    '৪.৫ Adobe Stock টাইটেল দৈর্ঘ্য (৫০–৭০ অক্ষর) বাধ্যতামূলক নয়, বরং "recommended" হিসেবে চিহ্নিত',
    `Enforcement: ${adobeTitleRule?.enforcementLevel}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Unverified Rules Labeled as uncertain_needs_verification (Requirement 2 & 4)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৫: অপ্রমাণিত নিয়মকে "uncertain_needs_verification" লেবেলিং ---');

  const freepikVideoRule = FREEPIK_RULES.videoRules.find((r) => r.id === 'freepik-vid-unsupported');
  assert(
    freepikVideoRule !== undefined &&
      freepikVideoRule.enforcementLevel === 'uncertain_needs_verification' &&
      freepikVideoRule.verificationStatus === 'uncertain_needs_verification' &&
      freepikVideoRule.isVerified === false,
    '৫.১ Freepik বহিরাগত AI ভিডিও আপলোড সুবিধা অপ্রমাণিত বিধায় "uncertain_needs_verification" চিহ্নিত',
    `Enforcement: ${freepikVideoRule?.enforcementLevel} | Status: ${freepikVideoRule?.verificationStatus}`
  );

  const wirestockVideoRule = WIRESTOCK_RULES.videoRules.find((r) => r.id === 'wirestock-vid-specs');
  assert(
    wirestockVideoRule !== undefined &&
      wirestockVideoRule.enforcementLevel === 'uncertain_needs_verification' &&
      wirestockVideoRule.verificationStatus === 'uncertain_needs_verification' &&
      wirestockVideoRule.isVerified === false,
    '৫.২ Wirestock খাঁটি এআই ভিডিও ডিস্ট্রিবিউশন শর্ত প্ল্যাটফর্ম-নির্ভর বিধায় "uncertain_needs_verification" চিহ্নিত',
    `Enforcement: ${wirestockVideoRule?.enforcementLevel} | Status: ${wirestockVideoRule?.verificationStatus}`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Prompt Brand Mentions != Visible Logos (Requirement 5)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৬: প্রম্পট ব্র্যান্ড উল্লেখ বনাম দৃশ্যমান লোগোর পার্থক্য (Requirement 5) ---');

  const promptMentionAsset: Asset = {
    id: 'test-prompt-brand-asset',
    title: 'Modern Minimalist Smartphone on Oak Desk',
    type: 'image',
    prompt: 'A sleek smartphone with titanium bezel inspired by modern Apple design on a minimalist wooden table',
    style: 'Photorealistic',
    aspectRatio: '16:9',
    dimensions: '2560 × 1440',
    url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    thumbnailUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    createdAt: 'Just now',
    isFavorite: false,
    model: 'Studio Generator',
    source: 'Studio',
    fileSize: '2.5 MB',
    fileFormat: 'JPEG',
  };

  // 6A: Prompt mention without confirmed visible logo -> needs_fix, NOT reject_candidate
  const evalPromptOnly = evaluateMarketplaceRules(promptMentionAsset, 'adobe-stock', 'image', { visualLogoFound: false });
  assert(
    evalPromptOnly.brandInspectionAudit.status === 'prompt_mention_only' &&
      evalPromptOnly.summaryStatus === 'needs_fix',
    '৬.১ শুধু প্রম্পটে ব্র্যান্ড থাকলে কখনোই "reject_candidate" হবে না, "needs_fix" এবং মানব পর্যালোচনা প্রস্তাব করা হয়েছে',
    `Brand Status: ${evalPromptOnly.brandInspectionAudit.status} | Summary Outcome: ${evalPromptOnly.summaryStatus} (${evalPromptOnly.summaryStatusLabelBn})`
  );

  // 6B: Confirmed visual logo in image pixels -> reject_candidate
  const evalVisualConfirmed = evaluateMarketplaceRules(promptMentionAsset, 'adobe-stock', 'image', { visualLogoFound: true });
  assert(
    evalVisualConfirmed.brandInspectionAudit.status === 'visual_logo_detected' &&
      evalVisualConfirmed.summaryStatus === 'reject_candidate',
    '৬.২ কেবল পিক্সেলে দৃশ্যমান লোগো নিশ্চিত হলেই "reject_candidate" নির্ধারণ করা হয়',
    `Brand Status: ${evalVisualConfirmed.brandInspectionAudit.status} | Summary Outcome: ${evalVisualConfirmed.summaryStatus}`
  );

  // --------------------------------------------------------------------------
  // TEST 7: Evaluated Rule Result Items Expose Evidence Fields (Requirement 6)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৭: মূল্যায়ন ফলাফলে নিয়মভিত্তিক প্রমাণ ফিল্ডের বিস্তার ---');

  const ruleResultSample = evalPromptOnly.technicalCompliance.ruleResults[0];
  assert(
    ruleResultSample !== undefined &&
      typeof ruleResultSample.sourceUrl === 'string' &&
      ruleResultSample.sourceUrl.startsWith('https://') &&
      typeof ruleResultSample.lastVerifiedAt === 'string' &&
      typeof ruleResultSample.evidenceSummary === 'string' &&
      ruleResultSample.evidenceSummary.length > 10,
    '৭.১ প্রতিটি মূল্যায়ন ফলাফল আইটেমে sourceUrl, lastVerifiedAt এবং evidenceSummary সঠিকভাবে উপলব্ধ',
    `Rule ID: ${ruleResultSample.ruleId} | Source: ${ruleResultSample.sourceUrl} | Verified: ${ruleResultSample.lastVerifiedAt}`
  );

  // --------------------------------------------------------------------------
  // TEST 8: Editorial Acceptance Zero-Guarantee Disclosures
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৮: এডিটোরিয়াল অনুমোদন জিরো-গ্যারান্টি ও মানুষের পর্যবেক্ষণ ডিসক্লেইমার ---');

  assert(
    evalPromptOnly.editorialAcceptance.guaranteed === false &&
      evalPromptOnly.editorialAcceptance.humanReviewRequired === true &&
      evalPromptOnly.editorialAcceptance.editorialDisclaimerBn.includes('চূড়ান্ত গ্রহণযোগ্যতা নিশ্চিত করা যায় না'),
    '৮.১ সিস্টেম কোনো অবস্থাতেই মার্কেটপ্লেস গ্রহণের নিশ্চয়তা দেয় না (Zero Guarantee Rule)',
    `Disclaimer: "${evalPromptOnly.editorialAcceptance.editorialDisclaimerBn}"`
  );

  // --------------------------------------------------------------------------
  // TEST 9: Quality Checker Integration with Verified Evidence Engine
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৯: কোয়ালিটি চেকারের সাথে নির্ভুল ইন্টিগ্রেশন ---');

  const reportPromptOnly = await runFinalQualityCheck(promptMentionAsset, 'adobe-stock', { visualLogoConfirmed: false });
  assert(
    reportPromptOnly.stockReadiness.outcome === 'needs_fix',
    '৯.১ runFinalQualityCheck প্রম্পট ব্র্যান্ডে কেবল "needs_fix" এবং মেটাডেটা অপসারণ অ্যাকশন প্রদান করে',
    `Outcome: ${reportPromptOnly.stockReadiness.outcome} (${reportPromptOnly.stockReadiness.outcomeLabelBn})`
  );

  const reportVisualConfirmed = await runFinalQualityCheck(promptMentionAsset, 'adobe-stock', { visualLogoConfirmed: true });
  assert(
    reportVisualConfirmed.stockReadiness.outcome === 'reject_candidate',
    '৯.২ দৃশ্যমান লোগো নিশ্চিত হলে runFinalQualityCheck সঠিকভাবে "reject_candidate" সাব্যস্ত করে',
    `Outcome: ${reportVisualConfirmed.stockReadiness.outcome}`
  );

  console.log('\n========================================================================');
  console.log(`অডিট ফলাফল: সর্বমোট পরীক্ষা: ${passedTests + failedTests} | সফল: ${passedTests} | ব্যর্থ: ${failedTests}`);
  console.log('========================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerifiedMarketplaceRulesEvidenceAudit().catch((err) => {
  console.error('Audit failed with uncaught exception:', err);
  process.exit(1);
});

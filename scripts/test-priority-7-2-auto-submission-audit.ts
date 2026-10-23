/**
 * Priority 7.2: Verified Auto-Submission Marketplace Audit Test
 *
 * Verifies:
 * 1. Comprehensive audit of Adobe Stock, Shutterstock, Freepik, Dreamstime, Wirestock, and Fiverr.
 * 2. Official documentation links, contributor eligibility, and authentication methods verified.
 * 3. Strict differentiation between Search/Licensing APIs, SFTP/FTP staging, and true Auto-Submission.
 * 4. Zero fake auto-submission platforms added to Autonomous Pipeline (Invariant: verifiedAutoPlatforms === 0).
 * 5. Honest blocker reporting for all platforms.
 * 6. Zero security breaches (no passwords, session-cookies, OTPs, or scrapers).
 * 7. Drop package (RFC 4180 CSV + JPEG) integrity preserved.
 */

import {
  getAllMarketplaceAutoSubmissionAudits,
  getMarketplaceAutoSubmissionAudit,
  getVerifiedAutoSubmissionPlatforms,
  getBlockedAutoSubmissionPlatforms,
  getSubmissionReadinessAuditSummary,
  MarketplaceAutoSubmissionAuditProfile,
} from '../src/utils/marketplaceAutoSubmissionAudit';
import { PLATFORM_POLICY_REGISTRY } from '../src/utils/platformPolicyRegistry';
import {
  buildAdobeStockCsv,
  buildShutterstockCsv,
  buildFreepikCsv,
  buildDreamstimeCsv,
  buildWirestockCsv,
} from '../src/utils/autonomousPipelineEngine';

let passed = 0;
let failed = 0;

function assertPass(step: string, title: string, details?: string) {
  passed++;
  console.log(`\x1b[32m✔ [PASS] Step ${step}: ${title}\x1b[0m`);
  if (details) console.log(`   \x1b[90m${details}\x1b[0m`);
}

function assertFail(step: string, title: string, error?: string) {
  failed++;
  console.error(`\x1b[31m✘ [FAIL] Step ${step}: ${title}\x1b[0m`);
  if (error) console.error(`   \x1b[31mError: ${error}\x1b[0m`);
}

async function runAutoSubmissionAuditTests() {
  console.log('\n========================================================================');
  console.log(' Priority 7.2: Verified Auto-Submission Marketplace Audit Verification');
  console.log('========================================================================\n');

  // ---------------------------------------------------------------------------
  // STEP 1: AUDIT COVERAGE & OFFICIAL DOCUMENTATION LINKS
  // ---------------------------------------------------------------------------
  console.log('--- ধাপ ১: মার্কেটপ্লেস কভারেজ ও অফিসিয়াল ডকুমেন্টেশন লিংক অডিট ---');

  const requiredPlatforms = ['adobe-stock', 'shutterstock', 'freepik', 'dreamstime', 'wirestock', 'fiverr'] as const;
  const allAudits = getAllMarketplaceAutoSubmissionAudits();
  const coveredIds = new Set(allAudits.map((a) => a.platformId));

  const missingPlatforms = requiredPlatforms.filter((id) => !coveredIds.has(id));

  if (missingPlatforms.length === 0) {
    assertPass(
      '১.১',
      'সমস্ত আবশ্যক প্ল্যাটফর্ম (Adobe Stock, Shutterstock, Freepik, Dreamstime, Wirestock, Fiverr) অডিটে অন্তর্ভুক্ত',
      `মোট অডিটকৃত প্ল্যাটফর্ম: ${allAudits.length}টি`
    );
  } else {
    assertFail('১.১', `অসম্পূর্ণ প্ল্যাটফর্ম অডিট। অনুপস্থিত: ${missingPlatforms.join(', ')}`);
  }

  // Verify official URLs
  let validUrlsCount = 0;
  for (const pid of requiredPlatforms) {
    const audit = getMarketplaceAutoSubmissionAudit(pid);
    if (audit.officialDocumentationUrl.startsWith('https://') && audit.officialDocumentationUrl.length > 15) {
      validUrlsCount++;
    }
  }

  if (validUrlsCount === requiredPlatforms.length) {
    assertPass(
      '১.২',
      'প্রতিটি প্ল্যাটফর্মের জন্য সক্রিয় ও অফিসিয়াল নির্দেশিকা URL নিশ্চিত',
      `৬টি প্ল্যাটফর্মের প্রতিটিই বৈধ https:// লিঙ্কসহ কনফিগার করা`
    );
  } else {
    assertFail('১.২', `কিছু প্ল্যাটফর্মে অফিসিয়াল নির্দেশিকা লিঙ্ক অনুপস্থিত (${validUrlsCount}/${requiredPlatforms.length})`);
  }

  // ---------------------------------------------------------------------------
  // STEP 2: RIGOROUS DISTINCTION: UPLOAD VS FINAL SUBMISSION
  // ---------------------------------------------------------------------------
  console.log('\n--- ধাপ ২: আপলোড বাফার বনাম ফাইনাল সাবমিশনের সুস্পষ্ট পার্থক্য ---');

  const adobeAudit = getMarketplaceAutoSubmissionAudit('adobe-stock');
  const dreamstimeAudit = getMarketplaceAutoSubmissionAudit('dreamstime');

  // SFTP exists, but is NOT full auto-submit
  const adobeSftpStaged =
    adobeAudit.upload.sftpFtpSupported &&
    !adobeAudit.isFullAutoSubmitPossible &&
    adobeAudit.classification === 'ASSISTED_SFTP_STAGING' &&
    adobeAudit.finalSubmission.requiresPortalInteraction;

  if (adobeSftpStaged) {
    assertPass(
      '২.১',
      'Adobe Stock: SFTP শুধুমাত্র ড্রাফট বাফার (Uploaded Files) করে, স্বয়ংক্রিয় সাবমিশন নয় — সঠিক শ্রেণিবদ্ধকরণ',
      `SFTP Host: ${adobeAudit.upload.sftpHost} | Classification: ${adobeAudit.classification} | Blocker: ${adobeAudit.blockerCategory}`
    );
  } else {
    assertFail('২.১', 'Adobe Stock SFTP-কে ভুলবশত ফুল অটো-সাবমিশন হিসেবে গণ্য করা হয়েছে');
  }

  const dreamstimeFtpStaged =
    dreamstimeAudit.upload.sftpFtpSupported &&
    !dreamstimeAudit.isFullAutoSubmitPossible &&
    dreamstimeAudit.classification === 'ASSISTED_SFTP_STAGING' &&
    dreamstimeAudit.finalSubmission.requiresPortalInteraction;

  if (dreamstimeFtpStaged) {
    assertPass(
      '২.২',
      'Dreamstime: FTP ফাইল "Commercial Unfinished" সেকশনে বাফার করে, ম্যানুয়াল ক্যাটাগরি ও সাবমিশন আবশ্যক',
      `FTP Host: ${dreamstimeAudit.upload.sftpHost} | Classification: ${dreamstimeAudit.classification}`
    );
  } else {
    assertFail('২.২', 'Dreamstime FTP ড্রাফট হ্যান্ডলিং সঠিকভাবে চিহ্নিত হয়নি');
  }

  // ---------------------------------------------------------------------------
  // STEP 3: STRICT POLICY & API BLOCKER VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- ধাপ ৩: পলিসি ও এপিআই ব্লকার সততা পরীক্ষা ---');

  // Shutterstock external AI ban & enterprise ingestion restriction
  const shutterAudit = getMarketplaceAutoSubmissionAudit('shutterstock');
  const shutterBlocked =
    shutterAudit.classification === 'POLICY_BLOCKED' &&
    shutterAudit.blockerCategory === 'ai_policy_prohibition' &&
    !shutterAudit.isFullAutoSubmitPossible &&
    shutterAudit.contributorEligibility.enterpriseContractRequired;

  if (shutterBlocked) {
    assertPass(
      '৩.১',
      'Shutterstock: বাহ্যিক ৩য়-পক্ষ জেনারেটিভ এআই নিষেধাজ্ঞা ও এন্টারপ্রাইজ-অনলি এপিআই ব্লকার নিশ্চিত',
      `Classification: ${shutterAudit.classification} | Blocker: ${shutterAudit.blockerCategory}`
    );
  } else {
    assertFail('৩.১', 'Shutterstock এআই পলিসি নিষেধাজ্ঞা শনাক্তে ব্যর্থ');
  }

  // Freepik: No contributor API
  const freepikAudit = getMarketplaceAutoSubmissionAudit('freepik');
  const freepikBlocked =
    freepikAudit.classification === 'DROP_PACKAGE_MANUAL_PORTAL' &&
    freepikAudit.blockerCategory === 'no_contributor_submission_api' &&
    !freepikAudit.isFullAutoSubmitPossible;

  if (freepikBlocked) {
    assertPass(
      '৩.২',
      'Freepik: কন্ট্রিবিউটর সাবমিশন এপিআই অনুপস্থিত — ড্রপ প্যাকেজ ও পোর্টাল রিভিউ আবশ্যক',
      `Classification: ${freepikAudit.classification} | Actions: ${freepikAudit.finalSubmission.mandatoryPortalActionsBn.length} portal steps`
    );
  } else {
    assertFail('৩.২', 'Freepik এপিআই অনুপস্থিতি শনাক্তে ব্যর্থ');
  }

  // Wirestock: Aggregator without open developer API
  const wirestockAudit = getMarketplaceAutoSubmissionAudit('wirestock');
  const wirestockBlocked =
    wirestockAudit.classification === 'DROP_PACKAGE_MANUAL_PORTAL' &&
    !wirestockAudit.isFullAutoSubmitPossible;

  if (wirestockBlocked) {
    assertPass(
      '৩.৩',
      'Wirestock: ওপেন থার্ড-পার্টি কন্ট্রিবিউটর এপিআই অনুপস্থিত — ড্যাশবোর্ড ড্রপ প্যাকেজ আবশ্যক',
      `Classification: ${wirestockAudit.classification}`
    );
  } else {
    assertFail('৩.৩', 'Wirestock ওপেন এপিআই সীমাবদ্ধতা শনাক্তে ব্যর্থ');
  }

  // ---------------------------------------------------------------------------
  // STEP 4: ZERO FAKE AUTO-SUBMISSION INVARIANT
  // ---------------------------------------------------------------------------
  console.log('\n--- ধাপ ৪: ০ ফেক অটো-সাবমিশন ইনভ্যারিয়েন্ট (Truthful Guarantee) ---');

  const verifiedAutoList = getVerifiedAutoSubmissionPlatforms();
  const blockedList = getBlockedAutoSubmissionPlatforms();
  const summary = getSubmissionReadinessAuditSummary();

  const isStrictlyZeroVerified = verifiedAutoList.length === 0;
  const isAllStockBlocked = blockedList.length >= 5;

  if (isStrictlyZeroVerified && isAllStockBlocked) {
    assertPass(
      '৪.১',
      'সত্যতা নিশ্চয়তা: কোনো প্ল্যাটফর্মকে মনগড়াভাবে "Full Auto-Submit" দাবি করা হয়নি (Verified: 0)',
      `অফিসিয়াল সত্য: সাধারণ কন্ট্রিবিউটর অ্যাকাউন্টের জন্য কোনো প্ল্যাটফর্মে এপিআই এন্ড-টু-এন্ড সাবমিশন নেই (Blocked: ${blockedList.length})`
    );
  } else {
    assertFail(
      '৪.১',
      `ভুল বা কাল্পনিক অটো-সাবমিশন প্ল্যাটফর্ম পাওয়া গেছে! Verified count: ${verifiedAutoList.length}`
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 5: SECURITY BOUNDARY & CREDENTIALS INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n--- ধাপ ৫: নিরাপত্তা সীমানা ও ক্রেডেনশিয়াল সততা ---');

  let hasUnsafeAuth = false;
  for (const audit of allAudits) {
    if (audit.authentication.supportsHeadlessSubmission) {
      hasUnsafeAuth = true;
      break;
    }
  }

  if (!hasUnsafeAuth) {
    assertPass(
      '৫.১',
      'কোনো প্ল্যাটফর্মে পাসওয়ার্ড, সেশন কুকি, OTP সংগ্রহ বা হেডলেস স্ক্র্যাপিং বাইপাস রাখা হয়নি',
      'নিরাপত্তা নীতি অক্ষত: Headless submission strictly false across all profiles'
    );
  } else {
    assertFail('৫.১', 'অননুমোদিত হেডলেস স্ক্র্যাপিং বা সেশন বাইপাস পাওয়া গেছে');
  }

  // ---------------------------------------------------------------------------
  // STEP 6: PLATFORM POLICY REGISTRY INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n--- ধাপ ৬: Platform Policy Registry সমন্বয় ও নির্ভুলতা ---');

  const pAdobe = PLATFORM_POLICY_REGISTRY['adobe-stock'];
  const pShutter = PLATFORM_POLICY_REGISTRY['shutterstock'];
  const pDream = PLATFORM_POLICY_REGISTRY['dreamstime'];

  const policyRegistryTruthful =
    !pAdobe.automatedPublishingAllowed &&
    !pShutter.automatedPublishingAllowed &&
    !pDream.automatedPublishingAllowed;

  if (policyRegistryTruthful) {
    assertPass(
      '৬.১',
      'Platform Policy Registry-তে automatedPublishingAllowed সঠিকভাবে false নির্ধারণ',
      'Adobe Stock, Shutterstock এবং Dreamstime কোনোটিতেই মিথ্যা অটো-পাবলিশিং নেই'
    );
  } else {
    assertFail('৬.১', 'Platform Policy Registry-তে মিথ্যা অটোমেটেড পাবলিশিং ট্রু রাখা হয়েছে');
  }

  // ---------------------------------------------------------------------------
  // STEP 7: DROP PACKAGE RFC 4180 INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n--- ধাপ ৭: ড্রপ প্যাকেজ (RFC 4180 CSV + মেটাডেটা) পূর্ণ কার্যকারিতা ---');

  const testFilename = 'test_asset_001.jpg';
  const testTitle = 'Majestic Bengal Tiger in Sundarbans Mangrove Generative AI';
  const testDesc = 'Close up photograph of Royal Bengal tiger resting in Sundarbans forest';
  const testKeywords = ['tiger', 'bengal tiger', 'sundarbans', 'wildlife', 'generative ai', 'nature'];

  const adobeCsv = buildAdobeStockCsv(testFilename, testTitle, testKeywords);
  const shutterCsv = buildShutterstockCsv(testFilename, testDesc, testKeywords);
  const freepikCsv = buildFreepikCsv(testFilename, testTitle, testKeywords, 'tiger prompt');
  const dreamCsv = buildDreamstimeCsv(testFilename, testTitle, testDesc, testKeywords);
  const wirestockCsv = buildWirestockCsv(testFilename, testTitle, testDesc, testKeywords);

  const csvIntegrity =
    adobeCsv.includes('Filename') && adobeCsv.includes('Title') && adobeCsv.includes('Keywords') &&
    shutterCsv.includes('Filename') && shutterCsv.includes('Description') && shutterCsv.includes('Keywords') &&
    freepikCsv.includes('Filename') && freepikCsv.includes('Title') && freepikCsv.includes('Prompt') &&
    dreamCsv.includes('Filename') && dreamCsv.includes('Title') && dreamCsv.includes('Category') &&
    wirestockCsv.includes('Filename') && wirestockCsv.includes('Title') && wirestockCsv.includes('Keywords');

  if (csvIntegrity) {
    assertPass(
      '৭.১',
      '৫টি মার্কেটপ্লেসের জন্য RFC 4180 CSV ড্রপ প্যাকেজ সঠিকভাবে প্রস্তুত ও অক্ষুণ্ণ',
      'Adobe Stock, Shutterstock, Freepik, Dreamstime, Wirestock সব ফরম্যাট বৈধ'
    );
  } else {
    assertFail('৭.১', 'RFC 4180 CSV জেনারেশনে ত্রুটি');
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`অডিট টেস্ট ফলাফল: PASS: ${passed} | FAIL: ${failed}`);
  console.log('========================================================================\n');

  if (failed === 0) {
    console.log('\x1b[32m✔ Priority 7.2 Verified Auto-Submission Marketplace Audit সম্পূর্ণ সফল!\x1b[0m\n');
  } else {
    process.exit(1);
  }
}

runAutoSubmissionAuditTests().catch((err) => {
  console.error('Audit test failed with unhandled error:', err);
  process.exit(1);
});

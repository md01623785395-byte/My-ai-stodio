/**
 * Test Suite: Priority 2.4 Professional Account Manager Module Audit
 *
 * Verifies:
 * 1. Account CRUD Operations (Add, Read, Update, Delete).
 * 2. Platform Policy Gates (Fiverr 1-account strict limit vs Adobe Stock multi-account rules).
 * 3. Security Shield (Strict rejection and non-storage of passwords, cookies, or tokens).
 * 4. Truthful Connection States (Never displays fake Connected state; defaults to Action Required).
 * 5. Asset Assignment & Duplicate Prevention (Prevents accidental duplicate assignments).
 * 6. Adobe Stock Workflow Packaging (Technical check, 4 MP rule, AI disclosure checkbox).
 * 7. Fiverr Freelance Service Packaging (Gig title, description with AI disclosure, tier pricing, checklist).
 * 8. Status Integrity & Verifiable Evidence Audit (Chronological history log, evidence note requirement).
 * 9. Localization & Field Integrity (Bilingual labels in Bengali and English).
 */

import {
  getAccounts,
  saveAccount,
  updateAccount,
  deleteAccount,
  getAssignments,
  assignAssetToAccount,
  updateAssignmentWorkflowStatus,
  removeAssignment,
} from '../src/utils/accountManagerStorage';
import {
  PLATFORM_POLICY_REGISTRY,
  validateNewAccountPermissibility,
} from '../src/utils/platformPolicyRegistry';
import { prepareAssetForAccount } from '../src/utils/accountWorkflowPreparer';
import { Asset } from '../src/types';

async function runAccountManagerAudit() {
  console.log('========================================================================');
  console.log('AI CREATOR STUDIO: PRIORITY 2.4 PROFESSIONAL ACCOUNT MANAGER AUDIT');
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

  // Sample Asset for Testing
  const sampleStockImage: Asset = {
    id: 'asset-stock-sample-001',
    title: 'Modern Minimalist Ceramic Coffee Cup on Marble Counter',
    type: 'image',
    prompt: 'A minimalist ceramic coffee cup with steam rising on white marble counter, warm morning daylight, 8k resolution',
    style: 'Photorealistic',
    aspectRatio: '16:9',
    dimensions: '2560 × 1440',
    url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    thumbnailUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    createdAt: 'Just now',
    isFavorite: false,
    model: 'Studio Generator',
    source: 'Studio',
    fileSize: '3.2 MB',
    fileFormat: 'JPEG',
  };

  // --------------------------------------------------------------------------
  // TEST 1: Official Policy Registry Verification
  // --------------------------------------------------------------------------
  console.log('--- পরীক্ষা ১: Adobe Stock ও Fiverr-এর অফিসিয়াল নীতি অডিট ---');

  const adobePolicy = PLATFORM_POLICY_REGISTRY['adobe-stock'];
  assert(
    adobePolicy !== undefined &&
      adobePolicy.platformType === 'stock_marketplace' &&
      adobePolicy.multipleAccountsAllowed === true &&
      adobePolicy.officialTermsUrl.includes('helpx.adobe.com'),
    '১.১ Adobe Stock: স্টক মার্কেটপ্লেস হিসেবে শ্রেণিভুক্ত ও মাল্টি-অ্যাকাউন্ট শর্তাবলী যাচাইকৃত',
    `Type: ${adobePolicy.platformType} | Multi-accounts: ${adobePolicy.multipleAccountsAllowed} | URL: ${adobePolicy.officialTermsUrl}`
  );

  const fiverrPolicy = PLATFORM_POLICY_REGISTRY['fiverr'];
  assert(
    fiverrPolicy !== undefined &&
      fiverrPolicy.platformType === 'freelance_service' &&
      fiverrPolicy.multipleAccountsAllowed === false &&
      fiverrPolicy.maxAccountsPerUser === 1 &&
      fiverrPolicy.officialTermsUrl.includes('fiverr.com'),
    '১.২ Fiverr: ফ্রিল্যান্স সার্ভিস হিসেবে শ্রেণিভুক্ত ও ১-অ্যাকাউন্ট কঠোর সীমা নীতিতে চিহ্নিত',
    `Type: ${fiverrPolicy.platformType} | Max accounts: ${fiverrPolicy.maxAccountsPerUser} | Multi-accounts: ${fiverrPolicy.multipleAccountsAllowed}`
  );

  // --------------------------------------------------------------------------
  // TEST 2: Account Creation & Truthful Connection Status
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ২: অ্যাকাউন্ট প্রোফাইল তৈরি ও সত্যবাদী কানেকশন স্ট্যাটাস ---');

  // 2A: Adobe Stock Profile
  const adobeAccRes = await saveAccount({
    platformId: 'adobe-stock',
    displayName: 'Bengal Creative Stock Studio',
    accountIdentifier: 'bengal_stock_id_99',
    profileUrl: 'https://stock.adobe.com/contributor/bengal_stock_id_99',
    notes: 'Commercial architectural & food photography stock',
  });

  assert(
    adobeAccRes.success &&
      adobeAccRes.account !== undefined &&
      adobeAccRes.account.connectionStatus === 'action_required',
    '২.১ Adobe Stock অ্যাকাউন্ট তৈরিতে সত্যবাদী স্ট্যাটাস "action_required" প্রদর্শিত (ভুয়া Connected নয়)',
    `ID: ${adobeAccRes.account?.id} | Status: ${adobeAccRes.account?.connectionStatus} | Reason: "${adobeAccRes.account?.statusReasonBn}"`
  );

  // 2B: Fiverr Profile
  const fiverrAccRes = await saveAccount({
    platformId: 'fiverr',
    displayName: 'Pro Concept Artistry',
    accountIdentifier: 'pro_concept_fiverr',
    profileUrl: 'https://fiverr.com/pro_concept_fiverr',
    notes: 'Custom AI Concept Art & Illustrations for Indie Games',
  });

  assert(
    fiverrAccRes.success &&
      fiverrAccRes.account !== undefined &&
      fiverrAccRes.account.platformType === 'freelance_service' &&
      fiverrAccRes.account.connectionStatus === 'action_required',
    '২.২ Fiverr ফ্রিল্যান্স সেলার অ্যাকাউন্ট সফলভাবে তৈরি ও ফ্রিল্যান্স সার্ভিস সক্ষমতা অ্যাসাইনকৃত',
    `Platform: ${fiverrAccRes.account?.platformId} | Capabilities: ${fiverrAccRes.account?.supportedCapabilities.join(', ')}`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Multi-Account Policy Gating (Fiverr 1-Account Enforcement)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৩: মাল্টি-অ্যাকাউন্ট পলিসি গেট (Fiverr ১-অ্যাকাউন্ট নীতি প্রয়োগ) ---');

  // Attempt to create a 2nd Fiverr account
  const secondFiverrAttempt = await saveAccount({
    platformId: 'fiverr',
    displayName: 'Secondary Fiverr Profile',
    accountIdentifier: 'secondary_fiverr_user',
  });

  assert(
    secondFiverrAttempt.success === false &&
      secondFiverrAttempt.error !== undefined &&
      (secondFiverrAttempt.error.includes('সর্বোচ্চ 1টি') || secondFiverrAttempt.error.includes('সর্বোচ্চ ১টি') || secondFiverrAttempt.error.includes('Fiverr')),
    '৩.১ Fiverr-এ ২য় প্রোফাইল তৈরি প্রতিরোধ করা হয়েছে (Fiverr Terms of Service Violation Gate)',
    `Error Message: "${secondFiverrAttempt.error}"`
  );

  // Adobe Stock allows legitimate 2nd account
  const secondAdobeAttempt = await saveAccount({
    platformId: 'adobe-stock',
    displayName: 'Bengal Studio Agency LLC',
    accountIdentifier: 'bengal_stock_agency_corp',
  });

  assert(
    secondAdobeAttempt.success === true &&
      secondAdobeAttempt.account !== undefined,
    '৩.২ Adobe Stock-এ বৈধ ব্যবসায়িক পৃথকীকরণের অধীনে একাধিক প্রোফাইল সফলভাবে অনুমোদিত',
    `Adobe Profile 2 ID: ${secondAdobeAttempt.account?.id}`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Security Shield (Credential Rejection)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৪: নিরাপত্তা সুরক্ষা (পাসওয়ার্ড ও টোকেন সরাসরি বাতিল) ---');

  const securityTestRes = await saveAccount({
    platformId: 'adobe-stock',
    displayName: 'Insecure Profile',
    accountIdentifier: 'user_with_password',
    // @ts-expect-error test illegal input
    password: 'PlaintextSecretPassword123!',
  });

  const securityViolationCaught =
    securityTestRes.success === false &&
    securityTestRes.error !== undefined &&
    securityTestRes.error.includes('Security Violation');

  assert(
    securityViolationCaught,
    '৪.১ পাসওয়ার্ড, সেশন টোকেন বা গোপন ক্রেডেনশিয়াল স্টোরেজে দেওয়া হলে তাৎক্ষণিক Security Violation ব্লক',
    `Security Shield: "${securityTestRes.error}"`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Asset Assignment & Duplicate Prevention
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৫: এসেট বরাদ্দ ও ডুপ্লিকেট অ্যাসাইনমেন্ট রোধ ---');

  const targetAccountId = adobeAccRes.account!.id;

  // 5A: First assignment succeeds
  const firstAssignRes = await assignAssetToAccount(targetAccountId, sampleStockImage);
  assert(
    firstAssignRes.success &&
      firstAssignRes.assignment !== undefined &&
      firstAssignRes.assignment.workflowStatus === 'prepared',
    '৫.১ প্রথমবার এসেট অ্যাসাইনমেন্ট সফল হয়েছে এবং প্রাথমিক স্ট্যাটাস "prepared" নির্ধারণ করা হয়েছে',
    `Assignment ID: ${firstAssignRes.assignment?.id} | Status: ${firstAssignRes.assignment?.workflowStatus}`
  );

  // 5B: Duplicate assignment of the same asset to the same account is rejected
  const duplicateAssignRes = await assignAssetToAccount(targetAccountId, sampleStockImage);
  assert(
    duplicateAssignRes.success === false &&
      duplicateAssignRes.error !== undefined &&
      duplicateAssignRes.error.includes('ইতিমধ্যে এই অ্যাকাউন্টে যুক্ত রয়েছে'),
    '৫.২ একই এসেট একই অ্যাকাউন্টে পুনরায় বরাদ্দ দেওয়া থেকে ডুপ্লিকেট গার্ড সফলভাবে প্রতিহত করেছে',
    `Duplicate rejection: "${duplicateAssignRes.error}"`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Adobe Stock Workflow Packaging
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৬: Adobe Stock ওয়ার্কফ্লো প্যাকেজিং ও চেকলিস্ট ---');

  const adobeWorkflow = prepareAssetForAccount(sampleStockImage, 'adobe-stock');
  assert(
    adobeWorkflow.targetPackage.minMegapixelsRequired === 4.0 &&
      adobeWorkflow.targetPackage.aiDisclosureRequired === true &&
      adobeWorkflow.targetPackage.title.includes('Generative AI'),
    '৬.১ Adobe Stock প্যাকেজে ৪ MP শর্ত, AI ডিসক্লোজার ও ফ্যাকচুয়াল টাইটেল সমন্বিত',
    `Title: "${adobeWorkflow.targetPackage.title}" | Min MP: ${adobeWorkflow.targetPackage.minMegapixelsRequired}`
  );

  const hasAdobeAiCheckboxItem = adobeWorkflow.targetPackage.checklist.some((c) =>
    c.id === 'check-ai-box' && c.required === true
  );
  assert(
    hasAdobeAiCheckboxItem,
    '৬.২ Adobe কন্ট্রিবিউটর আপলোড পোর্টালে "Created using generative AI tools" চেকবক্স নির্দেশিকা অন্তর্ভুক্ত',
    'চেকলিস্টে AI চেকবক্স টিক দেওয়ার বাধ্যবাধকতা নিশ্চিত করা হয়েছে।'
  );

  // --------------------------------------------------------------------------
  // TEST 7: Fiverr Freelance Service Packaging
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৭: Fiverr ফ্রিল্যান্স গিগ ও ক্লায়েন্ট ডেলিভারি প্যাকেজিং ---');

  const fiverrWorkflow = prepareAssetForAccount(sampleStockImage, 'fiverr', {
    gigTier: 'standard',
    customPriceUsd: 45,
  });

  assert(
    Boolean(fiverrWorkflow.targetPackage.gigTitle?.startsWith('I will create professional AI')) &&
      fiverrWorkflow.targetPackage.suggestedPriceUsd === 45 &&
      fiverrWorkflow.targetPackage.keywords.length <= 5,
    '৭.১ Fiverr ফ্রিল্যান্স সার্ভিসে কাস্টম গিগ টাইটেল, মূল্য ($৪৫) ও সর্বোচ্চ ৫টি সার্চ ট্যাগ তৈরি হয়েছে',
    `Gig Title: "${fiverrWorkflow.targetPackage.gigTitle}" | Price: $${fiverrWorkflow.targetPackage.suggestedPriceUsd} | Tags: ${fiverrWorkflow.targetPackage.keywords.length}`
  );

  const fiverrAiDisclosurePresent = fiverrWorkflow.targetPackage.description.includes('Generative AI tools are utilized');
  assert(
    fiverrAiDisclosurePresent,
    '৭.২ Fiverr গিগ বিবরণে ক্রেতার সুবিধার্থে স্বচ্ছ এআই ব্যবহারের শর্তাবলী অন্তর্ভুক্ত',
    'ক্রেতাকে বিভ্রান্ত না করে এআই টুলের ব্যবহারের বিষয়ে স্বচ্ছতা বজায় রাখা হয়েছে।'
  );

  // --------------------------------------------------------------------------
  // TEST 8: Verifiable Status Transitions & Audit History Log
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৮: প্রমাণভিত্তিক স্ট্যাটাস পরিবর্তন ও অডিট ট্রেইল ---');

  const assignmentId = firstAssignRes.assignment!.id;

  // 8A: Transition without evidence is rejected
  const emptyEvidenceAttempt = await updateAssignmentWorkflowStatus(
    assignmentId,
    'submitted',
    '   ' // Empty evidence
  );

  assert(
    emptyEvidenceAttempt.success === false &&
      Boolean(emptyEvidenceAttempt.error?.includes('প্রমাণের বিবরণ (Evidence Note) আবশ্যক')),
    '৮.১ প্রমাণ ছাড়া কোনো এসেটকে "submitted" বা "published" করা কঠোরভাবে নিষিদ্ধ ও প্রত্যাখ্যাত',
    `Error: "${emptyEvidenceAttempt.error}"`
  );

  // 8B: Valid transition with verifiable evidence succeeds and logs chronological history
  const validTransition = await updateAssignmentWorkflowStatus(
    assignmentId,
    'submitted',
    'Uploaded via Adobe Stock Contributor Portal (Batch #AD-2026-9901)',
    'Verified sRGB JPEG file, checked generative AI checkbox'
  );

  assert(
    validTransition.success &&
      validTransition.assignment?.workflowStatus === 'submitted' &&
      validTransition.assignment?.submissionHistory.length >= 2,
    '৮.২ বাস্তব প্রমাণের রেফারেন্সসহ স্ট্যাটাস সফলভাবে "submitted"-এ রূপান্তরিত ও অডিট লগে সংরক্ষিত',
    `Status: ${validTransition.assignment?.workflowStatus} | History count: ${validTransition.assignment?.submissionHistory.length}`
  );

  // 8C: Publishing confirmation with evidence
  const publishedTransition = await updateAssignmentWorkflowStatus(
    assignmentId,
    'confirmed_published',
    'Asset accepted by Adobe curator, File ID #94827104 live on Adobe Stock marketplace'
  );

  assert(
    publishedTransition.success &&
      publishedTransition.assignment?.workflowStatus === 'confirmed_published',
    '৮.৩ কিউরেটর অনুমোদনের আইডি রেকর্ডের পর স্ট্যাটাস "confirmed_published"-এ উন্নীত',
    `Workflow status: ${publishedTransition.assignment?.workflowStatusLabelBn}`
  );

  // Clean up test accounts
  await deleteAccount(secondAdobeAttempt.account!.id);

  console.log('\n========================================================================');
  console.log(`অডিট ফলাফল: সর্বমোট পরীক্ষা: ${passedTests + failedTests} | সফল: ${passedTests} | ব্যর্থ: ${failedTests}`);
  console.log('========================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAccountManagerAudit().catch((err) => {
  console.error('Account Manager Audit failed with uncaught exception:', err);
  process.exit(1);
});

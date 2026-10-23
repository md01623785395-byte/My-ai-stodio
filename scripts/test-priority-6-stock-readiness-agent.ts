/**
 * Priority 6.0: Autonomous Stock Submission Readiness Test Suite
 * 
 * Verifies all requirements of Priority 6.0:
 * 1. Existing Asset, Quality Check, Marketplace Rules Engine, Metadata and Submission Queue reused.
 * 2. Autonomous Quality Check, Duplicate Check, Marketplace Rules, and Metadata Validation.
 * 3. 3-Tier Status: "READY_TO_SUBMIT", "NEEDS_REVIEW", or "REJECTED" with clear reasons & issues.
 * 4. Strict Submission Queue gating: Only assets passing all mandatory checks can auto-dispatch;
 *    uncertain policy or pending human review holds automatic submission in NEEDS_REVIEW.
 * 5. Multi-marketplace ZIP/CSV generation (Adobe Stock, Shutterstock, Freepik, Dreamstime, Wirestock, Master CSV).
 *    Duplicate submission prevention for the same image to the same marketplace.
 * 6. Truthful upload boundaries: Never claims upload succeeded without real auth; no password/token requests.
 * 7. Zero generation credit deduction on existing, imported, or Google Flow assets.
 */

import { Asset, AutonomousTaskItem, StockMarketplaceId } from '../src/types';
import { AccountAssetAssignment } from '../src/types/accountManager';
import {
  evaluateAutonomousStockSubmissionReadiness,
  runAutonomousStockReadinessScan,
  isDuplicateSubmissionForMarketplace,
  AutonomousSubmissionEvaluation,
} from '../src/utils/batchStockAuditor';
import { createStockSubmissionQueueTask } from '../src/utils/autonomousQueueManager';

// Simple RFC 4180 CSV parser
function parseCsvRows(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.length > 0 && r.some((c) => c.trim().length > 0));
}

async function runPriority6Tests() {
  console.log('========================================================================');
  console.log('PRIORITY 6.0: AUTONOMOUS STOCK SUBMISSION READINESS AGENT TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (detail) console.log(`       └─ ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       └─ ${detail}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // Baseline Mock Assets
  // ---------------------------------------------------------------------------
  const passingAsset: Asset = {
    id: 'asset-stock-ready-001',
    title: 'Minimalist Artisan Ceramic Pitcher Generative AI',
    prompt: 'Commercial macro of handmade minimalist matte ceramic pitcher on light travertine slate, diffused morning softbox light',
    url: 'https://storage.googleapis.com/test-assets/pitcher-4k.jpg',
    thumbnailUrl: 'https://storage.googleapis.com/test-assets/pitcher-thumb.jpg',
    type: 'image',
    dimensions: '4096 × 2304',
    aspectRatio: '16:9',
    style: 'Commercial Still Life',
    model: 'imagen-3',
    fileSize: '3.6 MB',
    fileFormat: 'JPEG',
    isFavorite: false,
    createdAt: new Date().toISOString(),
    source: 'Google Flow',
    preparedMetadata: {
      title: 'Minimalist Artisan Ceramic Pitcher Generative AI',
      description: 'Handcrafted matte black ceramic water pitcher on travertine stone under soft morning side lighting.',
      keywords: [
        'ceramic', 'pitcher', 'handmade', 'artisan', 'minimalist',
        'tableware', 'still life', 'pottery', 'travertine', 'diffused light',
        'matte texture', 'scandinavian design', 'vessel', 'kitchenware', 'studio'
      ],
      marketplace: 'adobe-stock',
      marketplaceName: 'Adobe Stock',
      category: 'Home & Lifestyle',
      aiDisclosure: 'Created with Generative AI technology. Commercial non-exclusive licensing.',
      aiPolicyStatus: 'allowed',
      aiPolicyBadge: 'অনুমোদিত',
      aiPolicyColor: 'green',
      officialPolicyNote: 'Adobe Stock accepts generative AI when marked with Generative AI suffix and AI toggle.',
      isPolicyVerified: true,
      labelingRequirement: 'Mandatory "Generative AI" suffix and toggle',
      humanPresenceCompliance: 'No human subjects present; model release not required',
      trademarkCompliance: '100% Free of commercial brands and trademark logos',
      technicalRequirements: 'JPEG format, min 4.0 MP, max 45 MB',
      factualSubjectSummary: 'Minimalist ceramic pitcher still life',
    },
  };

  const assetMissingSuffix: Asset = {
    ...passingAsset,
    id: 'asset-missing-suffix-002',
    title: 'Minimalist Ceramic Pitcher',
    preparedMetadata: {
      ...passingAsset.preparedMetadata!,
      title: 'Minimalist Ceramic Pitcher', // Missing "Generative AI"
    },
  };

  const assetWithFluff: Asset = {
    ...passingAsset,
    id: 'asset-fluff-003',
    preparedMetadata: {
      ...passingAsset.preparedMetadata!,
      keywords: ['photorealistic', '8k', 'masterpiece', 'ceramic', 'pitcher'],
    },
  };

  const zeroByteAsset: Asset = {
    ...passingAsset,
    id: 'asset-zero-byte-004',
    fileSize: '0 bytes',
  };

  // ---------------------------------------------------------------------------
  // TEST SUITE 1: 3-TIER STATUS DETERMINATION
  // ---------------------------------------------------------------------------
  console.log('--- ১. ৩-স্তরের সাবমিশন স্থিতি নির্ধারণ (3-Tier Status: READY_TO_SUBMIT, NEEDS_REVIEW, REJECTED) ---');

  // Test 1.1: Fully verified asset with approved human review -> READY_TO_SUBMIT
  const evalReady = await evaluateAutonomousStockSubmissionReadiness(passingAsset, 'adobe-stock', {
    humanReviewApproved: true,
  });

  assert(
    evalReady.status === 'READY_TO_SUBMIT',
    '১.১ সমস্ত বাধ্যতামূলক যাচাই ও মানব রিভিউ পাস করলে স্ট্যাটাস "READY_TO_SUBMIT"',
    `Status: ${evalReady.status} | Label: ${evalReady.statusLabelBn}`
  );

  assert(
    evalReady.canAutoDispatch === true,
    '১.২ "READY_TO_SUBMIT" ছবির ক্ষেত্রে canAutoDispatch সত্য (স্বয়ংক্রিয় কিউ ডিসপ্যাচ অনুমোদিত)',
    `canAutoDispatch: ${evalReady.canAutoDispatch}`
  );

  // Test 1.2: Human review pending -> NEEDS_REVIEW (Gating Requirement)
  const evalPendingReview = await evaluateAutonomousStockSubmissionReadiness(passingAsset, 'adobe-stock', {
    humanReviewApproved: false, // Pending human review
  });

  assert(
    evalPendingReview.status === 'NEEDS_REVIEW',
    '১.৩ মানব পর্যালোচনা পেন্ডিং থাকলে স্বয়ংক্রিয় সাবমিশন বন্ধ এবং স্ট্যাটাস "NEEDS_REVIEW"',
    `Status: ${evalPendingReview.status} | Issues: ${evalPendingReview.issues.length}`
  );

  assert(
    evalPendingReview.canAutoDispatch === false,
    '১.৪ "NEEDS_REVIEW" ছবির ক্ষেত্রে canAutoDispatch মিথ্যা (স্বয়ংক্রিয় ডিসপ্যাচ প্রতিহত)',
    `canAutoDispatch: ${evalPendingReview.canAutoDispatch}`
  );

  // Test 1.3: Missing Generative AI suffix on Adobe Stock -> NEEDS_REVIEW
  const evalSuffixMissing = await evaluateAutonomousStockSubmissionReadiness(assetMissingSuffix, 'adobe-stock', {
    humanReviewApproved: true,
  });

  assert(
    evalSuffixMissing.status === 'NEEDS_REVIEW',
    '১.৫ টাইটেলে "Generative AI" সাফিক্স না থাকলে Adobe Stock-এর জন্য "NEEDS_REVIEW" নির্ধারিত',
    `Status: ${evalSuffixMissing.status}`
  );

  assert(
    evalSuffixMissing.issues.some((i) => i.type === 'metadata' && i.messageBn.includes('Generative AI')),
    '১.৬ মেটাডেটা সমস্যার সুনির্দিষ্ট কারণ ও বিবরণ উল্লেখিত',
    `Reason: ${evalSuffixMissing.issues.find((i) => i.type === 'metadata')?.messageBn}`
  );

  // Test 1.4: Promotional fluff words -> NEEDS_REVIEW
  const evalFluff = await evaluateAutonomousStockSubmissionReadiness(assetWithFluff, 'adobe-stock', {
    humanReviewApproved: true,
  });

  assert(
    evalFluff.status === 'NEEDS_REVIEW',
    '১.৭ নিষিদ্ধ প্রমোশনাল শব্দ (photorealistic, 8k) থাকলে স্ট্যাটাস "NEEDS_REVIEW"',
    `Status: ${evalFluff.status}`
  );

  // Test 1.5: 0-byte corrupt file -> REJECTED
  const evalZeroByte = await evaluateAutonomousStockSubmissionReadiness(zeroByteAsset, 'adobe-stock', {
    humanReviewApproved: true,
  });

  assert(
    evalZeroByte.status === 'REJECTED',
    '১.৮ ০-বাইটের খালি বা ক্ষতিগ্রস্ত ফাইল তাৎক্ষণিক "REJECTED" নির্ধারিত',
    `Status: ${evalZeroByte.status}`
  );

  assert(
    evalZeroByte.issues.some((i) => i.severity === 'blocking' && i.type === 'technical'),
    '১.৯ ব্লকড টেকনিক্যাল সমস্যার বিবরণ উল্লেখিত',
    `Issues: ${evalZeroByte.issues.map((i) => i.messageBn).join('; ')}`
  );

  // Test 1.6: Shutterstock third-party AI policy -> REJECTED
  const evalShutterstock = await evaluateAutonomousStockSubmissionReadiness(passingAsset, 'shutterstock', {
    humanReviewApproved: true,
  });

  assert(
    evalShutterstock.status === 'REJECTED',
    '১.১০ Shutterstock-এ থার্ড-পার্টি এআই ছবি বাধ্যতামূলকভাবে "REJECTED"',
    `Status: ${evalShutterstock.status} | Marketplace: ${evalShutterstock.targetMarketplaceName}`
  );

  assert(
    evalShutterstock.issues.some((i) => i.type === 'policy' && i.messageBn.includes('নিষিদ্ধ')),
    '১.১১ Shutterstock-এর অফিসিয়াল নীতি নিষেধাজ্ঞা স্পষ্ট উল্লেখিত',
    `Reason: ${evalShutterstock.issues.find((i) => i.type === 'policy')?.messageBn}`
  );

  // Test 1.7: Confirmed visible trademark logo in pixels -> REJECTED
  const evalLogoConfirmed = await evaluateAutonomousStockSubmissionReadiness(passingAsset, 'adobe-stock', {
    visualLogoConfirmed: true,
    humanReviewApproved: true,
  });

  assert(
    evalLogoConfirmed.status === 'REJECTED',
    '১.১২ পিক্সেলে নিশ্চিত বাণিজ্যিক লোগো থাকলে তাৎক্ষণিক "REJECTED" নির্ধারিত',
    `Status: ${evalLogoConfirmed.status}`
  );

  // ---------------------------------------------------------------------------
  // TEST SUITE 2: DUPLICATE SUBMISSION PREVENTION
  // ---------------------------------------------------------------------------
  console.log('\n--- ২. ডুপ্লিকেট সাবমিশন প্রতিরোধ (Duplicate Submission Prevention) ---');

  const mockExistingQueueTask: AutonomousTaskItem = {
    id: 'task-existing-101',
    title: 'Minimalist Artisan Ceramic Pitcher',
    type: 'image',
    prompt: passingAsset.prompt,
    aspectRatio: '16:9',
    style: 'Commercial Still Life',
    status: 'completed',
    statusLabelBn: 'সম্পন্ন',
    statusLabelEn: 'Completed',
    exactReason: 'সম্পন্ন',
    retryCount: 0,
    maxRetries: 1,
    duplicateHash: `asset-${passingAsset.id}::adobe-stock`,
    targetMarketplace: 'adobe-stock',
    autoEnhance: false,
    createdAt: Date.now(),
    assetId: passingAsset.id,
  };

  // Test 2.1: Duplicate detection in queue
  const duplicateInQueue = isDuplicateSubmissionForMarketplace(
    passingAsset.id,
    'adobe-stock',
    [mockExistingQueueTask]
  );

  assert(
    duplicateInQueue.isDuplicate === true,
    '২.১ একই ছবি একই মার্কেটপ্লেসের কিউতে থাকলে ডুপ্লিকেট সনাক্ত হওয়া',
    `Reason: ${duplicateInQueue.reason}`
  );

  // Test 2.2: Different marketplace for same asset is NOT duplicate
  const differentMarketplaceCheck = isDuplicateSubmissionForMarketplace(
    passingAsset.id,
    'freepik',
    [mockExistingQueueTask]
  );

  assert(
    differentMarketplaceCheck.isDuplicate === false,
    '২.২ একই ছবি ভিন্ন মার্কেটপ্লেসে (Freepik) ডুপ্লিকেট হিসেবে বাধা পাবে না',
    `isDuplicate: ${differentMarketplaceCheck.isDuplicate}`
  );

  // Test 2.3: Duplicate detection in Account Manager assignments
  const mockAssignment: AccountAssetAssignment = {
    id: 'assign-201',
    accountId: 'acc-adobe-1',
    platformId: 'adobe-stock',
    assetId: passingAsset.id,
    assetType: 'image',
    assignedAt: new Date().toISOString(),
    workflowStatus: 'prepared',
    workflowStatusLabelBn: 'প্যাকেজ প্রস্তুত',
    workflowStatusLabelEn: 'Package Prepared',
    targetPackage: {
      title: passingAsset.title,
      description: passingAsset.prompt,
      keywords: ['ceramic', 'pottery'],
      checklist: [],
    },
    submissionHistory: [],
  };

  const duplicateInAssignment = isDuplicateSubmissionForMarketplace(
    passingAsset.id,
    'adobe-stock',
    [],
    [mockAssignment]
  );

  assert(
    duplicateInAssignment.isDuplicate === true,
    '২.৩ অ্যাকাউন্ট ম্যানেজারে অ্যাসাইন/প্রস্তুত থাকলে ডুপ্লিকেট সনাক্ত হওয়া',
    `Reason: ${duplicateInAssignment.reason}`
  );

  // Test 2.4: Evaluate asset with duplicate in queue blocks auto-dispatch
  const evalWithDuplicate = await evaluateAutonomousStockSubmissionReadiness(passingAsset, 'adobe-stock', {
    humanReviewApproved: true,
    existingQueueTasks: [mockExistingQueueTask],
  });

  assert(
    evalWithDuplicate.isDuplicateSubmission === true,
    '২.৪ মূল্যায়নে isDuplicateSubmission সত্য প্রতিফলিত হওয়া',
    `isDuplicateSubmission: ${evalWithDuplicate.isDuplicateSubmission}`
  );

  assert(
    evalWithDuplicate.canAutoDispatch === false,
    '২.৫ ডুপ্লিকেট ছবির ক্ষেত্রে canAutoDispatch বাধ্যতামূলকভাবে মিথ্যা',
    `canAutoDispatch: ${evalWithDuplicate.canAutoDispatch}`
  );

  // ---------------------------------------------------------------------------
  // TEST SUITE 3: MULTI-MARKETPLACE CSV & SUBMISSION PACKAGES
  // ---------------------------------------------------------------------------
  console.log('\n--- ৩. মাল্টি-মার্কেটপ্লেস CSV ও সাবমিশন প্যাকেজ (RFC 4180 Packages) ---');

  // Test 3.1: Adobe Stock CSV format
  const adobeCsv = evalReady.submissionPackages.adobeStockCsv;
  const parsedAdobe = parseCsvRows(adobeCsv);
  assert(
    parsedAdobe.length === 2 && parsedAdobe[0].length === 4,
    '৩.১ Adobe Stock CSV হেডার ও ডাটা কলাম সংখ্যা ৪টি (Filename, Title, Keywords, Category)',
    `Rows: ${parsedAdobe.length}, Cols: ${parsedAdobe[0].length}`
  );

  // Test 3.2: Shutterstock CSV format
  const shutterCsv = evalReady.submissionPackages.shutterstockCsv;
  const parsedShutter = parseCsvRows(shutterCsv);
  assert(
    parsedShutter.length === 2 && parsedShutter[0].length === 6,
    '৩.২ Shutterstock CSV হেডার ও ডাটা কলাম সংখ্যা ৬টি (Filename, Description, Keywords, Categories, Illustration, Mature Content)',
    `Rows: ${parsedShutter.length}, Cols: ${parsedShutter[0].length}`
  );

  // Test 3.3: Freepik CSV format
  const freepikCsv = evalReady.submissionPackages.freepikCsv;
  const parsedFreepik = parseCsvRows(freepikCsv);
  assert(
    parsedFreepik.length === 2 && parsedFreepik[0].length === 4,
    '৩.৩ Freepik CSV হেডার ও ডাটা কলাম সংখ্যা ৪টি (Filename, Title, Keywords, Prompt)',
    `Rows: ${parsedFreepik.length}, Cols: ${parsedFreepik[0].length}`
  );

  // Test 3.4: Dreamstime CSV format
  const dreamCsv = evalReady.submissionPackages.dreamstimeCsv;
  const parsedDream = parseCsvRows(dreamCsv);
  assert(
    parsedDream.length === 2 && parsedDream[0].length === 5,
    '৩.৪ Dreamstime CSV হেডার ও ডাটা কলাম সংখ্যা ৫টি (Filename, Title, Description, Category, Keywords)',
    `Rows: ${parsedDream.length}, Cols: ${parsedDream[0].length}`
  );

  // Test 3.5: Wirestock CSV format
  const wireCsv = evalReady.submissionPackages.wirestockCsv;
  const parsedWire = parseCsvRows(wireCsv);
  assert(
    parsedWire.length === 2 && parsedWire[0].length === 4,
    '৩.৫ Wirestock CSV হেডার ও ডাটা কলাম সংখ্যা ৪টি (Filename, Title, Description, Keywords)',
    `Rows: ${parsedWire.length}, Cols: ${parsedWire[0].length}`
  );

  // Test 3.6: Master RFC 4180 CSV format
  const masterCsv = evalReady.submissionPackages.masterExportCsv;
  const parsedMaster = parseCsvRows(masterCsv);
  assert(
    parsedMaster.length === 2 && parsedMaster[0].length === 33 && parsedMaster[0].length === parsedMaster[1].length,
    '৩.৬ Master RFC 4180 CSV-তে ৩৩টি হেডার ও ডেটা ফিল্ডের সম্পূর্ণ সমতা',
    `Headers: ${parsedMaster[0].length}, Values: ${parsedMaster[1].length}`
  );

  // ---------------------------------------------------------------------------
  // TEST SUITE 4: TRUTHFUL UPLOAD BOUNDARIES & ZERO CREDIT GUARANTEE
  // ---------------------------------------------------------------------------
  console.log('\n--- ৪. আপলোড সীমানা ও ০ ক্রেডিট নিশ্চয়তা (Honest Upload Boundaries & Zero Credits) ---');

  // Test 4.1: Truthful upload boundary (never claims fake successful upload)
  assert(
    evalReady.uploadStatus.authorized === false,
    '৪.১ বাস্তব ইন্টিগ্রেশন ছাড়া uploadStatus.authorized মিথ্যা নিশ্চিত',
    `authorized: ${evalReady.uploadStatus.authorized}`
  );

  assert(
    evalReady.uploadStatus.state === 'package_ready_for_portal',
    '৪.২ আপলোড স্থিতি নির্ভুলভাবে "package_ready_for_portal" (ম্যানুয়াল ড্রপের জন্য প্রস্তুত)',
    `state: ${evalReady.uploadStatus.state}`
  );

  assert(
    evalReady.uploadStatus.messageBn.includes('ক্রেডেনশিয়াল ছাড়া স্বয়ংক্রিয় রিমোট আপলোড সম্ভব নয়'),
    '৪.৩ ব্যবহারকারীকে সততার সাথে কন্ট্রিবিউটর ক্রেডেনশিয়াল সীমানা ব্যাখ্যা করা হয়েছে',
    `Message: ${evalReady.uploadStatus.messageBn.slice(0, 70)}...`
  );

  // Test 4.2: Zero Generation Credit deduction guarantee
  assert(
    evalReady.generationCreditDeduction === 0,
    '৪.৪ Google Flow বা বিদ্যমান অ্যাসেটে ক্রেডিট কর্তন শূন্য (০ ক্রেডিট গ্যারান্টি)',
    `generationCreditDeduction: ${evalReady.generationCreditDeduction}`
  );

  // ---------------------------------------------------------------------------
  // TEST SUITE 5: BATCH SCAN & SUBMISSION QUEUE TASK CREATION
  // ---------------------------------------------------------------------------
  console.log('\n--- ৫. স্বয়ংক্রিয় ব্যাচ স্ক্যান ও কিউ টাস্ক ক্রিয়েশন (Batch Scan & Queue Task) ---');

  // Test 5.1: Batch scan returns evaluations for all assets
  const scanResults = await runAutonomousStockReadinessScan(
    [passingAsset, assetMissingSuffix, zeroByteAsset],
    ['adobe-stock']
  );

  assert(
    scanResults.length === 3,
    '৫.১ ব্যাচ স্ক্যান লাইব্রেরির সব ইমেজ অ্যাসেটের জন্য মূল্যায়ন রিপোর্ট প্রস্তুত করেছে',
    `Evaluated count: ${scanResults.length}`
  );

  // Test 5.2: createStockSubmissionQueueTask generates valid AutonomousTaskItem
  const queueTask = createStockSubmissionQueueTask({
    asset: passingAsset,
    targetMarketplace: 'adobe-stock',
    humanReviewApproved: true,
  });

  assert(
    queueTask.status === 'completed' && queueTask.statusLabelBn.includes('সাবমিশন প্যাক প্রস্তুত'),
    '৫.২ সাবমিশন কিউ টাস্ক সঠিক স্ট্যাটাস ও লেবেল সহ তৈরি হয়েছে',
    `Status: ${queueTask.status} | Label: ${queueTask.statusLabelBn}`
  );

  assert(
    queueTask.duplicateHash === `asset-${passingAsset.id}::adobe-stock`,
    '৫.৩ ডুপ্লিকেট হ্যাশ প্ল্যাটফর্ম ও অ্যাসেট আইডি সহ সঠিকভাবে নির্ধারিত',
    `Hash: ${queueTask.duplicateHash}`
  );

  assert(
    queueTask.submissionStatusMessage !== undefined && queueTask.submissionStatusMessage.includes('০ ক্রেডিট ব্যয়িত'),
    '৫.৪ কিউ টাস্কে সততার সাথে ০ ক্রেডিট ব্যবহারের নিশ্চয়তা লিপিবদ্ধ',
    `Message: ${queueTask.submissionStatusMessage}`
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`পরীক্ষা ফলাফল: মোট ${passed + failed}টি পরীক্ষার মধ্যে ${passed}টি PASS, ${failed}টি FAIL`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('Priority 6.0 Autonomous Stock Submission Readiness সকল টেস্ট ১০০% সফল!\n');
  }
}

runPriority6Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

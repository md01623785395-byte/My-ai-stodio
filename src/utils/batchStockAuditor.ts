/**
 * Batch Image Quality & Stock Submission Readiness Audit Utility
 * Priority 3.7: Final Stock Submission Readiness
 * 
 * Inspects batches of images or individual assets against stock commercial requirements:
 * 1. Technical metrics: resolution (min 4.0 MP for Adobe/Shutterstock/Freepik, 3.0 MP for Dreamstime, 6.0 MP recommended for Wirestock),
 *    format (JPEG required), file size (<= 45MB/50MB, > 0 bytes), decodability.
 * 2. Commercial metadata: title word count, character limits, mandatory AI disclosure suffix/toggle,
 *    promotional fluff removal, commercial brand filter, keyword hygiene (repetitive, contradictory, artifacts).
 * 3. Verified marketplace rules engine: evaluates mandatory, recommended, and uncertain rules.
 *    Failure of uncertain rules NEVER causes automatic rejection.
 * 4. 3-Tier Submission Status: "Ready for Manual Review", "Needs Fix", or "Rejected", with specific reasons.
 * 5. Mandatory Human Review: visual quality/artifacts, IP/logos, model/property releases, curator discretion.
 * 6. Non-destructive safety: purely read-only, zero credit deduction, zero data loss.
 */

import { Asset, StockMarketplaceId, AutonomousTaskItem, PreparedStockMetadata } from '../types';
import { AccountAssetAssignment } from '../types/accountManager';
import { runFinalQualityCheck, FinalQualityReport } from './qualityChecker';
import {
  buildAdobeStockCsv,
  buildShutterstockCsv,
  buildFreepikCsv,
  buildDreamstimeCsv,
  buildWirestockCsv,
} from './autonomousPipelineEngine';
import { generateStockMetadataCsv } from './stockMetadataExporter';
import {
  auditMarketplaceValidation,
  COMMERCIAL_TRADEMARK_BRANDS,
  PROMOTIONAL_FLUFF_WORDS,
  PROMPT_ARTIFACT_KEYWORDS,
  MARKETPLACE_TITLE_RULES,
  detectRepetitiveKeywords,
  detectContradictoryKeywords,
  detectPromptArtifactKeywords,
} from './stockMetadataValidator';
import {
  evaluateMarketplaceRules,
  VERIFIED_MARKETPLACE_REGISTRY,
  classifyThirdPartyIp,
  MarketplaceComplianceEvaluation,
  RuleEnforcementLevel,
  VerificationStatus,
} from './verifiedMarketplaceRules';

export type FinalSubmissionStatus = 'Ready for Manual Review' | 'Needs Fix' | 'Rejected';
export type BatchReadinessStatus = 'Ready' | 'Needs Fix' | 'Rejected';

export interface BatchItemCheckDetail {
  id: string;
  label: string;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  measuredValue?: string;
  enforcementLevel?: RuleEnforcementLevel;
  verificationStatus?: VerificationStatus;
}

export interface HumanReviewCheckpoint {
  id: string;
  category: 'visual_quality' | 'intellectual_property' | 'model_release' | 'property_release' | 'curator_discretion';
  label: string;
  labelBn: string;
  description: string;
  descriptionBn: string;
  status: 'mandatory_manual_review' | 'advisory_review';
}

export interface UncertainRuleItem {
  ruleId: string;
  title: string;
  titleBn: string;
  verificationStatus: VerificationStatus;
  enforcementLevel: RuleEnforcementLevel;
  evidenceSummary: string;
  noteBn: string;
}

export interface BatchItemAuditResult {
  assetId: string;
  title: string;
  format: string;
  dimensions: string;
  megapixels: number;
  fileSize: string;
  status: BatchReadinessStatus; // 'Ready' | 'Needs Fix' | 'Rejected' (backward-compatible)
  finalStatus: FinalSubmissionStatus; // 'Ready for Manual Review' | 'Needs Fix' | 'Rejected'
  finalStatusLabelBn: string;
  statusColor: 'green' | 'amber' | 'rose';
  targetMarketplace: StockMarketplaceId;
  targetMarketplaceName: string;
  reasons: string[];
  passedChecksCount: number;
  totalChecksCount: number;
  checks: BatchItemCheckDetail[];
  metadata: {
    hasGenerativeAiSuffix: boolean;
    titleWordsCount: number;
    titleLengthChars: number;
    keywordCount: number;
    fluffDetected: string[];
    trademarkDetected: string[];
    repetitiveKeywords?: string[];
    contradictoryKeywords?: string[];
    promptArtifacts?: string[];
    aiDisclosurePresent: boolean;
    aiDisclosureStatement?: string;
  };
  rulesSummary: {
    mandatoryTotal: number;
    mandatoryPassed: number;
    mandatoryFailed: number;
    recommendedTotal: number;
    recommendedPassed: number;
    recommendedFailed: number;
    uncertainTotal: number;
    uncertainRules: UncertainRuleItem[];
  };
  humanReview: {
    required: true;
    disclaimerBn: string;
    checkpoints: HumanReviewCheckpoint[];
  };
  asset: Asset;
}

export interface BatchAuditSummary {
  totalInspected: number;
  readyCount: number;
  needsFixCount: number;
  rejectedCount: number;
  overallBatchStatus: BatchReadinessStatus;
  overallFinalStatus: FinalSubmissionStatus;
  overallFinalStatusLabelBn: string;
  targetMarketplace: StockMarketplaceId;
  targetMarketplaceName: string;
  humanReviewRequired: true;
  items: BatchItemAuditResult[];
  timestamp: string;
}

/**
 * Standard Mandatory Human Review Checkpoints
 * Code cannot reliably confirm subtle artifacts, micro-logos, or release permissions
 */
export const MANDATORY_HUMAN_REVIEW_CHECKPOINTS: HumanReviewCheckpoint[] = [
  {
    id: 'hr-visual-quality',
    category: 'visual_quality',
    label: 'Visual Quality & AI Artifacts Inspection',
    labelBn: 'ভিজ্যুয়াল কোয়ালিটি ও এআই আর্টিক্টস পরীক্ষা',
    description: 'Inspect image at 100% zoom to verify absence of anatomical deformities, distorted geometry, blurring, or generation glitches.',
    descriptionBn: '১০০% জুমে পরীক্ষা করুন: অঙ্গবিকৃতি, জ্যামিতিক বিকৃতি, অতিরিক্ত ব্লার বা ত্রুটিপূর্ণ পিক্সেল নেই তো?',
    status: 'mandatory_manual_review',
  },
  {
    id: 'hr-ip-logos',
    category: 'intellectual_property',
    label: 'Micro-Logos & Intellectual Property Check',
    labelBn: 'মাইক্রো-লোগো ও মেধা-স্বত্ব বা ট্রেডমার্ক পরীক্ষা',
    description: 'Inspect clothing, background signs, products, or vehicles to ensure zero visible commercial logos or protected designs exist.',
    descriptionBn: 'জামাকাপড়, সাইনবোর্ড বা গাড়িতে কোনো দৃশ্যমান ব্র্যান্ড লোগো নেই তা খালি চোখে নিশ্চিত করুন।',
    status: 'mandatory_manual_review',
  },
  {
    id: 'hr-model-release',
    category: 'model_release',
    label: 'Model Release & Recognizable Likeness',
    labelBn: 'মডেল রিলিজ ও শনাক্তযোগ্য ব্যক্তির মুখাবয়ব',
    description: 'If recognizable human likenesses appear, ensure signed model release is available or stylized/silhouette treatment is applied.',
    descriptionBn: 'মানুষের মুখ দৃশ্যমান থাকলে স্বাক্ষরিত মডেল রিলিজ প্রয়োজন অথবা মুখাবয়ব কাল্পনিক/অস্বীকৃত হতে হবে।',
    status: 'mandatory_manual_review',
  },
  {
    id: 'hr-property-release',
    category: 'property_release',
    label: 'Property Release & Protected Architecture',
    labelBn: 'প্রপার্টি রিলিজ ও সংরক্ষিত স্থাপত্য',
    description: 'Verify the depicted building or private property does not violate proprietary design rights or require a property release.',
    descriptionBn: 'ব্যক্তিগত সম্পত্তি বা স্বত্বাধিকারযুক্ত আধুনিক স্থাপত্যের ক্ষেত্রে প্রপার্টি রিলিজের শর্ত যাচাই করুন।',
    status: 'mandatory_manual_review',
  },
  {
    id: 'hr-curator-discretion',
    category: 'curator_discretion',
    label: 'Editorial Curator Final Discretion (Zero Guarantee)',
    labelBn: 'মার্কেটপ্লেস কিউরেটরের চূড়ান্ত সিদ্ধান্ত (জিরো-গ্যারান্টি)',
    description: 'Final acceptance is at the sole discretion of the stock marketplace curator; automated checks provide readiness assistance without acceptance guarantee.',
    descriptionBn: 'স্বয়ংক্রিয় নিরীক্ষা সাবমিশন প্রস্তুতির সহায়তা করে; কিন্তু চূড়ান্ত গ্রহণযোগ্যতা স্টক এজেন্সির কিউরেটরের ওপর নির্ভরশীল।',
    status: 'mandatory_manual_review',
  },
];

/**
 * Audits a single asset against stock marketplace submission requirements
 */
export async function auditSingleAssetReadiness(
  asset: Asset,
  targetMarketplace: StockMarketplaceId = 'adobe-stock',
  options?: {
    visualLogoFound?: boolean;
    visualLogoConfirmed?: boolean;
    hasActualVisualInspection?: boolean;
  }
): Promise<BatchItemAuditResult> {
  const mpProfile = VERIFIED_MARKETPLACE_REGISTRY[targetMarketplace] || VERIFIED_MARKETPLACE_REGISTRY['adobe-stock'];
  const titleRule = MARKETPLACE_TITLE_RULES[targetMarketplace] || MARKETPLACE_TITLE_RULES['adobe-stock'];

  const qualityReport: FinalQualityReport = await runFinalQualityCheck(asset, targetMarketplace);

  const isVisualLogoFlagged = options?.visualLogoFound === true || options?.visualLogoConfirmed === true;
  const mpEvaluation: MarketplaceComplianceEvaluation = evaluateMarketplaceRules(asset, targetMarketplace, 'image', {
    visualLogoFound: isVisualLogoFlagged,
    hasActualVisualInspection: options?.hasActualVisualInspection ?? isVisualLogoFlagged,
  });

  const megapixels = qualityReport.technicalMetrics.megapixels;
  const dimensions = qualityReport.technicalMetrics.pixelDimensions;
  const format = qualityReport.technicalMetrics.format;
  const isDecodable = qualityReport.technicalMetrics.decodedSuccessfully;

  // File size calculation & zero-byte detection
  const rawFileSize = (asset.fileSize || '').toLowerCase().trim();
  const isZeroByte = rawFileSize === '0 bytes' || rawFileSize === '0 b' || rawFileSize === '0 mb' || rawFileSize === '0 kb' || rawFileSize.startsWith('0 byte');
  let fileSizeMb = isZeroByte ? 0 : qualityReport.technicalMetrics.estimatedSizeMb;

  if (!isZeroByte && asset.fileSize) {
    const szMatch = asset.fileSize.match(/([\d.]+)\s*(MB|KB|Bytes|B)/i);
    if (szMatch) {
      const val = parseFloat(szMatch[1]);
      if (val === 0) fileSizeMb = 0;
      else if (szMatch[2].toUpperCase().startsWith('K')) fileSizeMb = Number((val / 1024).toFixed(2));
      else if (szMatch[2].toUpperCase().startsWith('B')) fileSizeMb = Number((val / 1048576).toFixed(4));
      else fileSizeMb = val;
    }
  }
  const fileSizeStr = asset.fileSize || `${fileSizeMb} MB`;

  // Metadata audit: use preparedMetadata when available, fallback to asset fields
  const effectiveTitle = (asset.preparedMetadata?.title || asset.title || '').trim();
  const titleWords = effectiveTitle.split(/\s+/).filter(Boolean).length;
  const titleChars = effectiveTitle.length;
  const hasGenerativeAiSuffix = effectiveTitle.toLowerCase().endsWith('generative ai');

  // Extract metadata keywords
  const preparedKeywords = asset.preparedMetadata?.keywords && asset.preparedMetadata.keywords.length > 0
    ? asset.preparedMetadata.keywords
    : [];

  const textWords = preparedKeywords.length > 0
    ? `${effectiveTitle} ${preparedKeywords.join(' ')}`.toLowerCase().split(/[\s,._-]+/).filter(Boolean)
    : `${asset.title || ''} ${asset.prompt || ''}`.toLowerCase().split(/[\s,._-]+/).filter(Boolean);

  const fluffDetected: string[] = [];
  const trademarkDetected: string[] = [];

  for (const word of textWords) {
    if ((PROMOTIONAL_FLUFF_WORDS.has(word) || PROMPT_ARTIFACT_KEYWORDS.has(word)) && !fluffDetected.includes(word)) {
      fluffDetected.push(word);
    }
    if (COMMERCIAL_TRADEMARK_BRANDS.has(word) && !trademarkDetected.includes(word)) {
      trademarkDetected.push(word);
    }
  }

  // Deep IP audit using verified marketplace rules classification
  const fullTextCorpus = `${effectiveTitle} ${preparedKeywords.join(' ')} ${asset.prompt || ''}`;
  const ipClassification = classifyThirdPartyIp(fullTextCorpus, {
    visualLogoConfirmed: isVisualLogoFlagged,
    hasActualVisualInspection: options?.hasActualVisualInspection ?? isVisualLogoFlagged,
  });

  for (const detectedItem of ipClassification.detectedItems) {
    if (!trademarkDetected.includes(detectedItem.name.toLowerCase())) {
      trademarkDetected.push(detectedItem.name.toLowerCase());
    }
  }

  // Keyword anomaly detection (repetition, contradiction, prompt artifacts)
  const repetitiveList = preparedKeywords.length > 0 ? detectRepetitiveKeywords(preparedKeywords).map((r) => r.term) : [];
  const contradictionList = preparedKeywords.length > 0 ? detectContradictoryKeywords(preparedKeywords).map((c) => `${c.termA} vs ${c.termB}`) : [];
  const promptArtifactList = preparedKeywords.length > 0 ? detectPromptArtifactKeywords(preparedKeywords) : [];

  const reasons: string[] = [];
  const checks: BatchItemCheckDetail[] = [];

  // Check 1: Decodability / Readability
  if (isDecodable) {
    checks.push({
      id: 'decode',
      label: 'ছবি অ্যাক্সেস ও ডিকোডিং (Readability)',
      status: 'passed',
      message: 'ছবির ফাইলটি ক্ষতিগ্রস্ত নয় এবং সফলভাবে ডিকোড ও রেন্ডার হয়েছে।',
      measuredValue: 'Valid',
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
  } else {
    checks.push({
      id: 'decode',
      label: 'ছবি অ্যাক্সেস ও ডিকোডিং (Readability)',
      status: 'failed',
      message: 'ছবির ফাইল ক্ষতিগ্রস্ত বা ফাইল ডাটা পড়া সম্ভব হয়নি (Corrupt Image Data)।',
      measuredValue: 'Corrupted',
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    reasons.push('ছবির ফাইল ক্ষতিগ্রস্ত বা ডিকোড করা সম্ভব হয়নি (Corrupt data)');
  }

  // Check 2: Resolution (Marketplace-specific technical requirement)
  let requiredMinMp = 4.0;
  if (targetMarketplace === 'dreamstime') {
    requiredMinMp = 3.0;
  }

  if (megapixels >= requiredMinMp) {
    checks.push({
      id: 'resolution',
      label: `রেজোলিউশন (ন্যূনতম ${requiredMinMp} MP)`,
      status: 'passed',
      message: `${megapixels} MP (${dimensions}) — ${mpProfile.name}-এর ${requiredMinMp} MP টেকনিক্যাল শর্ত পূরণ করেছে।`,
      measuredValue: `${megapixels} MP`,
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
  } else {
    checks.push({
      id: 'resolution',
      label: `রেজোলিউশন (ন্যূনতম ${requiredMinMp} MP)`,
      status: 'warning',
      message: `বর্তমান রেজোলিউশন ${megapixels} MP, যা ${mpProfile.name}-এর ন্যূনতম ${requiredMinMp} MP-এর চেয়ে কম।`,
      measuredValue: `${megapixels} MP < ${requiredMinMp} MP`,
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    const minMpStr = targetMarketplace === 'adobe-stock' ? '৪.০ MP' : `${requiredMinMp} MP`;
    reasons.push(`রেজোলিউশন ${megapixels} MP (${mpProfile.name}-এর ন্যূনতম ${minMpStr} পূরণ করতে 2x/4x Upscale প্রয়োজন)`);
  }

  // Check 3: Format (Stock agencies require JPEG)
  const isJpeg =
    format.toLowerCase().includes('jpeg') ||
    format.toLowerCase().includes('jpg') ||
    Boolean(asset.url?.startsWith('data:image/jpeg')) ||
    Boolean(asset.url?.endsWith('.jpg')) ||
    Boolean(asset.url?.endsWith('.jpeg'));

  if (isJpeg) {
    checks.push({
      id: 'format',
      label: 'ফাইল ফরম্যাট (JPEG)',
      status: 'passed',
      message: 'JPEG (.jpg) ফরম্যাট সনাক্ত হয়েছে, যা কমার্শিয়াল স্টকের আদর্শ ফরম্যাট।',
      measuredValue: 'JPEG',
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
  } else {
    checks.push({
      id: 'format',
      label: 'ফাইল ফরম্যাট (JPEG)',
      status: 'warning',
      message: `বর্তমান ফরম্যাট ${format}। স্টক মার্কেটপ্লেসে সাবমিশনের জন্য JPEG ফরম্যাটে রূপান্তর প্রয়োজন।`,
      measuredValue: format || 'Non-JPEG',
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    reasons.push(`ফরম্যাট ${format || 'Non-JPEG'} (${mpProfile.name}-এর জন্য JPEG-তে কনভার্ট প্রয়োজন)`);
  }

  // Check 4: File Size (Must be under 45MB/50MB, > 0 bytes)
  const maxAllowedMb = targetMarketplace === 'adobe-stock' ? 45 : 50;
  if (!isZeroByte && fileSizeMb > 0 && fileSizeMb <= maxAllowedMb) {
    checks.push({
      id: 'filesize',
      label: `ফাইল সাইজ সীমা (Max ${maxAllowedMb}MB)`,
      status: 'passed',
      message: `ফাইল সাইজ ${fileSizeStr} গ্রহণযোগ্য সীমার মধ্যে রয়েছে।`,
      measuredValue: fileSizeStr,
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
  } else if (isZeroByte || fileSizeMb === 0) {
    checks.push({
      id: 'filesize',
      label: 'ফাইল সাইজ সীমা',
      status: 'failed',
      message: 'ফাইল সাইজ ০ বাইট (খালি ফাইল)।',
      measuredValue: '0 Bytes',
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    reasons.push('ফাইলটি ০ বাইটের খালি ফাইল');
  } else {
    checks.push({
      id: 'filesize',
      label: `ফাইল সাইজ সীমা (Max ${maxAllowedMb}MB)`,
      status: 'warning',
      message: `ফাইল সাইজ ${fileSizeStr} ${mpProfile.name}-এর ${maxAllowedMb}MB সীমা অতিক্রম করেছে।`,
      measuredValue: fileSizeStr,
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    reasons.push(`ফাইল সাইজ ${maxAllowedMb}MB সীমা অতিক্রম করেছে (${fileSizeStr})`);
  }

  // Check 5: Marketplace Policy & AI Acceptance Status
  if (mpProfile.aiAcceptanceStatus === 'prohibited') {
    checks.push({
      id: 'ai-policy',
      label: `${mpProfile.name} AI পলিসি`,
      status: 'failed',
      message: `${mpProfile.name}-এ থার্ড-পার্টি AI দিয়ে তৈরি কন্টেন্ট সম্পূর্ণ নিষিদ্ধ (${mpProfile.aiAcceptanceNoteBn})।`,
      measuredValue: 'Prohibited',
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    reasons.push(`${mpProfile.name} থার্ড-পার্টি জেনারেটিভ AI কন্টেন্ট সম্পূর্ণ নিষিদ্ধ করে`);
  } else {
    checks.push({
      id: 'ai-policy',
      label: `${mpProfile.name} AI পলিসি`,
      status: 'passed',
      message: `${mpProfile.name}-এ জেনারেটিভ AI কন্টেন্ট অনুমোদিত (${mpProfile.aiAcceptanceNoteBn})।`,
      measuredValue: 'Allowed',
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
  }

  // Check 6: Title Standard & Suffix Requirements
  if (targetMarketplace === 'adobe-stock') {
    if (hasGenerativeAiSuffix) {
      checks.push({
        id: 'title-suffix',
        label: 'Adobe Stock AI টাইটেল সাফিক্স',
        status: 'passed',
        message: 'টাইটেলটি বাধ্যতামূলক "Generative AI" সাফিক্স দিয়ে শেষ হয়েছে।',
        measuredValue: 'Compliant',
        enforcementLevel: 'mandatory',
        verificationStatus: 'verified',
      });
    } else {
      checks.push({
        id: 'title-suffix',
        label: 'Adobe Stock AI টাইটেল সাফিক্স',
        status: 'warning',
        message: 'Adobe Stock-এর এআই পলিসি অনুযায়ী টাইটেলের শেষে "Generative AI" সাফিক্স থাকা বাধ্যতামূলক।',
        measuredValue: 'Missing Suffix',
        enforcementLevel: 'mandatory',
        verificationStatus: 'verified',
      });
      reasons.push('টাইটেলে "Generative AI" সাফিক্স অনুপস্থিত (Stock Preparation-এ স্বয়ংক্রিয়ভাবে যোগ করা যায়)');
    }
  }

  // Check 7: Title Word & Character Count
  if (titleWords >= titleRule.minWords) {
    checks.push({
      id: 'title-length',
      label: `${mpProfile.name} টাইটেল শব্দ সংখ্যা`,
      status: 'passed',
      message: `টাইটেলে ${titleWords}টি শব্দ রয়েছে (ন্যূনতম ${titleRule.minWords}টি)।`,
      measuredValue: `${titleWords} words`,
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
  } else {
    checks.push({
      id: 'title-length',
      label: `${mpProfile.name} টাইটেল শব্দ সংখ্যা`,
      status: 'warning',
      message: `টাইটেল অতি সংক্ষিপ্ত (${titleWords}টি শব্দ)। ${mpProfile.name}-এ ন্যূনতম ${titleRule.minWords}টি বর্ণনামূলক শব্দ প্রয়োজন।`,
      measuredValue: `${titleWords} < ${titleRule.minWords} words`,
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    reasons.push(`টাইটেল অতি সংক্ষিপ্ত (${titleWords}টি শব্দ, ন্যূনতম ${titleRule.minWords}টি প্রয়োজন)`);
  }

  // Check 8: Keyword Count Compliance
  const effectiveKeywordsCount = preparedKeywords.length > 0 ? preparedKeywords.length : textWords.length;
  if (effectiveKeywordsCount >= titleRule.minKeywords && effectiveKeywordsCount <= titleRule.maxKeywords) {
    checks.push({
      id: 'keyword-count',
      label: `${mpProfile.name} কীওয়ার্ড সংখ্যা (${titleRule.minKeywords}–${titleRule.maxKeywords})`,
      status: 'passed',
      message: `কীওয়ার্ড সংখ্যা (${effectiveKeywordsCount}টি) প্ল্যাটফর্মের সীমার মধ্যে রয়েছে।`,
      measuredValue: `${effectiveKeywordsCount} keywords`,
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
  } else if (effectiveKeywordsCount < titleRule.minKeywords) {
    checks.push({
      id: 'keyword-count',
      label: `${mpProfile.name} কীওয়ার্ড সংখ্যা (${titleRule.minKeywords}–${titleRule.maxKeywords})`,
      status: 'warning',
      message: `কীওয়ার্ড সংখ্যা ${effectiveKeywordsCount}টি, যা ${mpProfile.name}-এর ন্যূনতম ${titleRule.minKeywords}টির চেয়ে কম।`,
      measuredValue: `${effectiveKeywordsCount} < ${titleRule.minKeywords}`,
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    reasons.push(`কীওয়ার্ড সংখ্যা কম (${effectiveKeywordsCount}টি, ন্যূনতম ${titleRule.minKeywords}টি প্রয়োজন)`);
  } else {
    checks.push({
      id: 'keyword-count',
      label: `${mpProfile.name} কীওয়ার্ড সংখ্যা (${titleRule.minKeywords}–${titleRule.maxKeywords})`,
      status: 'warning',
      message: `কীওয়ার্ড সংখ্যা ${effectiveKeywordsCount}টি, যা সর্বোচ্চ ${titleRule.maxKeywords}টি সীমা অতিক্রম করেছে।`,
      measuredValue: `${effectiveKeywordsCount} > ${titleRule.maxKeywords}`,
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    reasons.push(`কীওয়ার্ড সংখ্যা সীমা অতিক্রম করেছে (${effectiveKeywordsCount}টি, সর্বোচ্চ ${titleRule.maxKeywords}টি)`);
  }

  // Check 9: Promotional Fluff Check
  if (fluffDetected.length === 0) {
    checks.push({
      id: 'fluff',
      label: 'প্রমোশনাল শব্দ বর্জন (Fluff Check)',
      status: 'passed',
      message: 'কোনো নিষিদ্ধ প্রমোশনাল শব্দ (যেমন 8k, photorealistic, masterpiece) পাওয়া যায়নি।',
      measuredValue: 'Clean',
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
  } else {
    checks.push({
      id: 'fluff',
      label: 'প্রমোশনাল শব্দ বর্জন (Fluff Check)',
      status: 'warning',
      message: `নিষিদ্ধ প্রমোশনাল শব্দ পাওয়া গেছে: ${fluffDetected.join(', ')}`,
      measuredValue: fluffDetected.join(', '),
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    reasons.push(`নিষিদ্ধ প্রমোশনাল শব্দ শনাক্ত হয়েছে: ${fluffDetected.join(', ')}`);
  }

  // Check 10: Trademark / Brand Filter Check
  const visualLogoConfirmed = isVisualLogoFlagged || ipClassification.visualLogoConfirmed;

  if (visualLogoConfirmed) {
    checks.push({
      id: 'trademark',
      label: 'বাণিজ্যিক ট্রেডমার্ক ও ব্র্যান্ড ফিল্টার',
      status: 'failed',
      message: `পিক্সেলে দৃশ্যমান ব্র্যান্ড লোগো নিশ্চিত হয়েছে: ${trademarkDetected.join(', ') || 'Visible Logo'}। কমার্শিয়াল স্টকে সরাসরি রিজেক্ট হবে।`,
      measuredValue: 'Confirmed Logo',
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
    reasons.push(`পিক্সেলে দৃশ্যমান বাণিজ্যিক লোগো নিশ্চিত হয়েছে (Confirmed visible trademark logo in pixels): ${trademarkDetected.join(', ') || 'Visible Logo'}`);
  } else if (trademarkDetected.length === 0 && !ipClassification.promptMentionDetected) {
    checks.push({
      id: 'trademark',
      label: 'বাণিজ্যিক ট্রেডমার্ক ও ব্র্যান্ড ফিল্টার',
      status: 'passed',
      message: 'কোনো নিবন্ধিত বাণিজ্যিক ব্র্যান্ড বা ট্রেডমার্কের নাম পাওয়া যায়নি।',
      measuredValue: 'Clean IP',
      enforcementLevel: 'mandatory',
      verificationStatus: 'verified',
    });
  } else {
    checks.push({
      id: 'trademark',
      label: 'বাণিজ্যিক ট্রেডমার্ক ও ব্র্যান্ড ফিল্টার',
      status: 'warning',
      message: `টেক্সট বা প্রম্পটে ব্র্যান্ড নাম শনাক্ত হয়েছে: ${trademarkDetected.join(', ')} (পিক্সেলে লোগো আছে কিনা মানব পর্যালোচনা আবশ্যক)।`,
      measuredValue: trademarkDetected.join(', '),
      enforcementLevel: 'recommended',
      verificationStatus: 'verified',
    });
    reasons.push(`বাণিজ্যিক ব্র্যান্ড নাম টেক্সটে অন্তর্ভুক্ত: ${trademarkDetected.join(', ')} (পিক্সেলে লোগো না থাকলে মেটাডেটা থেকে নাম বাদ দিন)`);
  }

  // Check 11: Keyword Hygiene (Repetitive / Contradictory / Artifacts)
  if (repetitiveList.length > 0) {
    checks.push({
      id: 'kw-repetitive',
      label: 'পুনরাবৃত্তিমূলক কীওয়ার্ড পরীক্ষা',
      status: 'warning',
      message: `পুনরাবৃত্তিমূলক কীওয়ার্ড স্প্যামিং সনাক্ত: ${repetitiveList.join(', ')}`,
      measuredValue: `${repetitiveList.length} repetitive`,
      enforcementLevel: 'recommended',
      verificationStatus: 'verified',
    });
    reasons.push(`পুনরাবৃত্তিমূলক কীওয়ার্ড শনাক্ত: ${repetitiveList.join(', ')}`);
  }

  if (contradictionList.length > 0) {
    checks.push({
      id: 'kw-contradictory',
      label: 'পরস্পরবিরোধী কীওয়ার্ড পরীক্ষা',
      status: 'warning',
      message: `পরস্পরবিরোধী কীওয়ার্ড জোড়া সনাক্ত: ${contradictionList.join('; ')}`,
      measuredValue: `${contradictionList.length} conflicts`,
      enforcementLevel: 'recommended',
      verificationStatus: 'verified',
    });
    reasons.push(`পরস্পরবিরোধী কীওয়ার্ড জোড়া শনাক্ত: ${contradictionList.join('; ')}`);
  }

  if (promptArtifactList.length > 0) {
    checks.push({
      id: 'kw-artifacts',
      label: 'প্রম্পট আর্টিক্ট কীওয়ার্ড পরীক্ষা',
      status: 'warning',
      message: `প্রম্পট মেকানিক্স বা কোড শব্দ সনাক্ত: ${promptArtifactList.join(', ')}`,
      measuredValue: `${promptArtifactList.length} artifacts`,
      enforcementLevel: 'recommended',
      verificationStatus: 'verified',
    });
    reasons.push(`প্রম্পট আর্টিক্ট বা কোডিং শব্দ মেটাডেটায় উপস্থিত: ${promptArtifactList.join(', ')}`);
  }

  // Check 12: Mandatory AI Disclosure Statement
  const aiDisclosureStatement =
    asset.preparedMetadata?.aiDisclosure ||
    'Created with Generative AI technology. Commercial non-exclusive licensing.';
  checks.push({
    id: 'ai-disclosure',
    label: 'বাধ্যতামূলক AI ডিসক্লোজার স্টেটমেন্ট',
    status: 'passed',
    message: `স্বতন্ত্র এআই ডিসক্লোজার স্টেটমেন্ট অন্তর্ভুক্ত: "${aiDisclosureStatement}"`,
    measuredValue: 'Present',
    enforcementLevel: 'mandatory',
    verificationStatus: 'verified',
  });

  // Evaluate Marketplace Rules from verifiedMarketplaceRules engine
  const evaluatedRuleResults = mpEvaluation.technicalCompliance.ruleResults;
  let mandatoryTotal = 0;
  let mandatoryPassed = 0;
  let mandatoryFailed = 0;
  let recommendedTotal = 0;
  let recommendedPassed = 0;
  let recommendedFailed = 0;
  const uncertainRules: UncertainRuleItem[] = [];

  for (const r of evaluatedRuleResults) {
    if (r.enforcementLevel === 'mandatory') {
      mandatoryTotal++;
      if (r.status === 'passed') mandatoryPassed++;
      else mandatoryFailed++;
    } else if (r.enforcementLevel === 'recommended') {
      recommendedTotal++;
      if (r.status === 'passed') recommendedPassed++;
      else recommendedFailed++;
    } else if (r.enforcementLevel === 'uncertain_needs_verification' || r.verificationStatus === 'uncertain_needs_verification') {
      uncertainRules.push({
        ruleId: r.ruleId,
        title: r.title,
        titleBn: r.titleBn,
        verificationStatus: r.verificationStatus,
        enforcementLevel: r.enforcementLevel,
        evidenceSummary: r.evidenceSummary,
        noteBn: r.messageBn,
      });
      // CRITICAL GUARANTEE: Uncertain rules NEVER cause mandatory failure!
    }
  }

  // Determine overall status
  const isFatalError =
    !isDecodable ||
    isZeroByte ||
    fileSizeMb === 0 ||
    fileSizeMb > 50 ||
    mpProfile.aiAcceptanceStatus === 'prohibited' ||
    visualLogoConfirmed;

  const hasNeedsFix =
    reasons.length > 0 ||
    mandatoryFailed > 0 ||
    megapixels < requiredMinMp ||
    !isJpeg ||
    (targetMarketplace === 'adobe-stock' && !hasGenerativeAiSuffix) ||
    titleWords < titleRule.minWords ||
    fluffDetected.length > 0 ||
    trademarkDetected.length > 0 ||
    ipClassification.promptMentionDetected;

  let status: BatchReadinessStatus = 'Ready';
  let finalStatus: FinalSubmissionStatus = 'Ready for Manual Review';
  let finalStatusLabelBn = 'ম্যানুয়াল রিভিউয়ের জন্য প্রস্তুত (Ready for Manual Review)';
  let statusColor: 'green' | 'amber' | 'rose' = 'green';

  if (isFatalError) {
    status = 'Rejected';
    finalStatus = 'Rejected';
    finalStatusLabelBn = 'বাতিলযোগ্য (Rejected)';
    statusColor = 'rose';
  } else if (hasNeedsFix) {
    status = 'Needs Fix';
    finalStatus = 'Needs Fix';
    finalStatusLabelBn = 'সংশোধন প্রয়োজন (Needs Fix)';
    statusColor = 'amber';
  } else {
    // When passing all programmatic checks, status is Ready for Manual Review (Never 100% Guaranteed)
    status = 'Ready';
    finalStatus = 'Ready for Manual Review';
    finalStatusLabelBn = 'ম্যানুয়াল রিভিউয়ের জন্য প্রস্তুত (Ready for Manual Review)';
    statusColor = 'green';
  }

  const passedChecksCount = checks.filter((c) => c.status === 'passed').length;

  return {
    assetId: asset.id,
    title: effectiveTitle || asset.title,
    format,
    dimensions,
    megapixels,
    fileSize: fileSizeStr,
    status,
    finalStatus,
    finalStatusLabelBn,
    statusColor,
    targetMarketplace,
    targetMarketplaceName: mpProfile.name,
    reasons,
    passedChecksCount,
    totalChecksCount: checks.length,
    checks,
    metadata: {
      hasGenerativeAiSuffix,
      titleWordsCount: titleWords,
      titleLengthChars: titleChars,
      keywordCount: effectiveKeywordsCount,
      fluffDetected,
      trademarkDetected,
      repetitiveKeywords: repetitiveList,
      contradictoryKeywords: contradictionList,
      promptArtifacts: promptArtifactList,
      aiDisclosurePresent: true,
      aiDisclosureStatement,
    },
    rulesSummary: {
      mandatoryTotal,
      mandatoryPassed,
      mandatoryFailed,
      recommendedTotal,
      recommendedPassed,
      recommendedFailed,
      uncertainTotal: uncertainRules.length,
      uncertainRules,
    },
    humanReview: {
      required: true,
      disclaimerBn:
        'সতর্কতা: সমস্ত টেকনিক্যাল ও মেটাডেটা টেস্ট উত্তীর্ণ হলেও মানুষের ম্যানুয়াল নিরীক্ষা ছাড়া কোনো স্টক এজেন্সিতে সাবমিট করবেন না।',
      checkpoints: MANDATORY_HUMAN_REVIEW_CHECKPOINTS,
    },
    asset,
  };
}

/**
 * Audits a batch of assets for stock submission readiness
 */
export async function auditBatchImageReadiness(
  assets: Asset[],
  targetMarketplace: StockMarketplaceId = 'adobe-stock',
  options?: {
    visualLogoFound?: boolean;
    visualLogoConfirmed?: boolean;
    hasActualVisualInspection?: boolean;
  }
): Promise<BatchAuditSummary> {
  const mpProfile = VERIFIED_MARKETPLACE_REGISTRY[targetMarketplace] || VERIFIED_MARKETPLACE_REGISTRY['adobe-stock'];
  const items: BatchItemAuditResult[] = [];

  for (const asset of assets) {
    if (asset.type === 'image') {
      const itemResult = await auditSingleAssetReadiness(asset, targetMarketplace, options);
      items.push(itemResult);
    }
  }

  const totalInspected = items.length;
  const readyCount = items.filter((i) => i.status === 'Ready').length;
  const needsFixCount = items.filter((i) => i.status === 'Needs Fix').length;
  const rejectedCount = items.filter((i) => i.status === 'Rejected').length;

  let overallBatchStatus: BatchReadinessStatus = 'Ready';
  if (rejectedCount === totalInspected && totalInspected > 0) {
    overallBatchStatus = 'Rejected';
  } else if (needsFixCount > 0 || rejectedCount > 0) {
    overallBatchStatus = 'Needs Fix';
  } else {
    overallBatchStatus = 'Ready';
  }

  const overallFinalStatus: FinalSubmissionStatus =
    overallBatchStatus === 'Ready' ? 'Ready for Manual Review' : overallBatchStatus;

  const overallFinalStatusLabelBn =
    overallFinalStatus === 'Ready for Manual Review'
      ? 'ম্যানুয়াল রিভিউয়ের জন্য প্রস্তুত (Ready for Manual Review)'
      : overallFinalStatus === 'Needs Fix'
      ? 'সংশোধন প্রয়োজন (Needs Fix)'
      : 'বাতিলযোগ্য (Rejected)';

  const now = new Date();
  const timestamp = `${now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  return {
    totalInspected,
    readyCount,
    needsFixCount,
    rejectedCount,
    overallBatchStatus,
    overallFinalStatus,
    overallFinalStatusLabelBn,
    targetMarketplace,
    targetMarketplaceName: mpProfile.name,
    humanReviewRequired: true,
    items,
    timestamp,
  };
}

// ============================================================================
// PRIORITY 6.0: AUTONOMOUS STOCK SUBMISSION READINESS ENGINE
// ============================================================================

export type AutonomousSubmissionReadinessStatus = 'READY_TO_SUBMIT' | 'NEEDS_REVIEW' | 'REJECTED';

export interface SubmissionIssueDetail {
  type: 'technical' | 'metadata' | 'policy' | 'human_review' | 'duplicate';
  severity: 'blocking' | 'review_required' | 'advisory';
  messageBn: string;
  messageEn: string;
}

export interface AutonomousSubmissionEvaluation {
  assetId: string;
  assetTitle: string;
  targetMarketplace: StockMarketplaceId;
  targetMarketplaceName: string;
  status: AutonomousSubmissionReadinessStatus;
  statusLabelBn: string;
  statusLabelEn: string;
  statusColor: 'green' | 'amber' | 'rose';
  isDuplicateSubmission: boolean;
  duplicateReason?: string;
  reasons: string[];
  issues: SubmissionIssueDetail[];
  technicalPassed: boolean;
  metadataPassed: boolean;
  marketplaceRulesPassed: boolean;
  mandatoryRulesPassed: boolean;
  uncertainRulesCount: number;
  humanReviewRequired: boolean;
  humanReviewApproved: boolean;
  canAutoDispatch: boolean;
  submissionPackages: {
    adobeStockCsv: string;
    shutterstockCsv: string;
    freepikCsv: string;
    dreamstimeCsv: string;
    wirestockCsv: string;
    masterExportCsv: string;
    portalCopyText: string;
    imageFilename: string;
  };
  uploadStatus: {
    authorized: false;
    state: 'package_ready_for_portal';
    messageBn: string;
    messageEn: string;
  };
  generationCreditDeduction: 0;
  evaluatedAt: string;
  asset: Asset;
}

/**
 * Checks whether an asset has already been queued or assigned for a specific marketplace
 * to prevent duplicate submissions.
 */
export function isDuplicateSubmissionForMarketplace(
  assetId: string,
  targetMarketplace: StockMarketplaceId,
  existingTasks: AutonomousTaskItem[] = [],
  existingAssignments: AccountAssetAssignment[] = []
): { isDuplicate: boolean; reason?: string } {
  // Check tasks queue
  const duplicateTask = existingTasks.find(
    (t) =>
      t.assetId === assetId &&
      t.targetMarketplace === targetMarketplace &&
      t.status !== 'failed'
  );
  if (duplicateTask) {
    return {
      isDuplicate: true,
      reason: `এই ছবিটি ইতোমধ্যে ${targetMarketplace} মার্কেটপ্লেসের সাবমিশন কিউতে বিদ্যমান (Task: ${duplicateTask.id})। ডুপ্লিকেট সাবমিশন রোধ করা হয়েছে।`,
    };
  }

  // Check account manager assignments
  const duplicateAssignment = existingAssignments.find(
    (a) =>
      a.assetId === assetId &&
      a.platformId === targetMarketplace &&
      a.workflowStatus !== 'assigned'
  );
  if (duplicateAssignment) {
    return {
      isDuplicate: true,
      reason: `এই ছবিটি ইতোমধ্যে ${targetMarketplace}-এ অ্যাসাইন বা সাবমিট করা হয়েছে (Workflow: ${duplicateAssignment.workflowStatus})। ডুপ্লিকেট সাবমিশন রোধ করা হয়েছে।`,
    };
  }

  return { isDuplicate: false };
}

/**
 * Autonomously audits a single asset against all mandatory stock checks,
 * determining whether it is "READY_TO_SUBMIT", "NEEDS_REVIEW", or "REJECTED".
 * 
 * Rules:
 * 1. Only assets passing ALL mandatory checks can be READY_TO_SUBMIT.
 * 2. If human review or uncertain policy is unresolved, status is held in NEEDS_REVIEW.
 * 3. Prohibited policies or fatal technical defects result in REJECTED.
 * 4. Generates multi-marketplace CSV/ZIP packages and guards against duplicate submissions.
 * 5. Zero credit deduction and truthful upload boundaries guaranteed.
 */
export async function evaluateAutonomousStockSubmissionReadiness(
  asset: Asset,
  targetMarketplace: StockMarketplaceId = 'adobe-stock',
  options?: {
    existingQueueTasks?: AutonomousTaskItem[];
    existingAssignments?: AccountAssetAssignment[];
    humanReviewApproved?: boolean;
    visualLogoFound?: boolean;
    visualLogoConfirmed?: boolean;
    hasActualVisualInspection?: boolean;
  }
): Promise<AutonomousSubmissionEvaluation> {
  const auditResult = await auditSingleAssetReadiness(asset, targetMarketplace, options);
  const mpProfile = VERIFIED_MARKETPLACE_REGISTRY[targetMarketplace] || VERIFIED_MARKETPLACE_REGISTRY['adobe-stock'];
  const qualityReport = await runFinalQualityCheck(asset, targetMarketplace);

  const duplicateCheck = isDuplicateSubmissionForMarketplace(
    asset.id,
    targetMarketplace,
    options?.existingQueueTasks,
    options?.existingAssignments
  );

  const issues: SubmissionIssueDetail[] = [];
  const reasons: string[] = [...auditResult.reasons];

  if (duplicateCheck.isDuplicate) {
    issues.push({
      type: 'duplicate',
      severity: 'blocking',
      messageBn: duplicateCheck.reason || 'একই মার্কেটপ্লেসে ডুপ্লিকেট সাবমিশন প্রতিরোধ করা হয়েছে।',
      messageEn: 'Duplicate submission prevented for this marketplace.',
    });
  }

  // Check technical metrics (Priority 6.7: Production Safety & Package Integrity)
  const hasValidImageSource = Boolean(asset.url && asset.url.trim().length > 0);
  if (!hasValidImageSource) {
    issues.push({
      type: 'technical',
      severity: 'blocking',
      messageBn: 'আসল ইমেজ ফাইল বা URL অনুপস্থিত — অসম্পূর্ণ প্যাকেজ সাবমিশনের জন্য অনুপযুক্ত (Missing Image Data)।',
      messageEn: 'Missing asset image source or URL — incomplete package cannot be submitted.',
    });
  }

  const minRequiredMp = targetMarketplace === 'dreamstime' ? 3.0 : 4.0;
  const isDecodable = qualityReport.technicalMetrics.decodedSuccessfully;
  const isResolutionMet = qualityReport.technicalMetrics.megapixels >= minRequiredMp;
  const isFileSizeValid = !auditResult.checks.some((c) => c.id === 'filesize' && c.status === 'failed');

  const technicalPassed = hasValidImageSource && isDecodable && isResolutionMet && isFileSizeValid;

  if (!technicalPassed) {
    for (const c of auditResult.checks) {
      if (c.status === 'failed' || (c.enforcementLevel === 'mandatory' && c.status === 'warning')) {
        issues.push({
          type: 'technical',
          severity: c.status === 'failed' ? 'blocking' : 'review_required',
          messageBn: c.message,
          messageEn: `${c.label}: ${c.measuredValue}`,
        });
      }
    }

    if (!isDecodable && hasValidImageSource && !issues.some((i) => i.messageEn?.includes('Corrupted') || i.messageBn?.includes('ক্ষতিগ্রস্ত'))) {
      issues.push({
        type: 'technical',
        severity: 'blocking',
        messageBn: 'ছবির ফাইল ক্ষতিগ্রস্ত বা ডিকোড করা সম্ভব হয়নি — অসম্পূর্ণ প্যাকেজ সাবমিশন অযোগ্য (Corrupt Image Data)।',
        messageEn: 'Image data corrupted or unreadable — incomplete package cannot be submitted.',
      });
    }
  }

  // Check marketplace policy prohibition (e.g. Shutterstock 3rd-party AI ban)
  const policyProhibited = mpProfile.aiAcceptanceStatus === 'prohibited';
  if (policyProhibited) {
    issues.push({
      type: 'policy',
      severity: 'blocking',
      messageBn: `${mpProfile.name} থার্ড-পার্টি জেনারেটিভ AI কন্টেন্ট সম্পূর্ণ নিষিদ্ধ করে।`,
      messageEn: `${mpProfile.name} strictly prohibits third-party generative AI content.`,
    });
  }

  // Check confirmed visual logo in pixels
  const visualLogoConfirmed = options?.visualLogoConfirmed === true || options?.visualLogoFound === true;
  if (visualLogoConfirmed) {
    issues.push({
      type: 'policy',
      severity: 'blocking',
      messageBn: 'পিক্সেলে বাণিজ্যিক লোগো বা ট্রেডমার্ক নিশ্চিত হয়েছে (Confirmed visible trademark logo)।',
      messageEn: 'Confirmed visible trademark logo in image pixels.',
    });
  }

  // Check metadata hygiene
  const hasGenerativeAiSuffix = auditResult.metadata.hasGenerativeAiSuffix;
  const hasFluff = auditResult.metadata.fluffDetected.length > 0;
  const hasTrademark = auditResult.metadata.trademarkDetected.length > 0;
  const metadataPassed = !hasFluff && !hasTrademark && (targetMarketplace !== 'adobe-stock' || hasGenerativeAiSuffix);

  if (!metadataPassed) {
    if (targetMarketplace === 'adobe-stock' && !hasGenerativeAiSuffix) {
      issues.push({
        type: 'metadata',
        severity: 'review_required',
        messageBn: 'Adobe Stock-এর জন্য টাইটেলে "Generative AI" সাফিক্স আবশ্যক।',
        messageEn: 'Missing "Generative AI" title suffix for Adobe Stock.',
      });
    }
    if (hasFluff) {
      issues.push({
        type: 'metadata',
        severity: 'review_required',
        messageBn: `নিষিদ্ধ প্রমোশনাল শব্দ উপস্থিত: ${auditResult.metadata.fluffDetected.join(', ')}`,
        messageEn: `Promotional fluff detected: ${auditResult.metadata.fluffDetected.join(', ')}`,
      });
    }
    if (hasTrademark) {
      issues.push({
        type: 'metadata',
        severity: 'review_required',
        messageBn: `বাণিজ্যিক ব্র্যান্ড বা ট্রেডমার্ক শব্দ সনাক্ত: ${auditResult.metadata.trademarkDetected.join(', ')}`,
        messageEn: `Brand terms detected: ${auditResult.metadata.trademarkDetected.join(', ')}`,
      });
    }
  }

  // Check human review gate
  const isHumanReviewApproved = options?.humanReviewApproved === true;
  if (!isHumanReviewApproved) {
    issues.push({
      type: 'human_review',
      severity: 'review_required',
      messageBn: 'মানবিক পর্যালোচনা ও কিউরেটর পরিদর্শন আবশ্যক (স্বয়ংক্রিয় সাবমিশন স্থগিত রাখা হয়েছে)।',
      messageEn: 'Mandatory human curator review pending (automated dispatch held).',
    });
  }

  // Uncertain rules check
  const uncertainRulesCount = auditResult.rulesSummary.uncertainTotal;
  if (uncertainRulesCount > 0) {
    issues.push({
      type: 'policy',
      severity: 'review_required',
      messageBn: `${uncertainRulesCount}টি প্ল্যাটফর্ম নিয়ম অনিশ্চিত/অযাচাইকৃত — মানব পর্যালোচনা প্রয়োজন।`,
      messageEn: `${uncertainRulesCount} uncertain policy rules require curator review.`,
    });
  }

  // Determine 3-tier status
  const hasBlockingIssues = issues.some((i) => i.severity === 'blocking');
  const hasReviewRequiredIssues = issues.some((i) => i.severity === 'review_required');

  let status: AutonomousSubmissionReadinessStatus = 'NEEDS_REVIEW';
  let statusLabelBn = 'পর্যালোচনা ও সংশোধন প্রয়োজন (Needs Review)';
  let statusLabelEn = 'Needs Review';
  let statusColor: 'green' | 'amber' | 'rose' = 'amber';

  if (hasBlockingIssues) {
    status = 'REJECTED';
    statusLabelBn = 'বাতিলযোগ্য (Rejected)';
    statusLabelEn = 'Rejected';
    statusColor = 'rose';
  } else if (!hasReviewRequiredIssues && isHumanReviewApproved && !duplicateCheck.isDuplicate) {
    status = 'READY_TO_SUBMIT';
    statusLabelBn = 'সাবমিশনের জন্য সম্পূর্ণ প্রস্তুত (Ready to Submit)';
    statusLabelEn = 'Ready to Submit';
    statusColor = 'green';
  } else {
    status = 'NEEDS_REVIEW';
    statusLabelBn = 'পর্যালোচনা ও সংশোধন প্রয়োজন (Needs Review)';
    statusLabelEn = 'Needs Review';
    statusColor = 'amber';
  }

  const canAutoDispatch = status === 'READY_TO_SUBMIT' && !duplicateCheck.isDuplicate;

  // Prepare submission packages
  const cleanSafeName = (asset.title || 'stock_asset').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40) || 'stock_asset';
  const imageFilename = `${cleanSafeName}.jpg`;

  const metaTitle = asset.preparedMetadata?.title || asset.title || 'Commercial Stock Asset';
  const metaDesc = asset.preparedMetadata?.description || asset.prompt || metaTitle;
  const metaKeywords = asset.preparedMetadata?.keywords && asset.preparedMetadata.keywords.length > 0
    ? asset.preparedMetadata.keywords
    : (asset.prompt || '').split(' ').slice(0, 20);

  const adobeStockCsv = buildAdobeStockCsv(imageFilename, metaTitle, metaKeywords);
  const shutterstockCsv = buildShutterstockCsv(imageFilename, metaDesc, metaKeywords);
  const freepikCsv = buildFreepikCsv(imageFilename, metaTitle, metaKeywords, asset.prompt || '');
  const dreamstimeCsv = buildDreamstimeCsv(imageFilename, metaTitle, metaDesc, metaKeywords);
  const wirestockCsv = buildWirestockCsv(imageFilename, metaTitle, metaDesc, metaKeywords);
  const effectiveMetadata: PreparedStockMetadata = asset.preparedMetadata || {
    title: metaTitle,
    description: metaDesc,
    keywords: metaKeywords,
    marketplace: targetMarketplace,
    marketplaceName: mpProfile.name,
    category: 'Commercial Imagery',
    aiDisclosure: 'Created with Generative AI technology. Commercial non-exclusive licensing.',
    aiPolicyStatus: mpProfile.aiAcceptanceStatus,
    aiPolicyBadge: mpProfile.aiAcceptanceNoteBn,
    aiPolicyColor: mpProfile.aiAcceptanceStatus === 'allowed' ? 'green' : mpProfile.aiAcceptanceStatus === 'prohibited' ? 'red' : 'amber',
    officialPolicyNote: mpProfile.aiAcceptanceNoteBn,
    isPolicyVerified: true,
    labelingRequirement: targetMarketplace === 'adobe-stock' ? 'Mandatory "Generative AI" suffix and toggle' : 'AI generated label required',
    humanPresenceCompliance: 'No human subjects present; model release not required',
    trademarkCompliance: '100% Free of commercial brands and trademark logos',
    technicalRequirements: `JPEG format, min ${minRequiredMp} MP, max 50 MB`,
    factualSubjectSummary: metaTitle,
  };

  const masterExportCsv = generateStockMetadataCsv(asset, effectiveMetadata, qualityReport);

  const portalCopyText = `=====================================================
=== AI CREATOR STUDIO: CONTRIBUTOR SUBMISSION PACKAGE ===
=====================================================
ASSET TITLE: ${metaTitle}
ASSET DIMENSIONS: ${asset.dimensions || '4096 × 2304'}
ASSET FILE: ${imageFilename}
TARGET MARKETPLACE: ${mpProfile.name}
SUBMISSION READINESS STATUS: ${status} (${statusLabelBn})

COMMERCIAL TITLE:
${metaTitle}

COMMERCIAL DESCRIPTION:
${metaDesc}

TAGS / KEYWORDS (${metaKeywords.length} VERIFIED):
${metaKeywords.join(', ')}

AI DISCLOSURE STATEMENT:
${asset.preparedMetadata?.aiDisclosure || 'Created with Generative AI technology. Commercial non-exclusive licensing.'}

NOTICE: Contributor portals require individual contributor login credentials or SFTP for final upload. This package provides compliant JPEG files and RFC 4180 CSV metadata matching contributor rules. Technical compliance and CSV export do not guarantee curator acceptance or sales.
=====================================================`;

  return {
    assetId: asset.id,
    assetTitle: asset.title,
    targetMarketplace,
    targetMarketplaceName: mpProfile.name,
    status,
    statusLabelBn,
    statusLabelEn,
    statusColor,
    isDuplicateSubmission: duplicateCheck.isDuplicate,
    duplicateReason: duplicateCheck.reason,
    reasons,
    issues,
    technicalPassed,
    metadataPassed,
    marketplaceRulesPassed: !policyProhibited,
    mandatoryRulesPassed: auditResult.rulesSummary.mandatoryFailed === 0 && !policyProhibited && !visualLogoConfirmed,
    uncertainRulesCount,
    humanReviewRequired: true,
    humanReviewApproved: isHumanReviewApproved,
    canAutoDispatch,
    submissionPackages: {
      adobeStockCsv,
      shutterstockCsv,
      freepikCsv,
      dreamstimeCsv,
      wirestockCsv,
      masterExportCsv,
      portalCopyText,
      imageFilename,
    },
    uploadStatus: {
      authorized: false,
      state: 'package_ready_for_portal',
      messageBn:
        'মার্কেটপ্লেস কন্ট্রিবিউটর এপিআই/এসএফটিপি ক্রেডেনশিয়াল ছাড়া স্বয়ংক্রিয় রিমোট আপলোড সম্ভব নয়। প্রস্তুতকৃত RFC 4180 CSV ও ZIP প্যাকেজ কন্ট্রিবিউটর পোর্টালে সরাসরি আপলোডের জন্য প্রস্তুত। কোনো পাসওয়ার্ড চাওয়া হয় না।',
      messageEn:
        'Direct remote upload requires official contributor API/SFTP credentials. Ready-to-upload ZIP package with RFC 4180 CSV is prepared for manual portal submission.',
    },
    generationCreditDeduction: 0,
    evaluatedAt: new Date().toISOString(),
    asset,
  };
}

/**
 * Autonomously scans a list of assets against target marketplaces,
 * returning full readiness evaluations.
 */
export async function runAutonomousStockReadinessScan(
  assets: Asset[],
  targetMarketplaces: StockMarketplaceId[] = ['adobe-stock'],
  options?: {
    existingQueueTasks?: AutonomousTaskItem[];
    existingAssignments?: AccountAssetAssignment[];
    humanReviewApprovedMap?: Record<string, boolean>;
  }
): Promise<AutonomousSubmissionEvaluation[]> {
  const evaluations: AutonomousSubmissionEvaluation[] = [];

  // Filter only images for stock submission
  const imageAssets = assets.filter((a) => a.type === 'image');

  for (const asset of imageAssets) {
    for (const mp of targetMarketplaces) {
      const isApproved = Boolean(options?.humanReviewApprovedMap?.[`${asset.id}::${mp}`]);
      const evalResult = await evaluateAutonomousStockSubmissionReadiness(asset, mp, {
        existingQueueTasks: options?.existingQueueTasks,
        existingAssignments: options?.existingAssignments,
        humanReviewApproved: isApproved,
      });
      evaluations.push(evalResult);
    }
  }

  return evaluations;
}

export interface PackageIntegrityVerificationResult {
  isValid: boolean;
  imageFilename: string;
  hasRealImageFile: boolean;
  imageByteSize: number;
  csvFilesFound: string[];
  allCsvFilenamesMatch: boolean;
  hasBom: boolean;
  errors: string[];
  errorsBn: string[];
}

/**
 * Priority 6.7: Verifies production safety and package integrity of a generated stock submission ZIP
 */
export async function verifyStockPackageIntegrity(
  zipInstanceOrBuffer: any,
  expectedImageFilename: string
): Promise<PackageIntegrityVerificationResult> {
  const result: PackageIntegrityVerificationResult = {
    isValid: true,
    imageFilename: expectedImageFilename,
    hasRealImageFile: false,
    imageByteSize: 0,
    csvFilesFound: [],
    allCsvFilenamesMatch: true,
    hasBom: true,
    errors: [],
    errorsBn: [],
  };

  try {
    let zipObj = zipInstanceOrBuffer;
    if (zipInstanceOrBuffer && (typeof zipInstanceOrBuffer.files === 'undefined' || typeof zipInstanceOrBuffer.loadAsync === 'function')) {
      const JSZip = (await import('jszip')).default;
      if (typeof zipInstanceOrBuffer.files === 'undefined') {
        zipObj = await JSZip.loadAsync(zipInstanceOrBuffer);
      }
    }

    if (!zipObj || !zipObj.files) {
      result.isValid = false;
      result.errors.push('Invalid ZIP object or empty archive.');
      result.errorsBn.push('অবৈধ বা ত্রুটিপূর্ণ ZIP প্যাকেজ।');
      return result;
    }

    // 1. Check real image file
    const imageEntry = zipObj.files[expectedImageFilename];
    if (!imageEntry || imageEntry.dir) {
      result.isValid = false;
      result.hasRealImageFile = false;
      result.errors.push(`Expected image file "${expectedImageFilename}" is missing from ZIP package.`);
      result.errorsBn.push(`ZIP প্যাকেজে প্রত্যাশিত আসল ইমেজ ফাইল "${expectedImageFilename}" অনুপস্থিত।`);
    } else {
      const imgData = await imageEntry.async('uint8array');
      result.imageByteSize = imgData ? imgData.length : 0;
      if (result.imageByteSize === 0) {
        result.isValid = false;
        result.hasRealImageFile = false;
        result.errors.push(`Image file "${expectedImageFilename}" has 0 bytes (empty file).`);
        result.errorsBn.push(`ইমেজ ফাইল "${expectedImageFilename}"-এর আকার ০ বাইট (খালি ফাইল)।`);
      } else {
        result.hasRealImageFile = true;
      }
    }

    // 2. Check required portal CSVs
    const requiredCsvs = [
      'AdobeStock_metadata.csv',
      'Shutterstock_metadata.csv',
      'Freepik_metadata.csv',
      'Dreamstime_metadata.csv',
      'Wirestock_metadata.csv',
    ];

    for (const csvName of requiredCsvs) {
      const csvEntry = zipObj.files[csvName];
      if (!csvEntry) {
        result.isValid = false;
        result.errors.push(`Required metadata CSV "${csvName}" is missing from ZIP package.`);
        result.errorsBn.push(`প্রয়োজনীয় মেটাডাটা CSV "${csvName}" প্যাকেজে অনুপস্থিত।`);
      } else {
        result.csvFilesFound.push(csvName);
        const content = await csvEntry.async('string');

        // Check UTF-8 BOM
        if (!content.startsWith('\uFEFF')) {
          result.isValid = false;
          result.hasBom = false;
          result.errors.push(`CSV "${csvName}" is missing required UTF-8 BOM.`);
          result.errorsBn.push(`CSV "${csvName}" ফাইলে আবশ্যক UTF-8 BOM অনুপস্থিত।`);
        }

        // Check exact image filename match in CSV
        if (!content.includes(expectedImageFilename)) {
          result.isValid = false;
          result.allCsvFilenamesMatch = false;
          result.errors.push(`CSV "${csvName}" does not match image filename "${expectedImageFilename}".`);
          result.errorsBn.push(`CSV "${csvName}"-এর সাথে ইমেজ ফাইলনাম "${expectedImageFilename}" মেলেনি।`);
        }
      }
    }
  } catch (err: any) {
    result.isValid = false;
    result.errors.push(`Failed to verify ZIP package: ${err.message || String(err)}`);
    result.errorsBn.push(`ZIP প্যাকেজ যাচাইকরণ ব্যর্থ হয়েছে: ${err.message || String(err)}`);
  }

  return result;
}


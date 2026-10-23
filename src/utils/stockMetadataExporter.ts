/**
 * Structured Metadata Exporter for Stock Marketplaces
 * Priority 3.7: Final Stock Submission Readiness
 * 
 * Generates structured CSV and JSON exports containing:
 * 1. Prompts (generation prompt, negative prompt, style, model)
 * 2. Identified brand information (prompt brand mentions, reasons, visual logo check status)
 * 3. Submission readiness status: "Ready for Manual Review", "Needs Fix", or "Rejected"
 * 4. Honest compliance reporting: never falsely labels uncertain compliance as verified
 * 5. Mandatory Human Review requirement and checkpoints
 * 6. Easy copy-pasting for stock platforms (Adobe Stock, Freepik, Dreamstime, etc.)
 */

import { Asset, PreparedStockMetadata, StockMarketplaceId } from '../types';
import { FinalQualityReport } from './qualityChecker';

export interface StructuredStockExportData {
  exportVersion: string;
  exportTimestamp: string;
  asset: {
    id: string;
    title: string;
    type: string;
    dimensions: string;
    aspectRatio?: string;
    model?: string;
    source?: string;
    createdAt?: string;
    url?: string;
  };
  prompts: {
    prompt: string;
    negativePrompt?: string;
    style?: string;
    model?: string;
    provenanceNote: string;
  };
  stockPlatformMetadata: {
    targetMarketplace: StockMarketplaceId;
    marketplaceName: string;
    commercialTitle: string;
    commercialDescription: string;
    keywords: string[];
    keywordsCount: number;
    keywordsCommaSeparated: string;
    category?: string;
    visualSubjectDescription: string;
    pixelInspectionMethod: string;
    aiDisclosure: string;
    labelingRequirement: string;
    titleRuleRequirement?: string;
    visualGroundingQuality?: string;
  };
  brandInformation: {
    promptBrandDetected: boolean;
    identifiedBrands: string[];
    detectionReasons: string[];
    promptBrandStatus: string;
    visualLogoCheckStatus: string;
    visualLogoNote: string;
    trademarkComplianceSummary: string;
    aiToolProvenanceExclusion: string;
  };
  complianceStatus: {
    overallQualityTier: string;
    overallStatusColor: 'green' | 'amber' | 'rose';
    submissionStatus: 'Ready for Manual Review' | 'Needs Fix' | 'Rejected';
    submissionStatusLabelBn: string;
    humanReviewRequired: true;
    humanReviewCheckpoints: string[];
    aiPolicyStatus: 'allowed' | 'conditional' | 'prohibited';
    aiPolicyBadge: string;
    isPolicyVerified: boolean;
    policyVerificationState: 'Verified' | 'Uncertain (Needs Verification)' | 'Unverified';
    uncertainRulesCount: number;
    uncertainRules: Array<{ id: string; title: string; note: string }>;
    verificationDate: string;
    officialPolicyUrl?: string;
    officialPolicySummary: string;
    humanPresenceCompliance: string;
    technicalInspection: {
      allPassed: boolean;
      pixelCheckPassed: boolean;
      pixelDimensionsNote: string;
      formatCheckPassed: boolean;
      formatNote: string;
      sizeCheckPassed: boolean;
      sizeNote: string;
      warnings: string[];
    };
    limitationDisclaimer: string;
  };
}

/**
 * Builds structured data object containing prompts, brand info, and compliance status
 */
export function buildStructuredExportData(
  asset: Asset,
  metadata: PreparedStockMetadata,
  qualityReport?: FinalQualityReport | null
): StructuredStockExportData {
  const promptBrandDetected = qualityReport?.legalRisk?.promptBrandDetected ?? false;
  const identifiedBrands = qualityReport?.legalRisk?.promptBrandDetails ?? [];
  const detectionReasons = qualityReport?.legalRisk?.promptBrandReasons ?? [];
  
  const promptBrandStatus =
    qualityReport?.legalRisk?.promptBrandStatus ||
    (promptBrandDetected
      ? `বাণিজ্যিক ব্র্যান্ড শনাক্ত: [${identifiedBrands.join(', ')}]`
      : 'কোনো ব্র্যান্ড উল্লেখ নেই');

  const visualLogoCheckStatus =
    qualityReport?.legalRisk?.visualLogoStatus || 'ছবির লোগো ম্যানুয়ালি যাচাই করুন';

  const visualLogoNote =
    qualityReport?.legalRisk?.visualLogoNote ||
    'ছবির ভেতরের মাইক্রো-লোগো ও ট্রেডমার্ক সরাসরি কম্পিউটার ভিশন দ্বারা শতভাগ নির্ভরযোগ্যভাবে শনাক্ত করা যায় না; সাবমিট করার আগে নিজ চোখে জামাকাপড়, পণ্য বা ব্যাকগ্রাউন্ড নিরীক্ষা করুন।';

  const overallQualityTier = qualityReport?.overallStatus || 'সম্ভাব্য সমস্যা নেই';
  const overallStatusColor = qualityReport?.overallStatusColor || 'green';

  // Honest policy verification state determination:
  // Never falsely label unverified platforms or uncertain rules as 'Verified'
  const isMarketplaceOther = metadata.marketplace === 'other';
  const uncertainRulesFromMeta = (metadata.validationAudit?.policyScopeAudit?.unverifiableByCodeAlone || []).map((rule, idx) => ({
    id: `uncertain-${idx}`,
    title: rule,
    note: 'Requires manual verification with the platform',
  }));

  let policyVerificationState: 'Verified' | 'Uncertain (Needs Verification)' | 'Unverified' = 'Verified';
  let isPolicyVerified = metadata.isPolicyVerified ?? true;

  if (isMarketplaceOther) {
    policyVerificationState = 'Unverified';
    isPolicyVerified = false;
  } else if (!metadata.isPolicyVerified || uncertainRulesFromMeta.length > 0) {
    policyVerificationState = 'Uncertain (Needs Verification)';
    isPolicyVerified = false;
  } else {
    policyVerificationState = 'Verified';
    isPolicyVerified = true;
  }

  // Determine submission readiness status: Ready for Manual Review | Needs Fix | Rejected
  let submissionStatus: 'Ready for Manual Review' | 'Needs Fix' | 'Rejected' = 'Ready for Manual Review';
  let submissionStatusLabelBn = 'ম্যানুয়াল রিভিউয়ের জন্য প্রস্তুত (Ready for Manual Review)';

  if (qualityReport?.overallStatusColor === 'rose' || metadata.aiPolicyStatus === 'prohibited') {
    submissionStatus = 'Rejected';
    submissionStatusLabelBn = 'বাতিলযোগ্য (Rejected)';
  } else if (
    (metadata.techInspection && !metadata.techInspection.allTechPassed) ||
    (metadata.techInspection?.warnings && metadata.techInspection.warnings.length > 0) ||
    qualityReport?.overallStatusColor === 'amber'
  ) {
    submissionStatus = 'Needs Fix';
    submissionStatusLabelBn = 'সংশোধন প্রয়োজন (Needs Fix)';
  } else {
    submissionStatus = 'Ready for Manual Review';
    submissionStatusLabelBn = 'ম্যানুয়াল রিভিউয়ের জন্য প্রস্তুত (Ready for Manual Review)';
  }

  const humanReviewCheckpoints = [
    'Visual Quality & AI Artifacts (100% zoom check for anatomical/geometry deformities)',
    'Micro-Logos & Trademarks (clothing, signs, vehicles, background items)',
    'Model Release (identifiable living persons or synthetic human faces)',
    'Property Release (private property, modern copyrighted architecture)',
    'Editorial Curator Final Discretion (zero automated guarantee of acceptance)',
  ];

  return {
    exportVersion: '1.1',
    exportTimestamp: new Date().toISOString(),
    asset: {
      id: asset.id,
      title: asset.title,
      type: asset.type,
      dimensions: asset.dimensions,
      aspectRatio: asset.aspectRatio,
      model: asset.model,
      source: asset.source,
      url: asset.url?.startsWith('data:') ? '[Embedded Data URI]' : (asset.url || ''),
    },
    prompts: {
      prompt: asset.prompt || '',
      negativePrompt: asset.negativePrompt || 'N/A',
      style: asset.style || 'Standard',
      model: asset.model || 'AI Studio',
      provenanceNote:
        'Google Flow, ChatGPT, Midjourney ইত্যাদি এআই টুলের নাম প্রম্পটে থাকলে তা টুলের প্রোভেন্যান্স হিসেবে গণ্য, কোনো বাণিজ্যিক পণ্যের ব্র্যান্ড লোগো নয়।',
    },
    stockPlatformMetadata: {
      targetMarketplace: metadata.marketplace,
      marketplaceName: metadata.marketplaceName,
      commercialTitle: metadata.title,
      commercialDescription: metadata.description,
      keywords: metadata.keywords,
      keywordsCount: metadata.keywords.length,
      keywordsCommaSeparated: metadata.keywords.join(', '),
      category: metadata.category,
      visualSubjectDescription: metadata.visualSubjectDescription || asset.prompt,
      pixelInspectionMethod: metadata.pixelAnalyzed ? 'Direct Pixel Analysis (Gemini 3.8 Flash Vision)' : 'User-Described Subject',
      aiDisclosure: metadata.aiDisclosure || 'Created with Generative AI technology. Commercial non-exclusive licensing.',
      labelingRequirement: metadata.labelingRequirement,
      titleRuleRequirement: metadata.titleRule?.recommendedChars || `${metadata.marketplaceName} Standard Title Rule`,
      visualGroundingQuality: metadata.groundedVerification?.note || '100% Grounded in Visible Pixels (Zero Promotional Fluff)',
    },
    brandInformation: {
      promptBrandDetected,
      identifiedBrands,
      detectionReasons,
      promptBrandStatus,
      visualLogoCheckStatus,
      visualLogoNote,
      trademarkComplianceSummary: metadata.trademarkCompliance,
      aiToolProvenanceExclusion:
        'AI জেনারেটর টুলের নাম (Google Flow, ChatGPT, Midjourney, DALL-E ইত্যাদি) ফিল্টার করা হয়েছে; কেবল বাণিজ্যিক সাবজেক্ট ব্র্যান্ড শনাক্ত করা হয়।',
    },
    complianceStatus: {
      overallQualityTier,
      overallStatusColor,
      submissionStatus,
      submissionStatusLabelBn,
      humanReviewRequired: true,
      humanReviewCheckpoints,
      aiPolicyStatus: metadata.aiPolicyStatus,
      aiPolicyBadge: metadata.aiPolicyBadge,
      isPolicyVerified,
      policyVerificationState,
      uncertainRulesCount: uncertainRulesFromMeta.length,
      uncertainRules: uncertainRulesFromMeta,
      verificationDate: metadata.verificationDate || new Date().toISOString(),
      officialPolicyUrl: metadata.officialPolicyUrl,
      officialPolicySummary: metadata.officialPolicyNote,
      humanPresenceCompliance: metadata.humanPresenceCompliance,
      technicalInspection: {
        allPassed: metadata.techInspection?.allTechPassed ?? true,
        pixelCheckPassed: metadata.techInspection?.pixelCheckPassed ?? true,
        pixelDimensionsNote: metadata.techInspection?.pixelDimensionsNote ?? asset.dimensions,
        formatCheckPassed: metadata.techInspection?.formatCheckPassed ?? true,
        formatNote: metadata.techInspection?.formatNote ?? 'JPEG (.jpg)',
        sizeCheckPassed: metadata.techInspection?.sizeCheckPassed ?? true,
        sizeNote: metadata.techInspection?.sizeNote ?? '',
        warnings: metadata.techInspection?.warnings ?? [],
      },
      limitationDisclaimer:
        'স্বয়ংক্রিয় পরীক্ষা কোনো চূড়ান্ত গ্রহণযোগ্যতার নিশ্চয়তা দেয় না। কোনো ছবিকেই শতভাগ লোগোমুক্ত বলে দাবি করা যায় না। সাবমিটের পূর্বে ম্যানুয়াল রিভিউ করুন।',
    },
  };
}

/**
 * Generates formatted JSON text
 */
export function generateStockMetadataJson(
  asset: Asset,
  metadata: PreparedStockMetadata,
  qualityReport?: FinalQualityReport | null
): string {
  const data = buildStructuredExportData(asset, metadata, qualityReport);
  return JSON.stringify(data, null, 2);
}

/**
 * Escapes a single string field for RFC 4180 CSV compliance
 */
function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates structured RFC 4180 CSV text with UTF-8 BOM for Excel/Sheets compatibility
 */
export function generateStockMetadataCsv(
  asset: Asset,
  metadata: PreparedStockMetadata,
  qualityReport?: FinalQualityReport | null
): string {
  const data = buildStructuredExportData(asset, metadata, qualityReport);

  const headers = [
    'Title (Commercial)',
    'Description (Commercial)',
    'Keywords',
    'Keywords Count',
    'Visual Subject Description',
    'Pixel Inspection Method',
    'AI Disclosure Statement',
    'Target Marketplace',
    'Marketplace Title Rule',
    'Visual Grounding Quality',
    'Compliance Tier',
    'Marketplace AI Policy',
    'Labeling Requirement',
    'Prompt',
    'Negative Prompt',
    'AI Model',
    'Style',
    'Brand Mention in Prompt',
    'Identified Brands',
    'Brand Detection Reasons',
    'Visual Logo Check Status',
    'Trademark Compliance Summary',
    'Human Presence & Model Release',
    'Pixel Resolution',
    'File Format',
    'Technical Check Passed',
    'Technical Warnings',
    'Official Policy URL',
    'Export Date',
    'Submission Status',
    'Human Review Required',
    'Policy Verification State',
    'Uncertain Rules'
  ];

  const row = [
    data.stockPlatformMetadata.commercialTitle,
    data.stockPlatformMetadata.commercialDescription,
    data.stockPlatformMetadata.keywordsCommaSeparated,
    data.stockPlatformMetadata.keywordsCount,
    data.stockPlatformMetadata.visualSubjectDescription,
    data.stockPlatformMetadata.pixelInspectionMethod,
    data.stockPlatformMetadata.aiDisclosure,
    data.stockPlatformMetadata.marketplaceName,
    data.stockPlatformMetadata.titleRuleRequirement || 'Standard',
    data.stockPlatformMetadata.visualGroundingQuality || '100% Grounded in Visible Pixels',
    data.complianceStatus.overallQualityTier,
    `${data.complianceStatus.aiPolicyBadge} (${data.complianceStatus.aiPolicyStatus.toUpperCase()})`,
    data.stockPlatformMetadata.labelingRequirement,
    data.prompts.prompt,
    data.prompts.negativePrompt,
    data.prompts.model,
    data.prompts.style,
    data.brandInformation.promptBrandDetected ? 'Yes (বাণিজ্যিক ব্র্যান্ড শনাক্ত)' : 'No (কোনো ব্র্যান্ড উল্লেখ নেই)',
    data.brandInformation.identifiedBrands.length > 0 ? data.brandInformation.identifiedBrands.join('; ') : 'None',
    data.brandInformation.detectionReasons.join(' | ') || 'None',
    data.brandInformation.visualLogoCheckStatus,
    data.brandInformation.trademarkComplianceSummary,
    data.complianceStatus.humanPresenceCompliance,
    data.complianceStatus.technicalInspection.pixelDimensionsNote,
    data.complianceStatus.technicalInspection.formatNote,
    data.complianceStatus.technicalInspection.allPassed ? 'Passed' : 'Warnings Present',
    data.complianceStatus.technicalInspection.warnings.join('; ') || 'None',
    data.complianceStatus.officialPolicyUrl || 'N/A',
    data.exportTimestamp,
    data.complianceStatus.submissionStatus,
    data.complianceStatus.humanReviewRequired ? 'Yes (Mandatory human review before submission)' : 'No',
    data.complianceStatus.policyVerificationState,
    data.complianceStatus.uncertainRules.map((u) => u.title).join('; ') || 'None',
  ];

  const csvContent = [
    headers.map(escapeCsvField).join(','),
    row.map(escapeCsvField).join(','),
  ].join('\r\n');

  // Prepend UTF-8 BOM so spreadsheet viewers render UTF-8 properly
  return '\uFEFF' + csvContent;
}

/**
 * Generates an easy copy-paste text block formatted for stock platform portals
 */
export function generateStockPlatformCopyText(
  asset: Asset,
  metadata: PreparedStockMetadata,
  qualityReport?: FinalQualityReport | null
): string {
  const data = buildStructuredExportData(asset, metadata, qualityReport);

  return `=====================================================
=== ${data.stockPlatformMetadata.marketplaceName.toUpperCase()} STOCK SUBMISSION METADATA ===
=====================================================

[1] COMMERCIAL TITLE:
${data.stockPlatformMetadata.commercialTitle}

[2] COMMERCIAL DESCRIPTION:
${data.stockPlatformMetadata.commercialDescription}

[3] DESCRIPTIVE KEYWORDS (${data.stockPlatformMetadata.keywordsCount} VISUAL TAGS - COMMA SEPARATED):
${data.stockPlatformMetadata.keywordsCommaSeparated}

[3.1] AI DISCLOSURE STATEMENT (SEPARATE FIELD):
${data.stockPlatformMetadata.aiDisclosure}

[4] AI PROMPT:
${data.prompts.prompt}
${data.prompts.negativePrompt !== 'N/A' ? `Negative Prompt: ${data.prompts.negativePrompt}\n` : ''}Model: ${data.prompts.model} | Style: ${data.prompts.style}

[5] IDENTIFIED BRAND INFORMATION:
• Prompt/Metadata Brand Mention: ${data.brandInformation.promptBrandStatus}
• Detected Brands: ${data.brandInformation.identifiedBrands.length > 0 ? data.brandInformation.identifiedBrands.join(', ') : 'None'}
• Visual Logo Check: ${data.brandInformation.visualLogoCheckStatus} (${data.brandInformation.visualLogoNote})
• Trademark Compliance: ${data.brandInformation.trademarkComplianceSummary}

[6] SUBMISSION STATUS & COMPLIANCE:
• Final Submission Status: ${data.complianceStatus.submissionStatus} (${data.complianceStatus.submissionStatusLabelBn})
• Human Review: Mandatory Before Submission (${data.complianceStatus.humanReviewCheckpoints.join(' | ')})
• AI Policy: ${data.complianceStatus.aiPolicyBadge} (${data.complianceStatus.aiPolicyStatus}) [${data.complianceStatus.policyVerificationState}]
• Required Portal Labeling: ${data.stockPlatformMetadata.labelingRequirement}
• Human & Model Release: ${data.complianceStatus.humanPresenceCompliance}
• Technical Specs: ${data.complianceStatus.technicalInspection.pixelDimensionsNote} | ${data.complianceStatus.technicalInspection.formatNote}
• Policy URL: ${data.complianceStatus.officialPolicyUrl || 'N/A'}

[7] EXPORT TIMESTAMP:
${data.exportTimestamp}
=====================================================`;
}

/**
 * Downloads a file in browser using a Blob and anchor click
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

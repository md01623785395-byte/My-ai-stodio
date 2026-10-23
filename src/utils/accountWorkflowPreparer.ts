/**
 * Account Workflow Preparer
 * Priority 2.4: Platform-Specific Package Generation & Quality Pre-Check Engine
 *
 * Distinct workflows:
 * 1. Adobe Stock (Stock Marketplace): Technical checks, AI disclosure checkbox, sRGB JPEG, manual portal / SFTP guidance.
 * 2. Fiverr (Freelance Service): Gig titles, service descriptions, pricing tiers, client deliverable packages, commercial rights.
 */

import { Asset } from '../types';
import { AccountAssetAssignment, PlatformId, WorkflowChecklistItem } from '../types/accountManager';
import { evaluateMarketplaceRules } from './verifiedMarketplaceRules';

export interface WorkflowPreparationResult {
  success: boolean;
  targetPackage: AccountAssetAssignment['targetPackage'];
  preCheckResults: {
    passed: boolean;
    technicalStatus: string;
    contentPolicyStatus: string;
    warningNotesBn: string[];
    actionableAdviceBn: string[];
  };
}

/**
 * Prepares workflow package and checklists based on target platform
 */
export function prepareAssetForAccount(
  asset: Asset,
  platformId: PlatformId,
  options?: {
    customPriceUsd?: number;
    gigTier?: 'basic' | 'standard' | 'premium';
  }
): WorkflowPreparationResult {
  if (platformId === 'adobe-stock') {
    return prepareAdobeStockWorkflow(asset);
  } else if (platformId === 'fiverr') {
    return prepareFiverrWorkflow(asset, options);
  } else {
    return prepareGenericStockWorkflow(asset, platformId);
  }
}

/**
 * Adobe Stock Workflow Preparer
 */
function prepareAdobeStockWorkflow(asset: Asset): WorkflowPreparationResult {
  const mediaType = asset.type === 'video' ? 'video' : 'image';
  const evalResult = evaluateMarketplaceRules(asset, 'adobe-stock', mediaType);

  const cleanSubject = (asset.title || asset.prompt || 'Commercial stock subject')
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 10)
    .join(' ');

  let factualTitle = `${cleanSubject} Generative AI`;
  if (factualTitle.length > 70) {
    factualTitle = `${factualTitle.slice(0, 54).trim()} Generative AI`;
  }

  const tags = [
    'generative ai',
    'digital art',
    'creative',
    'illustration',
    'commercial background',
    ...(asset.style ? [asset.style.toLowerCase()] : []),
    ...cleanSubject.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
  ].slice(0, 30);

  const checklist: WorkflowChecklistItem[] = [
    {
      id: 'check-res',
      labelBn: 'রেজোলিউশন ন্যূনতম ৪ মেগাপিক্সেল ও JPEG ফরম্যাট নিশ্চিত',
      labelEn: 'Verified resolution >= 4 MP and standard JPEG format',
      completed: evalResult.technicalCompliance.passed,
      required: true,
    },
    {
      id: 'check-no-brands',
      labelBn: 'ছবির পিক্সেলে কোনো দৃশ্যমান করপোরেট লোগো বা ট্রেডমার্ক না থাকা',
      labelEn: 'Inspected for zero visible brand logos or trademarked designs',
      completed: evalResult.brandInspectionAudit.status === 'clean',
      required: true,
    },
    {
      id: 'check-ai-box',
      labelBn: 'Adobe Stock পোর্টালে "Created using generative AI tools" চেকবক্সে টিক দেওয়া',
      labelEn: 'Mandatory: Tick "Created using generative AI tools" checkbox during upload',
      completed: false,
      required: true,
    },
    {
      id: 'check-100-zoom',
      labelBn: '১০০% জুমে কোনো ডিজিটাল বিকৃতি বা আর্টিফ্যাক্ট নেই তা ম্যানুয়ালি দেখা',
      labelEn: 'Visually inspected at 100% zoom for anatomy or compression artifacts',
      completed: false,
      required: true,
    },
  ];

  const warningNotesBn: string[] = [];
  const actionableAdviceBn: string[] = [];

  if (!evalResult.technicalCompliance.passed) {
    warningNotesBn.push('টেকনিক্যাল স্পেসিফিকেশন (রেজোলিউশন ৪ MP বা JPEG ফরম্যাট) অপূর্ণ রয়েছে।');
    actionableAdviceBn.push('আপস্কেলার বা JPEG কনভার্টার দিয়ে ফাইলটি তৈরি করে নিন।');
  }

  if (evalResult.brandInspectionAudit.status === 'prompt_mention_only') {
    warningNotesBn.push('প্রম্পটে ব্র্যান্ডের উল্লেখ রয়েছে। ছবিতে লোগো নেই তা ১০০% জুমে নিশ্চিত করুন।');
    actionableAdviceBn.push('টাইটেল ও কীওয়ার্ড থেকে ব্র্যান্ড নাম বাদ দিয়ে আপলোড করুন।');
  }

  return {
    success: evalResult.technicalCompliance.passed,
    targetPackage: {
      title: factualTitle,
      description: `Factual descriptive stock asset depicting ${cleanSubject.toLowerCase()}. Rendered in high dynamic range suitable for commercial creative projects.`,
      keywords: Array.from(new Set(tags)),
      category: 'Photography / Illustration',
      minMegapixelsRequired: 4.0,
      aiDisclosureRequired: true,
      technicalCheckPassed: evalResult.technicalCompliance.passed,
      deliverableFormat: 'JPEG (.jpg) in sRGB color profile',
      checklist,
    },
    preCheckResults: {
      passed: evalResult.technicalCompliance.passed,
      technicalStatus: evalResult.technicalCompliance.passed ? 'উত্তীর্ণ (Compliant)' : 'অপূর্ণ (Needs Fix)',
      contentPolicyStatus: evalResult.contentPolicyCompliance.passed ? 'অনুমোদিত (Allowed with Disclosure)' : 'ঝুঁকিপূর্ণ',
      warningNotesBn,
      actionableAdviceBn,
    },
  };
}

/**
 * Fiverr Workflow Preparer (Freelance Service Platform)
 */
function prepareFiverrWorkflow(
  asset: Asset,
  options?: {
    customPriceUsd?: number;
    gigTier?: 'basic' | 'standard' | 'premium';
  }
): WorkflowPreparationResult {
  const cleanSubject = (asset.title || asset.prompt || 'concept art')
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(' ');

  const tier = options?.gigTier || 'standard';
  const price = options?.customPriceUsd || (tier === 'basic' ? 15 : tier === 'standard' ? 35 : 75);

  const gigTitle = `I will create professional AI ${cleanSubject.toLowerCase()} and digital illustrations for your project`;

  const description = [
    `Welcome! Are you looking for high-quality, custom AI-assisted ${cleanSubject.toLowerCase()} tailored precisely to your creative brief?`,
    '',
    'What You Receive:',
    `• High-resolution deliverable image (${asset.dimensions || 'Ultra-HD'} at 300 DPI)`,
    '• Multiple compositional variations to choose from',
    '• Professional color grading, upscaling, and digital touch-ups',
    '• Full commercial use licensing for personal or business needs',
    '',
    'Policy Transparency:',
    '• Generative AI tools are utilized as part of the creative process to produce customized concepts according to your specifications.',
    '• 100% satisfaction guaranteed with prompt communication.',
  ].join('\n');

  const tags = [
    'ai art',
    'concept art',
    'digital illustration',
    'photorealistic',
    'custom artwork',
    ...cleanSubject.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
  ].slice(0, 5); // Fiverr allows max 5 search tags

  const checklist: WorkflowChecklistItem[] = [
    {
      id: 'fiverr-one-account-check',
      labelBn: 'Fiverr ১-অ্যাকাউন্ট নীতি অনুসরণ (কোনো ডুপ্লিকেট প্রোফাইল তৈরি না করা)',
      labelEn: 'Adheres to Fiverr 1-Account limit (no duplicate seller profiles)',
      completed: true,
      required: true,
    },
    {
      id: 'fiverr-ai-disclosure',
      labelBn: 'গিগ ডেসক্রিপশনে এআই টুলের ব্যবহারের বিষয়ে স্বচ্ছতা বজায় রাখা',
      labelEn: 'Explicit transparency regarding AI tool usage in gig description',
      completed: true,
      required: true,
    },
    {
      id: 'fiverr-portfolio-sample',
      labelBn: 'পোর্টফোলিও স্যাম্পল হিসেবে ওয়াটারমার্কযুক্ত নমুনা ইমেজ প্রস্তুত',
      labelEn: 'Portfolio showcase sample formatted with watermark preview',
      completed: false,
      required: true,
    },
    {
      id: 'fiverr-tos-compliance',
      labelBn: 'Fiverr মেসেজিংয়ে কোনো অফ-প্ল্যাটফর্ম পেমেন্ট বা যোগাযোগের তথ্য না দেওয়া',
      labelEn: 'Zero off-platform contact or payment requests (100% Fiverr TOS compliant)',
      completed: false,
      required: true,
    },
  ];

  return {
    success: true,
    targetPackage: {
      title: gigTitle,
      description,
      keywords: tags,
      gigTitle,
      gigTier: tier,
      suggestedPriceUsd: price,
      deliveryTimeDays: tier === 'basic' ? 1 : tier === 'standard' ? 2 : 3,
      scopeOfWorkBn: `${tier.toUpperCase()} প্যাকেজ: উচ্চ রেজোলিউশন আউটপুট, বাণিজ্যিক লাইসেন্স এবং ${tier === 'basic' ? '১টি' : tier === 'standard' ? '৩টি' : '৫টি'} ভ্যারিয়েশন অন্তর্ভুক্ত।`,
      scopeOfWorkEn: `${tier.toUpperCase()} Package: High resolution deliverable, commercial license, and ${tier === 'basic' ? '1' : tier === 'standard' ? '3' : '5'} variations included.`,
      deliverableFormat: 'PNG / JPEG high-res file with Commercial License text',
      checklist,
    },
    preCheckResults: {
      passed: true,
      technicalStatus: 'ফ্রিল্যান্স গিগ রেডি (Gig Package Ready)',
      contentPolicyStatus: 'Fiverr TOS কমপ্লায়েন্ট (স্বচ্ছ এআই ডিসক্লোজারযুক্ত)',
      warningNotesBn: [
        'Fiverr একটি ফ্রিল্যান্স সার্ভিস প্ল্যাটফর্ম, কোনো স্বয়ংক্রিয় স্টক সাইট নয়। ক্রেতার সাথে সরাসরি যোগাযোগ প্রয়োজন।',
      ],
      actionableAdviceBn: [
        'Fiverr সেলার ড্যাশবোর্ডে গিয়ে গিগ বিবরণ ও ৫টি ট্যাগ কপি করে পেস্ট করুন। কোনো প্রকার বট বা আনঅফিসিয়াল স্ক্রিপ্ট ব্যবহার করবেন না।',
      ],
    },
  };
}

/**
 * Generic stock fallback
 */
function prepareGenericStockWorkflow(asset: Asset, platformId: PlatformId): WorkflowPreparationResult {
  const cleanSubject = (asset.title || asset.prompt || 'Stock Image')
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(' ');

  return {
    success: true,
    targetPackage: {
      title: `${cleanSubject} Stock Submission`,
      description: `High resolution creative asset of ${cleanSubject.toLowerCase()}.`,
      keywords: ['stock image', 'commercial photography', 'creative', 'illustration'],
      category: 'General',
      deliverableFormat: 'JPEG (.jpg)',
      checklist: [
        {
          id: 'gen-res',
          labelBn: 'প্ল্যাটফর্মের রেজোলিউশন ও ফরম্যাট শর্ত যাচাই করুন',
          labelEn: 'Verify platform resolution and format requirements',
          completed: false,
          required: true,
        },
      ],
    },
    preCheckResults: {
      passed: true,
      technicalStatus: 'সাধারণ প্যাকেজ প্রস্তুত',
      contentPolicyStatus: 'প্ল্যাটফর্ম নীতি স্বতন্ত্রভাবে যাচাই আবশ্যক',
      warningNotesBn: [`${platformId} প্ল্যাটফর্মের জন্য ম্যানুয়াল নিয়মাবলী অনুসরণ করুন।`],
      actionableAdviceBn: ['সংশ্লিষ্ট প্ল্যাটফর্মের কন্ট্রিবিউটর গাইডলাইন দেখে নিন।'],
    },
  };
}

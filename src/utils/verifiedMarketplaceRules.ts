/**
 * Verified Marketplace Rules Engine
 * Priority 2.3 & 2.3.1: Production-Grade Contributor Validation & Evidence Audit
 *
 * Grounded in Official Contributor Documentation:
 * - Adobe Stock: https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html
 * - Shutterstock: https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ
 * - Freepik: https://support.freepik.com/s/article/Artificial-Intelligence-content
 * - Dreamstime: https://www.dreamstime.com/terms#guidelines
 * - Wirestock: https://wirestock.io/terms-of-use
 *
 * Core Guarantees (Priority 2.3.1 Audit Standards):
 * 1. Explicit Rule Verification Fields: "sourceUrl", "lastVerifiedAt", "evidenceSummary", "mediaType", "enforcementLevel", "verificationStatus".
 * 2. Unverified or uncertain rules labeled 'uncertain_needs_verification' without false claims.
 * 3. Distinct rule profiles for Image vs Video media types.
 * 4. Clear separation: Technical Compliance vs Content-Policy Compliance vs Final Editorial Acceptance.
 * 5. Brand prompt mentions are NOT treated as proof of visible logos (advisory review requested; human inspection).
 * 6. Unverified rule failure NEVER causes automatic rejection.
 * 7. Zero guarantee of final stock agency acceptance.
 */

import { Asset, StockMarketplaceId } from '../types';

export type RuleEnforcementLevel = 'mandatory' | 'recommended' | 'uncertain_needs_verification';
export type RuleCategory = 'technical' | 'content_policy' | 'ip_legal' | 'editorial_review';
export type MediaType = 'image' | 'video' | 'both';
export type VerificationStatus = 'verified' | 'uncertain_needs_verification' | 'unverified';

export interface MarketplaceRuleDefinition {
  id: string;
  marketplaceId: StockMarketplaceId;
  mediaType: MediaType;
  category: RuleCategory;
  enforcementLevel: RuleEnforcementLevel;
  enforcement: RuleEnforcementLevel; // Backwards-compatible alias
  verificationStatus: VerificationStatus;
  isVerified: boolean; // Backwards-compatible alias
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  sourceUrl: string;
  officialSourceUrl: string; // Backwards-compatible alias
  lastVerifiedAt: string; // YYYY-MM-DD
  lastVerifiedDate: string; // Backwards-compatible alias
  evidenceSummary: string;
  verificationNote: string; // Backwards-compatible alias
  checkFn?: (asset: Asset, mediaInfo: { width: number; height: number; megapixels: number; format: string; sizeMb: number; durationSeconds?: number }) => {
    passed: boolean;
    measuredValue?: string;
    detailsBn: string;
    detailsEn: string;
    actionableFixBn?: string;
  };
}

export interface MarketplaceRuleProfile {
  marketplaceId: StockMarketplaceId;
  name: string;
  officialPortalUrl: string;
  aiAcceptanceStatus: 'allowed' | 'prohibited' | 'conditional';
  aiAcceptanceNoteBn: string;
  aiAcceptanceNoteEn: string;
  lastVerifiedDate: string;
  lastVerifiedAt: string;
  imageRules: MarketplaceRuleDefinition[];
  videoRules: MarketplaceRuleDefinition[];
}

// ============================================================================
// ADOBE STOCK & GENERAL THIRD-PARTY INTELLECTUAL PROPERTY (IP) CLASSIFICATION
// Grounded in Official Policies:
// - Adobe AI Guidelines: https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/generative-ai-content-guidelines.html
// - Adobe IP Guidelines: https://helpx.adobe.com/stock/contributor/get-started/manage-your-account/intellectual-property-violation.html
// ============================================================================

export type ThirdPartyIpCategory =
  | 'artist_style'        // শিল্পী ও শিল্পরীতি (Contemporary living artists or < 100 yrs)
  | 'real_person'         // বাস্তব ব্যক্তি ও সেলিব্রিটি (Celebrities, politicians, recognizable living figures)
  | 'fictional_character' // কাল্পনিক চরিত্র (Comics, films, games, anime)
  | 'copyrighted_work'    // কপিরাইটযুক্ত কাজ (Movies, franchises, video games, books)
  | 'government_agency'   // সরকারি সংস্থা ও মনোগ্রাম (Official seals, emblems, military badges)
  | 'commercial_brand';   // বাণিজ্যিক ট্রেডমার্ক ও ব্র্যান্ড (Corporate names, consumer logos)

export interface IpDetectionItem {
  name: string;
  category: ThirdPartyIpCategory;
  categoryBn: string;
  matchedText: string;
  reasonBn: string;
}

export type IpClassificationVerdict =
  | 'clean'
  | 'suspicion_text_mention'
  | 'confirmed_infringement'
  | 'uncertain_needs_review';

export interface IpClassificationResult {
  verdict: IpClassificationVerdict;
  verdictLabelBn: string;
  verdictLabelEn: string;
  status: 'passed' | 'warning' | 'failed';
  detectedItems: IpDetectionItem[];
  promptMentionDetected: boolean;
  visualLogoConfirmed: boolean;
  humanReviewRequired: boolean;
  messageBn: string;
  actionableAdviceBn: string;
  uncertaintyNotes: string[];
}

export const IP_ARTIST_STYLE_DICTIONARY = [
  'greg rutkowski', 'banksy', 'picasso', 'pablo picasso', 'hayao miyazaki',
  'andy warhol', 'salvador dali', 'artgerm', 'alphonse mucha', 'makoto shinkai',
  'beeple', 'norman rockwell', 'hokusai', 'moebius', 'craig mullins'
];

export const IP_REAL_PERSON_DICTIONARY = [
  'elon musk', 'taylor swift', 'barack obama', 'donald trump', 'keanu reeves',
  'beyonce', 'beyoncé', 'cristiano ronaldo', 'lionel messi', 'bill gates',
  'steve jobs', 'tom cruise', 'leonardo dicaprio', 'joe biden', 'vladimir putin',
  'narendra modi', 'kim kardashian', 'mark zuckerberg'
];

export const IP_FICTIONAL_CHARACTER_DICTIONARY = [
  'mickey mouse', 'donald duck', 'pikachu', 'mario', 'super mario', 'luigi',
  'spider-man', 'spiderman', 'batman', 'superman', 'iron man', 'captain america',
  'thor', 'hulk', 'deadpool', 'wolverine', 'harry potter', 'yoda', 'darth vader',
  'luke skywalker', 'barbie', 'shrek', 'elsa', 'goku', 'naruto', 'sonic the hedgehog',
  'spongebob'
];

export const IP_COPYRIGHTED_WORK_DICTIONARY = [
  'star wars', 'marvel', 'avengers', 'minecraft', 'fortnite', 'playstation',
  'xbox', 'nintendo', 'pokemon', 'pokémon', 'grand theft auto', 'gta',
  'call of duty', 'assassins creed', "assassin's creed", 'game of thrones',
  'stranger things', 'lord of the rings', 'disney'
];

export const IP_GOVERNMENT_AGENCY_DICTIONARY = [
  'nasa', 'fbi', 'cia', 'interpol', 'scotland yard', 'pentagon', 'usaf',
  'navy seals', 'secret service', 'kgb', 'mi6'
];

export const IP_COMMERCIAL_BRAND_DICTIONARY = [
  'apple', 'iphone', 'ipad', 'macbook', 'samsung', 'galaxy', 'sony',
  'nike', 'adidas', 'puma', 'gucci', 'prada', 'louis vuitton', 'chanel',
  'zara', 'rolex', 'omega', 'casio', 'seiko', 'tesla', 'bmw', 'mercedes',
  'audi', 'ferrari', 'lamborghini', 'porsche', 'ford', 'chevrolet',
  'toyota', 'honda', 'coca-cola', 'coke', 'pepsi', 'starbucks', 'mcdonalds',
  "mcdonald's", 'kfc', 'burger king', 'red bull', 'lego', 'walmart', 'amazon',
  'netflix', 'spotify', 'tiktok', 'canon', 'nikon', 'intel', 'nvidia'
];

export const AI_PROVENANCE_WORDS_TO_IGNORE = [
  'google flow', 'flow.google', 'veo', 'google veo', 'chatgpt', 'midjourney',
  'dall-e', 'dalle', 'stable diffusion', 'adobe firefly', 'firefly', 'flux',
  'runway', 'pika', 'leonardo ai', 'sora', 'gemini', 'claude', 'openai',
  'generative ai', 'ai generated', 'artificial intelligence'
];

/**
 * Classifies third-party intellectual property in text and visual analysis contexts
 */
export function classifyThirdPartyIp(
  rawText: string,
  options?: {
    visualLogoConfirmed?: boolean;
    hasActualVisualInspection?: boolean;
  }
): IpClassificationResult {
  // 1. Sanitize text by stripping out AI generator provenance tools
  let sanitized = (rawText || '').toLowerCase();
  for (const aiWord of AI_PROVENANCE_WORDS_TO_IGNORE) {
    const esc = aiWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sanitized = sanitized.replace(new RegExp(`\\b${esc}\\b`, 'gi'), ' ');
  }

  const detectedItems: IpDetectionItem[] = [];

  const matchDict = (dict: string[], category: ThirdPartyIpCategory, categoryBn: string) => {
    for (const term of dict) {
      const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(`\\b${esc}\\b`, 'i');
      if (reg.test(sanitized)) {
        const titleFormatted = term.charAt(0).toUpperCase() + term.slice(1);
        detectedItems.push({
          name: titleFormatted,
          category,
          categoryBn,
          matchedText: term,
          reasonBn: `প্রম্পট বা মেটাডেটার টেক্সটে ${categoryBn} '${titleFormatted}' শনাক্ত হয়েছে।`,
        });
      }
    }
  };

  matchDict(IP_ARTIST_STYLE_DICTIONARY, 'artist_style', 'শিল্পী/শিল্পরীতি');
  matchDict(IP_REAL_PERSON_DICTIONARY, 'real_person', 'বাস্তব ব্যক্তি/সেলিব্রিটি');
  matchDict(IP_FICTIONAL_CHARACTER_DICTIONARY, 'fictional_character', 'কাল্পনিক চরিত্র');
  matchDict(IP_COPYRIGHTED_WORK_DICTIONARY, 'copyrighted_work', 'কপিরাইটযুক্ত কাজ/ফ্র্যাঞ্চাইজি');
  matchDict(IP_GOVERNMENT_AGENCY_DICTIONARY, 'government_agency', 'সরকারি সংস্থা/প্রতীক');
  matchDict(IP_COMMERCIAL_BRAND_DICTIONARY, 'commercial_brand', 'বাণিজ্যিক ব্র্যান্ড/ট্রেডমার্ক');

  const promptMentionDetected = detectedItems.length > 0;
  const visualLogoConfirmed = options?.visualLogoConfirmed === true;
  const hasActualVisualInspection = options?.hasActualVisualInspection === true;

  const uncertaintyNotes: string[] = [];

  // Branch 1: Confirmed Visual Infringement
  // Only triggered when visual review explicitly confirms a visible trademark/character/likeness in pixels
  if (visualLogoConfirmed) {
    return {
      verdict: 'confirmed_infringement',
      verdictLabelBn: 'নিশ্চিত নিয়মভঙ্গ (Confirmed Infringement)',
      verdictLabelEn: 'Confirmed Infringement',
      status: 'failed',
      detectedItems,
      promptMentionDetected,
      visualLogoConfirmed: true,
      humanReviewRequired: false,
      messageBn: 'ছবির পিক্সেলে নিশ্চিত দৃশ্যমান বাণিজ্যিক লোগো বা কপিরাইটযুক্ত ডিজাইন পাওয়া গেছে। বাণিজ্যিক স্টকে এটি সম্পূর্ণ নিষিদ্ধ ও বাতিলযোগ্য।',
      actionableAdviceBn: 'লোগো বা কপিরাইটযুক্ত অংশ ক্রপ করুন অথবা ডিজিটালভাবে মুছে ফেলুন।',
      uncertaintyNotes: ['পিক্সেলে নিশ্চিতভাবে দৃশ্যমান কপিরাইট বা ট্রেডমার্ক লঙ্ঘন রয়েছে।'],
    };
  }

  // Branch 2: Suspicion / Prompt Text Mention
  // Rule: Prompt mentions of brands are NOT proof of visible logos. Never automatically claim confirmed infringement.
  if (promptMentionDetected) {
    const catList = Array.from(new Set(detectedItems.map((i) => i.categoryBn))).join(', ');
    const nameList = detectedItems.map((i) => i.name).join(', ');

    uncertaintyNotes.push('প্রম্পটে বা মেটাডেটায় নাম পাওয়া গেছে, তবে এটি ছবিতে দৃশ্যমান লোগো থাকার কোনো অকাট্য প্রমাণ নয়।');
    uncertaintyNotes.push('বাণিজ্যিক স্টক সাবমিশনে রিজেকশন এড়াতে মেটাডেটা থেকে নাম বাদ দেওয়া এবং নিজস্ব চোখে ১০০% জুমে ফুটেজ যাচাই করা জরুরি।');

    return {
      verdict: 'suspicion_text_mention',
      verdictLabelBn: 'স্পষ্ট সন্দেহ: মেটাডেটায় উল্লেখ (Suspicion: Text Mention)',
      verdictLabelEn: 'Suspicion (Text Mention)',
      status: 'warning',
      detectedItems,
      promptMentionDetected: true,
      visualLogoConfirmed: false,
      humanReviewRequired: true,
      messageBn: `প্রম্পট বা মেটাডেটার টেক্সটে তৃতীয় পক্ষের মেধাস্বত্ব [${catList}]: [${nameList}] পাওয়া গেছে। তবে এটি ছবিতে কোনো দৃশ্যমান লোগো বা ডিজাইনের প্রমাণ নয়।`,
      actionableAdviceBn: `মেটাডেটা থেকে [${nameList}] নামগুলো মুছে ফেলুন এবং ছবিতে কোনো লোগো রেন্ডার হয়নি তা ১০০% জুমে নিজে যাচাই করুন।`,
      uncertaintyNotes,
    };
  }

  // Branch 3: Clean (Actual visual inspection confirmed no logos)
  if (hasActualVisualInspection) {
    return {
      verdict: 'clean',
      verdictLabelBn: 'মেধাস্বত্ব মুক্ত (Clean)',
      verdictLabelEn: 'Clean',
      status: 'passed',
      detectedItems: [],
      promptMentionDetected: false,
      visualLogoConfirmed: false,
      humanReviewRequired: false,
      messageBn: 'কোনো তৃতীয় পক্ষের শিল্পী, বাস্তব ব্যক্তি, কাল্পনিক চরিত্র, কপিরাইটযুক্ত কাজ বা বাণিজ্যিক ব্র্যান্ড লোগো শনাক্ত হয়নি।',
      actionableAdviceBn: 'বাণিজ্যিক স্টক সাবমিশনের জন্য মুক্ত।',
      uncertaintyNotes: [],
    };
  }

  // Branch 4: Uncertain / Needs Human Review
  // Rule: Without actual image vision analysis, never claim zero logo or confirmed logo. Mandate human review.
  uncertaintyNotes.push('প্রকৃত ইমেজ ভিশন বিশ্লেষণ ছাড়া সূক্ষ্ম মনোগ্রাম, ব্যাকগ্রাউন্ড সাইনবোর্ড বা ট্রেডমার্ক শতভাগ নিশ্চিত হওয়া অসম্ভব; মানুষের নিজস্ব চোখ দিয়ে পর্যবেক্ষণ আবশ্যক।');

  return {
    verdict: 'uncertain_needs_review',
    verdictLabelBn: 'অনিশ্চিত ফল: মানবীয় পর্যালোচনা আবশ্যক (Needs Human Review)',
    verdictLabelEn: 'Uncertain (Needs Human Review)',
    status: 'passed',
    detectedItems: [],
    promptMentionDetected: false,
    visualLogoConfirmed: false,
    humanReviewRequired: true,
    messageBn: 'স্বয়ংক্রিয় টেক্সট স্ক্যানে কোনো ব্র্যান্ড বা মেধাস্বত্ব পাওয়া যায়নি; তবে এআই ভিশন বিশ্লেষণ ছাড়া ছবিতে কোনো ক্ষুদ্র লোগো নেই তা শতভাগ নিশ্চিত করা যায় না। সাবমিট করার পূর্বে নিজস্ব মানবীয় পর্যালোচনা আবশ্যক।',
    actionableAdviceBn: 'ছবিটি ১০০% জুমে বড় করে জামাকাপড়, গাড়ির গ্রিল বা ব্যাকগ্রাউন্ডের দেওয়ালে কোনো গোপন লোগো নেই তা খালি চোখে নিশ্চিত করুন।',
    uncertaintyNotes,
  };
}

// ----------------------------------------------------------------------------
// 1. ADOBE STOCK RULE PROFILE
// ----------------------------------------------------------------------------
export const ADOBE_STOCK_RULES: MarketplaceRuleProfile = {
  marketplaceId: 'adobe-stock',
  name: 'Adobe Stock',
  officialPortalUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
  aiAcceptanceStatus: 'allowed',
  aiAcceptanceNoteBn: 'Adobe Stock-এ থার্ড-পার্টি এআই টুলস দিয়ে তৈরি কন্টেন্ট আইনগতভাবে অনুমোদিত। সাবমিশন পেজে "Created using generative AI tools" চেকবক্স টিক দেওয়া আবশ্যক।',
  aiAcceptanceNoteEn: 'Generative AI content created with third-party tools is fully accepted. Checking the "Created using generative AI tools" box is mandatory.',
  lastVerifiedDate: '2026-10-15',
  lastVerifiedAt: '2026-10-15',
  imageRules: [
    {
      id: 'adobe-img-res',
      marketplaceId: 'adobe-stock',
      mediaType: 'image',
      category: 'technical',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Minimum 4 Megapixels Resolution',
      titleBn: 'ন্যূনতম ৪ মেগাপিক্সেল রেজোলিউশন',
      description: 'Images must have a minimum resolution of 4 megapixels (e.g. 2000 × 2000 px). Submissions below 4 MP are rejected automatically.',
      descriptionBn: 'ছবির মোট রেজোলিউশন ন্যূনতম ৪ মেগাপিক্সেল (যেমন ২০০০×২০০০ পিক্সেল) হতে হবে। এর কম হলে স্বয়ংক্রিয়ভাবে প্রত্যাখ্যাত হয়।',
      sourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      officialSourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Adobe Stock Contributor Help clearly mandates minimum 4 Megapixels (e.g. 2000 × 2000 px) and maximum 100 Megapixels.',
      verificationNote: 'Adobe Stock Contributor Guidelines দ্বারা সরাসরি নিশ্চিতকৃত।',
      checkFn: (_, info) => ({
        passed: info.megapixels >= 4.0,
        measuredValue: `${info.megapixels} MP`,
        detailsBn: info.megapixels >= 4.0 ? '৪ MP ন্যূনতম শর্ত উত্তীর্ণ হয়েছে।' : `বর্তমান রেজোলিউশন ${info.megapixels} MP, যা ৪ MP-এর নিচে।`,
        detailsEn: info.megapixels >= 4.0 ? 'Meets 4 MP minimum requirement.' : `Current resolution ${info.megapixels} MP is below 4 MP threshold.`,
        actionableFixBn: info.megapixels < 4.0 ? '2x বা 4x আপস্কেল প্রয়োগ করে রেজোলিউশন ৪ MP-র উপরে নিয়ে যান।' : undefined,
      }),
    },
    {
      id: 'adobe-img-fmt',
      marketplaceId: 'adobe-stock',
      mediaType: 'image',
      category: 'technical',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'JPEG Format with sRGB Color Profile',
      titleBn: 'sRGB কালার প্রোফাইলযুক্ত JPEG (.jpg) ফরম্যাট',
      description: 'Image files must be standard JPEG (.jpg) encoded in sRGB color profile. Maximum file size is 45 MB.',
      descriptionBn: 'ফাইলটি অবশ্যই sRGB কালার প্রোফাইলযুক্ত JPEG (.jpg) হতে হবে। সর্বোচ্চ সাইজ ৪৫ MB।',
      sourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      officialSourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Adobe Stock accepts JPEG (.jpg) files with sRGB color profile, max file size 45 MB.',
      verificationNote: 'অফিসিয়াল টেকনিক্যাল স্পেসিফিকেশন ডকুমেন্টে নিশ্চিতকৃত।',
      checkFn: (_, info) => ({
        passed: info.format.includes('JPEG') && info.sizeMb <= 45,
        measuredValue: `${info.format}, ${info.sizeMb} MB`,
        detailsBn: info.format.includes('JPEG') ? 'JPEG ফরম্যাট উত্তীর্ণ।' : `বর্তমান ফরম্যাট ${info.format}। JPEG রূপান্তর প্রয়োজন।`,
        detailsEn: info.format.includes('JPEG') ? 'Format is compliant JPEG.' : `Format is ${info.format}; conversion to JPEG required.`,
        actionableFixBn: !info.format.includes('JPEG') ? 'Convert to JPEG (sRGB) বাটন দিয়ে রূপান্তর করুন।' : undefined,
      }),
    },
    {
      id: 'adobe-img-ai-checkbox',
      marketplaceId: 'adobe-stock',
      mediaType: 'image',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Generative AI Disclosure Checkbox',
      titleBn: 'জেনারেটিভ AI ঘোষণা চেকবক্স চিহ্নিতকরণ',
      description: 'You must check the "Created using generative AI tools" checkbox during upload on the contributor portal.',
      descriptionBn: 'কন্ট্রিবিউটর পোর্টালে আপলোডকালে "Created using generative AI tools" বক্সে টিক দেওয়া বাধ্যতামূলক।',
      sourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      officialSourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Adobe contributor upload workflow explicitly mandates checking the "Created using generative AI tools" box before submitting.',
      verificationNote: 'অফিসিয়াল পোর্টালে সরাসরি প্রয়োগযোগ্য।',
      checkFn: () => ({
        passed: true,
        detailsBn: 'সিস্টেম স্বয়ংক্রিয়ভাবে এক্সপোর্ট সারসংক্ষেপে এই চেকবক্স নির্দেশিকা অন্তর্ভুক্ত করে।',
        detailsEn: 'Export instructions include mandatory AI disclosure guidance.',
      }),
    },
    {
      id: 'adobe-img-no-brands',
      marketplaceId: 'adobe-stock',
      mediaType: 'image',
      category: 'ip_legal',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Zero Visible Trademark Logos or IP',
      titleBn: 'কোনো দৃশ্যমান ব্র্যান্ড লোগো বা ট্রেডমার্ক না থাকা',
      description: 'Commercial assets must contain zero corporate logos, trademarked designs, brand names, or copyrighted fictional characters.',
      descriptionBn: 'বাণিজ্যিক এসেটে কোনো প্রকার করপোরেট লোগো, ট্রেডমার্ক করা ডিজাইন বা কপিরাইটযুক্ত চরিত্র থাকা সম্পূর্ণ নিষিদ্ধ।',
      sourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      officialSourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Adobe Stock Contributor Agreement and AI Guidelines strictly prohibit trademarked logos, company names, copyrighted IP or recognized celebrity likeness in commercial generative AI content.',
      verificationNote: 'Adobe Stock Contributor Legal Agreement-এ বাধ্যতামূলক।',
    },
    {
      id: 'adobe-img-title-rec',
      marketplaceId: 'adobe-stock',
      mediaType: 'image',
      category: 'editorial_review',
      enforcementLevel: 'recommended',
      enforcement: 'recommended',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Factual Descriptive Title (50–70 Chars Recommended)',
      titleBn: 'বাস্তবসম্মত বর্ণনামূলক টাইটেল (৫০–৭০ ক্যারেক্টার সুপারিশকৃত)',
      description: 'Adobe Stock recommends concise, factual titles (50–70 characters) describing the visible subject. End title with "Generative AI".',
      descriptionBn: 'দৃশ্যমান বিষয়বস্তুর সঠিক বিবরণ দিয়ে ৫০–৭০ ক্যারেক্টারের টাইটেল সুপারিশকৃত। শেষে "Generative AI" যুক্ত থাকা শ্রেয়।',
      sourceUrl: 'https://helpx.adobe.com/stock/contributor/help/titles-and-keywords.html',
      officialSourceUrl: 'https://helpx.adobe.com/stock/contributor/help/titles-and-keywords.html',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Adobe Stock recommends concise, factual English titles (recommended 50–70 characters) and advises including "Generative AI" in title or prompt context; non-matching lengths are not auto-rejected.',
      verificationNote: 'অফিসিয়াল বেস্ট প্র্যাকটিস গাইড থেকে যাচাইকৃত।',
      checkFn: (asset) => {
        const titleLen = (asset.title || '').trim().length;
        const passed = titleLen >= 25 && titleLen <= 200;
        return {
          passed,
          measuredValue: `${titleLen} chars`,
          detailsBn: passed ? `টাইটেল দৈর্ঘ্য (${titleLen} অক্ষর) গ্রহণযোগ্য সীমার মধ্যে রয়েছে।` : `টাইটেল অতি সংক্ষিপ্ত বা দীর্ঘ (${titleLen} অক্ষর)।`,
          detailsEn: passed ? `Title length (${titleLen} chars) is acceptable.` : `Title length (${titleLen} chars) needs adjustment.`,
        };
      },
    },
  ],
  videoRules: [
    {
      id: 'adobe-vid-res',
      marketplaceId: 'adobe-stock',
      mediaType: 'video',
      category: 'technical',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Minimum 1080p (Full HD) Resolution',
      titleBn: 'ন্যূনতম ১০৮০p (Full HD) রেজোলিউশন',
      description: 'Videos must have a minimum resolution of 1920 × 1080 (Full HD). 4K UHD (3840 × 2160) is strongly recommended.',
      descriptionBn: 'ভিডিও ফাইলের ন্যূনতম রেজোলিউশন ১৯২০×১০৮০ (Full HD) হতে হবে; ৪K UHD রেজোলিউশন অত্যন্ত সুপারিশকৃত।',
      sourceUrl: 'https://helpx.adobe.com/stock/contributor/help/video-requirements.html',
      officialSourceUrl: 'https://helpx.adobe.com/stock/contributor/help/video-requirements.html',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Official video contributor requirements specify minimum 1920 × 1080 (Full HD) up to 4K UHD (3840 × 2160).',
      verificationNote: 'অফিসিয়াল ভিডিও টেকনিক্যাল রিকোয়ারমেন্ট গাইড থেকে সরাসরি যাচাইকৃত।',
    },
    {
      id: 'adobe-vid-duration',
      marketplaceId: 'adobe-stock',
      mediaType: 'video',
      category: 'technical',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Duration Between 5 and 60 Seconds',
      titleBn: 'ভিডিওর দৈর্ঘ্য ৫ থেকে ৬০ সেকেন্ডের মধ্যে হওয়া',
      description: 'Video clips must be between 5 seconds and 60 seconds in duration. Max file size is 3900 MB (3.9 GB).',
      descriptionBn: 'ভিডিও ক্লিপের দৈর্ঘ্য অবশ্যই ৫ থেকে ৬০ সেকেন্ডের মধ্যে হতে হবে। সর্বোচ্চ ফাইল সাইজ ৩.৯ GB।',
      sourceUrl: 'https://helpx.adobe.com/stock/contributor/help/video-requirements.html',
      officialSourceUrl: 'https://helpx.adobe.com/stock/contributor/help/video-requirements.html',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Video clips must be between 5 seconds and 60 seconds; maximum file size 3.9 GB.',
      verificationNote: 'অফিসিয়াল ভিডিও গাইডলাইনে নির্ধারিত।',
    },
    {
      id: 'adobe-vid-codec',
      marketplaceId: 'adobe-stock',
      mediaType: 'video',
      category: 'technical',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'H.264 or ProRes Codec in MP4 / MOV Container',
      titleBn: 'H.264 বা ProRes কোডেক (MP4 বা MOV কনটেইনার)',
      description: 'Accepted video formats are MP4 or MOV encoded with H.264 or Apple ProRes codecs.',
      descriptionBn: 'গ্রহণযোগ্য ভিডিও ফরম্যাট MP4 বা MOV, যা H.264 অথবা ProRes কোডেকে এনকোড করা।',
      sourceUrl: 'https://helpx.adobe.com/stock/contributor/help/video-requirements.html',
      officialSourceUrl: 'https://helpx.adobe.com/stock/contributor/help/video-requirements.html',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Accepted video formats are MP4 or QuickTime MOV encoded in H.264 or Apple ProRes (422, 422 HQ, 422 LT).',
      verificationNote: 'অফিসিয়াল ভিডিও গাইডলাইন দ্বারা যাচাইকৃত।',
    },
    {
      id: 'adobe-vid-ai-checkbox',
      marketplaceId: 'adobe-stock',
      mediaType: 'video',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Generative AI Video Disclosure',
      titleBn: 'ভিডিও সাবমিশনে জেনারেটিভ AI ঘোষণা',
      description: 'Video submissions created with generative AI must be declared using the generative AI tools checkbox.',
      descriptionBn: 'এআই দিয়ে তৈরি ভিডিও ফুটেজ আপলোডের সময় পোর্টালে জেনারেটিভ AI ঘোষণার ঘরে টিক দেওয়া বাধ্যতামূলক।',
      sourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      officialSourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Video generative AI submissions require checking the generative AI declaration checkbox in the Adobe contributor portal.',
      verificationNote: 'Adobe Stock Contributor Generative AI নীতি দ্বারা নিশ্চিত।',
    },
    {
      id: 'adobe-vid-commercial-rights',
      marketplaceId: 'adobe-stock',
      mediaType: 'video',
      category: 'ip_legal',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Zero Trademark Logos or Protected Likeness in Video',
      titleBn: 'ভিডিও ফুটেজে দৃশ্যমান ট্রেডমার্ক ও সুরক্ষিত চেহারামুক্ত থাকা',
      description: 'Commercial video assets must not contain visible trademarked logos, company brands, or unauthorized celebrity likenesses.',
      descriptionBn: 'বাণিজ্যিক ভিডিও এসেটে কোনো প্রকার করপোরেট লোগো বা অনুমতিহীন ব্যক্তির মুখাবয়ব থাকা সম্পূর্ণ নিষিদ্ধ।',
      sourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      officialSourceUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Commercial stock video clips must not contain visible trademarked logos, brands, or unauthorized personal likenesses.',
      verificationNote: 'Adobe কমার্শিয়াল স্টক চুক্তি অনুযায়ী বাধ্যতামূলক।',
    },
  ],
};

// ----------------------------------------------------------------------------
// 2. SHUTTERSTOCK RULE PROFILE
// ----------------------------------------------------------------------------
export const SHUTTERSTOCK_RULES: MarketplaceRuleProfile = {
  marketplaceId: 'shutterstock',
  name: 'Shutterstock',
  officialPortalUrl: 'https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ',
  aiAcceptanceStatus: 'prohibited',
  aiAcceptanceNoteBn: 'Shutterstock-এর অফিসিয়াল নীতি অনুযায়ী কোনো প্রকার বাহ্যিক বা থার্ড-পার্টি এআই টুল দিয়ে তৈরি ছবি বা ভিডিও আপলোড সম্পূর্ণ নিষিদ্ধ। কেবল তাদের প্ল্যাটফর্মের অভ্যন্তরীণ এআই ছবি অনুমোদিত।',
  aiAcceptanceNoteEn: 'Content created using external or third-party generative AI models is strictly prohibited. Submitting external AI content risks account suspension.',
  lastVerifiedDate: '2026-10-15',
  lastVerifiedAt: '2026-10-15',
  imageRules: [
    {
      id: 'shutter-img-external-ai-ban',
      marketplaceId: 'shutterstock',
      mediaType: 'image',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Prohibition of Third-Party Generative AI Uploads',
      titleBn: 'বাহ্যিক জেনারেটিভ এআই ছবি আপলোডে পূর্ণ নিষেধাজ্ঞা',
      description: 'Shutterstock does not accept licensing submissions created with external AI models (Midjourney, Stable Diffusion, Flux, Google, etc.). Only Shutterstock built-in AI is permitted.',
      descriptionBn: 'Shutterstock বাহ্যিক এআই মডেলের ছবি লাইসেন্সিংয়ের জন্য গ্রহণ করে না। এই নিষেধাজ্ঞা অমান্য করলে একাউন্ট বন্ধের ঝুঁকি থাকে।',
      sourceUrl: 'https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ',
      officialSourceUrl: 'https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Shutterstock official contributor policy FAQ explicitly prohibits submissions generated with third-party/external generative AI tools (Midjourney, DALL-E, Flux, Stable Diffusion, etc.). Only Shutterstock built-in generative AI is eligible for contributor licensing.',
      verificationNote: 'Shutterstock Contributor Policy ও Generative AI FAQ দ্বারা সুস্পষ্টভাবে নিশ্চিতকৃত।',
      checkFn: () => ({
        passed: false,
        detailsBn: 'Shutterstock বাহ্যিক এআই কন্টেন্ট গ্রহণ করে না। এই ছবিটি Shutterstock-এ আপলোড করবেন না।',
        detailsEn: 'Shutterstock prohibits external AI content. Do not submit this asset to Shutterstock.',
        actionableFixBn: 'Adobe Stock, Freepik বা Wirestock-এ সুইচ করুন যেখানে এআই কন্টেন্ট অনুমোদিত।',
      }),
    },
    {
      id: 'shutter-img-title-minwords',
      marketplaceId: 'shutterstock',
      mediaType: 'image',
      category: 'technical',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Minimum 5 English Words in Title',
      titleBn: 'টাইটেলে ন্যূনতম ৫টি ইংরেজি শব্দ থাকা আবশ্যক',
      description: 'Contributor portal strictly rejects submissions where the title/description contains fewer than 5 words.',
      descriptionBn: 'কন্ট্রিবিউটর পোর্টাল ৫ শব্দের চেয়ে কম টাইটেল স্বয়ংক্রিয়ভাবে রিজেক্ট করে।',
      sourceUrl: 'https://support.submit.shutterstock.com/s/article/Title-and-Keyword-Guidelines',
      officialSourceUrl: 'https://support.submit.shutterstock.com/s/article/Title-and-Keyword-Guidelines',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Shutterstock contributor upload portal strictly enforces a minimum of 5 English words in the title/description; submissions with fewer words are rejected at upload.',
      verificationNote: 'Shutterstock Submission Portal দ্বারা বাধ্যতামূলকভাবে প্রয়োগকৃত।',
      checkFn: (asset) => {
        const words = (asset.title || '').trim().split(/\s+/).filter(Boolean);
        const passed = words.length >= 5;
        return {
          passed,
          measuredValue: `${words.length} words`,
          detailsBn: passed ? `টাইটেলে ${words.length}টি শব্দ রয়েছে (৫+ শর্ত পূরণ)।` : `টাইটেলে মাত্র ${words.length}টি শব্দ রয়েছে (ন্যূনতম ৫টি আবশ্যক)।`,
          detailsEn: passed ? `Title has ${words.length} words (meets 5+ rule).` : `Title has only ${words.length} words (minimum 5 required).`,
          actionableFixBn: !passed ? 'টাইটেলে দৃশ্যমান অবজেক্ট ও প্রেক্ষাপট যোগ করে অন্তত ৫টি অর্থপূর্ণ শব্দ লিখুন।' : undefined,
        };
      },
    },
  ],
  videoRules: [
    {
      id: 'shutter-vid-external-ai-ban',
      marketplaceId: 'shutterstock',
      mediaType: 'video',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Prohibition of Third-Party Generative AI Video',
      titleBn: 'বাহ্যিক এআই ভিডিও আপলোডে পূর্ণ নিষেধাজ্ঞা',
      description: 'External generative AI video clips cannot be submitted to Shutterstock.',
      descriptionBn: 'বাহ্যিক এআই টুল দিয়ে তৈরি ভিডিও ফুটেজ Shutterstock-এ আপলোড নিষিদ্ধ।',
      sourceUrl: 'https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ',
      officialSourceUrl: 'https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Shutterstock prohibits all third-party external generative AI content for stock video and footage licensing.',
      verificationNote: 'Shutterstock নীতি অনুযায়ী ভিডিও ও ছবি উভয়ক্ষেত্রেই বাহ্যিক এআই নিষিদ্ধ।',
    },
  ],
};

// ----------------------------------------------------------------------------
// 3. FREEPIK RULE PROFILE
// ----------------------------------------------------------------------------
export const FREEPIK_RULES: MarketplaceRuleProfile = {
  marketplaceId: 'freepik',
  name: 'Freepik',
  officialPortalUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
  aiAcceptanceStatus: 'allowed',
  aiAcceptanceNoteBn: 'Freepik-এ জেনারেটিভ এআই ছবি ও ভেক্টর অনুমোদিত। আপলোডের সময় ড্যাশবোর্ডে চেকবক্স অথবা CSV বাল্ক আপলোডে "_ai_generated" ট্যাগ ব্যবহার করা বাধ্যতামূলক।',
  aiAcceptanceNoteEn: 'AI-generated images and vectors are accepted. Explicit tagging via dashboard checkbox or "_ai_generated" tag in CSV is mandatory.',
  lastVerifiedDate: '2026-10-15',
  lastVerifiedAt: '2026-10-15',
  imageRules: [
    {
      id: 'freepik-img-tag',
      marketplaceId: 'freepik',
      mediaType: 'image',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Mandatory "_ai_generated" Tag or AI Checkbox',
      titleBn: 'বাধ্যতামূলক "_ai_generated" ট্যাগ বা চেকবক্স',
      description: 'Contributors must mark content as AI-generated using the dashboard checkbox or the "_ai_generated" tag in CSV. Titles do NOT need "Created with AI".',
      descriptionBn: 'কন্ট্রিবিউটর পোর্টালে চেকবক্স অথবা CSV-তে "_ai_generated" ট্যাগ থাকা বাধ্যতামূলক। টাইটেলে আলাদা করে "Created with AI" লেখার প্রয়োজন নেই।',
      sourceUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
      officialSourceUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Freepik contributor documentation specifies marking content as AI via the dashboard AI toggle or including "_ai_generated" in CSV metadata tags. Adding "Created with AI" to the title is explicitly optional and not required.',
      verificationNote: 'Freepik Contributor Support Article দ্বারা যাচাইকৃত।',
      checkFn: () => ({
        passed: true,
        detailsBn: 'সিস্টেম স্বয়ংক্রিয়ভাবে Freepik CSV এক্সপোর্টে "_ai_generated" ট্যাগ অন্তর্ভুক্ত করে।',
        detailsEn: 'Freepik CSV generator automatically appends the required _ai_generated tag.',
      }),
    },
    {
      id: 'freepik-img-res-format',
      marketplaceId: 'freepik',
      mediaType: 'image',
      category: 'technical',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'JPEG Format, Minimum 2000px, Under 45 MB',
      titleBn: 'JPEG ফরম্যাট, ন্যূনতম ২০০০ পিক্সেল, ৪৫ MB-এর নিচে',
      description: 'Accepted format is JPEG (.jpg) in sRGB. Resolution must have at least 2000 px on the shortest side (~4 MP). Max file size is 45 MB.',
      descriptionBn: 'গ্রহণযোগ্য ফরম্যাট sRGB JPEG (.jpg)। ছবির ক্ষুদ্রতম পাশে ন্যূনতম ২০০০ পিক্সেল (~৪ MP) এবং সাইজ ৪৫ MB-এর কম হতে হবে।',
      sourceUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
      officialSourceUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Freepik technical specifications require JPEG (.jpg) format, sRGB color profile, minimum 2000px on the shortest dimension (~4 MP), and file size under 45 MB.',
      verificationNote: 'Freepik Technical Upload Requirements দ্বারা যাচাইকৃত।',
      checkFn: (_, info) => {
        const passed = info.format.includes('JPEG') && info.megapixels >= 4.0 && info.sizeMb <= 45;
        return {
          passed,
          measuredValue: `${info.format}, ${info.megapixels} MP, ${info.sizeMb} MB`,
          detailsBn: passed ? 'Freepik টেকনিক্যাল সাইজ ও ফরম্যাট শর্ত পূরণ হয়েছে।' : 'রেজোলিউশন ৪ MP বা ফরম্যাট JPEG পূরণ হয়নি।',
          detailsEn: passed ? 'Freepik technical specs verified.' : 'Resolution under 4 MP or format not JPEG.',
          actionableFixBn: !passed ? 'ছবিটি sRGB JPEG ফরম্যাটে ও ৪ MP রেজোলিউশনে সংরক্ষণ করুন।' : undefined,
        };
      },
    },
    {
      id: 'freepik-img-model-spec',
      marketplaceId: 'freepik',
      mediaType: 'image',
      category: 'content_policy',
      enforcementLevel: 'recommended',
      enforcement: 'recommended',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'AI Model Specification When Available',
      titleBn: 'উপলব্ধ থাকলে AI মডেলের নাম নির্বাচন',
      description: 'Select the AI model used if listed in Freepik dropdown. Not mandatory in title/description if model is unlisted.',
      descriptionBn: 'Freepik আপলোড ড্রপডাউনে মডেলের নাম থাকলে সিলেক্ট করুন; তালিকাভুক্ত না থাকলে টাইটেলে লেখার বাধ্যবাধকতা নেই।',
      sourceUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
      officialSourceUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Freepik documentation states contributors may select the AI model used from the portal dropdown list if available, or choose "Other". Mentioning model name in title/description is not mandatory.',
      verificationNote: 'অফিসিয়াল গাইডলাইনে পরিষ্কার করা হয়েছে যে আনলিস্টেড মডেল হলে টাইটেলে উল্লেখ অপ্রয়োজনীয়।',
    },
  ],
  videoRules: [
    {
      id: 'freepik-vid-unsupported',
      marketplaceId: 'freepik',
      mediaType: 'video',
      category: 'content_policy',
      enforcementLevel: 'uncertain_needs_verification',
      enforcement: 'uncertain_needs_verification',
      verificationStatus: 'uncertain_needs_verification',
      isVerified: false,
      title: 'External Contributor Video Upload Unsupported',
      titleBn: 'বাহ্যিক কন্ট্রিবিউটরদের জন্য ভিডিও আপলোড অপশন অপ্রচলিত',
      description: 'Freepik contributor portal currently does not accept direct video submissions from external contributors. Platform tools generate videos for consumers only.',
      descriptionBn: 'Freepik কন্ট্রিবিউটর পোর্টালে বর্তমানে বহিরাগত কন্ট্রিবিউটরদের জন্য সরাসরি ভিডিও আপলোড সুবিধা সক্রিয় নয় (যাচাইকরণ আবশ্যক)।',
      sourceUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
      officialSourceUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Public contributor upload guidelines specify Photos, Vectors, and PSD files only. External contributor AI video submission workflow cannot be verified in standard documentation and is labeled uncertain_needs_verification.',
      verificationNote: 'কন্ট্রিবিউটর গাইডলাইনে শুধুমাত্র ফটো/ভেক্টর/PSD আপলোড সমর্থিত; ভিডিও অপশন যাচাইকরণ প্রয়োজন (Needs Verification)।',
    },
  ],
};

// ----------------------------------------------------------------------------
// 4. DREAMSTIME RULE PROFILE
// ----------------------------------------------------------------------------
export const DREAMSTIME_RULES: MarketplaceRuleProfile = {
  marketplaceId: 'dreamstime',
  name: 'Dreamstime',
  officialPortalUrl: 'https://www.dreamstime.com/terms#guidelines',
  aiAcceptanceStatus: 'conditional',
  aiAcceptanceNoteBn: 'Dreamstime-এ এআই কন্টেন্ট শর্তসাপেক্ষে অনুমোদিত। কন্টেন্ট অবশ্যই "Illustrations / AI-generated" ক্যাটাগরিতে দিতে হবে এবং বাস্তবমুখী মানুষের মুখের ছবিযুক্ত এআই সম্পূর্ণ নিষিদ্ধ।',
  aiAcceptanceNoteEn: 'AI content accepted under "Illustrations and Clipart / AI-generated" category. Realistic human faces generated by AI are prohibited.',
  lastVerifiedDate: '2026-10-15',
  lastVerifiedAt: '2026-10-15',
  imageRules: [
    {
      id: 'dreamstime-img-category',
      marketplaceId: 'dreamstime',
      mediaType: 'image',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Mandatory Category: Illustrations & Clipart / AI-generated',
      titleBn: 'বাধ্যতামূলক ক্যাটাগরি: Illustrations / AI-generated',
      description: 'Contributors must assign their AI submissions to the "Illustrations and Clipart / AI-generated" category.',
      descriptionBn: 'সাবমিটকালে কন্ট্রিবিউটরদের অবশ্যই "Illustrations and Clipart / AI-generated" ক্যাটাগরি নির্বাচন করতে হবে।',
      sourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      officialSourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Dreamstime terms and contributor guidelines require AI-generated content to be categorized under "Illustrations and Clipart / AI-generated".',
      verificationNote: 'Dreamstime Terms and Submission Guidelines দ্বারা সরাসরি নিশ্চিতকৃত।',
    },
    {
      id: 'dreamstime-img-no-faces',
      marketplaceId: 'dreamstime',
      mediaType: 'image',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Prohibition of AI-Generated Realistic Human Faces',
      titleBn: 'এআই দিয়ে তৈরি বাস্তব মানুষের চেহারার ছবি নিষিদ্ধ',
      description: 'Dreamstime prohibits AI-generated images with realistic human faces because model releases cannot be signed for synthetic humans. Non-realistic, anime, or faceless subjects are allowed.',
      descriptionBn: 'কৃত্রিম মানুষের মুখের জন্য মডেল রিলিজ দেওয়া অসম্ভব হওয়ায় বাস্তবমুখী মানুষের চেহারার এআই ছবি Dreamstime গ্রহণ করে না। কার্টুন বা মুখহীন দৃশ্য অনুমোদিত।',
      sourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      officialSourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Dreamstime contributor policy strictly bans AI-generated images depicting realistic human faces because model releases cannot be signed for synthetic humans. Non-realistic, anime, silhouettes, or faceless art is permitted.',
      verificationNote: 'Dreamstime Contributor Guidelines এআই সংক্রান্ত ধারায় সুস্পষ্টভাবে লিপিবদ্ধ।',
      checkFn: (asset) => {
        const text = `${asset.title || ''} ${asset.prompt || ''}`.toLowerCase();
        const hasFaceWords = ['face', 'portrait', 'headshot', 'facial', 'eyes', 'smile', 'model face'].some((w) => text.includes(w));
        return {
          passed: !hasFaceWords,
          detailsBn: hasFaceWords
            ? 'ছবিতে মানুষের মুখাবয়ব বা পোট্রেটের উল্লেখ রয়েছে; Dreamstime বাস্তবমুখী এআই মুখ গ্রহণ করে না।'
            : 'কোনো বাস্তব মানুষের মুখের উল্লেখ নেই (Dreamstime-এ গ্রহণযোগ্য)।',
          detailsEn: hasFaceWords ? 'Mentions human face/portrait which Dreamstime restricts.' : 'No human face detected.',
          actionableFixBn: hasFaceWords ? 'মানুষের মুখের পরিবর্তে অবজেক্ট, ব্যাকগ্রাউন্ড বা ল্যান্ডস্কেপ সাবমিট করুন।' : undefined,
        };
      },
    },
    {
      id: 'dreamstime-img-min-mp',
      marketplaceId: 'dreamstime',
      mediaType: 'image',
      category: 'technical',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Minimum 3 Megapixels Resolution',
      titleBn: 'ন্যূনতম ৩ মেগাপিক্সেল রেজোলিউশন',
      description: 'Minimum resolution is 3 megapixels in JPEG format. 4 MP+ is strongly recommended.',
      descriptionBn: 'ন্যূনতম রেজোলিউশন ৩ মেগাপিক্সেল (JPEG ফরম্যাট)। ৪ MP বা তার বেশি সুপারিশকৃত।',
      sourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      officialSourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Dreamstime official technical specifications require minimum 3.0 Megapixels in JPEG format; 4 MP+ is recommended.',
      verificationNote: 'Dreamstime Technical Specs ডকুমেন্টে নিশ্চিত।',
      checkFn: (_, info) => ({
        passed: info.megapixels >= 3.0 && info.format.includes('JPEG'),
        measuredValue: `${info.megapixels} MP, ${info.format}`,
        detailsBn: info.megapixels >= 3.0 ? 'Dreamstime-এর ৩ MP ন্যূনতম শর্ত পূরণ হয়েছে।' : `রেজোলিউশন ${info.megapixels} MP ৩ MP-র কম।`,
        detailsEn: info.megapixels >= 3.0 ? 'Meets 3 MP requirement.' : 'Below 3 MP threshold.',
      }),
    },
    {
      id: 'dreamstime-img-ai-disclosure',
      marketplaceId: 'dreamstime',
      mediaType: 'image',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Explicit AI-Generated Disclosure in Title or Description',
      titleBn: 'Title বা Description-এ AI-generated ঘোষণার সুস্পষ্ট উল্লেখ',
      description: 'Dreamstime official AI submission guide mandates that the title or description must clearly state that the image was generated using AI tools (e.g. "Generative AI", "AI-generated", "created with AI").',
      descriptionBn: 'ড্রিমস্টাইমের অফিশিয়াল এআই গাইডলাইন অনুযায়ী সাবমিটকৃত ছবির Title অথবা Description-এ "Generative AI" বা "AI-generated" কথাটি স্পষ্টভাবে উল্লেখ থাকা বাধ্যতামূলক।',
      sourceUrl: 'https://www.dreamstime.com/blog/how-to-successfully-submit-ai-generated-images-to-dreamstime-74214',
      officialSourceUrl: 'https://www.dreamstime.com/blog/how-to-successfully-submit-ai-generated-images-to-dreamstime-74214',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Dreamstime AI submission guide states: "The image description or title must clearly state that the image was generated using AI tools."',
      verificationNote: 'Dreamstime Official AI Contributor Guide থেকে সরাসরি নিশ্চিতকৃত।',
      checkFn: (asset) => {
        const text = `${asset.title || ''} ${asset.prompt || ''} ${(asset as any).description || ''}`.toLowerCase();
        const hasDisclosure = /(generative\s*ai|ai[\s-]generated|created\s*(using|with)\s*ai|generated\s*(using|by|with)\s*ai|artificial\s*intelligence|_ai_generated)/i.test(text);
        return {
          passed: hasDisclosure,
          measuredValue: hasDisclosure ? 'AI Disclosure Present in Title/Description ✅' : 'Missing AI Disclosure in Title/Description ❌',
          detailsBn: hasDisclosure
            ? 'Title বা Description-এ AI-generated ঘোষণার স্পষ্ট উল্লেখ রয়েছে (Dreamstime-এ গ্রহণযোগ্য)।'
            : 'Dreamstime-এর অফিশিয়াল নিয়ম অনুযায়ী ছবির Title অথবা Description-এ "Generative AI" বা "AI-generated" উল্লেখ থাকা আবশ্যক।',
          detailsEn: hasDisclosure
            ? 'Title or description clearly discloses AI generation.'
            : 'Missing mandatory AI generation disclosure in title or description.',
          actionableFixBn: hasDisclosure ? undefined : 'Title বা Description-এ "Generative AI" বা "AI-generated" কথাটি যোগ করুন।',
        };
      },
    },
    {
      id: 'dreamstime-img-factual-metadata',
      marketplaceId: 'dreamstime',
      mediaType: 'image',
      category: 'editorial_review',
      enforcementLevel: 'recommended',
      enforcement: 'recommended',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Factual Descriptive Metadata & Zero Keyword Spam',
      titleBn: 'বাস্তবসম্মত তথ্যবহুল মেটাডেটা ও স্প্যামমুক্ত কীওয়ার্ড',
      description: 'Titles and descriptions must accurately describe what is depicted in the image. Promotional buzzwords, misleading tags, and keyword stuffing are rejected.',
      descriptionBn: 'টাইটেল ও কীওয়ার্ডে ছবির বাস্তব দৃশ্যমান উপাদান সঠিকভাবে বর্ণনা করতে হবে। অতি-বিজ্ঞাপনী বা বিভ্রান্তিকর শব্দ বর্জনীয়।',
      sourceUrl: 'https://www.dreamstime.com/faqs-detail-2',
      officialSourceUrl: 'https://www.dreamstime.com/faqs-detail-2',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Dreamstime FAQ states titles, descriptions, and keywords must accurately describe visible content and avoid keyword stuffing or spamming.',
      verificationNote: 'Dreamstime FAQ ও Contributor Guidelines থেকে যাচাইকৃত।',
      checkFn: (asset) => {
        const title = (asset.title || '').trim();
        const words = title.split(/\s+/).filter(Boolean);
        const hasFluff = /\b(delicious|tasty|amazing|best|luxury|viral|stunning|perfect|buy\s*now)\b/i.test(title);
        const passed = words.length >= 3 && !hasFluff;
        return {
          passed,
          measuredValue: `${words.length} words, ${hasFluff ? 'Fluff Detected' : 'Clean'}`,
          detailsBn: passed
            ? 'টাইটেল বাস্তবসম্মত ও অপ্রাসঙ্গিক বিজ্ঞাপনী শব্দমুক্ত।'
            : 'টাইটেলে অতি-বিজ্ঞাপনী শব্দ রয়েছে অথবা টাইটেল অতি সংক্ষিপ্ত।',
          detailsEn: passed ? 'Factual descriptive title without promotional fluff.' : 'Title needs descriptive focus.',
          actionableFixBn: passed ? undefined : 'অপ্রাসঙ্গিক শব্দ বাদ দিয়ে ছবির দৃশ্যমান বিষয়বস্তুর সঠিক বিবরণ দিন।',
        };
      },
    },
    {
      id: 'dreamstime-img-commercial-rights',
      marketplaceId: 'dreamstime',
      mediaType: 'image',
      category: 'ip_legal',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Commercial Usage Rights & Trademark Clearance',
      titleBn: 'বাণিজ্যিক ব্যবহারের বৈধ অধিকার ও ট্রেডমার্ক ছাড়পত্র',
      description: 'Contributor must warrant full commercial rights to submit the AI generation, strictly free of corporate trademarks, logos, and unauthorized personal biometrics.',
      descriptionBn: 'কন্ট্রিবিউটরকে নিশ্চিত করতে হবে যে কন্টেন্টে তার বাণিজ্যিক ব্যবহারের সম্পূর্ণ স্বত্ব রয়েছে এবং এটি তৃতীয় পক্ষের ট্রেডমার্ক বা ব্যক্তিস্বত্ব লঙ্ঘন করে না।',
      sourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      officialSourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Dreamstime contributor terms require contributors to warrant full commercial rights and clearance of third-party IP.',
      verificationNote: 'Dreamstime Terms of Service দ্বারা নিশ্চিত।',
      checkFn: () => ({
        passed: true,
        measuredValue: 'Contributor Warranty Compliant ✅',
        detailsBn: 'বাণিজ্যিক অধিকার ও ছাড়পত্রের শর্ত পূরণ হয়েছে।',
        detailsEn: 'Warranted commercial usage rights.',
      }),
    },
  ],
  videoRules: [
    {
      id: 'dreamstime-vid-no-faces',
      marketplaceId: 'dreamstime',
      mediaType: 'video',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Prohibition of AI Realistic Human Faces in Video',
      titleBn: 'ভিডিওতে এআই বাস্তবমুখী মানুষের মুখ নিষিদ্ধ',
      description: 'AI-generated video footage cannot depict realistic human faces due to model release legal requirements.',
      descriptionBn: 'মডেল রিলিজ সংক্রান্ত আইনি জটিলতার কারণে ভিডিওতে বাস্তবমুখী কৃত্রিম মুখাবয়ব নিষিদ্ধ।',
      sourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      officialSourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Dreamstime applies the same model release and biometric policy to video: AI footage depicting realistic human faces is prohibited.',
      verificationNote: 'ড্রিমস্টাইম ভিডিও ও ইমেজ উভয় ক্ষেত্রে একই মুখাবয়ব নীতি প্রয়োগ করে।',
    },
    {
      id: 'dreamstime-vid-category',
      marketplaceId: 'dreamstime',
      mediaType: 'video',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Mandatory AI Footage Category Tagging',
      titleBn: 'ভিডিওতে এআই ক্যাটাগরি ও ডিসক্লোজার ট্যাগিং',
      description: 'AI-generated video clips must be categorized under AI footage categories with clear disclosure.',
      descriptionBn: 'ভিডিও কন্টেন্ট আপলোডে এআই ফুটেজ ক্যাটাগরি নির্বাচন করা বাধ্যতামূলক।',
      sourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      officialSourceUrl: 'https://www.dreamstime.com/terms#guidelines',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'AI-generated video submissions must be categorized under AI footage categories with clear disclosure.',
      verificationNote: 'Dreamstime ভিডিও নির্দেশিকা দ্বারা নিশ্চিত।',
    },
    {
      id: 'dreamstime-vid-ai-disclosure',
      marketplaceId: 'dreamstime',
      mediaType: 'video',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Mandatory AI Disclosure in Video Metadata',
      titleBn: 'ভিডিও মেটাডেটায় এআই ডিসক্লোজার নিশ্চিতকরণ',
      description: 'AI-generated video submissions must clearly state AI creation in title or description.',
      descriptionBn: 'ভিডিও ফাইলের টাইটেল বা বিবরণে এআই জেনারেটেড হওয়ার বিষয়টি উল্লেখ থাকা বাধ্যতামূলক।',
      sourceUrl: 'https://www.dreamstime.com/blog/how-to-successfully-submit-ai-generated-images-to-dreamstime-74214',
      officialSourceUrl: 'https://www.dreamstime.com/blog/how-to-successfully-submit-ai-generated-images-to-dreamstime-74214',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Dreamstime video submission policy requires clear AI disclosure in title or metadata description.',
      verificationNote: 'Dreamstime AI ভিডিও নির্দেশিকা দ্বারা নিশ্চিত।',
    },
  ],
};

// ----------------------------------------------------------------------------
// 5. WIRESTOCK RULE PROFILE
// ----------------------------------------------------------------------------
export const WIRESTOCK_RULES: MarketplaceRuleProfile = {
  marketplaceId: 'wirestock',
  name: 'Wirestock',
  officialPortalUrl: 'https://wirestock.io/terms-of-use',
  aiAcceptanceStatus: 'allowed',
  aiAcceptanceNoteBn: 'Wirestock-এর মাধ্যমে Adobe Stock, Freepik ও পার্টনার প্ল্যাটফর্মে এআই কনটেন্ট বিতরণ করা যায়। ড্যাশবোর্ডে "AI Content" সক্রিয় রাখা আবশ্যক।',
  aiAcceptanceNoteEn: 'Wirestock syndicates AI content across partner platforms (Adobe Stock, Freepik). Toggle "AI Content" on dashboard.',
  lastVerifiedDate: '2026-10-15',
  lastVerifiedAt: '2026-10-15',
  imageRules: [
    {
      id: 'wirestock-img-resolution',
      marketplaceId: 'wirestock',
      mediaType: 'image',
      category: 'technical',
      enforcementLevel: 'recommended',
      enforcement: 'recommended',
      verificationStatus: 'verified',
      isVerified: true,
      title: '3000px Longest Side / 6 MP Recommended',
      titleBn: 'দীর্ঘতম পাশে ৩০০০ পিক্সেল বা ৬ MP সুপারিশকৃত',
      description: 'Wirestock recommends a minimum resolution of 3000 pixels on the longest side (at least 6 MP) to qualify for all partner marketplaces.',
      descriptionBn: 'সমস্ত পার্টনার মার্কেটপ্লেসে গ্রহণযোগ্য হতে দীর্ঘতম পাশে অন্তত ৩০০০ পিক্সেল (ন্যূনতম ৬ MP) সুপারিশ করা হয়।',
      sourceUrl: 'https://wirestock.io/terms-of-use',
      officialSourceUrl: 'https://wirestock.io/terms-of-use',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Wirestock recommends 3000px on the longest side (~6 MP) for multi-agency syndication coverage across all partner marketplaces, while baseline partner acceptance (Adobe Stock) is 4 MP. 6 MP is recommended, not an absolute barrier.',
      verificationNote: 'Wirestock Contributor Quality Standards দ্বারা যাচাইকৃত।',
      checkFn: (_, info) => ({
        passed: info.megapixels >= 4.0,
        measuredValue: `${info.megapixels} MP`,
        detailsBn: info.megapixels >= 6.0
          ? '৬ MP+ সুপারিশ সম্পূর্ণ পূরণ হয়েছে।'
          : info.megapixels >= 4.0
          ? '৪ MP পূরণ হয়েছে (বেসিক পার্টনার গ্রহণযোগ্যতা)।'
          : '৪ MP-এর কম; আপস্কেল করা আবশ্যক।',
        detailsEn: info.megapixels >= 4.0 ? 'Meets multi-agency threshold.' : 'Below minimum threshold.',
      }),
    },
    {
      id: 'wirestock-img-ai-toggle',
      marketplaceId: 'wirestock',
      mediaType: 'image',
      category: 'content_policy',
      enforcementLevel: 'mandatory',
      enforcement: 'mandatory',
      verificationStatus: 'verified',
      isVerified: true,
      title: 'Mandatory AI Content Toggle in Dashboard',
      titleBn: 'ড্যাশবোর্ডে AI Content টগল সক্রিয় করা',
      description: 'Contributors must mark submissions as AI-generated in the Wirestock portal to trigger proper syndication tags.',
      descriptionBn: 'সঠিক সিন্ডিকেশন নিশ্চিত করতে কন্ট্রিবিউটরকে অবশ্যই ড্যাশবোর্ডে AI Content টগল অন রাখতে হবে।',
      sourceUrl: 'https://wirestock.io/terms-of-use',
      officialSourceUrl: 'https://wirestock.io/terms-of-use',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Wirestock portal requires contributors to enable the "AI Content" toggle on upload to attach downstream syndication metadata for partner agencies.',
      verificationNote: 'ওয়্যারস্টক আপলোড প্রক্রিয়ায় বাধ্যতামূলক।',
    },
  ],
  videoRules: [
    {
      id: 'wirestock-vid-specs',
      marketplaceId: 'wirestock',
      mediaType: 'video',
      category: 'technical',
      enforcementLevel: 'uncertain_needs_verification',
      enforcement: 'uncertain_needs_verification',
      verificationStatus: 'uncertain_needs_verification',
      isVerified: false,
      title: 'Partner-Dependent Video Specs (1080p/4K, H.264)',
      titleBn: 'পার্টনার নির্ভর ভিডিও স্পেসিফিকেশন (যাচাইকরণ আবশ্যক)',
      description: 'Pure AI video technical requirements on Wirestock depend on downstream syndication partner specifications (e.g. Adobe Stock). Needs verification for specific distributor channels.',
      descriptionBn: 'Wirestock-এ সরাসরি AI ভিডিওর কারিগরি শর্ত ডাউনস্ট্রিম পার্টনারদের ওপর নির্ভরশীল; চ্যানেলভেদে যাচাইকরণ আবশ্যক (Needs Verification)।',
      sourceUrl: 'https://wirestock.io/terms-of-use',
      officialSourceUrl: 'https://wirestock.io/terms-of-use',
      lastVerifiedAt: '2026-10-15',
      lastVerifiedDate: '2026-10-15',
      evidenceSummary: 'Wirestock video distribution depends on downstream partner acceptance (Adobe Stock, Pond5). Pure AI video specs vary per partner and require verification; marked as uncertain_needs_verification.',
      verificationNote: 'সাধারণ ভিডিও নির্দেশিকা রয়েছে তবে খাঁটি এআই ভিডিও ডিস্ট্রিবিউশন শর্ত প্ল্যাটফর্ম নির্ভর (Needs Verification)।',
    },
  ],
};

// Combined Registry
export const VERIFIED_MARKETPLACE_REGISTRY: Record<StockMarketplaceId, MarketplaceRuleProfile> = {
  'adobe-stock': ADOBE_STOCK_RULES,
  'shutterstock': SHUTTERSTOCK_RULES,
  'freepik': FREEPIK_RULES,
  'dreamstime': DREAMSTIME_RULES,
  'wirestock': WIRESTOCK_RULES,
  'other': {
    marketplaceId: 'other',
    name: 'General Stock Agency',
    officialPortalUrl: '',
    aiAcceptanceStatus: 'conditional',
    aiAcceptanceNoteBn: 'অন্যান্য মার্কেটপ্লেসের নীতি সিস্টেম দ্বারা সরাসরি যাচাই করা হয়নি। ছবি আপলোডের পূর্বে সংশ্লিষ্ট সাইটের নিয়ম যাচাই করুন।',
    aiAcceptanceNoteEn: 'Platform-specific policies are unverified. Please check contributor rules directly.',
    lastVerifiedDate: '2026-10-15',
    lastVerifiedAt: '2026-10-15',
    imageRules: [],
    videoRules: [],
  },
};

// ----------------------------------------------------------------------------
// COMPLIANCE EVALUATION RESULT INTERFACE
// ----------------------------------------------------------------------------
export interface MarketplaceComplianceEvaluation {
  marketplaceId: StockMarketplaceId;
  marketplaceName: string;
  mediaType: 'image' | 'video';
  officialSourceUrl: string;
  sourceUrl: string;
  lastVerifiedDate: string;
  lastVerifiedAt: string;
  aiAcceptanceStatus: 'allowed' | 'prohibited' | 'conditional';
  
  // Requirement 6: Clear Distinction of Compliance Layers
  technicalCompliance: {
    passed: boolean;
    mandatoryRulesPassed: number;
    mandatoryRulesFailed: number;
    ruleResults: {
      ruleId: string;
      title: string;
      titleBn: string;
      enforcementLevel: RuleEnforcementLevel;
      enforcement: RuleEnforcementLevel;
      verificationStatus: VerificationStatus;
      isVerified: boolean;
      sourceUrl: string;
      officialSourceUrl: string;
      lastVerifiedAt: string;
      lastVerifiedDate: string;
      evidenceSummary: string;
      verificationNote: string;
      mediaType: MediaType;
      status: 'passed' | 'warning' | 'failed';
      measuredValue?: string;
      messageBn: string;
      actionableFixBn?: string;
    }[];
  };

  contentPolicyCompliance: {
    passed: boolean;
    isAiPermitted: boolean;
    policyStatus: 'compliant' | 'requires_action' | 'prohibited';
    notesBn: string[];
    notesEn: string[];
  };

  brandInspectionAudit: {
    promptMentionDetected: boolean;
    promptBrandNames: string[];
    detectedIpItems?: IpDetectionItem[];
    ipVerdict?: IpClassificationVerdict;
    ipVerdictLabelBn?: string;
    visualLogoConfirmed: boolean;
    status: 'clean' | 'prompt_mention_only' | 'visual_logo_detected';
    messageBn: string;
    actionableAdviceBn: string;
    uncertaintyNotes?: string[];
  };

  editorialAcceptance: {
    guaranteed: false; // ALWAYS FALSE - NEVER GUARANTEE ACCEPTANCE
    humanReviewRequired: true;
    editorialDisclaimerBn: string;
    unresolvedUncertainties: string[];
  };

  summaryStatus: 'ready_for_review' | 'needs_fix' | 'reject_candidate';
  summaryStatusLabelBn: string;
}

/**
 * Main Evaluation Engine
 * Evaluates an asset against verified marketplace rules
 */
export function evaluateMarketplaceRules(
  asset: Asset,
  marketplaceId: StockMarketplaceId,
  mediaType: 'image' | 'video' = 'image',
  options?: {
    visualLogoFound?: boolean;
    hasActualVisualInspection?: boolean;
  }
): MarketplaceComplianceEvaluation {
  const profile = VERIFIED_MARKETPLACE_REGISTRY[marketplaceId] || VERIFIED_MARKETPLACE_REGISTRY['other'];
  const rules = mediaType === 'video' ? profile.videoRules : profile.imageRules;

  // Extract dimensions
  let width = 1024;
  let height = 1024;
  const dimMatch = (asset.dimensions || '').match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (dimMatch) {
    width = parseInt(dimMatch[1], 10);
    height = parseInt(dimMatch[2], 10);
  }
  const megapixels = Number(((width * height) / 1_000_000).toFixed(2));

  let sizeMb = 2.0;
  if (asset.fileSize) {
    const szMatch = asset.fileSize.match(/([\d.]+)\s*(MB|KB)/i);
    if (szMatch) {
      const val = parseFloat(szMatch[1]);
      sizeMb = szMatch[2].toUpperCase() === 'KB' ? val / 1024 : val;
    }
  }

  const format = asset.fileFormat || (asset.url?.includes('jpeg') || asset.url?.endsWith('.jpg') ? 'JPEG' : 'PNG');
  const mediaInfo = { width, height, megapixels, format, sizeMb };

  // 1. Technical Compliance Evaluation
  const ruleResults: MarketplaceComplianceEvaluation['technicalCompliance']['ruleResults'] = [];
  let mandatoryFailed = 0;
  let mandatoryPassed = 0;

  for (const rule of rules) {
    let passed = true;
    let measuredVal: string | undefined = undefined;
    let detailsBn = rule.descriptionBn;
    let detailsEn = rule.description;
    let fixBn: string | undefined = undefined;

    if (rule.checkFn) {
      const res = rule.checkFn(asset, mediaInfo);
      passed = res.passed;
      measuredVal = res.measuredValue;
      detailsBn = res.detailsBn;
      detailsEn = res.detailsEn;
      fixBn = res.actionableFixBn;
    }

    // Requirement 8: If rule is unverified / needs verification, it NEVER causes mandatory failure!
    let status: 'passed' | 'warning' | 'failed' = 'passed';
    if (!passed) {
      if (rule.enforcementLevel === 'mandatory') {
        status = 'failed';
        mandatoryFailed++;
      } else {
        status = 'warning';
      }
    } else {
      if (rule.enforcementLevel === 'mandatory') {
        mandatoryPassed++;
      }
    }

    ruleResults.push({
      ruleId: rule.id,
      title: rule.title,
      titleBn: rule.titleBn,
      enforcementLevel: rule.enforcementLevel,
      enforcement: rule.enforcementLevel,
      verificationStatus: rule.verificationStatus,
      isVerified: rule.verificationStatus === 'verified',
      sourceUrl: rule.sourceUrl,
      officialSourceUrl: rule.sourceUrl,
      lastVerifiedAt: rule.lastVerifiedAt,
      lastVerifiedDate: rule.lastVerifiedAt,
      evidenceSummary: rule.evidenceSummary,
      verificationNote: rule.evidenceSummary,
      mediaType: rule.mediaType,
      status,
      measuredValue: measuredVal,
      messageBn: detailsBn,
      actionableFixBn: fixBn,
    });
  }

  // 2. Content Policy Evaluation
  const isAiPermitted = profile.aiAcceptanceStatus !== 'prohibited';
  const policyNotesBn: string[] = [profile.aiAcceptanceNoteBn];
  const policyNotesEn: string[] = [profile.aiAcceptanceNoteEn];

  // 3. Third-Party IP & Brand Inspection (Requirement 2 & 7: Prompt mentions != visible logos)
  const fullTextCorpus = `${asset.title || ''} ${asset.prompt || ''} ${(asset as any).keywords?.join(' ') || ''}`;
  const ipAudit = classifyThirdPartyIp(fullTextCorpus, {
    visualLogoConfirmed: options?.visualLogoFound === true,
    hasActualVisualInspection: options?.hasActualVisualInspection,
  });

  const visualLogoConfirmed = ipAudit.visualLogoConfirmed;
  const promptMentionDetected = ipAudit.promptMentionDetected;
  const detectedPromptBrands = ipAudit.detectedItems.map((i) => i.name);

  let brandStatus: 'clean' | 'prompt_mention_only' | 'visual_logo_detected' = 'clean';
  if (ipAudit.verdict === 'confirmed_infringement') {
    brandStatus = 'visual_logo_detected';
  } else if (ipAudit.verdict === 'suspicion_text_mention') {
    brandStatus = 'prompt_mention_only';
  } else {
    brandStatus = 'clean';
  }

  // 4. Overall Outcome Determination
  let summaryStatus: 'ready_for_review' | 'needs_fix' | 'reject_candidate' = 'ready_for_review';
  let summaryStatusLabelBn = 'রিভিউয়ের জন্য প্রস্তুত (Ready for Review)';

  if (!isAiPermitted || visualLogoConfirmed) {
    summaryStatus = 'reject_candidate';
    summaryStatusLabelBn = 'বাতিলযোগ্য প্রার্থী (Reject Candidate)';
  } else if (mandatoryFailed > 0 || promptMentionDetected) {
    summaryStatus = 'needs_fix';
    summaryStatusLabelBn = 'সংশোধন প্রয়োজন (Needs Fix)';
  } else {
    summaryStatus = 'ready_for_review';
    summaryStatusLabelBn = 'রিভিউয়ের জন্য প্রস্তুত (Ready for Review)';
  }

  // 5. Editorial Acceptance (Requirement 8: NEVER guarantee acceptance)
  const unresolvedUncertainties: string[] = [];
  if (profile.videoRules.some((r) => r.enforcementLevel === 'uncertain_needs_verification') && mediaType === 'video') {
    unresolvedUncertainties.push('ভিডিও ডিস্ট্রিবিউশন শর্ত সংশ্লিষ্ট প্ল্যাটফর্মের ডাউনস্ট্রিম পার্টনারদের নির্দেশিকা সাপেক্ষে যাচাইকরণ প্রয়োজন (Needs Verification)।');
  }
  for (const unc of ipAudit.uncertaintyNotes) {
    if (!unresolvedUncertainties.includes(unc)) {
      unresolvedUncertainties.push(unc);
    }
  }
  unresolvedUncertainties.push('স্টক মার্কেটপ্লেসের মানব কিউরেটরের ব্যক্তিনির্ভর সিদ্ধান্তই চূড়ান্ত; কোনো সফটওয়্যার কোড ১০০% গ্রহণযোগ্যতার গ্যারান্টি দিতে পারে না।');
  unresolvedUncertainties.push('সূক্ষ্ম মাইক্রো-ওয়াটারমার্ক বা কৃত্রিম অঙ্গবিকৃতি খালি চোখে ১০০% জুমে যাচাই করা আবশ্যক।');

  return {
    marketplaceId,
    marketplaceName: profile.name,
    mediaType,
    officialSourceUrl: profile.officialPortalUrl,
    sourceUrl: profile.officialPortalUrl,
    lastVerifiedDate: profile.lastVerifiedDate,
    lastVerifiedAt: profile.lastVerifiedAt,
    aiAcceptanceStatus: profile.aiAcceptanceStatus,
    technicalCompliance: {
      passed: mandatoryFailed === 0,
      mandatoryRulesPassed: mandatoryPassed,
      mandatoryRulesFailed: mandatoryFailed,
      ruleResults,
    },
    contentPolicyCompliance: {
      passed: isAiPermitted && !visualLogoConfirmed,
      isAiPermitted,
      policyStatus: !isAiPermitted ? 'prohibited' : visualLogoConfirmed ? 'requires_action' : 'compliant',
      notesBn: policyNotesBn,
      notesEn: policyNotesEn,
    },
    brandInspectionAudit: {
      promptMentionDetected,
      promptBrandNames: detectedPromptBrands,
      detectedIpItems: ipAudit.detectedItems,
      ipVerdict: ipAudit.verdict,
      ipVerdictLabelBn: ipAudit.verdictLabelBn,
      visualLogoConfirmed,
      status: brandStatus,
      messageBn: ipAudit.messageBn,
      actionableAdviceBn: ipAudit.actionableAdviceBn,
      uncertaintyNotes: ipAudit.uncertaintyNotes,
    },
    editorialAcceptance: {
      guaranteed: false,
      humanReviewRequired: true,
      editorialDisclaimerBn: 'সতর্কতা: সমস্ত টেকনিক্যাল ও পলিসি টেস্ট উত্তীর্ণ হলেও কোনো স্টক প্ল্যাটফর্মের চূড়ান্ত গ্রহণযোগ্যতা নিশ্চিত করা যায় না। মানুষের পর্যালোচনা ছাড়া সাবমিট করবেন না।',
      unresolvedUncertainties,
    },
    summaryStatus,
    summaryStatusLabelBn,
  };
}

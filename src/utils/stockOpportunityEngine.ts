/**
 * Priority 6.4: Autonomous Stock Opportunity & Asset Selection Engine
 * 
 * Capabilities:
 * 1. Analyzes commercial buyer demand signals using approved curated 2026 stock intelligence.
 *    Transparently discloses offline source & lack of unauthorized paid live scraping APIs.
 * 2. Multi-metric asset prioritization: Commercial Utility, Originality, Duplicate Risk,
 *    Technical Quality, and Marketplace Rules Compliance.
 * 3. People-avoidance filter: strongly prioritizes safe commercial niches (Architecture,
 *    Contemporary Islamic Architecture, Nature, Commercial Backgrounds, Artisanal Still Life).
 * 4. Smart Asset Reuse: reuses qualified library assets to prevent redundant generation
 *    and dispatch them directly to the Autonomous Pipeline with 0 credit deduction.
 * 5. Anti-hype integrity: zero baseless sales guarantees, clear data provenance, and explicit disclaimer.
 * 6. Zero Generation Credit invariant for Google Flow, Imported, and library re-used assets.
 */

import { Asset, StockMarketplaceId, AutonomousTaskItem, AspectRatioType } from '../types';
import { COMMERCIAL_TRADEMARK_BRANDS, PROMOTIONAL_FLUFF_WORDS } from './stockMetadataValidator';
import { isDuplicateSubmissionForMarketplace } from './batchStockAuditor';
import { createAutonomousTask } from './autonomousQueueManager';

export type OpportunityCategory =
  | 'islamic_heritage'
  | 'architecture'
  | 'nature'
  | 'business_background'
  | 'artisanal_still_life'
  | 'clean_beauty';

export interface StockOpportunityNiche {
  id: string;
  nicheName: string;
  nicheNameBn: string;
  category: OpportunityCategory;
  demandIndex: 'Very High' | 'High';
  demandScore: number; // 0 - 100
  noPeopleAdvantage: boolean;
  recommendedKeywords: string[];
  recommendedPromptTemplate: string;
  aspectRatio: AspectRatioType;
  commercialUtilityReasonBn: string;
  commercialUtilityReasonEn: string;
  dataSource: string;
  liveDataStatus: 'offline_curated' | 'live_api_absent';
  liveDataBlockerNoticeBn: string;
  disclaimerBn: string;
}

export interface AssetOpportunityScore {
  assetId: string;
  assetTitle: string;
  overallScore: number; // 0 - 100
  commercialUtilityScore: number; // 0 - 100
  originalityScore: number; // 0 - 100
  duplicateRisk: 'Low' | 'Moderate' | 'High';
  duplicateRiskReasonBn?: string;
  technicalQualityScore: number; // 0 - 100
  marketplaceComplianceScore: number; // 0 - 100
  hasPeople: boolean;
  peopleExclusionBonus: boolean;
  priorityRank: 'High Commercial' | 'Moderate' | 'Low' | 'Skip';
  priorityRankBn: string;
  matchedOpportunityNiche?: string;
  matchedNicheCategory?: OpportunityCategory;
  reasonsBn: string[];
  dataSource: string;
  disclaimerBn: string;
  recommendedActionBn: string;
}

export interface OpportunityEvaluationResult {
  opportunity: StockOpportunityNiche;
  matchingAsset: Asset | null;
  matchingScore: AssetOpportunityScore | null;
  reuseExistingAsset: boolean;
  suggestedPrompt: string;
  actionRecommendationBn: string;
  dispatchCreditDeduction: 0;
  isAlreadyQueued: boolean;
  queueTaskId?: string;
}

// -----------------------------------------------------------------------------
// CURATED 2026 COMMERCIAL STOCK OPPORTUNITY NICHES (OFFLINE APPROVED INTELLIGENCE)
// -----------------------------------------------------------------------------
export const CURATED_STOCK_OPPORTUNITIES: StockOpportunityNiche[] = [
  {
    id: 'opp-islamic-architecture',
    nicheName: 'Contemporary Islamic Architecture & Sacred Geometry',
    nicheNameBn: 'সমসাময়িক ইসলামিক স্থাপত্য ও পবিত্র জ্যামিতি',
    category: 'islamic_heritage',
    demandIndex: 'Very High',
    demandScore: 98,
    noPeopleAdvantage: true,
    recommendedKeywords: [
      'islamic architecture',
      'grand mosque',
      'marble courtyard',
      'arabesque archway',
      'sacred geometry',
      'ramadan background',
      'calm reflection pool',
      'crescent moon twilight',
      'generative ai',
    ],
    recommendedPromptTemplate:
      'Grand modern marble mosque courtyard reflecting serene sunrise light in a tranquil shallow water basin, intricate geometric arabesque carved arches, morning mist, clean architectural photography, 4k resolution, no people',
    aspectRatio: '16:9',
    commercialUtilityReasonBn:
      'রমজান, ঈদ এবং আন্তর্জাতিক ইসলামিক ফিন্যান্স ও কালচারাল ক্যাম্পেইনে বিপুল বৈশ্বিক চাহিদা। মানুষহীন স্থাপত্যে মডেল রিলিজের কোনো ঝুঁকি নেই।',
    commercialUtilityReasonEn:
      'Perennial high commercial demand for Ramadan, Eid, and global cultural B2B campaigns. Zero model release friction.',
    dataSource: 'অভ্যন্তরীণ ২০২৬ বাণিজ্যিক স্টক প্যাটার্ন রেজিস্ট্রি (অফলাইন অনুমোদিত মডেল)',
    liveDataStatus: 'live_api_absent',
    liveDataBlockerNoticeBn:
      'লাইভ থার্ড-পার্টি কন্ট্রিবিউটর স্ক্র্যাপার API অনুপস্থিত (অনুমোদনহীন পেইড সার্ভিস বন্ধ)। অফলাইন ভেরিফাইড ডেটাসেট সক্রিয়।',
    disclaimerBn:
      'স্টক প্ল্যাটফর্মের অ্যালগরিদম ও ক্রেতার চাহিদার ওপর ডাউনলোড নির্ভরশীল; বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না।',
  },
  {
    id: 'opp-biophilic-architecture',
    nicheName: 'Biophilic & Sustainable Eco-Architecture',
    nicheNameBn: 'বায়োফিলিক ও টেকসই পরিবেশবান্ধব স্থাপত্য',
    category: 'architecture',
    demandIndex: 'Very High',
    demandScore: 95,
    noPeopleAdvantage: true,
    recommendedKeywords: [
      'biophilic architecture',
      'sustainable building',
      'living plant wall',
      'timber columns',
      'modern eco pavilion',
      'sunlit interior',
      'corporate presentation background',
      'generative ai',
    ],
    recommendedPromptTemplate:
      'Modern biophilic corporate pavilion interior featuring towering vertical living plant walls, curved laminated timber beams, sunlit glass ceiling, minimalist polished stone floor, architectural photography, no people',
    aspectRatio: '16:9',
    commercialUtilityReasonBn:
      'পরিবেশবান্ধব রিয়েল এস্টেট ও কর্পোরেট ইএসজি (ESG) ক্যাম্পেইনে বহুল বিক্রিত ক্যাটাগরি। কাল্পনিক স্থাপত্যে প্রপার্টি রিলিজের ঝুঁকি নেই।',
    commercialUtilityReasonEn:
      'Strong B2B appeal for sustainable architecture & corporate ESG brochures. Fictional designs avoid property release limits.',
    dataSource: 'অভ্যন্তরীণ ২০২৬ বাণিজ্যিক স্টক প্যাটার্ন রেজিস্ট্রি (অফলাইন অনুমোদিত মডেল)',
    liveDataStatus: 'live_api_absent',
    liveDataBlockerNoticeBn:
      'লাইভ থার্ড-পার্টি কন্ট্রিবিউটর স্ক্র্যাপার API অনুপস্থিত (অনুমোদনহীন পেইড সার্ভিস বন্ধ)। অফলাইন ভেরিফাইড ডেটাসেট সক্রিয়।',
    disclaimerBn:
      'স্টক প্ল্যাটফর্মের অ্যালগরিদম ও ক্রেতার চাহিদার ওপর ডাউনলোড নির্ভরশীল; বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না।',
  },
  {
    id: 'opp-business-backgrounds',
    nicheName: 'Minimalist Business & Commercial Copy Space Backgrounds',
    nicheNameBn: 'মিনিমালিস্ট ব্যবসায়িক ও কমার্শিয়াল কপি স্পেস ব্যাকগ্রাউন্ড',
    category: 'business_background',
    demandIndex: 'Very High',
    demandScore: 94,
    noPeopleAdvantage: true,
    recommendedKeywords: [
      'business background',
      'commercial copy space',
      'minimalist podium',
      'abstract studio lighting',
      'subtle shadows',
      'neutral tone backdrop',
      'corporate banner template',
      'generative ai',
    ],
    recommendedPromptTemplate:
      'High-end minimalist commercial studio backdrop with smooth concrete pedestal, warm diffused window side-light, soft geometric shadow play, ample empty copy space on left for advertising typography, no people',
    aspectRatio: '16:9',
    commercialUtilityReasonBn:
      'বিজ্ঞাপনদাতা ও গ্রাফিক ডিজাইনারদের জন্য টেক্সট ও প্রোডাক্ট বসানোর ফাঁকা জায়গা (Copy Space) অত্যন্ত মূল্যবান ও দ্রুত ডাউনলোড হয়।',
    commercialUtilityReasonEn:
      'Extremely high utility for commercial advertising, UI design, and marketing copy placement with generous negative space.',
    dataSource: 'অভ্যন্তরীণ ২০২৬ বাণিজ্যিক স্টক প্যাটার্ন রেজিস্ট্রি (অফলাইন অনুমোদিত মডেল)',
    liveDataStatus: 'live_api_absent',
    liveDataBlockerNoticeBn:
      'লাইভ থার্ড-পার্টি কন্ট্রিবিউটর স্ক্র্যাপার API অনুপস্থিত (অনুমোদনহীন পেইড সার্ভিস বন্ধ)। অফলাইন ভেরিফাইড ডেটাসেট সক্রিয়।',
    disclaimerBn:
      'স্টক প্ল্যাটফর্মের অ্যালগরিদম ও ক্রেতার চাহিদার ওপর ডাউনলোড নির্ভরশীল; বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না।',
  },
  {
    id: 'opp-artisan-ceramics',
    nicheName: 'Artisan Stoneware & Handcrafted Raw Terracotta',
    nicheNameBn: 'হস্তনির্মিত সিরামিক ও র টেরাকোটা মাটির পাত্র',
    category: 'artisanal_still_life',
    demandIndex: 'High',
    demandScore: 93,
    noPeopleAdvantage: true,
    recommendedKeywords: [
      'artisan ceramics',
      'stoneware pottery',
      'terracotta pitcher',
      'rustic natural linen',
      'matte clay texture',
      'still life photography',
      'wabi sabi aesthetic',
      'generative ai',
    ],
    recommendedPromptTemplate:
      'Artisanal handcrafted terracotta pitcher with raw speckled matte clay texture on aged natural linen fabric, gentle morning side-lighting with soft directional shadows, studio still life photography, 4k, no people',
    aspectRatio: '3:2',
    commercialUtilityReasonBn:
      'টেক্সটাইল, ইন্টেরিয়র ডিজাইন ও অর্গানিক ব্র্যান্ডের জন্য ট্যাকটাইল অনুভূতিযুক্ত স্টিল লাইফ উচ্চ প্রশংসিত। কোনো কপিরাইট ঝুঁকি নেই।',
    commercialUtilityReasonEn:
      'High buyer appetite for authentic tactile aesthetics in editorial lifestyle and organic brand storytelling.',
    dataSource: 'অভ্যন্তরীণ ২০২৬ বাণিজ্যিক স্টক প্যাটার্ন রেজিস্ট্রি (অফলাইন অনুমোদিত মডেল)',
    liveDataStatus: 'live_api_absent',
    liveDataBlockerNoticeBn:
      'লাইভ থার্ড-পার্টি কন্ট্রিবিউটর স্ক্র্যাপার API অনুপস্থিত (অনুমোদনহীন পেইড সার্ভিস বন্ধ)। অফলাইন ভেরিফাইড ডেটাসেট সক্রিয়।',
    disclaimerBn:
      'স্টক প্ল্যাটফর্মের অ্যালগরিদম ও ক্রেতার চাহিদার ওপর ডাউনলোড নির্ভরশীল; বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না।',
  },
  {
    id: 'opp-nature-macro',
    nicheName: 'Pristine Nature, Water Droplets & Organic Botanical Textures',
    nicheNameBn: 'প্রাকৃতিক বোটানিক্যাল টেক্সচার ও শিশিরবিন্দু ম্যাক্রো',
    category: 'nature',
    demandIndex: 'High',
    demandScore: 91,
    noPeopleAdvantage: true,
    recommendedKeywords: [
      'botanical texture',
      'macro water droplets',
      'emerald monstera leaf',
      'surface tension',
      'natural morning dew',
      'fresh organic nature',
      'wellness background',
      'generative ai',
    ],
    recommendedPromptTemplate:
      'Extreme macro close-up of crystal clear morning dew water droplets resting on deep emerald green monstera leaf surface, crisp surface tension, soft natural bokeh background, morning daylight, tack sharp, no people',
    aspectRatio: '16:9',
    commercialUtilityReasonBn:
      'ওয়েলনেস, অর্গানিক হেলথকেয়ার ও পরিবেশ সংক্রান্ত ক্যাম্পেইনে প্রাকৃতিক ম্যাক্রো টেক্সচারের চিরন্তন বাণিজ্যিক চাহিদা।',
    commercialUtilityReasonEn:
      'Perennial high commercial utility for organic healthcare, wellness, and environmental hero backgrounds.',
    dataSource: 'অভ্যন্তরীণ ২০২৬ বাণিজ্যিক স্টক প্যাটার্ন রেজিস্ট্রি (অফলাইন অনুমোদিত মডেল)',
    liveDataStatus: 'live_api_absent',
    liveDataBlockerNoticeBn:
      'লাইভ থার্ড-পার্টি কন্ট্রিবিউটর স্ক্র্যাপার API অনুপস্থিত (অনুমোদনহীন পেইড সার্ভিস বন্ধ)। অফলাইন ভেরিফাইড ডেটাসেট সক্রিয়।',
    disclaimerBn:
      'স্টক প্ল্যাটফর্মের অ্যালগরিদম ও ক্রেতার চাহিদার ওপর ডাউনলোড নির্ভরশীল; বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না।',
  },
  {
    id: 'opp-clean-beauty',
    nicheName: 'Unbranded Clean Beauty & Amber Glass Cosmetic Droppers',
    nicheNameBn: 'ব্র্যান্ডহীন ক্লিন বিউটি ও অ্যাম্বার গ্লাস কসমেটিক ড্রপার',
    category: 'clean_beauty',
    demandIndex: 'Very High',
    demandScore: 96,
    noPeopleAdvantage: true,
    recommendedKeywords: [
      'amber glass dropper',
      'clean beauty cosmetic',
      'essential oil bottle',
      'eucalyptus branch',
      'unbranded packaging',
      'water splash drops',
      'commercial studio lighting',
      'generative ai',
    ],
    recommendedPromptTemplate:
      'Minimalist amber glass dropper cosmetic serum bottle resting on smooth wet sandstone with crystal water splashes and fresh green eucalyptus leaves, unbranded clean label, high-end commercial beauty lighting, no people',
    aspectRatio: '4:3',
    commercialUtilityReasonBn:
      'ডিজিটাল মার্কেটিং ও স্কিনকেয়ার বিজ্ঞাপনে সর্বাধিক বিক্রিত আইটেম। কোনো ট্রেডমার্ক লোগো না থাকা নিশ্চিত করা বাধ্যতামূলক।',
    commercialUtilityReasonEn:
      'Top commercial ad asset for beauty & e-commerce. Must strictly remain unbranded to pass trademark audits.',
    dataSource: 'অভ্যন্তরীণ ২০২৬ বাণিজ্যিক স্টক প্যাটার্ন রেজিস্ট্রি (অফলাইন অনুমোদিত মডেল)',
    liveDataStatus: 'live_api_absent',
    liveDataBlockerNoticeBn:
      'লাইভ থার্ড-পার্টি কন্ট্রিবিউটর স্ক্র্যাপার API অনুপস্থিত (অনুমোদনহীন পেইড সার্ভিস বন্ধ)। অফলাইন ভেরিফাইড ডেটাসেট সক্রিয়।',
    disclaimerBn:
      'স্টক প্ল্যাটফর্মের অ্যালগরিদম ও ক্রেতার চাহিদার ওপর ডাউনলোড নির্ভরশীল; বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না।',
  },
];

// -----------------------------------------------------------------------------
// PEOPLE DETECTION FILTER (Strict Commercial Safety)
// -----------------------------------------------------------------------------
const PEOPLE_KEYWORDS = [
  'person',
  'people',
  'man',
  'men',
  'woman',
  'women',
  'face',
  'portrait',
  'girl',
  'boy',
  'child',
  'children',
  'model',
  'crowd',
  'human',
  'hands holding',
  'smiling',
  'selfie',
  'মানুষ',
  'নারী',
  'পুরুষ',
  'মেয়ে',
  'ছেলে',
  'ব্যক্তি',
  'মুখ',
  'মডেল',
  'ভিড়',
];

/**
 * Detects whether an asset prompt or title depicts human beings or faces.
 * Properly ignores negative exclusion phrases such as "no people", "without people",
 * "zero people", "no person", "মানুষহীন", "মানুষ ছাড়া".
 */
export function detectPeopleInSubject(text: string): boolean {
  if (!text) return false;
  // First, strip out explicit negative human exclusion phrases used in commercial stock prompting
  const sanitized = text
    .toLowerCase()
    .replace(/\b(no\s+people|without\s+people|zero\s+people|no\s+person|no\s+human|no\s+faces?|zero\s+human|nobody|unmanned)\b/gi, '')
    .replace(/(মানুষহীন|মানুষ\s*ছাড়া|কোনো\s*মানুষ\s*নেই|ব্যক্তিহীন|মডেল\s*ছাড়া)/gi, '');

  return PEOPLE_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(sanitized);
  });
}

// -----------------------------------------------------------------------------
// ASSET SCORING & PRIORITIZATION ALGORITHM
// -----------------------------------------------------------------------------

/**
 * Scores an individual asset across 5 commercial criteria:
 * 1. Commercial Utility (চাহিদা ও ব্যবহারের উপযোগিতা)
 * 2. Originality (মৌলিকত্ব ও দৃশ্যের বিবরণ)
 * 3. Duplicate Risk (ডুপ্লিকেট ঝুঁকি)
 * 4. Technical Quality (রেজোলিউশন ও ফরম্যাট)
 * 5. Marketplace Compliance (ট্রেডমার্ক ও পলিসি কমপ্লায়েন্স)
 */
export function scoreAssetForStockOpportunity(
  asset: Asset,
  allAssets: Asset[] = [],
  existingTasks: AutonomousTaskItem[] = []
): AssetOpportunityScore {
  const textCorpus = `${asset.title || ''} ${asset.prompt || ''} ${asset.style || ''}`.toLowerCase();
  const reasonsBn: string[] = [];

  // 1. People Detection
  const hasPeople = detectPeopleInSubject(textCorpus);
  const peopleExclusionBonus = !hasPeople;
  if (hasPeople) {
    reasonsBn.push('মানুষ বা মুখের উপস্থিতি শনাক্ত: মডেল রিলিজ ও কিউরেটর রিজেকশন ঝুঁকি বিদ্যমান (-১৫)');
  } else {
    reasonsBn.push('মানুষহীন নিরাপদ বাণিজ্যিক বিষয়: মডেল রিলিজ ও ফেসিয়াল আর্টফ্যাক্টের কোনো ঝুঁকি নেই (+১৫)');
  }

  // 2. Commercial Utility Score (0 - 100)
  let utilityScore = 50;
  const isArchitecture = /mosque|architecture|building|interior|pavilion|courtyard|archway|স্থাপত্য|মসজিদ/.test(textCorpus);
  const isNature = /nature|leaf|dew|droplet|botanical|flower|forest|water|প্রকৃতি/.test(textCorpus);
  const isBackground = /background|backdrop|copy space|pedestal|minimalist|টেক্সচার|ব্যাকগ্রাউন্ড/.test(textCorpus);
  const isArtisanal = /ceramic|pottery|terracotta|linen|stoneware|craft|হস্তশিল্প|মাটির পাত্র/.test(textCorpus);
  const isIslamic = /islamic|mosque|arabesque|quran|ramadan|eid|safawi|dates|মসজিদ|রমজান/.test(textCorpus);

  let matchedCategory: OpportunityCategory | undefined;
  if (isIslamic) {
    utilityScore += 35;
    matchedCategory = 'islamic_heritage';
    reasonsBn.push('ইসলামিক ঐতিহ্য ও স্থাপত্য ক্যাটাগরি: শীর্ষ আন্তর্জাতিক বাণিজ্যিক ও কালচারাল চাহিদা');
  } else if (isArchitecture) {
    utilityScore += 30;
    matchedCategory = 'architecture';
    reasonsBn.push('স্থাপত্য ও ইন্টেরিয়র ক্যাটাগরি: কর্পোরেট ও রিয়েল এস্টেট ব্যবহারের উচ্চ চাহিদা');
  } else if (isBackground) {
    utilityScore += 28;
    matchedCategory = 'business_background';
    reasonsBn.push('বাণিজ্যিক ব্যাকগ্রাউন্ড ও কপি স্পেস: বিজ্ঞাপনী ডিজাইনারদের নিয়মিত ডাউনলোড আইটেম');
  } else if (isArtisanal) {
    utilityScore += 26;
    matchedCategory = 'artisanal_still_life';
    reasonsBn.push('হস্তশিল্প সিরামিক ও স্টিল লাইফ: লাইফস্টাইল ব্র্যান্ডিং ও এডিটোরিয়াল চাহিদা');
  } else if (isNature) {
    utilityScore += 24;
    matchedCategory = 'nature';
    reasonsBn.push('প্রাকৃতিক বোটানিক্যাল টেক্সচার: হেলথকেয়ার ও অর্গানিক পণ্যের চিরন্তন চাহিদা');
  }

  // Commercial aspect ratios
  if (['16:9', '3:2', '4:3'].includes(asset.aspectRatio)) {
    utilityScore += 10;
  }
  utilityScore = Math.min(100, Math.max(10, utilityScore));

  // 3. Originality Score (0 - 100)
  let originalityScore = 60;
  const wordCount = (asset.prompt || '').trim().split(/\s+/).length;
  if (wordCount >= 15) {
    originalityScore += 20;
    reasonsBn.push('সমৃদ্ধ ও সুনির্দিষ্ট প্রম্পট বিবরণ: দৃশ্য, লাইটিং ও টেক্সচারের স্পষ্ট নির্দেশনা');
  } else if (wordCount < 6) {
    originalityScore -= 20;
    reasonsBn.push('অত্যধিক সংক্ষিপ্ত বা সাধারণ প্রম্পট: মৌলিকত্ব ও বাণিজ্যিক গভীরতা সীমিত');
  }
  originalityScore = Math.min(100, Math.max(20, originalityScore));

  // 4. Duplicate Risk (Low / Moderate / High)
  let duplicateRisk: 'Low' | 'Moderate' | 'High' = 'Low';
  let duplicateRiskReasonBn: string | undefined;

  // Check similar titles in library
  const otherAssets = allAssets.filter((a) => a.id !== asset.id);
  const cleanTitle = (asset.title || '').trim().toLowerCase();
  const titleMatches = otherAssets.filter((a) => (a.title || '').trim().toLowerCase() === cleanTitle);
  if (titleMatches.length > 0) {
    duplicateRisk = 'High';
    duplicateRiskReasonBn = `লাইব্রেরিতে একই নামের অন্য ${titleMatches.length}টি অ্যাসেট বিদ্যমান (ডুপ্লিকেট ঝুঁকি)`;
    reasonsBn.push('উচ্চ ডুপ্লিকেট ঝুঁকি: সমরূপ অ্যাসেট লাইব্রেরিতে পূর্বে সংরক্ষিত');
  } else {
    // Check if prompt is identical to an active queue task
    const cleanPrompt = (asset.prompt || '').trim().toLowerCase();
    const taskMatches = existingTasks.filter(
      (t) => (t.prompt || '').trim().toLowerCase() === cleanPrompt && t.status !== 'failed'
    );
    if (taskMatches.length > 0) {
      duplicateRisk = 'Moderate';
      duplicateRiskReasonBn = `অটোনোমাস কিউতে অনুরূপ প্রম্পটের টাস্ক ইতোমধ্যে প্রক্রিয়াধীন (${taskMatches[0].id})`;
      reasonsBn.push('মাঝারি ডুপ্লিকেট ঝুঁকি: পাইপলাইন কিউতে একই বিষয়ের কাজ বিদ্যমান');
    }
  }

  // 5. Technical Quality Score (0 - 100)
  let technicalQualityScore = 75;
  const dimMatch = (asset.dimensions || '').match(/(\d+)\s*[×xX*]\s*(\d+)/);
  if (dimMatch) {
    const w = parseInt(dimMatch[1], 10);
    const h = parseInt(dimMatch[2], 10);
    const mp = (w * h) / 1000000;
    if (mp >= 4.0) {
      technicalQualityScore += 20;
      reasonsBn.push(`প্রযুক্তিগত রেজোলিউশন মানদণ্ড উত্তীর্ণ (${mp.toFixed(1)} MP >= ৪.০ MP স্টক স্ট্যান্ডার্ড)`);
    } else {
      technicalQualityScore -= 25;
      reasonsBn.push(`নিম্ন রেজোলিউশন (${mp.toFixed(1)} MP < ৪.০ MP): আপস্কেলিং বা ফিক্স প্রয়োজন`);
    }
  } else {
    technicalQualityScore += 10;
  }
  if (asset.fileFormat?.toUpperCase() === 'JPEG' || asset.fileFormat?.toUpperCase() === 'JPG') {
    technicalQualityScore += 5;
  }
  technicalQualityScore = Math.min(100, Math.max(10, technicalQualityScore));

  // 6. Marketplace Compliance Score (0 - 100)
  let complianceScore = 90;
  // Check for trademarks
  const foundTrademarks = Array.from(COMMERCIAL_TRADEMARK_BRANDS).filter((brand) => textCorpus.includes(brand.toLowerCase()));
  if (foundTrademarks.length > 0) {
    complianceScore -= 50;
    reasonsBn.push(`নিষিদ্ধ ব্র্যান্ড/ট্রেডমার্ক শনাক্ত (${foundTrademarks.join(', ')}): রিজেকশন ঝুঁকি অত্যন্ত উচ্চ`);
  }
  // Check for fluff words
  const foundFluff = Array.from(PROMOTIONAL_FLUFF_WORDS).filter((fluff) => textCorpus.includes(fluff.toLowerCase()));
  if (foundFluff.length > 0) {
    complianceScore -= 15;
    reasonsBn.push(`প্রচারণামূলক অগ্রহণযোগ্য শব্দ শনাক্ত (${foundFluff.join(', ')})`);
  }
  complianceScore = Math.min(100, Math.max(10, complianceScore));

  // 7. Composite Priority Score Calculation
  // Utility (30%) + Quality (25%) + Compliance (20%) + Originality (15%) + People Bonus (10%) - Duplicate Penalty
  let composite =
    utilityScore * 0.3 +
    technicalQualityScore * 0.25 +
    complianceScore * 0.2 +
    originalityScore * 0.15 +
    (peopleExclusionBonus ? 10 : 0);

  if (duplicateRisk === 'High') {
    composite -= 30;
  } else if (duplicateRisk === 'Moderate') {
    composite -= 15;
  }

  const overallScore = Math.round(Math.min(100, Math.max(0, composite)));

  // Determine Rank
  let priorityRank: 'High Commercial' | 'Moderate' | 'Low' | 'Skip';
  let priorityRankBn: string;
  let recommendedActionBn: string;

  if (overallScore >= 82) {
    priorityRank = 'High Commercial';
    priorityRankBn = 'উচ্চ বাণিজ্যিক অগ্রাধিকার (High Commercial)';
    recommendedActionBn = 'বিদ্যমান অ্যাসেটটি পুনরায় জেনারেট না করে সরাসরি সাবমিশন পাইপলাইনে প্রেরণ করুন (০ ক্রেডিট)।';
  } else if (overallScore >= 65) {
    priorityRank = 'Moderate';
    priorityRankBn = 'মাঝারি অগ্রাধিকার (Moderate)';
    recommendedActionBn = 'বাণিজ্যিক উপযোগিতা ভালো; আপস্কেলিং বা মেটাডেটা পরিমার্জন করে পাইপলাইনে পাঠানো সম্ভব।';
  } else if (overallScore >= 45) {
    priorityRank = 'Low';
    priorityRankBn = 'কম অগ্রাধিকার (Low)';
    recommendedActionBn = 'চাহিদা বা কোয়ালিটি সীমিত; নতুন সুযোগভিত্তিক প্রম্পট ব্যবহার করার সুপারিশ করা হচ্ছে।';
  } else {
    priorityRank = 'Skip';
    priorityRankBn = 'বর্জনীয় / স্থগিত (Skip)';
    recommendedActionBn = 'ট্রেডমার্ক বা গুণগত ত্রুটির কারণে এটি পাইপলাইনে না পাঠানোর পরামর্শ দেওয়া হচ্ছে।';
  }

  return {
    assetId: asset.id,
    assetTitle: asset.title || 'Untitled Asset',
    overallScore,
    commercialUtilityScore: utilityScore,
    originalityScore,
    duplicateRisk,
    duplicateRiskReasonBn,
    technicalQualityScore,
    marketplaceComplianceScore: complianceScore,
    hasPeople,
    peopleExclusionBonus,
    priorityRank,
    priorityRankBn,
    matchedOpportunityNiche: matchedCategory,
    matchedNicheCategory: matchedCategory,
    reasonsBn,
    dataSource: 'অভ্যন্তরীণ ২০২৬ বাণিজ্যিক স্টক প্যাটার্ন রেজিস্ট্রি (অফলাইন অনুমোদিত মডেল)',
    disclaimerBn:
      'স্টক প্ল্যাটফর্মের অ্যালগরিদম ও ক্রেতার চাহিদার ওপর ডাউনলোড নির্ভরশীল; বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না।',
    recommendedActionBn,
  };
}

// -----------------------------------------------------------------------------
// SMART ASSET REUSE & OPPORTUNITY MATCHING
// -----------------------------------------------------------------------------

/**
 * Evaluates all stock opportunities against existing asset library:
 * - If user already has a qualified matching asset, recommends reusing it (reuseExistingAsset = true).
 * - If not, generates an optimized prompt for generation or Google Flow workflow.
 * - Enforces 0 credit invariant for re-used and Google Flow assets.
 */
export function evaluateAllStockOpportunities(
  assets: Asset[],
  existingTasks: AutonomousTaskItem[] = [],
  targetMarketplace: StockMarketplaceId = 'adobe-stock'
): OpportunityEvaluationResult[] {
  return CURATED_STOCK_OPPORTUNITIES.map((opp) => {
    // Find best matching asset in library
    let bestMatch: Asset | null = null;
    let bestScore: AssetOpportunityScore | null = null;

    for (const asset of assets) {
      const score = scoreAssetForStockOpportunity(asset, assets, existingTasks);
      const text = `${asset.title || ''} ${asset.prompt || ''} ${asset.style || ''}`.toLowerCase();

      // Check category match
      const isCategoryMatch =
        (opp.category === 'islamic_heritage' && /mosque|islamic|ramadan|eid|safawi|dates|মসজিদ/.test(text)) ||
        (opp.category === 'architecture' && /architecture|building|interior|pavilion|wood|scandinavian|স্থাপত্য/.test(text)) ||
        (opp.category === 'business_background' && /background|backdrop|copy space|pedestal|minimalist|ব্যবসায়িক/.test(text)) ||
        (opp.category === 'artisanal_still_life' && /ceramic|pottery|terracotta|linen|stoneware|craft|হস্তশিল্প/.test(text)) ||
        (opp.category === 'nature' && /nature|leaf|dew|droplet|botanical|flower|forest|water|প্রকৃতি/.test(text)) ||
        (opp.category === 'clean_beauty' && /dropper|cosmetic|amber glass|serum|skincare|প্রসাধন/.test(text));

      if (isCategoryMatch && score.overallScore >= 60 && !score.hasPeople) {
        if (!bestScore || score.overallScore > bestScore.overallScore) {
          bestMatch = asset;
          bestScore = score;
        }
      }
    }

    // Check if matching asset is already queued
    let isAlreadyQueued = false;
    let queueTaskId: string | undefined;
    if (bestMatch) {
      const dupCheck = isDuplicateSubmissionForMarketplace(bestMatch.id, targetMarketplace, existingTasks);
      isAlreadyQueued = dupCheck.isDuplicate;
      queueTaskId = dupCheck.reason?.match(/Task:\s*([^\s)]+)/)?.[1] || undefined;
    }

    const reuseExistingAsset = Boolean(bestMatch && bestScore && bestScore.overallScore >= 65 && !isAlreadyQueued);

    let actionRecommendationBn: string;
    if (reuseExistingAsset && bestMatch) {
      actionRecommendationBn = `বিদ্যমান অ্যাসেট "${bestMatch.title}" এই বাণিজ্যিক সুযোগের উপযুক্ত (স্কোর: ${bestScore?.overallScore}/১০০)। নতুন ছবি জেনারেট না করে এটি সরাসরি পাইপলাইনে ব্যবহার করা যাবে (০ ক্রেডিট)।`;
    } else if (isAlreadyQueued && bestMatch) {
      actionRecommendationBn = `বিদ্যমান অ্যাসেট "${bestMatch.title}" ইতোমধ্যে ${targetMarketplace} কিউতে প্রসেসিংয়ে রয়েছে (Task: ${queueTaskId})। ডুপ্লিকেট রোধ করা হয়েছে।`;
    } else {
      actionRecommendationBn = `লাইব্রেরিতে এই নির্দিষ্ট বিষয়ের কোনো প্রস্তুত ছবি নেই। প্রস্তাবিত কমার্শিয়াল প্রম্পটটি দিয়ে নতুন ছবি তৈরি করুন বা গুগল ফ্লো থেকে ইমপোর্ট করুন (০ ক্রেডিট)।`;
    }

    return {
      opportunity: opp,
      matchingAsset: bestMatch,
      matchingScore: bestScore,
      reuseExistingAsset,
      suggestedPrompt: opp.recommendedPromptTemplate,
      actionRecommendationBn,
      dispatchCreditDeduction: 0,
      isAlreadyQueued,
      queueTaskId,
    };
  });
}

// -----------------------------------------------------------------------------
// SAFE DISPATCH TO AUTONOMOUS PIPELINE
// -----------------------------------------------------------------------------

/**
 * Creates an autonomous queue task from an opportunity evaluation:
 * - If reusing an existing asset: dispatches with 0 credit deduction, referencing assetId.
 * - If generating a new prompt: dispatches prompt to queue with transparent reason.
 */
export function dispatchOpportunityToAutonomousQueue(params: {
  opportunity: StockOpportunityNiche;
  asset?: Asset | null;
  targetMarketplace?: StockMarketplaceId;
}): AutonomousTaskItem {
  const { opportunity, asset, targetMarketplace = 'adobe-stock' } = params;
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);

  if (asset) {
    // Reusing existing library asset
    const baseTask = createAutonomousTask({
      prompt: asset.prompt || opportunity.recommendedPromptTemplate,
      type: 'image',
      aspectRatio: asset.aspectRatio || opportunity.aspectRatio,
      style: asset.style || 'Photorealistic',
      targetMarketplace,
      title: asset.title || 'Stock Opportunity Asset',
    });
    return {
      ...baseTask,
      id: `task-opp-asset-${asset.id}-${targetMarketplace}-${now}-${rand}`,
      assetId: asset.id,
      assetThumbnailUrl: asset.thumbnailUrl || asset.url,
      status: 'pending',
      statusLabelBn: 'অপেক্ষমাণ (স্মার্ট অ্যাসেট নির্বাচন - ০ ক্রেডিট)',
      statusLabelEn: 'Pending (Smart Reused Asset - 0 Credit)',
      exactReason: `বাণিজ্যিক সুযোগ "${opportunity.nicheNameBn}" অনুযায়ী বিদ্যমান অ্যাসেট পাইপলাইনে প্রেরিত।`,
    };
  }

  // New prompt dispatched for creation
  const baseTask = createAutonomousTask({
    prompt: opportunity.recommendedPromptTemplate,
    type: 'image',
    aspectRatio: opportunity.aspectRatio,
    style: 'Photorealistic',
    targetMarketplace,
    title: `${opportunity.nicheNameBn} (বাণিজ্যিক স্টক)`,
  });
  return {
    ...baseTask,
    id: `task-opp-prompt-${opportunity.id}-${now}-${rand}`,
    status: 'pending',
    statusLabelBn: 'অপেক্ষমাণ (সুযোগ ভিত্তিক নতুন প্রম্পট)',
    statusLabelEn: 'Pending (Opportunity Prompt)',
    exactReason: `বাণিজ্যিক সুযোগ "${opportunity.nicheNameBn}" অনুযায়ী নতুন টাস্ক কিউতে যুক্ত।`,
  };
}

// -----------------------------------------------------------------------------
// BLOCKER & INTEGRATION TRANSPARENCY DECLARATION
// -----------------------------------------------------------------------------
export const OPPORTUNITY_ENGINE_BLOCKERS = {
  LIVE_TREND_SCRAPER_ABSENT: {
    code: 'LIVE_TREND_SCRAPER_ABSENT',
    titleBn: 'লাইভ থার্ড-পার্টি কন্ট্রিবিউটর স্ক্র্যাপার API অনুপস্থিত (Blocker)',
    titleEn: 'Live Third-Party Contributor Scraper API Absent (Blocker)',
    detailBn:
      'অ্যাডোবি স্টক বা শাটারস্টক কোনো উন্মুক্ত রিয়েল-টাইম ট্রেন্ড এপিআই প্রদান করে না। পেইড ও অননুমোদিত স্ক্র্যাপার বন্ধ রেখে অভ্যন্তরীণ ২০২৬ ভেরিফাইড প্যাটার্ন রেজিস্ট্রি সক্রিয় রাখা হয়েছে।',
    isBlocker: true,
    verificationStatus: 'NOT VERIFIED' as const,
  },
  DIRECT_MARKETPLACE_UPLOAD_ABSENT: {
    code: 'DIRECT_MARKETPLACE_UPLOAD_ABSENT',
    titleBn: 'মার্কেটপ্লেস সরাসরি নেটওয়ার্ক আপলোড (NOT VERIFIED)',
    titleEn: 'Direct Marketplace Remote Upload (NOT VERIFIED)',
    detailBn:
      'আসল কন্ট্রিবিউটর এসএফটিপি/এপিআই অনুমোদন ও ক্রেডেনশিয়াল ছাড়া স্বয়ংক্রিয় আপলোড অসম্ভব ও নিরাপত্তা নীতির পরিপন্থী। ড্রপ প্যাকেজ (ZIP + RFC 4180 CSV) সম্পূর্ণ প্রস্তুত।',
    isBlocker: false,
    verificationStatus: 'NOT VERIFIED' as const,
  },
};

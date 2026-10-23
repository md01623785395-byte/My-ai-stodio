/**
 * Priority 2.8: Image Metadata Accuracy & Final Stock Readiness Audit
 * 
 * Comprehensive Automated Test Suite:
 * 1. Visual Grounding & Relevance (No invented unverified visual details).
 * 2. Prompt-Artifact Keyword Detection (8k, octane render, unreal engine, masterpiece, etc.).
 * 3. Repetitive Keyword Detection (exact duplicates, plural/singular stem duplicates, permutations).
 * 4. Contradictory Keyword Detection (indoor vs outdoor, day vs night, summer vs winter, no people vs human).
 * 5. Irrelevant & Domain Cross-Contamination Detection (food in tech, vehicles in nature, brands).
 * 6. Marketplace Title, Description & Keyword Rule Compliance (Adobe Stock, Shutterstock, Freepik, Dreamstime, Wirestock).
 * 7. 3-Tier Verification Separation (Software-verified, Heuristic estimates, Manual visual review).
 * 8. End-to-End verifyAndSanitizeStockMetadata verification.
 */

import {
  MARKETPLACE_TITLE_RULES,
  PROMOTIONAL_FLUFF_WORDS,
  COMMERCIAL_TRADEMARK_BRANDS,
  PROMPT_ARTIFACT_KEYWORDS,
  CONTRADICTORY_KEYWORD_RULES,
  detectPromptArtifactKeywords,
  detectRepetitiveKeywords,
  detectContradictoryKeywords,
  auditKeywordHygiene,
  filterAndGroundKeywords,
  formatTitleForMarketplace,
  removeUnsupportedDetailsAndFluff,
  auditMarketplaceValidation,
  verifyAndSanitizeStockMetadata,
} from '../src/utils/stockMetadataValidator';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
    if (detail) console.log(`       └─ ${detail}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${testName}`);
    if (detail) console.error(`       └─ FAILED DETAIL: ${detail}`);
  }
}

console.log('========================================================================');
console.log('PRIORITY 2.8: IMAGE METADATA ACCURACY & FINAL STOCK READINESS AUDIT');
console.log('========================================================================\n');

// ============================================================================
// TEST SUITE 1: Relevance to Actual Image Information (Visual Grounding)
// ============================================================================
console.log('--- পরীক্ষা ১: ছবির বাস্তব তথ্যের প্রাসঙ্গিকতা ও অলীক ডিটেইল প্রতিরোধ ---');

const testFoodDesc = 'Fresh handcrafted artisan sourdough bread loaf with vanilla extract, baking powder, and secret blend on kitchen table.';
const { cleanedText: cleanedFoodDesc, removedItems: removedFoodItems } = removeUnsupportedDetailsAndFluff(testFoodDesc, {
  visualSubject: 'Sourdough bread on rustic wooden surface',
  category: 'Food',
});

assert(
  !cleanedFoodDesc.toLowerCase().includes('vanilla extract') &&
  !cleanedFoodDesc.toLowerCase().includes('baking powder') &&
  !cleanedFoodDesc.toLowerCase().includes('secret blend'),
  '১.১ খাদ্যের ছবিতে খালি চোখে অদৃশ্য রাসায়নিক উপাদান ও মনগড়া সিক্রেট ব্লেন্ড অপসারণ',
  `বাদ দেওয়া হয়েছে: ${removedFoodItems.join(', ')}`
);

const testEmotionTitle = 'Architectural glass pavilion celebrating triumph and dreaming of success with delicious burger';
const { cleanedText: cleanedPavilion, removedItems: removedPavilion } = removeUnsupportedDetailsAndFluff(testEmotionTitle, {
  visualSubject: 'Modern glass pavilion in forest',
  category: 'Architecture',
});

assert(
  !cleanedPavilion.toLowerCase().includes('celebrating') &&
  !cleanedPavilion.toLowerCase().includes('triumph') &&
  !cleanedPavilion.toLowerCase().includes('dreaming') &&
  !cleanedPavilion.toLowerCase().includes('delicious') &&
  !cleanedPavilion.toLowerCase().includes('burger'),
  '১.২ স্থাপত্য ছবিতে সাবজেক্টিভ অনুভূতি, কাল্পনিক মনস্তাত্ত্বিক অবস্থা ও অনাহূত ফুড অপসারণ',
  `ফিল্টারকৃত শব্দ: ${removedPavilion.join(', ')}`
);

// ============================================================================
// TEST SUITE 2: Prompt-Artifact Keyword Detection & Flagging
// ============================================================================
console.log('\n--- পরীক্ষা ২: প্রম্পট-আর্টিফ্যাক্ট ও রেন্ডার ইঞ্জিন ট্যাগ সনাক্তকরণ ---');

const sampleKeywordsWithArtifacts = [
  'mountain landscape', 'alpine lake', '8k', '4k', 'octane render',
  'unreal engine', 'trending on artstation', 'photorealistic', 'masterpiece',
  'volumetric lighting', 'sharp focus', 'conifer forest', 'clear reflection'
];

const detectedArtifacts = detectPromptArtifactKeywords(sampleKeywordsWithArtifacts);
assert(
  detectedArtifacts.includes('8k') &&
  detectedArtifacts.includes('4k') &&
  detectedArtifacts.includes('octane render') &&
  detectedArtifacts.includes('unreal engine') &&
  detectedArtifacts.includes('trending on artstation') &&
  detectedArtifacts.includes('photorealistic') &&
  detectedArtifacts.includes('masterpiece'),
  '২.১ এআই প্রম্পট রেন্ডার ট্যাগ ও রেজোলিউশন ফ্ল্যাফ নির্ভুলভাবে চিহ্নিত',
  `সনাক্তকৃত প্রম্পট আর্টিফ্যাক্ট (${detectedArtifacts.length}টি): ${detectedArtifacts.join(', ')}`
);

const filteredArtifactResult = filterAndGroundKeywords(
  sampleKeywordsWithArtifacts,
  'Mountain alpine lake with reflection',
  'Nature',
  'adobe-stock'
);

assert(
  !filteredArtifactResult.keywords.some((kw) =>
    ['8k', '4k', 'octane render', 'unreal engine', 'trending on artstation', 'masterpiece'].includes(kw)
  ),
  '২.২ filterAndGroundKeywords দ্বারা সমস্ত প্রম্পট আর্টিফ্যাক্ট স্বয়ংক্রিয়ভাবে অপসারিত',
  `ফাইনাল কীওয়ার্ডে কোনো প্রম্পট টোকেন নেই (রক্ষা পেয়েছে: ${filteredArtifactResult.keywords.slice(0, 5).join(', ')}...)`
);

// ============================================================================
// TEST SUITE 3: Repetitive & Redundant Keyword Detection
// ============================================================================
console.log('\n--- পরীক্ষা ৩: পুনরাবৃত্তিমূলক (Repetitive / Stem Plural) কীওয়ার্ড সনাক্তকরণ ---');

const sampleWithRepetitions = [
  'coffee', 'coffee bean', 'coffee beans', 'beans', 'fresh coffee',
  'apple', 'apples', 'red apple', 'apple red', 'coffee', // exact duplicate and plural and permutation
  'roasted coffee', 'espresso'
];

const repetitiveDetections = detectRepetitiveKeywords(sampleWithRepetitions);

assert(
  repetitiveDetections.some((r) => r.type === 'exact' && r.term === 'coffee'),
  '৩.১ হু-বহু একই কীওয়ার্ড পুনরাবৃত্তি (Exact Duplicate) সনাক্তকরণ',
  'সফলভাবে "coffee" পুনরাবৃত্তি চিহ্নিত হয়েছে।'
);

assert(
  repetitiveDetections.some((r) => r.type === 'stem_plural' && (r.term === 'apples' || r.term === 'coffee beans')),
  '৩.২ একবচন/বহুবচন রিডানড্যান্ট স্টেম (apples vs apple, coffee beans vs coffee bean) সনাক্তকরণ',
  `সনাক্তকৃত স্টেম প্লুরাল: ${repetitiveDetections.filter((r) => r.type === 'stem_plural').map((r) => `${r.term} (dup of ${r.duplicateOf})`).join(', ')}`
);

assert(
  repetitiveDetections.some((r) => r.type === 'word_permutation' && r.term === 'apple red'),
  '৩.৩ শব্দের ক্রম পরিবর্তন করে সাজানো ছদ্ম-ডুপ্লিকেট (red apple vs apple red) সনাক্তকরণ',
  'সফলভাবে শব্দ বিন্যাসের দ্বৈত রূপ চিহ্নিত।'
);

// ============================================================================
// TEST SUITE 4: Contradictory Keyword Detection & Flagging
// ============================================================================
console.log('\n--- পরীক্ষা ৪: পরস্পরবিরোধী (Contradictory / Conflicting) কীওয়ার্ড সনাক্তকরণ ---');

const contradictorySets = [
  {
    kws: ['modern living room', 'indoor', 'sofa', 'outdoor', 'open air', 'interior design'],
    expectedConflict: 'Indoor vs Outdoor',
  },
  {
    kws: ['city street', 'daylight', 'bright noon', 'nighttime', 'midnight', 'street lights'],
    expectedConflict: 'Day vs Night',
  },
  {
    kws: ['mountain peak', 'summer', 'sunny beach', 'snowy', 'winter blizzard', 'ice frost'],
    expectedConflict: 'Summer vs Winter',
  },
  {
    kws: ['minimalist background', 'no people', 'empty space', 'crowd', 'portrait of woman', 'lady model'],
    expectedConflict: 'No People vs Human Presence',
  },
  {
    kws: ['white background', 'isolated on white', 'cutout', 'complex background', 'busy cityscape'],
    expectedConflict: 'Isolated/Cutout vs Complex Background',
  },
  {
    kws: ['macro photography', 'microscopic detail', 'aerial view', 'panoramic landscape'],
    expectedConflict: 'Macro vs Panoramic/Aerial',
  },
];

for (const [idx, set] of contradictorySets.entries()) {
  const matches = detectContradictoryKeywords(set.kws);
  assert(
    matches.some((m) => m.conflict === set.expectedConflict),
    `৪.${idx + 1} পরস্পরবিরোধী জোড়া সনাক্তকরণ: ${set.expectedConflict}`,
    matches.length > 0 ? `দ্বন্দ্ব: ${matches[0].termA} ↔ ${matches[0].termB} (${matches[0].explanation})` : 'কোনো ম্যাচ নেই'
  );
}

// ============================================================================
// TEST SUITE 5: Full Keyword Hygiene Audit & Actionable Correction Flags
// ============================================================================
console.log('\n--- পরীক্ষা ৫: সামগ্রিক কীওয়ার্ড হাইজিন অডিট ও সংশোধন ফ্ল্যাগস ---');

const mixedHygieneKeywords = [
  'mountain landscape', '8k', 'photorealistic', // prompt artifacts
  'pine tree', 'pine trees',                    // repetitive stem
  'indoor', 'outdoor',                          // contradictory
  'delicious burger', 'kfc',                    // irrelevant domain & brand in nature photo
  'alpine meadow', 'blue lake'
];

const hygieneAudit = auditKeywordHygiene(mixedHygieneKeywords, {
  visualSubject: 'Alpine mountain lake and pine forest',
  category: 'Nature',
  hasHumans: false,
});

assert(
  hygieneAudit.promptArtifactsCount >= 2,
  '৫.১ প্রম্পট আর্টিফ্যাক্ট কাউন্ট ও সুনির্দিষ্ট কারণ চিহ্নিত',
  `পাওয়া গেছে: ${hygieneAudit.detectedPromptArtifacts.join(', ')}`
);

assert(
  hygieneAudit.repetitiveCount >= 1,
  '৫.২ রিপিটিটিভ বহুবচন ডুপ্লিকেট চিহ্নিত',
  `পাওয়া গেছে: ${hygieneAudit.detectedRepetitive.join(', ')}`
);

assert(
  hygieneAudit.contradictoryCount >= 1,
  '৫.৩ পরস্পরবিরোধী বিষয় চিহ্নিত',
  `পাওয়া গেছে: ${hygieneAudit.detectedContradictions.map((c) => c.conflict).join(', ')}`
);

assert(
  hygieneAudit.irrelevantCount >= 2,
  '৫.৪ ক্রস-ডোমেন ফুড ও ট্রেডমার্ক ব্র্যান্ড চিহ্নিত',
  `পাওয়া গেছে: ${hygieneAudit.detectedIrrelevant.join(', ')}`
);

assert(
  hygieneAudit.correctionFlags.length >= 5 &&
  hygieneAudit.correctionFlags.every((f) => f.term && f.reason && f.suggestedFix),
  '৫.৫ প্রতিটি সমস্যার জন্য সুনির্দিষ্ট সংশোধন নির্দেশিকা (Actionable Fixes) উপস্থিত',
  `মোট ${hygieneAudit.correctionFlags.length}টি সংশোধন পরামর্শ প্রস্তুত।`
);

// ============================================================================
// TEST SUITE 6: Marketplace Rules Validation (5 Marketplaces)
// ============================================================================
console.log('\n--- পরীক্ষা ৬: ৫টি স্টক মার্কেটপ্লেসের সুনির্দিষ্ট রুলস ভ্যালিডেশন ---');

const cleanSubject = 'Artisan handmade copper teapot with ceramic cup on wooden table';
const cleanKeywords = [
  'copper teapot', 'artisan kettle', 'handmade crafts', 'ceramic cup', 'tableware',
  'kitchen still life', 'warm lighting', 'rustic table', 'steam tea', 'hot beverage',
  'morning tea', 'traditional design', 'metallic reflection', 'horizontal view',
  'cozy atmosphere', 'close up', 'indoor setting', 'metal texture', 'artisan pottery', 'tea break'
];

// 6.1 Adobe Stock
const adobeRes = formatTitleForMarketplace('Artisan handmade copper teapot on rustic wooden table', cleanSubject, 'adobe-stock');
const adobeAudit = auditMarketplaceValidation(
  {
    title: adobeRes.title,
    description: 'Artisan handmade copper teapot on wooden table. Warm morning light with authentic crafts details.',
    keywords: cleanKeywords,
    visualSubject: cleanSubject,
    category: 'Still Life',
    hasHumans: false,
  },
  'adobe-stock'
);

assert(
  adobeAudit.checks.titleSyntaxAndSuffix.pass &&
  adobeRes.title.endsWith('Generative AI') &&
  adobeAudit.checks.keywordCount.pass &&
  adobeAudit.overallTechnicalPass,
  '৬.১ Adobe Stock: "Generative AI" সাফিক্স, দৈর্ঘ্য ও টেকনিক্যাল পাস যাচাই',
  `টাইটেল: "${adobeRes.title}" (${adobeRes.title.length} chars, words: ${adobeRes.title.split(' ').length})`
);

// 6.2 Shutterstock
const shutterRes = formatTitleForMarketplace('Handmade copper teapot', cleanSubject, 'shutterstock');
const shutterAudit = auditMarketplaceValidation(
  {
    title: shutterRes.title,
    description: 'Artisan handmade copper teapot on wooden table. Warm morning light with authentic crafts details.',
    keywords: cleanKeywords,
    visualSubject: cleanSubject,
    category: 'Still Life',
    hasHumans: false,
  },
  'shutterstock'
);

assert(
  shutterAudit.checks.titleWordCount.actual >= 5 &&
  shutterAudit.checks.titleWordCount.pass &&
  shutterAudit.overallTechnicalPass,
  '৬.২ Shutterstock: ন্যূনতম ৫ শব্দের কঠোর নিয়ম ও টেকনিক্যাল পাস',
  `টাইটেল: "${shutterRes.title}" (${shutterAudit.checks.titleWordCount.actual} words)`
);

// 6.3 Freepik
const freepikRes = formatTitleForMarketplace('Artisan handmade copper teapot on wooden table', cleanSubject, 'freepik');
const freepikAudit = auditMarketplaceValidation(
  {
    title: freepikRes.title,
    description: 'Artisan handmade copper teapot on wooden table. Warm morning light with authentic crafts details.',
    keywords: cleanKeywords,
    visualSubject: cleanSubject,
    category: 'Still Life',
    hasHumans: false,
  },
  'freepik'
);

assert(
  freepikAudit.checks.titleCharacterLength.actual <= 100 &&
  freepikAudit.overallTechnicalPass,
  '৬.৩ Freepik: সংক্ষিপ্ত টাইটেল মানদণ্ড (৩০–৬৫ chars) ও টেকনিক্যাল পাস',
  `টাইটেল: "${freepikRes.title}" (${freepikRes.title.length} chars)`
);

// 6.4 Dreamstime
const dreamsRes = formatTitleForMarketplace('Artisan copper teapot with ceramic cup', cleanSubject, 'dreamstime');
const dreamsAudit = auditMarketplaceValidation(
  {
    title: dreamsRes.title,
    description: 'Artisan handmade copper teapot on wooden table. Warm morning light with authentic crafts details.',
    keywords: cleanKeywords,
    visualSubject: cleanSubject,
    category: 'Still Life',
    hasHumans: false,
  },
  'dreamstime'
);

assert(
  dreamsAudit.checks.titleWordCount.actual >= 5 &&
  dreamsAudit.overallTechnicalPass,
  '৬.৪ Dreamstime: ন্যূনতম ৫ শব্দ ও ৪০–৮৫ chars মানদণ্ড যাচাই',
  `টাইটেল: "${dreamsRes.title}" (${dreamsRes.title.length} chars, ${dreamsAudit.checks.titleWordCount.actual} words)`
);

// 6.5 Wirestock
const wireRes = formatTitleForMarketplace('Artisan handmade copper teapot on rustic wooden table', cleanSubject, 'wirestock');
const wireAudit = auditMarketplaceValidation(
  {
    title: wireRes.title,
    description: 'Artisan handmade copper teapot on wooden table. Warm morning light with authentic crafts details.',
    keywords: cleanKeywords,
    visualSubject: cleanSubject,
    category: 'Still Life',
    hasHumans: false,
  },
  'wirestock'
);

assert(
  wireAudit.checks.keywordCount.actual >= 20 &&
  wireAudit.overallTechnicalPass,
  '৬.৫ Wirestock: সিন্ডিকেশন ও ন্যূনতম ২০ কীওয়ার্ড মানদণ্ড যাচাই',
  `কীওয়ার্ড সংখ্যা: ${wireAudit.checks.keywordCount.actual}টি`
);

// ============================================================================
// TEST SUITE 7: 3-Tier Verification Scope Separation
// ============================================================================
console.log('\n--- পরীক্ষা ৭: ৩-স্তরের স্বচ্ছ যাচাইকরণ পরিধি (Verification Scope) ---');

assert(
  Array.isArray(adobeAudit.policyScopeAudit.deterministicSoftwareVerified) &&
  adobeAudit.policyScopeAudit.deterministicSoftwareVerified.length >= 5,
  '৭.১ Tier 1: Software-Verified গাণিতিক ও সিনট্যাক্স যাচাই স্পষ্ট তালিকাভুক্ত',
  `চেক সংখ্যা: ${adobeAudit.policyScopeAudit.deterministicSoftwareVerified.length}টি`
);

assert(
  Array.isArray(adobeAudit.policyScopeAudit.heuristicEstimates) &&
  adobeAudit.policyScopeAudit.heuristicEstimates.length >= 3,
  '৭.২ Tier 2: Heuristic Estimates আনুমানিক পরিসংখ্যান স্পষ্ট তালিকাভুক্ত',
  `চেক সংখ্যা: ${adobeAudit.policyScopeAudit.heuristicEstimates.length}টি`
);

assert(
  Array.isArray(adobeAudit.policyScopeAudit.manualVisualReviewRequired) &&
  adobeAudit.policyScopeAudit.manualVisualReviewRequired.length >= 3,
  '৭.৩ Tier 3: Manual Visual Review ব্যবহারকারীর নিজস্ব দায়িত্ব স্পষ্ট তালিকাভুক্ত',
  `চেক সংখ্যা: ${adobeAudit.policyScopeAudit.manualVisualReviewRequired.length}টি`
);

assert(
  adobeAudit.policyScopeAudit.disclaimerBn.includes('কোড দ্বারা শুধুমাত্র টেকনিক্যাল ক্যারেক্টার লিমিট'),
  '৭.৪ মানব কিউরেটর ও লিগ্যাল রিলিজ সংক্রান্ত সততাপূর্ণ ডিসক্লেমার উপস্থিত',
  'সততা ডিসক্লেমার অক্ষুণ্ণ আছে।'
);

// ============================================================================
// TEST SUITE 8: End-to-End verifyAndSanitizeStockMetadata
// ============================================================================
console.log('\n--- পরীক্ষা ৮: এন্ড-টু-এন্ড verifyAndSanitizeStockMetadata পাইপলাইন ---');

const sanitizedFull = verifyAndSanitizeStockMetadata(
  {
    title: 'Delicious amazing copper kettle on wooden cutting board with melted Generative AI',
    description: 'High quality professional copper kettle with vanilla extract and secret spice for commercial sale.',
    keywords: [
      'copper kettle', '8k', 'photorealistic', 'kettle', 'kettles',
      'indoor', 'outdoor', 'apple watch', 'delicious', 'tea ware',
      'rustic wood', 'warm lighting', 'morning light', 'artisan pottery'
    ],
    visualSubjectDescription: 'Artisan handmade copper kettle on wooden table',
    category: 'Still Life',
    hasHumans: false,
  },
  'adobe-stock'
);

assert(
  sanitizedFull.title.endsWith('Generative AI') && !sanitizedFull.title.includes('Delicious'),
  '৮.১ টাইটেল থেকে প্রমোশনাল ফ্লফ অপসারণ এবং অ্যাডোবি সাফিক্স বজায় রাখা',
  `চূড়ান্ত টাইটেল: "${sanitizedFull.title}"`
);

assert(
  !sanitizedFull.description.includes('vanilla extract') &&
  !sanitizedFull.description.includes('secret spice') &&
  !sanitizedFull.description.includes('professional'),
  '৮.২ ডেসক্রিপশন থেকে অদৃশ্য উপাদান ও প্রমোশনাল হাইপ অপসারণ',
  `চূড়ান্ত বিবরণ: "${sanitizedFull.description}"`
);

assert(
  !sanitizedFull.keywords.includes('8k') &&
  !sanitizedFull.keywords.includes('photorealistic') &&
  !sanitizedFull.keywords.includes('apple watch'),
  '৮.৩ কীওয়ার্ড তালিকা থেকে প্রম্পট আর্টিফ্যাক্ট ও ব্র্যান্ড অপসারণ',
  `কীওয়ার্ড সংখ্যা: ${sanitizedFull.keywords.length}টি`
);

assert(
  sanitizedFull.isQualityVerified === true &&
  sanitizedFull.validationAudit !== undefined &&
  sanitizedFull.keywordAnomalyAudit !== undefined,
  '৮.৪ কোয়ালিটি ভেরিফায়েড ফ্ল্যাগ এবং কিওয়ার্ড অ্যানোমালি রিপোর্ট অন্তর্ভুক্ত',
  'এন্ড-টু-এন্ড ইন্টিগ্রেশন সফল।'
);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n========================================================================');
console.log(`টেস্ট সমাপ্ত: মোট ${totalTests}টি পরীক্ষার মধ্যে ${passedTests}টি PASS, ${failedTests}টি FAIL`);
console.log('========================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

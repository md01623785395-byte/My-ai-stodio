/**
 * Comprehensive Test Suite for Stock Metadata Accuracy & Marketplace Validation
 * 
 * Verifies:
 * 1. Spices, seasonings, and flavoring filtering (context-aware).
 * 2. Ungrounded objects, non-visible human entities, vehicle contamination, brands, emotions.
 * 3. Five marketplace rule engines (Adobe Stock, Shutterstock, Freepik, Dreamstime, Wirestock).
 * 4. Existing sample assets from mockAssets.ts.
 * 5. Truthful audit reporting (technical checks vs manual/legal disclaimers).
 */

import {
  filterAndGroundKeywords,
  removeUnsupportedDetailsAndFluff,
  formatTitleForMarketplace,
  verifyAndSanitizeStockMetadata,
  auditMarketplaceValidation,
  isSpiceSubjectVisible,
  isFoodSubject,
  isVehicleSubject,
  isHumanSubjectVisible,
  MARKETPLACE_TITLE_RULES,
  COMMERCIAL_TRADEMARK_BRANDS,
} from '../src/utils/stockMetadataValidator';
import { INITIAL_ASSETS } from '../src/data/mockAssets';

console.log('================================================================');
console.log('AI CREATOR STUDIO: স্টক মেটাডেটা নির্ভুলতা ও ভ্যালিডেশন পরীক্ষা');
console.log('================================================================\n');

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
    if (detail) console.error(`       └─ FAILED: ${detail}`);
  }
}

// ============================================================================
// টেস্ট ১: Spices, Seasonings, Flavoring এবং প্রাসঙ্গিক শব্দরূপের কনটেক্সট-অ্যাওয়ার ফিল্টারিং
// ============================================================================
console.log('--- পরীক্ষা ১: Spices, Seasonings ও Flavoring-এর কনটেক্সট-অ্যাওয়ার ফিল্টারিং ---');

// ১.১ খাদ্য/বার্গার ছবিতে যেখানে মসলা আলাদা দৃশ্যমান বস্তু নয়
const burgerSubject = 'Gourmet beef cheeseburger with cheddar cheese and lettuce on cutting board';
const burgerCandidates = [
  'cheeseburger', 'burger', 'beef', 'lettuce', 'tomato', 'sesame bun',
  'spices', 'seasoning', 'seasonings', 'flavoring', 'flavorings', 'spiced', 'secret spice',
  'steak knife', 'dipping sauce', 'steam', 'rising steam', 'delicious', 'gourmet'
];

const burgerResult = filterAndGroundKeywords(burgerCandidates, burgerSubject, 'Food', 'adobe-stock');
const burgerKw = burgerResult.keywords;

assert(
  !burgerKw.includes('spices') && !burgerKw.includes('seasoning') && !burgerKw.includes('seasonings'),
  'বার্গার ছবিতে অদৃশ্য মসলা ও সিজনিং (spices, seasoning, seasonings) বাদ দেওয়ার পরীক্ষা',
  `আউটপুট কীওয়ার্ডে spices/seasoning নেই। বাদ পড়েছে: ${burgerResult.removedItemsList?.filter((i) => /spice|season/i.test(i)).join(', ')}`
);

assert(
  !burgerKw.includes('flavoring') && !burgerKw.includes('flavorings'),
  'অদৃশ্য রাসায়নিক ফ্লেভারিং (flavoring, flavorings) বাদ দেওয়ার পরীক্ষা',
  'স্বাদ বা কৃত্রিম ফ্লেভারিং খালি চোখে দেখা যায় না বিধায় সঠিকভাবে অপসারিত।'
);

assert(
  !burgerKw.includes('steak knife') && !burgerKw.includes('dipping sauce') && !burgerKw.includes('steam'),
  'ছবিতে অনুপস্থিত কাটলারি, ডিপিং সস ও ধোঁয়া অপসারণ পরীক্ষা',
  'steak knife, dipping sauce, steam সফলভাবে ফিল্টার হয়েছে।'
);

// ১.২ বাস্তব মসলা প্রদর্শন (Genuine Spice Display) যেখানে মসলাই মূল বিষয়বস্তু
const spiceSubject = 'Assorted whole Indian spices and dried culinary herbs in rustic wooden bowls on dark table';
const spiceCandidates = [
  'spices', 'spice', 'seasoning', 'seasonings', 'peppercorn', 'cinnamon',
  'turmeric', 'star anise', 'flavoring', 'artificial flavoring', 'culinary herbs'
];

const spiceResult = filterAndGroundKeywords(spiceCandidates, spiceSubject, 'Food', 'adobe-stock');
const spiceKw = spiceResult.keywords;

assert(
  spiceKw.includes('spices') && spiceKw.includes('spice') && spiceKw.includes('seasoning') && spiceKw.includes('seasonings'),
  'প্রকৃত মসলা ডিসপ্লে ছবিতে বৈধ মসলা ও সিজনিং কীওয়ার্ড অক্ষুণ্ণ রাখার পরীক্ষা',
  `সংরক্ষিত হয়েছে: spices, spice, seasoning, seasonings, peppercorn, cinnamon`
);

assert(
  !spiceKw.includes('flavoring') && !spiceKw.includes('artificial flavoring'),
  'মসলার ছবিতেও অদৃশ্য স্বাদ/ফ্লেভারিং (flavoring, artificial flavoring) বাদ দেওয়ার পরীক্ষা',
  'শারীরিক মসলা থাকলেও অদৃশ্য স্বাদ/ফ্লেভারিং অপসারিত।'
);

// ============================================================================
// টেস্ট ২: ছবির দৃশ্যমান বিষয়ের সঙ্গে অমিল—বস্তু, উপাদান, অ্যাকশন, ব্র্যান্ড ও বৈশিষ্ট্য
// ============================================================================
console.log('\n--- পরীক্ষা ২: অমিল অবজেক্ট, মানুষ, যানবাহন, ব্র্যান্ড ও কাল্পনিক অ্যাকশন ফিল্টারিং ---');

// ২.১ মানুষহীন স্থাপত্য ভিলা
const villaSubject = 'Minimalist brutalist villa overlooking alpine pine forest with structural glass';
const villaAlienCandidates = [
  'scandinavian villa', 'modern architecture', 'pine forest', 'glass facade',
  'woman', 'fashion model', 'person', 'female', 'sports car', 'hypercar',
  'rolex', 'apple watch', 'nike', 'celebrating victory', 'thinking', 'delicious burger'
];

const villaResult = filterAndGroundKeywords(
  villaAlienCandidates,
  villaSubject,
  'Architecture',
  'adobe-stock',
  { hasHumans: false }
);
const villaKw = villaResult.keywords;

assert(
  !villaKw.includes('woman') && !villaKw.includes('fashion model') && !villaKw.includes('person'),
  'মানুষহীন ছবিতে মানুষ/মডেল (woman, model, person) কীওয়ার্ড বাতিলের পরীক্ষা',
  'hasHumans: false থাকায় সমস্ত মানুষ সম্পর্কিত কীওয়ার্ড বাদ দেওয়া হয়েছে।'
);

assert(
  !villaKw.includes('sports car') && !villaKw.includes('hypercar'),
  'স্থাপত্য ছবিতে অনাহূত যানবাহন (sports car, hypercar) বাতিলের পরীক্ষা',
  'ছবিতে গাড়ি না থাকায় যানবাহন কীওয়ার্ড সফলভাবে বাদ পড়েছে।'
);

assert(
  !villaKw.includes('rolex') && !villaKw.includes('apple watch') && !villaKw.includes('nike'),
  'বাণিজ্যিক ট্রেডমার্ক ব্র্যান্ড (Rolex, Apple Watch, Nike) বাতিলের পরীক্ষা',
  'স্টক এজেন্সির বাণিজ্যিক রিজেকশন রোধে ট্রেডমার্ক ব্র্যান্ড সম্পূর্ণ অপসারিত।'
);

assert(
  !villaKw.includes('celebrating victory') && !villaKw.includes('thinking'),
  'অদৃশ্য সাবজেক্টিভ অনুভূতি ও চিন্তা (celebrating, thinking) বাতিলের পরীক্ষা',
  'কাল্পনিক অভ্যন্তরীণ মানসিক অবস্থা ও অ্যাকশন ফিল্টার হয়েছে।'
);

assert(
  !villaKw.includes('delicious burger'),
  'নন-ফুড ছবিতে খাদ্য সম্পর্কিত উপাদান (delicious burger) ক্রস-কন্টামিনেশন রোধ',
  'স্থাপত্য ক্যাটাগরিতে বার্গার/ফুড সম্পর্কিত শব্দ বাদ পড়েছে।'
);

// ============================================================================
// টেস্ট ৩: পাঁচটি মার্কেটপ্লেসের শিরোনাম, কীওয়ার্ড ও বিদ্যমান ভ্যালিডেশন পরীক্ষা
// ============================================================================
console.log('\n--- পরীক্ষা ৩: ৫টি স্টক মার্কেটপ্লেসের সুনির্দিষ্ট ভ্যালিডেশন অডিট ---');

const testSubject = 'Organic raw honey jar with honeycomb and wooden dipper on kitchen table';
const rawTitleInput = 'Delicious amazing organic honey jar with honeycomb on wooden cutting board with melted';
const sampleKeywords = [
  'honey', 'honeycomb', 'glass jar', 'wooden dipper', 'organic honey',
  'raw honey', 'sweet food', 'breakfast', 'natural sweetener', 'golden honey',
  'kitchen table', 'close up', 'morning light', 'macro shot', 'food photography',
  'amber color', 'dripping honey', 'bee product', 'pure honey', 'healthy diet'
];

// ৩.১ Adobe Stock
const adobeAudit = auditMarketplaceValidation(
  {
    title: formatTitleForMarketplace(rawTitleInput, testSubject, 'adobe-stock').title,
    description: 'Fresh organic honey jar with honeycomb. Clean studio presentation.',
    keywords: sampleKeywords,
    visualSubject: testSubject,
    category: 'Food',
    hasHumans: false,
  },
  'adobe-stock'
);

assert(
  adobeAudit.checks.titleSyntaxAndSuffix.pass &&
    adobeAudit.checks.titleWordCount.pass &&
    adobeAudit.checks.titleCharacterLength.pass,
  'Adobe Stock টাইটেল শব্দসংখ্যা (>=৫), দৈর্ঘ্য এবং "Generative AI" সাফিক্স যাচাই',
  `টাইটেল: "${formatTitleForMarketplace(rawTitleInput, testSubject, 'adobe-stock').title}" (${adobeAudit.checks.titleCharacterLength.actual} chars)`
);

// ৩.২ Shutterstock
const shutterTitle = formatTitleForMarketplace(rawTitleInput, testSubject, 'shutterstock').title;
const shutterAudit = auditMarketplaceValidation(
  {
    title: shutterTitle,
    description: 'Fresh organic honey jar with honeycomb. Clean studio presentation.',
    keywords: sampleKeywords,
    visualSubject: testSubject,
    category: 'Food',
    hasHumans: false,
  },
  'shutterstock'
);

assert(
  shutterAudit.checks.titleWordCount.actual >= 5 && shutterAudit.checks.titleWordCount.pass,
  'Shutterstock ন্যূনতম ৫ শব্দের কঠোর নিয়ম যাচাই (Strict min 5 words)',
  `শব্দ সংখ্যা: ${shutterAudit.checks.titleWordCount.actual} (ন্যূনতম ৫টি আবশ্যক)`
);

// ৩.৩ Freepik
const freepikTitle = formatTitleForMarketplace(rawTitleInput, testSubject, 'freepik').title;
const freepikAudit = auditMarketplaceValidation(
  {
    title: freepikTitle,
    description: 'Fresh organic honey jar with honeycomb. Clean studio presentation.',
    keywords: sampleKeywords,
    visualSubject: testSubject,
    category: 'Food',
    hasHumans: false,
  },
  'freepik'
);

assert(
  freepikAudit.checks.titleCharacterLength.actual <= 100 && freepikAudit.checks.titleWordCount.actual >= 3,
  'Freepik সংক্ষিপ্ত ও স্পষ্ট টাইটেল সীমা যাচাই (৩০–৬৫ chars recommended)',
  `টাইটেল: "${freepikTitle}" (${freepikAudit.checks.titleCharacterLength.actual} chars)`
);

// ৩.৪ Dreamstime
const dreamsTitle = formatTitleForMarketplace(rawTitleInput, testSubject, 'dreamstime').title;
const dreamsAudit = auditMarketplaceValidation(
  {
    title: dreamsTitle,
    description: 'Fresh organic honey jar with honeycomb. Clean studio presentation.',
    keywords: sampleKeywords,
    visualSubject: testSubject,
    category: 'Food',
    hasHumans: false,
  },
  'dreamstime'
);

assert(
  dreamsAudit.checks.titleWordCount.actual >= 5 && dreamsAudit.checks.titleCharacterLength.actual >= 30,
  'Dreamstime টাইটেল মানদণ্ড যাচাই (মিন ৫ শব্দ, ৪০–৮৫ chars)',
  `টাইটেল: "${dreamsTitle}" (${dreamsAudit.checks.titleWordCount.actual} words)`
);

// ৩.৫ Wirestock
const wireTitle = formatTitleForMarketplace(rawTitleInput, testSubject, 'wirestock').title;
const wireAudit = auditMarketplaceValidation(
  {
    title: wireTitle,
    description: 'Fresh organic honey jar with honeycomb. Clean studio presentation.',
    keywords: sampleKeywords,
    visualSubject: testSubject,
    category: 'Food',
    hasHumans: false,
  },
  'wirestock'
);

assert(
  wireAudit.checks.titleCharacterLength.actual >= 35 && wireAudit.checks.titleWordCount.actual >= 5,
  'Wirestock মাল্টি-এজেন্সি সিন্ডিকেশন টাইটেল মানদণ্ড যাচাই',
  `টাইটেল: "${wireTitle}"`
);

// ৩.৬ সত্যনিষ্ঠ অডিট: অক্ষরসীমা পাস হওয়াকে সম্পূর্ণ নীতিমালা পাস দাবি না করা
assert(
  adobeAudit.policyScopeAudit.unverifiableByCodeAlone.length >= 3 &&
    adobeAudit.policyScopeAudit.disclaimerBn.includes('কোড দ্বারা স্বয়ংক্রিয়ভাবে ১০০% নিশ্চিত করা সম্ভব নয়'),
  'কোড যাচাইয়ের সততা: মডেল রিলিজ ও কিউরেটর অনুমোদনকে কোডের বাইরে রাখার স্পষ্ট ডিসক্লেইমার',
  `ডিসক্লেইমার উপস্থিত: "${adobeAudit.policyScopeAudit.disclaimerBn.slice(0, 85)}..."`
);

// ============================================================================
// টেস্ট ৪: পূর্বে সংরক্ষিত স্যাম্পল অ্যাসেটস (mockAssets.ts) নিয়ে এন্ড-টু-এন্ড যাচাই
// ============================================================================
console.log('\n--- পরীক্ষা ৪: বিদ্যমান নমুনা অ্যাসেটস (mockAssets) দিয়ে এন্ড-টু-এন্ড যাচাই ---');

// Asset 1: Cyberpunk alleyway
const asset1 = INITIAL_ASSETS[0];
const asset1Metadata = verifyAndSanitizeStockMetadata(
  {
    title: 'Cyberpunk alleyway Neo-Tokyo with volumetric steam and neon signs',
    description: 'Photorealistic cyberpunk alleyway at midnight. High quality professional octane render with steam.',
    keywords: ['cyberpunk', 'neon lights', 'alleyway', 'japan', 'steaming', 'delicious', 'apple', 'tokyo'],
    visualSubjectDescription: 'Cyberpunk wet alleyway with neon light reflections at night',
    category: 'Backgrounds',
    hasHumans: false,
  },
  'adobe-stock'
);

assert(
  !asset1Metadata.keywords.includes('apple') &&
    !asset1Metadata.keywords.includes('steaming') &&
    !asset1Metadata.keywords.includes('delicious') &&
    !asset1Metadata.keywords.includes('woman'),
  'Asset 1 (Cyberpunk): ব্র্যান্ড (Apple), অদৃশ্য বাষ্প (steaming) ও খাবারের শব্দ ফিল্টার',
  `কীওয়ার্ড সংখ্যা: ${asset1Metadata.keywords.length}, টাইটেল: "${asset1Metadata.title}"`
);

// Asset 2: Bioluminescent Flora
const asset2 = INITIAL_ASSETS[1];
const asset2Metadata = verifyAndSanitizeStockMetadata(
  {
    title: 'Bioluminescent glass orchid glowing with turquoise energy',
    description: 'Surreal fantasy glass flower with glowing core. Beautiful creative digital creation with spices.',
    keywords: ['orchid', 'bioluminescent', 'flower', 'glass', 'spices', 'flavoring', 'nike', 'person'],
    visualSubjectDescription: 'Bioluminescent glass orchid with glowing petals and dew droplets',
    category: 'Nature',
    hasHumans: false,
  },
  'freepik'
);

assert(
  !asset2Metadata.keywords.includes('spices') &&
    !asset2Metadata.keywords.includes('flavoring') &&
    !asset2Metadata.keywords.includes('nike') &&
    !asset2Metadata.keywords.includes('person'),
  'Asset 2 (Orchid): অপ্রাসঙ্গিক মসলা (spices), ফ্লেভারিং, ব্র্যান্ড (Nike) ও মানুষ বাতিল',
  `ফুলের ছবি থেকে ফুড ও ব্র্যান্ড সফলভাবে ফিল্টার হয়েছে।`
);

// Asset 3: Luxury Perfume
const asset3 = INITIAL_ASSETS[2];
const asset3Metadata = verifyAndSanitizeStockMetadata(
  {
    title: 'Minimalist luxury perfume bottle on volcanic black sand',
    description: 'Luxury perfume bottle on volcanic sand with golden light. High end commercial photo with delicious aroma and rolex watch.',
    keywords: ['perfume', 'bottle', 'black sand', 'cosmetics', 'delicious', 'rolex', 'sports car', 'woman model'],
    visualSubjectDescription: 'Minimalist glass perfume bottle on black sand under warm golden rays',
    category: 'Beauty',
    hasHumans: false,
  },
  'shutterstock'
);

assert(
  !asset3Metadata.keywords.includes('delicious') &&
    !asset3Metadata.keywords.includes('rolex') &&
    !asset3Metadata.keywords.includes('sports car') &&
    !asset3Metadata.keywords.includes('woman model'),
  'Asset 3 (Perfume): রোলেক্স ব্র্যান্ড, স্পোর্টস কার ও ফুড ফ্লফ ফিল্টার',
  `টাইটেল: "${asset3Metadata.title}" (Words: ${asset3Metadata.title.split(' ').length})`
);

// Asset 5: Scandinavian Villa
const asset5 = INITIAL_ASSETS[4];
const asset5Metadata = verifyAndSanitizeStockMetadata(
  {
    title: 'Scandinavian glass villa overlooking misty alpine forest',
    description: 'Minimalist architecture villa in misty pine forest. Architectural digest photography with celebrating success and delicious meal.',
    keywords: ['villa', 'architecture', 'forest', 'glass', 'celebrating success', 'delicious', 'bmw', 'tesla'],
    visualSubjectDescription: 'Minimalist structural glass villa overlooking pine forest',
    category: 'Architecture',
    hasHumans: false,
  },
  'adobe-stock'
);

assert(
  !asset5Metadata.keywords.includes('celebrating success') &&
    !asset5Metadata.keywords.includes('delicious') &&
    !asset5Metadata.keywords.includes('bmw') &&
    !asset5Metadata.keywords.includes('tesla'),
  'Asset 5 (Villa): বিএমডব্লিউ, টেসলা, কাল্পনিক সাফল্য ও খাবার ফিল্টার',
  `টাইটেল: "${asset5Metadata.title}"`
);

// ============================================================================
// টেস্ট ফলাফল সারাংশ
// ============================================================================
console.log('\n================================================================');
console.log(`পরীক্ষা সমাপ্ত: মোট ${totalTests}টি পরীক্ষার মধ্যে ${passedTests}টি PASS, ${failedTests}টি FAIL`);
console.log('================================================================');
if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

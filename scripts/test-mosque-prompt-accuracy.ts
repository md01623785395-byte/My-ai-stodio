/**
 * Priority 3.5 — Focused Test Suite: Mosque Prompt Accuracy & Category Matching
 *
 * Verifies:
 * 1. Topic Recognition: "মসজিদের পিক", "Mosque photos", "Mosque images" correctly detected as mosque topics.
 * 2. Category Matching: Automatically matched to 'স্থাপত্য ও ঐতিহাসিক স্থান (Architecture & Historical Buildings)' / 'Buildings / Architecture'.
 * 3. Primary Subject Integrity: Primary subject is an actual mosque (exterior, dome, minaret, prayer hall, mihrab, courtyard, arches, details).
 * 4. Exclusion of Unrelated Islamic Objects: Zero Quran, tasbih, prayer mats, perfume, prayer caps by default.
 * 5. All 7 Required Scene Types: Generates complete exterior, domes & minarets, interior prayer hall, mihrab, courtyard, arches, architectural details.
 * 6. Batch Diversity: 0 duplicate prompt strings across 10, 50, and 100 prompts.
 * 7. Single Prompt Rephrasing: Preserves architectural focus and negative prompt.
 * 8. Marketing Presets: 10 distinct concepts for mosque queries with no humans and correct category.
 * 9. Regression Safety: Other topics (honey, gadgets, etc.) remain untouched.
 */

import {
  isMosqueTopic,
  detectCategoryForTopic,
  hasExplicitIslamicObjectRequest,
  generateDiverseCombinatorialPrompts,
  generateBatchPlan,
  rephraseSinglePrompt,
  MOSQUE_NEGATIVE_PROMPT,
} from '../src/utils/batchPromptEngine';
import { getPrebuilt10Concepts } from '../src/data/marketingPresets';
import { isMosqueSubject } from '../src/utils/stockMetadataValidator';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, details?: string) {
  results.push({
    name: testName,
    passed: condition,
    details: details || (condition ? 'উত্তীর্ণ' : 'ব্যর্থ'),
  });
  const symbol = condition ? '✅' : '❌';
  console.log(`${symbol} ${testName}${details ? ` -> ${details}` : ''}`);
  if (!condition) {
    throw new Error(`Assertion failed: ${testName} (${details})`);
  }
}

async function runMosquePromptAccuracyTests() {
  console.log('\n=============================================================');
  console.log('Priority 3.5 — Mosque Prompt Accuracy & Category Matching Test');
  console.log('=============================================================\n');

  // -----------------------------------------------------------------
  // 1. Topic Recognition Tests
  // -----------------------------------------------------------------
  console.log('--- ১. বিষয় শনাক্তকরণ (Topic Recognition) ---');
  const positiveTopics = [
    'মসজিদের পিক',
    'মসজিদের ছবি',
    'মসজিদ',
    'Mosque photos',
    'Mosque images',
    'mosque pictures',
    'Grand Mosque architecture',
    'historical masjid exterior',
    'বায়তুল মোকাররম মসজিদ',
  ];

  for (const t of positiveTopics) {
    assert(
      isMosqueTopic(t) === true,
      `ইতিবাচক বিষয় শনাক্তকরণ: "${t}"`,
      `isMosqueTopic("${t}") === true`
    );
  }

  const negativeTopics = [
    'খাঁটি সুন্দরবনের মধু ও প্রাকৃতিক মশলা',
    'আধুনিক মিনিমালিস্টিক গ্যাজেট',
    'এগ্রিটেক উল্লম্ব ফার্মিং',
    'organic honey and cinnamon',
    'minimalist smartwatch',
  ];

  for (const t of negativeTopics) {
    assert(
      isMosqueTopic(t) === false,
      `নেতিবাচক বিষয় শনাক্তকরণ (অন্যান্য বিষয় অক্ষত): "${t}"`,
      `isMosqueTopic("${t}") === false`
    );
  }

  // -----------------------------------------------------------------
  // 2. Category Matching Tests
  // -----------------------------------------------------------------
  console.log('\n--- ২. ক্যাটাগরি ম্যাচিং (Category Matching) ---');
  const catBengali = detectCategoryForTopic('মসজিদের পিক');
  assert(
    catBengali.includes('স্থাপত্য') || catBengali.includes('Architecture'),
    '"মসজিদের পিক"-এর জন্য স্থাপত্য ক্যাটাগরি নির্ধারিত',
    `Category: "${catBengali}"`
  );

  const catPhotos = detectCategoryForTopic('Mosque photos');
  assert(
    catPhotos.includes('স্থাপত্য') || catPhotos.includes('Architecture'),
    '"Mosque photos"-এর জন্য স্থাপত্য ক্যাটাগরি নির্ধারিত',
    `Category: "${catPhotos}"`
  );

  const catImages = detectCategoryForTopic('Mosque images');
  assert(
    catImages.includes('স্থাপত্য') || catImages.includes('Architecture'),
    '"Mosque images"-এর জন্য স্থাপত্য ক্যাটাগরি নির্ধারিত',
    `Category: "${catImages}"`
  );

  const catHoney = detectCategoryForTopic('জৈব মধু', 'বাণিজ্যিক পণ্য');
  assert(
    catHoney === 'বাণিজ্যিক পণ্য',
    'অপ্রাসঙ্গিক বিষয়ে ফলব্যাক ক্যাটাগরি অক্ষত',
    `Category: "${catHoney}"`
  );

  // -----------------------------------------------------------------
  // 3. Batch Generation for “মসজিদের পিক” (Bengali)
  // -----------------------------------------------------------------
  console.log('\n--- ৩. “মসজিদের পিক” ব্যাচ জেনারেশন ও ইসলামিক অবজেক্ট বর্জন পরীক্ষা ---');
  const batchBn = generateDiverseCombinatorialPrompts('মসজিদের পিক', 50);
  assert(batchBn.length === 50, '৫০টি প্রম্পট সফলভাবে উৎপন্ন হয়েছে');

  // Check forbidden tabletop props
  const forbiddenRegex = /\b(quran|koran|tasbih|tasbeeh|misbaha|prayer\s*mat|prayer\s*rug|sajjadah|musallah|janamaz|perfume|attar|ittar|prayer\s*cap|kufi|topi|taqiyah|কুরআন|তসবিহ|জায়নামাজ|জায়নামাজ|আতর|টুপি)\b/i;

  let forbiddenCountBn = 0;
  for (const item of batchBn) {
    if (forbiddenRegex.test(item.prompt) || forbiddenRegex.test(item.subjectBn)) {
      forbiddenCountBn++;
    }
  }

  assert(
    forbiddenCountBn === 0,
    '“মসজিদের পিক” প্রম্পটে কুরআন, তসবিহ, জায়নামাজ, আতর ও টুপি সম্পূর্ণ অনুপস্থিত',
    `Forbidden objects count: ${forbiddenCountBn}/50`
  );

  // Verify negativePrompt has explicit exclusions
  const sampleBn = batchBn[0];
  assert(
    !!sampleBn.negativePrompt &&
    sampleBn.negativePrompt.includes('Quran') &&
    sampleBn.negativePrompt.includes('tasbih') &&
    sampleBn.negativePrompt.includes('prayer mat') &&
    sampleBn.negativePrompt.includes('perfume') &&
    sampleBn.negativePrompt.includes('prayer cap'),
    'নেগেটিভ প্রম্পটে টেবিলটপ ইসলামিক অবজেক্টের স্পষ্ট বর্জন বিদ্যমান',
    'Negative prompt contains Quran, tasbih, prayer mat, perfume, prayer cap exclusions'
  );

  // -----------------------------------------------------------------
  // 4. Batch Generation for “Mosque photos” & “Mosque images” (English)
  // -----------------------------------------------------------------
  console.log('\n--- ৪. “Mosque photos” ও “Mosque images” পরীক্ষা ---');
  const batchPhotos = generateDiverseCombinatorialPrompts('Mosque photos', 50);
  const batchImages = generateDiverseCombinatorialPrompts('Mosque images', 50);

  let forbiddenCountEn = 0;
  for (const item of [...batchPhotos, ...batchImages]) {
    if (forbiddenRegex.test(item.prompt) || forbiddenRegex.test(item.subjectBn)) {
      forbiddenCountEn++;
    }
  }

  assert(
    forbiddenCountEn === 0,
    'ইংরেজি বিষয়েও টেবিলটপ ইসলামিক আইটেম সম্পূর্ণ অনুপস্থিত (০টি)',
    `Forbidden count across 100 prompts: ${forbiddenCountEn}/100`
  );

  // Verify primary subject is mosque architecture
  let mosqueSubjectCount = 0;
  for (const item of batchPhotos) {
    const isMosqueRelated =
      item.prompt.toLowerCase().includes('mosque') ||
      item.prompt.toLowerCase().includes('masjid') ||
      item.subjectBn.includes('মসজিদ');
    if (isMosqueRelated) mosqueSubjectCount++;
  }
  assert(
    mosqueSubjectCount === 50,
    'প্রতিটি প্রম্পটের প্রধান ভিজ্যুয়াল সাবজেক্ট প্রকৃত মসজিদ স্থাপত্য',
    `Mosque-centered prompts: ${mosqueSubjectCount}/50`
  );

  // -----------------------------------------------------------------
  // 5. Verification of All 7 Required Scene Types
  // -----------------------------------------------------------------
  console.log('\n--- ৫. ৭টি সুনির্দিষ্ট মসজিদ দৃশ্যপটের উপস্থিতি যাচাই ---');
  // 1. Complete exterior
  // 2. Domes and minarets
  // 3. Interior prayer hall
  // 4. Mihrab
  // 5. Courtyard
  // 6. Arches
  // 7. Architectural details

  let hasCompleteExterior = false;
  let hasDomesAndMinarets = false;
  let hasInteriorPrayerHall = false;
  let hasMihrab = false;
  let hasCourtyard = false;
  let hasArches = false;
  let hasArchitecturalDetails = false;

  for (const item of batchPhotos) {
    const text = (item.prompt + ' ' + item.subjectBn + ' ' + item.sceneBn).toLowerCase();
    if (text.includes('complete exterior') || text.includes('facade') || text.includes('বহিদৃশ্য') || text.includes('সম্মুখভাগ')) {
      hasCompleteExterior = true;
    }
    if (text.includes('dome') || text.includes('minaret') || text.includes('গম্বুজ') || text.includes('মিনার')) {
      hasDomesAndMinarets = true;
    }
    if (text.includes('prayer hall') || text.includes('interior') || text.includes('প্রার্থনা কক্ষ') || text.includes('ঝাড়বাতি')) {
      hasInteriorPrayerHall = true;
    }
    if (text.includes('mihrab') || text.includes('qibla') || text.includes('মিহরাব') || text.includes('কিবলা')) {
      hasMihrab = true;
    }
    if (text.includes('courtyard') || text.includes('sahn') || text.includes('প্রাঙ্গণ') || text.includes('চত্বর') || text.includes('fountain')) {
      hasCourtyard = true;
    }
    if (text.includes('arch') || text.includes('colonnade') || text.includes('খিলান') || text.includes('arcade')) {
      hasArches = true;
    }
    if (text.includes('muqarnas') || text.includes('mosaic') || text.includes('tile') || text.includes('মুকারনাস') || text.includes('মোজাইক') || text.includes('খোদাই')) {
      hasArchitecturalDetails = true;
    }
  }

  assert(hasCompleteExterior, 'দৃশ্যপট ১: সম্পূর্ণ বহিদৃশ্য (Complete Exterior) উপস্থিত');
  assert(hasDomesAndMinarets, 'দৃশ্যপট ২: গম্বুজ ও মিনার (Domes and Minarets) উপস্থিত');
  assert(hasInteriorPrayerHall, 'দৃশ্যপট ৩: সুবিশাল অভ্যন্তরীণ প্রার্থনা কক্ষ (Interior Prayer Hall) উপস্থিত');
  assert(hasMihrab, 'দৃশ্যপট ৪: মিহরাব ও কিবলা দেওয়াল (Mihrab & Qibla Wall) উপস্থিত');
  assert(hasCourtyard, 'দৃশ্যপট ৫: মার্বেল প্রাঙ্গণ ও সাহন (Courtyard / Sahn) উপস্থিত');
  assert(hasArches, 'দৃশ্যপট ৬: ছন্দময় খিলান সারি ও তোরণ (Arches & Colonnades) উপস্থিত');
  assert(hasArchitecturalDetails, 'দৃশ্যপট ৭: মুকারনাস ও মোজাইক ডিটেইল (Architectural Details & Muqarnas) উপস্থিত');

  // -----------------------------------------------------------------
  // 6. 100-Prompt Diversity & Uniqueness Test
  // -----------------------------------------------------------------
  console.log('\n--- ৬. ১০০-প্রম্পট বৈচিত্র্য ও ডুপ্লিকেটহীনতা পরীক্ষা ---');
  const batch100 = generateDiverseCombinatorialPrompts('মসজিদের পিক', 100);
  assert(batch100.length === 100, '১০০টি প্রম্পটের ব্যাচ সফলভাবে উৎপন্ন হয়েছে');

  const promptStrings = batch100.map((p) => p.prompt.trim());
  const uniquePromptStrings = new Set(promptStrings);
  assert(
    uniquePromptStrings.size === 100,
    '১০০টি প্রম্পটের মধ্যে ০% পুনরাবৃত্তি (১০০% ইউনিক প্রম্পট স্ট্রিং)',
    `Unique prompts: ${uniquePromptStrings.size}/100`
  );

  const uniqueComps = new Set(batch100.map((p) => p.composition)).size;
  const uniqueLights = new Set(batch100.map((p) => p.lighting)).size;
  const uniqueCams = new Set(batch100.map((p) => p.cameraAngle)).size;
  const uniqueBgs = new Set(batch100.map((p) => p.background)).size;

  assert(uniqueComps >= 25, `কম্পোজিশন বৈচিত্র্য: ${uniqueComps}টি আলাদা কম্পোজিশন`);
  assert(uniqueLights >= 25, `আলোর বৈচিত্র্য: ${uniqueLights}টি আলাদা লাইটিং সেটআপ`);
  assert(uniqueCams >= 20, `ক্যামেরা লেন্স বৈচিত্র্য: ${uniqueCams}টি আলাদা লেন্স`);
  assert(uniqueBgs >= 20, `পটভূমির বৈচিত্র্য: ${uniqueBgs}টি আলাদা ব্যাকগ্রাউন্ড`);

  // -----------------------------------------------------------------
  // 7. Single Prompt Rephrasing Test
  // -----------------------------------------------------------------
  console.log('\n--- ৭. একক প্রম্পট রিফ্রেজ পরীক্ষা (rephraseSinglePrompt) ---');
  const originalItem = batchBn[0];
  const rephrasedItem = await rephraseSinglePrompt(originalItem);

  assert(
    rephrasedItem.prompt !== originalItem.prompt,
    'একক প্রম্পট সফলভাবে ভিন্ন বর্ণনায় পুনর্গঠিত',
    'Prompt text changed upon rephrasing'
  );
  assert(
    rephrasedItem.commercialNiche.includes('স্থাপত্য') || rephrasedItem.commercialNiche.includes('Architecture'),
    'রিফ্রেজ করা প্রম্পটেও স্থাপত্য ক্যাটাগরি অক্ষত',
    `Niche: "${rephrasedItem.commercialNiche}"`
  );
  assert(
    !!rephrasedItem.negativePrompt && rephrasedItem.negativePrompt.includes('Quran'),
    'রিফ্রেজ করা প্রম্পটেও ইসলামিক অবজেক্টের নেগেটিভ প্রম্পট অক্ষত',
    'Negative prompt preserved'
  );

  // -----------------------------------------------------------------
  // 8. Marketing Presets Concepts Test
  // -----------------------------------------------------------------
  console.log('\n--- ৮. মার্কেটিং এআই প্রি-বিল্ট কনসেপ্ট পরীক্ষা (getPrebuilt10Concepts) ---');
  const mosqueConceptsBn = getPrebuilt10Concepts('মসজিদের পিক');
  const mosqueConceptsEn = getPrebuilt10Concepts('Mosque photos');

  assert(mosqueConceptsBn.length === 10, '১০টি মসজিদ কনসেপ্ট সফলভাবে তৈরি (বাংলা)');
  assert(mosqueConceptsEn.length === 10, '১০টি মসজিদ কনসেপ্ট সফলভাবে তৈরি (ইংরেজি)');

  // All 10 must be Buildings / Architecture
  const allArchBn = mosqueConceptsBn.every((c) => c.category === 'Buildings / Architecture');
  const allNoHumansBn = mosqueConceptsBn.every((c) => c.subjectType === 'no-humans');
  assert(allArchBn, 'সব ১০টি কনসেপ্টের ক্যাটাগরি "Buildings / Architecture"');
  assert(allNoHumansBn, 'সব ১০টি কনসেপ্ট মডেল রিলিজ মুক্ত (no-humans)');

  let conceptsForbiddenCount = 0;
  for (const c of [...mosqueConceptsBn, ...mosqueConceptsEn]) {
    if (forbiddenRegex.test(c.prompt) || forbiddenRegex.test(c.banglaTitle)) {
      conceptsForbiddenCount++;
    }
  }
  assert(
    conceptsForbiddenCount === 0,
    'মার্কেটিং কনসেপ্টেও টেবিলটপ ইসলামিক অবজেক্ট সম্পূর্ণ অনুপস্থিত (০টি)',
    `Forbidden count in concepts: ${conceptsForbiddenCount}/20`
  );

  // -----------------------------------------------------------------
  // 9. stockMetadataValidator isMosqueSubject Helper Test
  // -----------------------------------------------------------------
  console.log('\n--- ৯. স্টক ভ্যালিডেটর সাবজেক্ট হেল্পার পরীক্ষা ---');
  assert(isMosqueSubject('Grand white marble mosque exterior') === true, 'isMosqueSubject ইংরেজি পজিটিভ');
  assert(isMosqueSubject('মসজিদের মার্বেল গম্বুজ ও মিনার') === true, 'isMosqueSubject বাংলা পজিটিভ');
  assert(isMosqueSubject('Fresh organic black peppercorn seasoning') === false, 'isMosqueSubject মশলা নেগেটিভ');
  assert(isMosqueSubject('Minimalist luxury wristwatch') === false, 'isMosqueSubject ঘড়ি নেগেটিভ');

  // -----------------------------------------------------------------
  // 10. Explicit Object Request Exemption Test
  // -----------------------------------------------------------------
  console.log('\n--- ১০. ব্যবহারকারী স্পষ্টভাবে চাইলে অবজেক্ট এলাউড (Exemption Test) ---');
  assert(
    hasExplicitIslamicObjectRequest('মসজিদে জায়নামাজ ও তসবিহ') === true,
    'স্পষ্ট নির্দেশ থাকলে hasExplicitIslamicObjectRequest পজিটিভ শনাক্ত করে'
  );
  assert(
    hasExplicitIslamicObjectRequest('মসজিদের পিক') === false,
    'সাধারণ মসজিদ রিকোয়েস্টে টেবিলটপ অবজেক্টের কোনো ফলস পজিটিভ নেই'
  );

  console.log('\n=============================================================');
  console.log(`সকল পরীক্ষা সফলভাবে সম্পন্ন: ${results.filter((r) => r.passed).length}/${results.length} টেস্ট উত্তীর্ণ`);
  console.log('=============================================================\n');
}

runMosquePromptAccuracyTests().catch((err) => {
  console.error('\n❌ টেস্ট ব্যর্থ হয়েছে:', err);
  process.exit(1);
});

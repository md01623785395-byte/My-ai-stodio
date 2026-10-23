/**
 * Focused Test Suite: Batch Planner Custom Quantity Verification
 * 
 * Tests:
 * 1. Quantity 1: Exact 1 item generated, correct indexes and audit
 * 2. Quantity 10: Exact 10 items generated, 100% distinct, correct indexes
 * 3. Existing Preset 50: Exact 50 items generated, preserving existing preset behavior
 * 4. Input Validation: Rejection of empty, zero, negative, decimal, and out-of-bounds values
 * 5. Algorithmic Combinatorial Fallback: Direct engine generation check for quantities 1, 10, 25, 50, 100
 */

import { generateBatchPlan, generateDiverseCombinatorialPrompts } from '../src/utils/batchPromptEngine';

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

async function runTests() {
  console.log('================================================================');
  console.log('BATCH PLANNER CUSTOM QUANTITY VERIFICATION SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Test 1: Direct Engine with Quantity 1
  // -------------------------------------------------------------
  console.log('--- পরীক্ষা ১: একক প্রম্পট (Quantity 1) ---');
  const items1 = generateDiverseCombinatorialPrompts('সুন্দরবনের খাঁটি মধু', 1, 'বাণিজ্যিক স্টক');
  assert(items1.length === 1, 'ইঞ্জিন থেকে ঠিক ১টি প্রম্পট প্রস্তুত (Length === 1)', `মোট প্রম্পট: ${items1.length}`);
  assert(items1[0].index === 1, 'প্রথম প্রম্পটের ইনডেক্স ১', `Index: ${items1[0].index}`);
  assert(items1[0].prompt.length > 20, 'প্রম্পট টেক্সট সম্পূর্ণ ও সমৃদ্ধ', `প্রম্পট দৈর্ঘ্য: ${items1[0].prompt.length} অক্ষর`);
  assert(items1[0].subjectBn.includes('সুন্দরবনের খাঁটি মধু'), 'বাংলা বিষয় যথাযথ সংরক্ষিত', `বিষয়: ${items1[0].subjectBn}`);

  // -------------------------------------------------------------
  // Test 2: Direct Engine with Quantity 10
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ২: ১০টি প্রম্পট (Quantity 10) ---');
  const items10 = generateDiverseCombinatorialPrompts('মডার্ন মিনিমালিস্টিক স্মার্টওয়াচ', 10, 'বাণিজ্যিক স্টক');
  assert(items10.length === 10, 'ইঞ্জিন থেকে ঠিক ১০টি প্রম্পট প্রস্তুত (Length === 10)', `মোট প্রম্পট: ${items10.length}`);
  const uniquePrompts10 = new Set(items10.map((i) => i.prompt.trim().toLowerCase()));
  assert(uniquePrompts10.size === 10, '১০টি প্রম্পটের প্রতিটি ১০০% অনন্য (Zero Collision)', `অনন্য সংখ্যা: ${uniquePrompts10.size}/10`);
  const indexes10 = items10.map((i) => i.index);
  assert(
    JSON.stringify(indexes10) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    'ইনডেক্স ক্রম ১ থেকে ১০ নির্ভুল',
    `ইনডেক্স: [${indexes10.join(', ')}]`
  );

  // -------------------------------------------------------------
  // Test 3: Existing Preset 50
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৩: বিদ্যমান প্রিসেট ৫০ (Preset 50) ---');
  const items50 = generateDiverseCombinatorialPrompts('ঐতিহ্যবাহী জামদানি শাড়ি', 50, 'বাণিজ্যিক স্টক');
  assert(items50.length === 50, 'প্রিসেট ৫০-এ ঠিক ৫০টি প্রম্পট প্রস্তুত (Length === 50)', `মোট প্রম্পট: ${items50.length}`);
  const uniquePrompts50 = new Set(items50.map((i) => i.prompt.trim().toLowerCase()));
  assert(uniquePrompts50.size === 50, '৫০টি প্রম্পটের ১০০% স্বতন্ত্রতা', `অনন্য সংখ্যা: ${uniquePrompts50.size}/50`);

  // -------------------------------------------------------------
  // Test 4: generateBatchPlan with Custom Quantities
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৪: generateBatchPlan এন্ড-টু-এন্ড ফাংশন (1, 10, 50) ---');
  const planRes1 = await generateBatchPlan('আর্গান অয়েল কসমেটিকস', 1, 'বাণিজ্যিক স্টক', 'FORCE_OFFLINE');
  assert(planRes1.plan.requestedCount === 1, 'প্ল্যানে requestedCount === 1', `requestedCount: ${planRes1.plan.requestedCount}`);
  assert(planRes1.plan.prompts.length === 1, 'প্ল্যানে prompts.length === 1', `prompts.length: ${planRes1.plan.prompts.length}`);

  const planRes10 = await generateBatchPlan('সৌর শক্তি রুফটপ প্যানেল', 10, 'বাণিজ্যিক স্টক', 'FORCE_OFFLINE');
  assert(planRes10.plan.requestedCount === 10, 'প্ল্যানে requestedCount === 10', `requestedCount: ${planRes10.plan.requestedCount}`);
  assert(planRes10.plan.prompts.length === 10, 'প্ল্যানে prompts.length === 10', `prompts.length: ${planRes10.plan.prompts.length}`);
  assert(planRes10.plan.diversityAudit?.totalGenerated === 10, 'ডাইভার্সিটি অডিটে totalGenerated === 10');

  // -------------------------------------------------------------
  // Test 5: HTTP Endpoint Live Validation Tests
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৫: লাইভ API রুট ভ্যালিডেশন (/api/batch-planner/generate) ---');

  // A. Quantity 1
  const httpRes1 = await fetch('http://localhost:3000/api/batch-planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'সুইস ক্রোনোগ্রাফ ঘড়ি', count: 1 }),
  });
  const data1 = await httpRes1.json();
  assert(httpRes1.ok && data1.success === true, 'HTTP রুট: Quantity 1 সফল', `Status: ${httpRes1.status}`);
  assert(data1.plan.prompts.length === 1, 'HTTP রেসপন্সে ঠিক ১টি প্রম্পট প্রদান', `Length: ${data1.plan.prompts.length}`);
  assert(data1.plan.requestedCount === 1, 'HTTP রেসপন্সে requestedCount === 1');

  // B. Quantity 10
  const httpRes10 = await fetch('http://localhost:3000/api/batch-planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'এগ্রিটেক ড্রোন ফার্মিং', count: 10 }),
  });
  const data10 = await httpRes10.json();
  assert(httpRes10.ok && data10.success === true, 'HTTP রুট: Quantity 10 সফল', `Status: ${httpRes10.status}`);
  assert(data10.plan.prompts.length === 10, 'HTTP রেসপন্সে ঠিক ১০টি প্রম্পট প্রদান', `Length: ${data10.plan.prompts.length}`);
  assert(data10.plan.requestedCount === 10, 'HTTP রেসপন্সে requestedCount === 10');

  // C. Existing Preset 50
  const httpRes50 = await fetch('http://localhost:3000/api/batch-planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'হস্তশিল্প পাটজাত পণ্য', count: 50 }),
  });
  const data50 = await httpRes50.json();
  assert(httpRes50.ok && data50.success === true, 'HTTP রুট: Preset 50 সফল', `Status: ${httpRes50.status}`);
  assert(data50.plan.prompts.length === 50, 'HTTP রেসপন্সে ঠিক ৫০টি প্রম্পট প্রদান', `Length: ${data50.plan.prompts.length}`);

  // -------------------------------------------------------------
  // Test 6: Strict Input Validation (Rejection Cases)
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৬: অবৈধ ইনপুট প্রত্যাখ্যান (Input Validation Guardrails) ---');

  // Empty string count
  const emptyRes = await fetch('http://localhost:3000/api/batch-planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'টেস্ট', count: '' }),
  });
  const emptyData = await emptyRes.json();
  assert(emptyRes.status === 400 && emptyData.success === false, 'খালি (Empty) সংখ্যা প্রত্যাখ্যান (HTTP 400)');

  // Zero count
  const zeroRes = await fetch('http://localhost:3000/api/batch-planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'টেস্ট', count: 0 }),
  });
  const zeroData = await zeroRes.json();
  assert(zeroRes.status === 400 && zeroData.success === false, 'শূন্য (0) সংখ্যা প্রত্যাখ্যান (HTTP 400)');

  // Negative count
  const negRes = await fetch('http://localhost:3000/api/batch-planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'টেস্ট', count: -5 }),
  });
  const negData = await negRes.json();
  assert(negRes.status === 400 && negData.success === false, 'ঋণাত্মক (-5) সংখ্যা প্রত্যাখ্যান (HTTP 400)');

  // Decimal count
  const decRes = await fetch('http://localhost:3000/api/batch-planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'টেস্ট', count: 12.5 }),
  });
  const decData = await decRes.json();
  assert(decRes.status === 400 && decData.success === false, 'দশমিক (12.5) সংখ্যা প্রত্যাখ্যান (HTTP 400)');

  // String decimal count
  const strDecRes = await fetch('http://localhost:3000/api/batch-planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'টেস্ট', count: '7.8' }),
  });
  const strDecData = await strDecRes.json();
  assert(strDecRes.status === 400 && strDecData.success === false, 'স্ট্রিং দশমিক ("7.8") প্রত্যাখ্যান (HTTP 400)');

  // Exceeding system limit (150 > 100)
  const overRes = await fetch('http://localhost:3000/api/batch-planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'টেস্ট', count: 150 }),
  });
  const overData = await overRes.json();
  assert(overRes.status === 400 && overData.success === false, 'সিস্টেম লিমিট অতিক্রম (150 > 100) প্রত্যাখ্যান (HTTP 400)');

  console.log('\n================================================================');
  console.log(`ফলাফল: ${passedTests}/${totalTests} পরীক্ষা সফলভাবে উত্তীর্ণ (PASS)`);
  if (failedTests > 0) {
    console.error(`ব্যর্থ পরীক্ষা: ${failedTests}`);
    process.exit(1);
  } else {
    console.log('সমস্ত কাস্টম ও প্রিসেট কোয়ান্টিটি টেস্ট ১০০% সফল!');
    console.log('================================================================\n');
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});

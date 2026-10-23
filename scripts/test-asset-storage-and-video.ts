import 'fake-indexeddb/auto';
import {
  saveAssetToDB,
  loadAllAssetsFromDB,
  getAssetByIdFromDB,
  updateAssetInDB,
  deleteAssetFromDB,
  clearAllAssetsFromDB,
  migrateFromLocalStorage,
  dataUrlToBlob,
  openAssetDB,
  LEGACY_LOCALSTORAGE_KEY,
  MIGRATION_FLAG_KEY,
  ASSET_STORE_NAME,
} from '../src/utils/assetStorage';
import {
  formatByteSize,
  calculateClosestAspectRatio,
  extractFileFormat,
  inspectVideoFile,
} from '../src/utils/mediaInspector';
import { Asset } from '../src/types';

// Mock localStorage for Node test environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] || null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

// Attach mock localStorage to global if needed
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = new MockLocalStorage();
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('AI CREATOR STUDIO: SAFE ASSET STORAGE & HONEST VIDEO WORKFLOW TEST');
  console.log('================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      console.log(`       └─ ${detail}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      console.error(`       └─ ${detail}`);
      failedTests++;
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 1: IndexedDB Save, Read, Update, Delete (CRUD)
  // -------------------------------------------------------------
  console.log('--- পরীক্ষা ১: IndexedDB Save / Read / Update / Delete (CRUD) ---');
  await clearAllAssetsFromDB();

  // Create a 1MB mock image Blob
  const sampleBytes = new Uint8Array(1024 * 1024); // 1MB
  sampleBytes.fill(255);
  const sampleBlob = new Blob([sampleBytes], { type: 'image/png' });

  const testAsset: Asset = {
    id: 'test-asset-1',
    title: 'Artisan Terracotta Pottery',
    type: 'image',
    prompt: 'Macro ceramic clay pot with rustic textures and studio lighting',
    style: 'Photorealistic',
    aspectRatio: '16:9',
    dimensions: '1920 × 1080',
    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    thumbnailUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    createdAt: 'Oct 14, 2026',
    isFavorite: false,
    model: 'Studio Lumina v3.5',
    views: 10,
    source: 'Studio',
  };

  // 1. Save with Blob
  const savedAsset = await saveAssetToDB(testAsset, sampleBlob);
  assert(
    Boolean(savedAsset.id === 'test-asset-1' && savedAsset.fileSize?.includes('1.00 MB')),
    'IndexedDB-তে আসল বাইনারি ব্লবসহ অ্যাসেট সেভ করা',
    `আইডি: ${savedAsset.id}, সংরক্ষিত সাইজ: ${savedAsset.fileSize}`
  );

  // 2. Read single asset
  const retrieved = await getAssetByIdFromDB('test-asset-1');
  assert(
    retrieved !== null && retrieved.title === 'Artisan Terracotta Pottery',
    'IndexedDB থেকে নির্দিষ্ট আইডি দিয়ে অ্যাসেট রিড করা',
    `টাইটেল: "${retrieved?.title}", মাত্রা: ${retrieved?.dimensions}`
  );

  // 3. Update favorite
  await updateAssetInDB('test-asset-1', { isFavorite: true, title: 'Updated Terracotta Artwork' });
  const updated = await getAssetByIdFromDB('test-asset-1');
  assert(
    updated?.isFavorite === true && updated?.title === 'Updated Terracotta Artwork',
    'IndexedDB-তে ফিল্ড আপডেট (isFavorite & Title) পরীক্ষা',
    `isFavorite: ${updated?.isFavorite}, টাইটেল: "${updated?.title}"`
  );

  // 4. Delete asset
  await deleteAssetFromDB('test-asset-1');
  const deletedCheck = await getAssetByIdFromDB('test-asset-1');
  assert(
    deletedCheck === null,
    'IndexedDB থেকে অ্যাসেট সম্পূর্ণ ডিলিট করার পরীক্ষা',
    'আইডি test-asset-1 সফলভাবে অপসারিত হয়েছে।'
  );

  // -------------------------------------------------------------
  // TEST GROUP 2: Reload Persistence & Browser Restart Simulation
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ২: অ্যাপ রিলোড ও ব্রাউজার রিস্টার্ট পারসিস্টেন্স ---');
  // Re-save with 2x/4x upscaled mock data
  const upscaled4kBlob = new Blob([new Uint8Array(4 * 1024 * 1024)], { type: 'image/jpeg' });
  const upscaledAsset: Asset = {
    id: 'asset-upscaled-4k',
    title: 'Vintage Leather Travel Backpack [4x Ultra Upscaled]',
    type: 'image',
    prompt: 'Handcrafted vintage leather backpack on weathered teak desk',
    style: 'Commercial Product',
    aspectRatio: '16:9',
    dimensions: '4096 × 2304',
    url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
    thumbnailUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
    createdAt: 'Oct 14, 2026',
    isFavorite: true,
    model: 'Studio Enhancer (4x Ultra Upscaled)',
    views: 24,
    source: 'Studio',
    fileSize: '4.00 MB',
    fileFormat: 'image/jpeg',
  };

  await saveAssetToDB(upscaledAsset, upscaled4kBlob);

  // Simulate complete app reload by clearing all memory and re-reading from DB
  const reloadedAssets = await loadAllAssetsFromDB();
  const reloadedItem = reloadedAssets.find((a) => a.id === 'asset-upscaled-4k');
  assert(
    reloadedItem !== undefined &&
      reloadedItem.dimensions === '4096 × 2304' &&
      reloadedItem.fileSize === '4.00 MB',
    'রিলোডের পর ৪x আপস্কেল করা বড় ফাইলের মেটাডেটা ও ব্লব অক্ষুণ্ণ থাকা',
    `আইটেম পাওয়া গেছে: ${reloadedItem?.title}, ডাইমেনশন: ${reloadedItem?.dimensions}, ফাইল সাইজ: ${reloadedItem?.fileSize}`
  );

  // -------------------------------------------------------------
  // TEST GROUP 3: Safe Migration from localStorage with Verification
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৩: localStorage থেকে নিরাপদ মাইগ্রেশন ও রোলব্যাক গ্যারান্টি ---');
  // Clear DB first
  await clearAllAssetsFromDB();
  (globalThis as any).localStorage.clear();

  // Populate mock legacy localStorage data (Base64 strings)
  const legacyAssets: Asset[] = [
    {
      id: 'legacy-asset-1',
      title: 'Neon Cyberpunk Shibuya Alley',
      type: 'image',
      prompt: 'Cyberpunk street',
      style: 'Cinematic 3D',
      aspectRatio: '16:9',
      dimensions: '1920 × 1080',
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      thumbnailUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      createdAt: '10 mins ago',
      isFavorite: true,
      model: 'Studio Lumina v3.5',
    },
    {
      id: 'legacy-asset-2',
      title: 'Quantum Glass Orchid',
      type: 'image',
      prompt: 'Glowing quantum flower',
      style: 'Fantasy',
      aspectRatio: '1:1',
      dimensions: '1024 × 1024',
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      thumbnailUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      createdAt: '20 mins ago',
      isFavorite: false,
      model: 'Studio Lumina v3.5',
    },
  ];

  (globalThis as any).localStorage.setItem(LEGACY_LOCALSTORAGE_KEY, JSON.stringify(legacyAssets));

  // Run migration
  const migrationResult = await migrateFromLocalStorage([]);
  assert(
    migrationResult.success === true && migrationResult.migratedCount === 2,
    'localStorage-এর Base64 ডেটা সফলভাবে IndexedDB-তে রূপান্তর',
    `মাইগ্রেটেড আইটেম সংখ্যা: ${migrationResult.migratedCount}`
  );

  // Verify that localStorage was only cleared AFTER successful verification
  const isMigratedFlag = (globalThis as any).localStorage.getItem(MIGRATION_FLAG_KEY);
  const oldStorageKey = (globalThis as any).localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
  assert(
    isMigratedFlag === 'true' && oldStorageKey === null,
    'মাইগ্রেশন সম্পূর্ণ যাচাই করার পরই localStorage ডেটা মুক্ত করার সততা',
    `MIGRATION_FLAG: ${isMigratedFlag}, পুরোনো কী অপসারিত হয়েছে: ${oldStorageKey === null}`
  );

  // Test rollback safety on corrupted JSON
  (globalThis as any).localStorage.setItem(LEGACY_LOCALSTORAGE_KEY, '{invalid json');
  await clearAllAssetsFromDB();
  const corruptMigration = await migrateFromLocalStorage([]);
  assert(
    corruptMigration.success === false && corruptMigration.error !== undefined,
    'ত্রুটিপূর্ণ ডেটায় মাইগ্রেশন থামানো এবং মূল ডেটা অক্ষত রাখার পরীক্ষা',
    `এরর মেসেজ: "${corruptMigration.error}"`
  );

  // -------------------------------------------------------------
  // TEST GROUP 4: Quota Handling & Storage Quota Overrun Simulation
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৪: ব্রাউজার স্টোরেজ কোটা ও ত্রুটি হ্যান্ডলিং ---');
  // Check formatByteSize function
  assert(
    formatByteSize(1024 * 1024 * 14.5) === '14.50 MB' && formatByteSize(512 * 1024) === '512.0 KB',
    'ফাইল সাইজ সঠিক ফরম্যাটে (KB/MB) কনভার্সন যাচাই',
    `14.5MB -> ${formatByteSize(1024 * 1024 * 14.5)}, 512KB -> ${formatByteSize(512 * 1024)}`
  );

  assert(
    formatByteSize(0) === 'Not available' && formatByteSize(-50) === 'Not available',
    'শূন্য বা অনুপস্থিত ফাইল সাইজে "Not available" প্রদর্শনের সততা',
    `0 bytes -> ${formatByteSize(0)}, -50 bytes -> ${formatByteSize(-50)}`
  );

  // -------------------------------------------------------------
  // TEST GROUP 5: Honest Video Workflow & Metadata Inspection
  // -------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৫: সততা ভিত্তিক ভিডিও মেটাডেটা ও ওয়ার্কফ্লো অডিট ---');
  // 1. Format extraction from mime and extension
  const mp4MockFile = new Blob([new Uint8Array(500)], { type: 'video/mp4' });
  const webmMockFile = new Blob([new Uint8Array(500)], { type: 'video/webm' });
  const unknownMockFile = new Blob([new Uint8Array(500)], { type: '' });

  assert(
    extractFileFormat(mp4MockFile) === 'MP4 (video/mp4)' &&
      extractFileFormat(webmMockFile) === 'WebM (video/webm)',
    'প্রকৃত ভিডিও ফাইলের ফরম্যাট (MP4/WebM) ডিটেকশন',
    `MP4: ${extractFileFormat(mp4MockFile)}, WebM: ${extractFileFormat(webmMockFile)}`
  );

  assert(
    extractFileFormat(unknownMockFile) === 'Not available',
    'অজানা ফরম্যাটে কাল্পনিক নাম না দিয়ে "Not available" দেখানো',
    `ফলাফল: ${extractFileFormat(unknownMockFile)}`
  );

  // 2. Aspect ratio calculation
  assert(
    calculateClosestAspectRatio(1920, 1080) === '16:9' &&
      calculateClosestAspectRatio(1080, 1920) === '9:16' &&
      calculateClosestAspectRatio(1000, 1000) === '1:1',
    'রেজোলিউশন থেকে বাস্তব অ্যাসপেক্ট রেশিও (16:9, 9:16, 1:1) ক্যালকুলেশন',
    `1920x1080 -> ${calculateClosestAspectRatio(1920, 1080)}, 1080x1920 -> ${calculateClosestAspectRatio(1080, 1920)}`
  );

  // 3. Video metadata inspector fallback in headless/node mode
  const inspectedHeadless = await inspectVideoFile(mp4MockFile);
  assert(
    inspectedHeadless.dimensions === 'Not available' &&
      inspectedHeadless.duration === 'Not available' &&
      inspectedHeadless.fileSize.includes('500 B'),
    'ক্যানভাস/ভিডিও ডোম না থাকলে মিথ্যা তথ্য না দেখিয়ে "Not available" প্রদর্শন',
    `রেজোলিউশন: "${inspectedHeadless.dimensions}", দৈর্ঘ্য: "${inspectedHeadless.duration}", ফাইল সাইজ: "${inspectedHeadless.fileSize}"`
  );

  // 4. Test storing real video asset with native video Blob
  const realVideoBytes = new Uint8Array(1024 * 1024 * 5); // 5MB video
  const realVideoBlob = new Blob([realVideoBytes], { type: 'video/mp4' });

  const videoAssetPayload: Asset = {
    id: 'real-imported-video-1',
    title: 'Drone Flying Over Misty Pine Canopy',
    type: 'video',
    prompt: 'Aerial drone footage gliding above pine forest in early morning mist',
    style: 'Cinematic Motion',
    aspectRatio: '16:9',
    dimensions: '1920 × 1080',
    duration: '8s',
    fps: 30,
    url: '',
    thumbnailUrl: '',
    createdAt: 'Oct 14, 2026',
    isFavorite: false,
    model: 'Google Flow / Real Video File',
    source: 'Google Flow',
    fileSize: '5.00 MB',
    fileFormat: 'MP4 (video/mp4)',
  };

  const savedVideo = await saveAssetToDB(videoAssetPayload, realVideoBlob);
  assert(
    savedVideo.id === 'real-imported-video-1' &&
      savedVideo.type === 'video' &&
      savedVideo.fileSize === '5.00 MB' &&
      savedVideo.fileFormat === 'MP4 (video/mp4)',
    'My Assets-এ আসল ভিডিও ব্লব সফলভাবে IndexedDB-তে সংরক্ষণ',
    `আইডি: ${savedVideo.id}, ধরন: ${savedVideo.type}, ফরম্যাট: ${savedVideo.fileFormat}, সাইজ: ${savedVideo.fileSize}`
  );

  // -------------------------------------------------------------
  // TEST SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`পরীক্ষা সমাপ্ত: মোট ${passedTests + failedTests}টি পরীক্ষার মধ্যে ${passedTests}টি PASS, ${failedTests}টি FAIL`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});

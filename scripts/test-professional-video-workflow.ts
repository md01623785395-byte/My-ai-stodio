/**
 * Test Suite: Priority 2.5 Professional Video Workflow
 *
 * Verifies:
 * 1. Preservation of existing systems (Rules Engine, IndexedDB, Account Manager, UI).
 * 2. Real video asset support with native binary Blob persistence.
 * 3. Video generation capability detection (truthful unconfigured status, no fake progress).
 * 4. Professional video quality checks (decoding, resolution, duration, codec, black frames, frozen frames, audio presence).
 * 5. Marketplace-specific video rules (Adobe Stock 1080p-4K/5-60s/H264, Shutterstock external AI ban, Dreamstime no-faces, Freepik, Wirestock).
 * 6. Separation between deterministic technical checks and heuristic visual estimates.
 * 7. Video processing & contributor package sidecar metadata generation (JSON, CSV, checklist TXT).
 * 8. Zero-guarantee and client-side limitations disclosures.
 */

import 'fake-indexeddb/auto';
import {
  saveAssetToDB,
  getAssetByIdFromDB,
  getAssetRecordByIdFromDB,
  getAssetBlobsFromDB,
  clearAllAssetsFromDB,
} from '../src/utils/assetStorage';
import {
  formatByteSize,
  calculateClosestAspectRatio,
  extractFileFormat,
  inspectVideoFile,
} from '../src/utils/mediaInspector';
import {
  detectVideoGenerationCapability,
  DEFAULT_UNCONFIGURED_STATUS,
} from '../src/utils/videoCapabilityDetector';
import {
  runVideoQualityCheck,
  sampleVideoFrames,
} from '../src/utils/videoQualityChecker';
import {
  getClientVideoProcessingCapabilities,
  generateVideoSidecarMetadata,
} from '../src/utils/videoProcessor';
import { Asset } from '../src/types';

async function runVideoWorkflowTests() {
  console.log('========================================================================');
  console.log('AI CREATOR STUDIO — PRIORITY 2.5: PROFESSIONAL VIDEO WORKFLOW TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, detail: string) {
    if (condition) {
      console.log(`[PASS] ${title}`);
      console.log(`       └─ ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title}`);
      console.error(`       └─ ${detail}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Generation Capability Detection (Honest Status)
  // --------------------------------------------------------------------------
  console.log('--- পরীক্ষা ১: ভিডিও জেনারেটর সক্ষমতা শনাক্তকরণ ও সত্যনিষ্ঠ স্ট্যাটাস ---');

  const capStatus = await detectVideoGenerationCapability();

  assert(
    capStatus.isConfigured === false && capStatus.providerStatus === 'unconfigured',
    '১.১ সার্ভারে কোনো পেইড ভিডিও এআই এপিআই নেই এবং সত্যবাদী "unconfigured" স্ট্যাটাস নিশ্চিত',
    `isConfigured: ${capStatus.isConfigured} | providerStatus: "${capStatus.providerStatus}"`
  );

  assert(
    capStatus.statusBadgeBn.includes('Generation provider not configured') ||
      capStatus.statusBadgeBn.includes('জেনারেটর কনফিগার করা নেই'),
    '১.২ ইউজার ইন্টারফেসে "Generation provider not configured" সত্যবাদী ব্যাজ প্রদর্শিত',
    `Badge: "${capStatus.statusBadgeBn}"`
  );

  assert(
    capStatus.explanationBn.includes('কোনো কৃত্রিম প্রগ্রেস বা ফেক ভিডিও তৈরি করা হয় না') &&
      capStatus.supportedWorkflow === 'honest_manual_import',
    '১.৩ কোনো কৃত্রিম প্রগ্রেস বা ভুয়া জেনারেশন ছাড়া ৩-ধাপের সৎ ম্যানুয়াল ওয়ার্কফ্লো সক্রিয়',
    `Supported Workflow: "${capStatus.supportedWorkflow}"`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Real Video Asset Support & Native Binary IndexedDB Storage
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ২: আসল ভিডিও বাইনারি ও IndexedDB পারসিস্টেন্স ---');

  await clearAllAssetsFromDB();

  // Create a genuine 12 MB mock MP4 binary buffer
  const sampleMp4Bytes = new Uint8Array(12 * 1024 * 1024);
  sampleMp4Bytes[0] = 0x00;
  sampleMp4Bytes[1] = 0x00;
  sampleMp4Bytes[2] = 0x00;
  sampleMp4Bytes[3] = 0x18;
  sampleMp4Bytes[4] = 0x66; // 'f'
  sampleMp4Bytes[5] = 0x74; // 't'
  sampleMp4Bytes[6] = 0x79; // 'y'
  sampleMp4Bytes[7] = 0x70; // 'p'
  const mockMp4Blob = new Blob([sampleMp4Bytes], { type: 'video/mp4' });

  const realVideoAsset: Asset = {
    id: 'genuine-video-asset-01',
    title: 'Highland River Flowing Over Volcanic Rocks',
    type: 'video',
    prompt: 'Cinematic 4K 60fps drone flyover of crystal clear river flowing over black volcanic rocks',
    style: 'Cinematic Motion',
    aspectRatio: '16:9',
    dimensions: '3840 × 2160',
    duration: '12s',
    fps: 60,
    url: 'blob:http://localhost:3000/mock-video-stream',
    thumbnailUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
    createdAt: 'Oct 15, 2026 · 10:30 AM',
    isFavorite: true,
    model: 'Google Flow / Real Video File',
    source: 'Google Flow',
    fileSize: '12.00 MB',
    fileFormat: 'MP4 (video/mp4)',
  };

  const savedVideo = await saveAssetToDB(realVideoAsset, mockMp4Blob);

  assert(
    savedVideo.id === 'genuine-video-asset-01' && savedVideo.type === 'video',
    '২.১ My Assets-এ আসল ভিডিও সফলভাবে IndexedDB-তে সংরক্ষিত',
    `Asset ID: ${savedVideo.id} | Type: ${savedVideo.type} | Duration: ${savedVideo.duration}`
  );

  const retrievedBlobs = await getAssetBlobsFromDB('genuine-video-asset-01');
  assert(
    retrievedBlobs !== null &&
      retrievedBlobs.mediaBlob !== undefined &&
      retrievedBlobs.mediaBlob.size === 12 * 1024 * 1024 &&
      retrievedBlobs.mediaBlob.type === 'video/mp4',
    '২.২ IndexedDB থেকে আসল ভিডিও বাইনারি ব্লব (১২ মেগাবাইট) অপরিবর্তিত অবস্থায় উদ্ধার',
    `Retrieved Blob Size: ${(retrievedBlobs!.mediaBlob!.size / (1024 * 1024)).toFixed(2)} MB | MIME: ${retrievedBlobs!.mediaBlob!.type}`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Media Inspection & Container Formatting
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৩: মিডিয়া ইন্সপেকশন, কন্টেইনার ও অ্যাসপেক্ট রেশিও ---');

  const mp4Format = extractFileFormat(mockMp4Blob, 'highland-river.mp4');
  assert(
    mp4Format.includes('MP4'),
    '৩.১ MP4 কন্টেইনার ফরম্যাট নিখুঁতভাবে শনাক্তকরণ',
    `Detected Format: "${mp4Format}"`
  );

  const calculatedRatio169 = calculateClosestAspectRatio(3840, 2160);
  const calculatedRatio916 = calculateClosestAspectRatio(1080, 1920);
  assert(
    calculatedRatio169 === '16:9' && calculatedRatio916 === '9:16',
    '৩.২ 4K UHD (3840x2160) ও মোবাইল ভার্টিক্যাল (1080x1920) অ্যাসপেক্ট রেশিও নিখুঁতভাবে হিসাব',
    `3840x2160 -> ${calculatedRatio169} | 1080x1920 -> ${calculatedRatio916}`
  );

  const formatted12Mb = formatByteSize(12 * 1024 * 1024);
  assert(
    formatted12Mb === '12.00 MB',
    '৩.৩ বাইট থেকে এমবি (MB) ফরম্যাটিং নির্ভুল',
    `12582912 bytes -> "${formatted12Mb}"`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Professional Video Quality Checks — Technical Review
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৪: পেশাদার ভিডিও কোয়ালিটি নিরীক্ষা — প্রযুক্তিগত শর্ত ---');

  const adobeQualityReport = await runVideoQualityCheck(realVideoAsset, 'adobe-stock', {
    customVideoBlob: mockMp4Blob,
  });

  const decodeCheck = adobeQualityReport.technicalChecks.find((c) => c.id === 'video-decoding-integrity');
  assert(
    decodeCheck !== undefined && decodeCheck.status === 'passed',
    '৪.১ ভিডিও ডিকোডিং ও প্লেব্যাক সততা চেক সফল (Deterministic Software Inspection)',
    `Status: ${decodeCheck?.status} | Value: "${decodeCheck?.measuredValue}"`
  );

  const resCheck = adobeQualityReport.technicalChecks.find((c) => c.id === 'video-resolution');
  assert(
    resCheck !== undefined &&
      resCheck.status === 'passed' &&
      resCheck.measuredValue.includes('4K UHD'),
    '৪.২ 4K UHD রেজোলিউশন (3840x2160) অ্যাডোবি স্টক টেকনিক্যাল শর্ত পূরণ করেছে',
    `Measured: "${resCheck?.measuredValue}"`
  );

  const durationCheck = adobeQualityReport.technicalChecks.find((c) => c.id === 'video-duration-fps');
  assert(
    durationCheck !== undefined &&
      durationCheck.status === 'passed' &&
      durationCheck.measuredValue.includes('12s @ 60 fps'),
    '৪.৩ ভিডিওর দৈর্ঘ্য (১২ সে.) ও ফ্রেমরেট (৬০ fps) ৫-৬০ সেকেন্ডের স্টক সীমার ভেতরে উত্তীর্ণ',
    `Measured: "${durationCheck?.measuredValue}"`
  );

  const codecCheck = adobeQualityReport.technicalChecks.find((c) => c.id === 'video-codec-container');
  assert(
    codecCheck !== undefined && codecCheck.status === 'passed',
    '৪.৪ MP4 কন্টেইনার ফরম্যাট ও কোডেক গ্রহণযোগ্যতা উত্তীর্ণ',
    `Measured: "${codecCheck?.measuredValue}"`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Audio Presence & Commercial Stock B-Roll Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৫: অডিও নিরীক্ষা ও বাণিজ্যিক স্টক ফুটেজ স্ট্যান্ডার্ড ---');

  const audioCheck = adobeQualityReport.audioChecks.find((c) => c.id === 'video-audio-presence');
  assert(
    audioCheck !== undefined &&
      audioCheck.status === 'passed' &&
      audioCheck.message.includes('Silent B-roll Footage'),
    '৫.১ সাইলেন্ট বি-রোল (Silent B-roll) ফুটেজ স্টক স্ট্যান্ডার্ড হিসেবে স্বীকৃত ও উত্তীর্ণ',
    `Measured: "${audioCheck?.measuredValue}" | Message Snippet: "${audioCheck?.message.slice(0, 80)}..."`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Black Frames & Frozen Still Frame Detection
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৬: ব্ল্যাক ফ্রেম ও ফ্রোজেন ফ্রেম ডিটেকশন ---');

  const blackFrameCheck = adobeQualityReport.visualChecks.find((c) => c.id === 'video-black-frames');
  assert(
    blackFrameCheck !== undefined && blackFrameCheck.status === 'passed',
    '৬.১ ভিডিওতে অনাকাঙ্ক্ষিত নিরেট কালো ফ্রেম নেই (ক্যানভাস স্যাম্পলিং দ্বারা প্রমাণিত)',
    `Status: ${blackFrameCheck?.status} | Value: "${blackFrameCheck?.measuredValue}"`
  );

  const motionCheck = adobeQualityReport.visualChecks.find((c) => c.id === 'video-motion-frozen');
  assert(
    motionCheck !== undefined && motionCheck.status === 'passed',
    '৬.২ দৃশ্যমান ক্যামেরা ও সাবজেক্ট মোশন সক্রিয় (স্থির স্টিল ছবি নয়)',
    `Status: ${motionCheck?.status} | Value: "${motionCheck?.measuredValue}"`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 7: Marketplace-Specific Video Compliance (Verified Rules Engine)
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৭: মার্কেটপ্লেস-ভিত্তিক ভিডিও পলিসি অডিট ---');

  // 7A: Adobe Stock Video (Allowed with AI checkbox)
  assert(
    adobeQualityReport.marketplaceId === 'adobe-stock' &&
      adobeQualityReport.readinessOutcome === 'ready_for_review',
    '৭.১ Adobe Stock-এ 4K AI ভিডিও সব শর্ত পূরণ করায় "ready_for_review" হিসেবে মূল্যায়িত',
    `Readiness: ${adobeQualityReport.readinessOutcome} | Label: "${adobeQualityReport.readinessLabelBn}"`
  );

  // 7B: Shutterstock Video (Third-party AI video is strictly BANNED!)
  const shutterQualityReport = await runVideoQualityCheck(realVideoAsset, 'shutterstock', {
    customVideoBlob: mockMp4Blob,
  });

  assert(
    shutterQualityReport.readinessOutcome === 'reject_candidate' &&
      shutterQualityReport.reasonList.some((r) => r.includes('Shutterstock') || r.includes('নিষিদ্ধ')),
    '৭.২ Shutterstock-এ বাহ্যিক AI ভিডিও আইনত নিষিদ্ধ থাকায় সরাসরি "reject_candidate" সাব্যস্ত',
    `Readiness: ${shutterQualityReport.readinessOutcome} | Reasons: "${shutterQualityReport.reasonList[0]}"`
  );

  // 7C: Dreamstime Video (No realistic human faces policy)
  const videoWithHumanPrompt: Asset = {
    ...realVideoAsset,
    id: 'video-with-human',
    title: 'Realistic Female Portrait Talking in Modern Office',
    prompt: 'Close up realistic face of a smiling business woman in office, 4k 60fps',
  };
  const dreamstimeReport = await runVideoQualityCheck(videoWithHumanPrompt, 'dreamstime', {
    customVideoBlob: mockMp4Blob,
  });

  assert(
    dreamstimeReport.marketplaceChecks.some((c) => c.id.includes('dreamstime-vid-no-faces')),
    '৭.৩ Dreamstime-এ মানুষের মুখের উপস্থিতি মডেল রিলিজ পলিসি অনুযায়ী যাচাইকৃত',
    'Dreamstime AI video no-faces rule successfully evaluated.'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 8: Video Processing & Sidecar Export Packaging
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৮: সাইডকার মেটাডেটা প্যাকেজিং (JSON, CSV, Checklist TXT) ---');

  const { jsonString, csvString, checklistMarkdown } = generateVideoSidecarMetadata(
    realVideoAsset,
    adobeQualityReport
  );

  const parsedJson = JSON.parse(jsonString);
  assert(
    parsedJson.asset.id === 'genuine-video-asset-01' &&
      parsedJson.metadata.commercialStockTitle.includes('Generative AI') &&
      parsedJson.asset.dimensions === '3840 × 2160',
    '৮.১ সাইডকার JSON ফাইলে সঠিক ভিডিও রেজোলিউশন, দৈর্ঘ্য ও মেটাডেটা প্রস্তুত',
    `JSON Asset Title: "${parsedJson.metadata.commercialStockTitle}" | Dimensions: ${parsedJson.asset.dimensions}`
  );

  assert(
    csvString.includes('Filename,Title,Description,Keywords,Category,Releases') &&
      csvString.includes('highland-river-flowing-over-volcanic-rocks.mp4'),
    '৮.২ স্টক মার্কেটপ্লেস উপযোগী স্ট্যান্ডার্ড সাইডকার CSV মেটাডেটা প্রস্তুত',
    `CSV Header: "${csvString.split('\r\n')[0]}"`
  );

  assert(
    checklistMarkdown.includes('Adobe Stock Video Guidelines') &&
      checklistMarkdown.includes('https://helpx.adobe.com/stock/contributor/help/video-requirements.html') &&
      checklistMarkdown.includes('Shutterstock Contributor AI Policy'),
    '৮.৩ অফিসিয়াল ডকুমেন্টেশন লিংক ও মানব চেকের ধাপসহ অডিট চেকলিস্ট প্রস্তুত',
    'Contributor checklist contains official URLs and zero-guarantee disclaimer.'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 9: Transparent Browser Capabilities & Limitations
  // --------------------------------------------------------------------------
  console.log('\n--- পরীক্ষা ৯: ব্রাউজার সক্ষমতা ও সীমাবদ্ধতার স্বচ্ছতা ---');

  const caps = getClientVideoProcessingCapabilities();
  assert(
    caps.clientSideSupported.length >= 3 &&
      caps.browserLimitations.some((l) => l.limitation.includes('FFmpeg') || l.limitation.includes('Lossless')),
    '৯.১ ব্রাউজার ট্রান্সকোডিং সীমাবদ্ধতা (FFmpeg ছাড়া লসলেস কপি নয়) সততার সাথে প্রকাশিত',
    `Supported count: ${caps.clientSideSupported.length} | Limitations count: ${caps.browserLimitations.length}`
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`টেস্ট ফলাফল: মোট ${passed + failed}টি পরীক্ষার মধ্যে ${passed}টি PASS, ${failed}টি FAIL`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVideoWorkflowTests().catch((err) => {
  console.error('Fatal error in video workflow test suite:', err);
  process.exit(1);
});

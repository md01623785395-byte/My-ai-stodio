import { inspectImageBinary } from '../src/utils/imageBinaryInspector.ts';
import { saveAssetToDB, loadAllAssetsFromDB, getAssetByIdFromDB } from '../src/utils/assetStorage.ts';
import { Asset } from '../src/types/index.ts';
import { indexedDB } from 'fake-indexeddb';

async function runLiveTest() {
  console.log('=== Priority 8.1A: Live Hugging Face Generation Test ===\n');

  // Step 1: Verify HF_TOKEN configuration (without leaking secret)
  const token = process.env.HF_TOKEN;
  const isTokenConfigured = !!(token && token.trim().length > 0 && token !== 'YOUR_HF_TOKEN');
  console.log(`[1] HF_TOKEN Configured: ${isTokenConfigured}`);
  if (!isTokenConfigured) {
    console.error('FAIL: HF_TOKEN is not configured in environment variables.');
    process.exit(1);
  }
  console.log(`[1] Token Presence: Verified (length: ${token.length}, prefix: ${token.slice(0, 3)}...)`);

  // Step 2: Make actual API call to FLUX.1-schnell via local server endpoint
  console.log('\n[2] Sending generation request to FLUX.1-schnell via /api/generate-image...');
  const startTime = Date.now();
  
  let res: Response;
  let data: any;

  try {
    res = await fetch('http://localhost:3000/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A pristine golden autumn leaf resting on a calm clear pond with soft morning reflections, high detail',
        provider: 'huggingface',
        aspectRatio: '1:1',
        quality: 'high',
      }),
    });
  } catch (netErr: any) {
    console.error(`FAIL: Failed to connect to local server: ${netErr.message}`);
    process.exit(1);
  }

  const durationMs = Date.now() - startTime;
  console.log(`[2] HTTP Status: ${res.status} (${res.statusText})`);
  console.log(`[2] Response Time: ${(durationMs / 1000).toFixed(2)}s`);

  try {
    data = await res.json();
  } catch (parseErr: any) {
    console.error(`FAIL: Response is not valid JSON: ${parseErr.message}`);
    process.exit(1);
  }

  console.log('[2] API Response Body:', {
    success: data.success,
    id: data.id,
    model: data.model,
    provider: data.provider,
    dimensions: data.dimensions,
    license: data.license,
    paidFallbackExecuted: data.paidFallbackExecuted,
    error: data.error,
  });

  if (!res.ok || !data.success) {
    console.error(`FAIL: Generation failed with HTTP ${res.status}. Error: ${data.error || 'Unknown error'}`);
    process.exit(1);
  }

  if (!data.imageUrl || !data.imageUrl.startsWith('data:image/')) {
    console.error('FAIL: data.imageUrl is missing or not a valid dataURL');
    process.exit(1);
  }

  // Step 3: Decode real binary and inspect pixel dimensions
  console.log('\n[3] Decoding image binary and inspecting real pixel dimensions...');
  const commaIdx = data.imageUrl.indexOf(',');
  const base64Content = data.imageUrl.slice(commaIdx + 1);
  const buffer = Buffer.from(base64Content, 'base64');

  const inspection = inspectImageBinary(buffer);
  console.log('[3] Binary Inspection Result:', {
    isValid: inspection.isValid,
    format: inspection.format,
    width: inspection.width,
    height: inspection.height,
    megapixels: inspection.megapixels,
    fileSizeBytes: inspection.fileSizeBytes,
    fileSizeMb: (inspection.fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB',
  });

  if (!inspection.isValid) {
    console.error(`FAIL: Image binary is invalid: ${inspection.error}`);
    process.exit(1);
  }

  // Step 4: Verify persistence in Asset Storage (IndexedDB)
  console.log('\n[4] Storing real asset in Asset Storage (IndexedDB)...');
  const assetRecord: Asset = {
    id: data.id || `hf-live-${Date.now()}`,
    title: 'Golden Autumn Leaf',
    type: 'image',
    prompt: 'A pristine golden autumn leaf resting on a calm clear pond with soft morning reflections, high detail',
    style: 'Default',
    aspectRatio: '1:1',
    dimensions: `${inspection.width} × ${inspection.height}`,
    url: data.imageUrl,
    thumbnailUrl: data.imageUrl,
    createdAt: new Date().toISOString(),
    isFavorite: false,
    model: data.model || 'black-forest-labs/FLUX.1-schnell',
    source: 'Studio',
    license: data.license || 'Apache-2.0',
  };

  const savedAsset = await saveAssetToDB(assetRecord, undefined, undefined, indexedDB);
  console.log('[4] Asset saved to DB:', {
    id: savedAsset.id,
    title: savedAsset.title,
    dimensions: savedAsset.dimensions,
    format: savedAsset.fileFormat,
    size: savedAsset.fileSize,
  });

  const allAssets = await loadAllAssetsFromDB(indexedDB);
  const found = allAssets.find((a) => a.id === savedAsset.id);
  const byId = await getAssetByIdFromDB(savedAsset.id, indexedDB);
  const storageVerified = !!found && !!byId && found.dimensions === `${inspection.width} × ${inspection.height}`;
  console.log(`[4] Asset Persistence Verified in DB: ${storageVerified} (Total assets in DB: ${allAssets.length})`);

  if (!storageVerified) {
    console.error('FAIL: Asset could not be retrieved from Asset Storage');
    process.exit(1);
  }

  // Final Summary
  console.log('\n=============================================');
  console.log('FINAL TEST OUTCOME: PASS');
  console.log(`HTTP Status: ${res.status}`);
  console.log(`Model: ${data.model}`);
  console.log(`Format: ${inspection.format}`);
  console.log(`Actual Pixel Dimensions: ${inspection.width} × ${inspection.height} px (${inspection.megapixels} MP)`);
  console.log(`File Size: ${(inspection.fileSizeBytes / 1024).toFixed(1)} KB`);
  console.log(`Paid Fallback Executed: ${data.paidFallbackExecuted}`);
  console.log(`Asset Storage Persistence: VERIFIED (ID: ${savedAsset.id})`);
  console.log('=============================================\n');
}

runLiveTest().catch((err) => {
  console.error('UNHANDLED ERROR in Live Test:', err);
  process.exit(1);
});

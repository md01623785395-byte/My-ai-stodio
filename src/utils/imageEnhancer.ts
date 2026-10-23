/**
 * Image Enhancement Utility: Real Pixel-Level Upscaling & JPEG sRGB Conversion
 * 
 * Strict Compliance:
 * 1. Upscale increases the REAL pixel dimensions (e.g. 1024x1024 -> 2048x2048 or 4096x4096)
 *    using high-fidelity stepped bicubic resampling on offscreen canvas.
 * 2. Convert to JPEG encodes real JPEG in standard sRGB color space with clean solid background.
 * 3. Re-inspects real Width, Height, Megapixels (MP), Format, and File Size (MB).
 * 4. Original asset is kept untouched; processed image is a separate copy.
 * 5. If real upscaling fails or is not possible, throws a descriptive error without faking.
 * 6. Zero paid APIs — runs purely on client-side hardware-accelerated canvas.
 */

export interface EnhancementResult {
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  newWidth: number;
  newHeight: number;
  originalMegapixels: number;
  newMegapixels: number;
  format: 'JPEG' | 'PNG';
  fileSizeBytes: number;
  fileSizeMb: number;
  processTimeMs: number;
  enhancementType: 'upscale-2x' | 'upscale-4x' | 'convert-jpeg';
}

/**
 * Loads an image safely, handling base64 data URLs, blob URLs, and external URLs via proxy
 */
export async function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== 'string') {
      return reject(new Error('ছবির ভ্যালিড URL পাওয়া যায়নি।'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error('ছবির পিক্সেল রেজোলিউশন পড়া যায়নি (Natural dimensions 0x0)।'));
      } else {
        resolve(img);
      }
    };

    img.onerror = () => {
      // If external URL failed due to CORS, attempt loading through local proxy
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => {
          if (fallbackImg.naturalWidth > 0 && fallbackImg.naturalHeight > 0) {
            resolve(fallbackImg);
          } else {
            reject(new Error('প্রক্সি মাধ্যমেও ছবির পিক্সেল রিড করা সম্ভব হয়নি।'));
          }
        };
        fallbackImg.onerror = () => {
          reject(new Error('ছবি লোড করা ব্যর্থ হয়েছে। ফাইলটির সোর্স অ্যাক্সেসযোগ্য নয় বা নষ্ট।'));
        };
        fallbackImg.src = proxyUrl;
      } else {
        reject(new Error('ছবি লোড করা সম্ভব হয়নি। ফাইলটি ক্ষতিগ্রস্ত হতে পারে।'));
      }
    };

    img.src = url;
  });
}

/**
 * Detects mobile or resource-constrained device environments
 */
export function isMobileOrConstrainedEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallScreen = window.innerWidth <= 768;
  const hasTouch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
  const isLowMemory =
    typeof navigator !== 'undefined' &&
    'deviceMemory' in navigator &&
    (navigator as unknown as { deviceMemory?: number }).deviceMemory !== undefined &&
    (navigator as unknown as { deviceMemory?: number }).deviceMemory! <= 4;
  return isMobileUA || (isSmallScreen && hasTouch) || Boolean(isLowMemory);
}

/**
 * Conservative memory guard parameters for mobile / constrained devices
 * Standard stock requires >= 4.0 MP (e.g. 2560 x 1600 or 2048 x 2048).
 * Mobile browsers (iOS Safari, Android Chrome) crash or discard canvas when exceeding ~16 MP (~4096 x 4096).
 * For 4x upscale, intermediate stepped canvas adds an additional 25% memory overhead.
 */
export const MOBILE_MEMORY_GUARD = {
  MAX_SAFE_DIMENSION: 4096,
  MAX_SAFE_PIXELS: 16_000_000, // 16 Megapixels
  MAX_SAFE_RGBA_BYTES: 64 * 1024 * 1024, // 64 MB buffer limit
};

/**
 * Validates whether an upscale operation is safe on current device memory
 */
export function checkUpscaleMemorySafety(
  origW: number,
  origH: number,
  factor: 2 | 4,
  isMobileOverride?: boolean
): { safe: boolean; reasonBn?: string; reasonEn?: string; targetW: number; targetH: number; targetPixels: number } {
  const targetW = origW * factor;
  const targetH = origH * factor;
  const targetPixels = targetW * targetH;
  const isMobile = isMobileOverride !== undefined ? isMobileOverride : isMobileOrConstrainedEnvironment();

  if (isMobile) {
    if (
      targetW > MOBILE_MEMORY_GUARD.MAX_SAFE_DIMENSION ||
      targetH > MOBILE_MEMORY_GUARD.MAX_SAFE_DIMENSION ||
      targetPixels > MOBILE_MEMORY_GUARD.MAX_SAFE_PIXELS
    ) {
      const mp = (targetPixels / 1_000_000).toFixed(1);
      return {
        safe: false,
        targetW,
        targetH,
        targetPixels,
        reasonBn: `মোবাইল মেমোরি সুরক্ষা (Memory Guard): লক্ষ্য রেজোলিউশন ${targetW} × ${targetH} px (${mp} MP) মোবাইল ব্রাউজারের নিরাপদ সীমা (সর্বোচ্চ ৪০৯৬ px / ১৬ MP) অতিক্রম করেছে। ডিভাইসের মেমোরি ক্র্যাশ এড়াতে মূল অ্যাসেট অক্ষত রেখে আপস্কেলিং সম্পন্ন করা যায়নি।`,
        reasonEn: `Mobile memory guard: Target resolution ${targetW} × ${targetH} px (${mp} MP) exceeds safe mobile threshold (max 4096px / 16 MP). Original asset preserved safely without risking device memory crash.`,
      };
    }
  }

  // Desktop general limit
  if (targetW > 16384 || targetH > 16384) {
    return {
      safe: false,
      targetW,
      targetH,
      targetPixels,
      reasonBn: `টার্গেট রেজোলিউশন (${targetW} × ${targetH} px) ব্রাউজারের ক্যানভাস সীমা (১৬৩৮৪ px) অতিক্রম করেছে।`,
      reasonEn: `Target resolution (${targetW} × ${targetH} px) exceeds browser canvas limit (16384 px).`,
    };
  }

  return { safe: true, targetW, targetH, targetPixels };
}

/**
 * Real Pixel Upscale (2x or 4x)
 * Allocates actual enlarged canvas and redraws with high quality smoothing
 */
export async function upscaleImageReal(
  imageUrl: string,
  factor: 2 | 4 = 2,
  options?: { convertToJpeg?: boolean; jpegQuality?: number; isMobileOverride?: boolean }
): Promise<EnhancementResult> {
  const startTime = performance.now();

  // Validate factor
  if (factor !== 2 && factor !== 4) {
    throw new Error('শুধুমাত্র 2x অথবা 4x আপস্কেল সমর্থিত।');
  }

  // Load the real image
  const img = await loadImageElement(imageUrl);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  if (origW <= 0 || origH <= 0) {
    throw new Error('ছবির মূল পিক্সেল ডিকোড করা সম্ভব হয়নি।');
  }

  // Conservative Mobile Memory Guard
  const memorySafety = checkUpscaleMemorySafety(origW, origH, factor, options?.isMobileOverride);
  if (!memorySafety.safe) {
    throw new Error(memorySafety.reasonBn || 'ক্যানভাস মেমোরি সীমাবদ্ধতার কারণে আপস্কেলিং নিরাপদে সম্পন্ন করা যায়নি।');
  }

  const targetW = memorySafety.targetW;
  const targetH = memorySafety.targetH;

  // Step 1: Create canvas for target dimension
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d', {
    willReadFrequently: false,
    colorSpace: 'srgb',
  });

  if (!ctx) {
    throw new Error('ব্রাউজার 2D ক্যানভাস কনটেক্সট তৈরি করতে ব্যর্থ হয়েছে। মেমোরি সীমাবদ্ধতা হতে পারে।');
  }

  // Solid white background for transparency handling in stock standard JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // For 4x upscale, perform a stepped 2-pass super-sample (1x -> 2x -> 4x) to reduce blur
  if (factor === 4) {
    const intermediateCanvas = document.createElement('canvas');
    intermediateCanvas.width = origW * 2;
    intermediateCanvas.height = origH * 2;
    const midCtx = intermediateCanvas.getContext('2d', { colorSpace: 'srgb' });
    if (midCtx) {
      midCtx.fillStyle = '#FFFFFF';
      midCtx.fillRect(0, 0, intermediateCanvas.width, intermediateCanvas.height);
      midCtx.imageSmoothingEnabled = true;
      midCtx.imageSmoothingQuality = 'high';
      midCtx.drawImage(img, 0, 0, intermediateCanvas.width, intermediateCanvas.height);

      // Now draw from 2x to 4x on the main canvas
      ctx.drawImage(intermediateCanvas, 0, 0, targetW, targetH);
    } else {
      ctx.drawImage(img, 0, 0, targetW, targetH);
    }
  } else {
    // 2x direct high-quality bicubic interpolation
    ctx.drawImage(img, 0, 0, targetW, targetH);
  }

  // Stock standard requires JPEG with sRGB
  const quality = options?.jpegQuality ?? 0.95;
  const mimeType = 'image/jpeg';
  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL(mimeType, quality);
  } catch (canvasErr) {
    throw new Error('ক্যানভাস মেমোরি সীমাবদ্ধতা: ইমেজ এনকোড করতে ব্যর্থ হয়েছে। মেমোরি সুরক্ষার জন্য মূল অ্যাসেট অক্ষত রাখা হলো।');
  }

  if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 50) {
    throw new Error('ক্যানভাস মেমোরি সীমাবদ্ধতা: ডিভাইস ব্রাউজার ইমেজ বাফার এনকোড করতে পারেনি। মূল অ্যাসেট অক্ষত রাখা হলো।');
  }

  // Calculate real binary byte size from base64
  const base64Content = dataUrl.split(',')[1] || '';
  const fileSizeBytes = Math.round((base64Content.length * 3) / 4);
  const fileSizeMb = Number((fileSizeBytes / (1024 * 1024)).toFixed(2));

  const origMp = Number(((origW * origH) / 1_000_000).toFixed(2));
  const newMp = Number(((targetW * targetH) / 1_000_000).toFixed(2));
  const processTimeMs = Math.round(performance.now() - startTime);

  return {
    dataUrl,
    originalWidth: origW,
    originalHeight: origH,
    newWidth: targetW,
    newHeight: targetH,
    originalMegapixels: origMp,
    newMegapixels: newMp,
    format: 'JPEG',
    fileSizeBytes,
    fileSizeMb,
    processTimeMs,
    enhancementType: factor === 4 ? 'upscale-4x' : 'upscale-2x',
  };
}

/**
 * Real Format Conversion to JPEG (sRGB)
 * Ensures alpha transparency is blended into clean white and sRGB color profile is embedded
 */
export async function convertToJpegReal(
  imageUrl: string,
  quality: number = 0.95
): Promise<EnhancementResult> {
  const startTime = performance.now();

  const img = await loadImageElement(imageUrl);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  if (origW <= 0 || origH <= 0) {
    throw new Error('ছবির মূল পিক্সেল ডিকোড করা সম্ভব হয়নি।');
  }

  const canvas = document.createElement('canvas');
  canvas.width = origW;
  canvas.height = origH;

  const ctx = canvas.getContext('2d', {
    willReadFrequently: false,
    colorSpace: 'srgb',
  });

  if (!ctx) {
    throw new Error('ব্রাউজার ক্যানভাস কনটেক্সট তৈরি করতে ব্যর্থ হয়েছে।');
  }

  // White background ensures transparent PNGs don't become ugly black boxes in JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, origW, origH);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, origW, origH);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);

  const base64Content = dataUrl.split(',')[1] || '';
  const fileSizeBytes = Math.round((base64Content.length * 3) / 4);
  const fileSizeMb = Number((fileSizeBytes / (1024 * 1024)).toFixed(2));
  const mp = Number(((origW * origH) / 1_000_000).toFixed(2));
  const processTimeMs = Math.round(performance.now() - startTime);

  return {
    dataUrl,
    originalWidth: origW,
    originalHeight: origH,
    newWidth: origW,
    newHeight: origH,
    originalMegapixels: mp,
    newMegapixels: mp,
    format: 'JPEG',
    fileSizeBytes,
    fileSizeMb,
    processTimeMs,
    enhancementType: 'convert-jpeg',
  };
}

/**
 * Client-side helper to prepare image pixel data for AI Vision model inspection.
 * Downscales overly large raw files (e.g., > 10MB uncompressed PNG uploads)
 * to high-fidelity ~1200px JPEG buffers so Gemini Vision inspects actual pixels quickly and reliably.
 */

export interface PreparedPixelData {
  base64: string;
  mimeType: string;
  width?: number;
  height?: number;
}

export async function prepareImageForVisionAnalysis(
  imageUrl: string,
  maxDimension = 1200
): Promise<PreparedPixelData | null> {
  if (!imageUrl) return null;

  // 1. If it's already a compact data URL (< 2.5MB), use it directly
  if (imageUrl.startsWith('data:image/') && imageUrl.length < 2_500_000) {
    const match = imageUrl.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
    if (match) {
      return {
        mimeType: match[1],
        base64: match[2],
      };
    }
  }

  // 2. Load into offscreen Image to scale if needed or if it's a blob/large data URL
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      // If image loading hangs or is blocked, resolve null so backend can try direct fetch
      resolve(null);
    }, 5000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(null);
          return;
        }

        // Downscale while preserving aspect ratio if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const match = dataUrl.match(/^data:image\/jpeg;base64,(.+)$/);

        if (match) {
          resolve({
            base64: match[1],
            mimeType: 'image/jpeg',
            width,
            height,
          });
        } else {
          resolve(null);
        }
      } catch (err) {
        // e.g. tainted canvas from cross-origin
        console.warn('Canvas export failed (likely CORS), server will attempt direct fetch:', err);
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = imageUrl;
  });
}

import { AspectRatioType } from '../types';

export interface MediaInspectionResult {
  dimensions: string;
  width: number | null;
  height: number | null;
  duration?: string;
  durationSeconds?: number | null;
  fps?: number;
  fileSize: string;
  fileSizeBytes: number;
  fileFormat: string;
  aspectRatio: AspectRatioType;
  thumbnailUrl?: string;
  thumbnailBlob?: Blob;
}

/**
 * Formats byte size into human readable string (KB / MB)
 */
export function formatByteSize(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) {
    return 'Not available';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Determines closest standard AspectRatioType from width and height
 */
export function calculateClosestAspectRatio(width: number, height: number): AspectRatioType {
  if (!width || !height || width <= 0 || height <= 0) {
    return '16:9';
  }
  const ratio = width / height;

  const standardRatios: Array<{ type: AspectRatioType; value: number }> = [
    { type: '1:1', value: 1.0 },
    { type: '16:9', value: 16 / 9 }, // 1.777
    { type: '9:16', value: 9 / 16 }, // 0.5625
    { type: '4:3', value: 4 / 3 },   // 1.333
    { type: '3:2', value: 3 / 2 },   // 1.5
    { type: '21:9', value: 21 / 9 }, // 2.333
  ];

  let closest = standardRatios[0];
  let minDiff = Math.abs(ratio - standardRatios[0].value);

  for (let i = 1; i < standardRatios.length; i++) {
    const diff = Math.abs(ratio - standardRatios[i].value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = standardRatios[i];
    }
  }

  return closest.type;
}

/**
 * Extracts human-friendly file format from MIME type or filename
 */
export function extractFileFormat(file: File | Blob, fallbackName?: string): string {
  const mime = file.type ? file.type.toLowerCase() : '';
  if (mime.includes('mp4')) return 'MP4 (video/mp4)';
  if (mime.includes('webm')) return 'WebM (video/webm)';
  if (mime.includes('quicktime')) return 'MOV (video/quicktime)';
  if (mime.includes('png')) return 'PNG (image/png)';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG (image/jpeg)';
  if (mime.includes('webp')) return 'WebP (image/webp)';

  // Fallback to filename extension
  const name = fallbackName || (file instanceof File ? file.name : '');
  if (name) {
    const ext = name.split('.').pop()?.toUpperCase();
    if (ext) return `${ext} (${mime || 'binary'})`;
  }

  return mime || 'Not available';
}

/**
 * Inspects a real video file to extract format, duration, resolution, file size,
 * and captures a frame thumbnail via HTML5 video + Canvas.
 * If any property cannot be determined, returns "Not available".
 */
export async function inspectVideoFile(file: File | Blob): Promise<MediaInspectionResult> {
  const fileSizeBytes = file.size || 0;
  const fileSize = formatByteSize(fileSizeBytes);
  const fileFormat = extractFileFormat(file);

  // If in non-browser environment (e.g. Node tests without DOM)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      dimensions: 'Not available',
      width: null,
      height: null,
      duration: 'Not available',
      durationSeconds: null,
      fileSize,
      fileSizeBytes,
      fileFormat,
      aspectRatio: '16:9',
    };
  }

  return new Promise((resolve) => {
    let objectUrl: string | null = null;
    let isSettled = false;

    // Timeout safety fallback
    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
        }
        resolve({
          dimensions: 'Not available',
          width: null,
          height: null,
          duration: 'Not available',
          durationSeconds: null,
          fps: 30,
          fileSize,
          fileSizeBytes,
          fileFormat,
          aspectRatio: '16:9',
        });
      }
    }, 4500);

    try {
      objectUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = objectUrl;

      video.onerror = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          if (objectUrl) {
            try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
          }
          resolve({
            dimensions: 'Not available',
            width: null,
            height: null,
            duration: 'Not available',
            durationSeconds: null,
            fps: 30,
            fileSize,
            fileSizeBytes,
            fileFormat,
            aspectRatio: '16:9',
          });
        }
      };

      video.onloadedmetadata = () => {
        const width = video.videoWidth || null;
        const height = video.videoHeight || null;
        const durationSeconds = video.duration && !isNaN(video.duration) ? video.duration : null;

        const dimensions = width && height ? `${width} × ${height}` : 'Not available';
        const duration = durationSeconds !== null ? `${Math.round(durationSeconds)}s` : 'Not available';
        const aspectRatio = width && height ? calculateClosestAspectRatio(width, height) : '16:9';

        // Try seeking to 0.2s or midpoint to capture a real frame thumbnail
        const seekTime = durationSeconds ? Math.min(0.2, durationSeconds / 2) : 0;
        
        const finalize = (thumbUrl?: string, thumbBlob?: Blob) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            if (objectUrl) {
              try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
            }
            resolve({
              dimensions,
              width,
              height,
              duration,
              durationSeconds,
              fps: 30,
              fileSize,
              fileSizeBytes,
              fileFormat,
              aspectRatio,
              thumbnailUrl: thumbUrl,
              thumbnailBlob: thumbBlob,
            });
          }
        };

        if (width && height && typeof document !== 'undefined') {
          video.currentTime = seekTime;
          video.onseeked = () => {
            try {
              const canvas = document.createElement('canvas');
              const thumbWidth = Math.min(640, width);
              const thumbHeight = Math.round((thumbWidth / width) * height);
              canvas.width = thumbWidth;
              canvas.height = thumbHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);
                const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                canvas.toBlob((blob) => {
                  finalize(thumbDataUrl, blob || undefined);
                }, 'image/jpeg', 0.85);
                return;
              }
            } catch {
              // Canvas capture failed (e.g. cross-origin or unsupported codec)
            }
            finalize();
          };
        } else {
          finalize();
        }
      };
    } catch {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
        }
        resolve({
          dimensions: 'Not available',
          width: null,
          height: null,
          duration: 'Not available',
          durationSeconds: null,
          fps: 30,
          fileSize,
          fileSizeBytes,
          fileFormat,
          aspectRatio: '16:9',
        });
      }
    }
  });
}

/**
 * Inspects a real image file to extract format, dimensions, file size,
 * and aspect ratio.
 */
export async function inspectImageFile(file: File | Blob): Promise<MediaInspectionResult> {
  const fileSizeBytes = file.size || 0;
  const fileSize = formatByteSize(fileSizeBytes);
  const fileFormat = extractFileFormat(file);

  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return {
      dimensions: 'Not available',
      width: null,
      height: null,
      fileSize,
      fileSizeBytes,
      fileFormat,
      aspectRatio: '1:1',
    };
  }

  return new Promise((resolve) => {
    let objectUrl: string | null = null;
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
        }
        resolve({
          dimensions: 'Not available',
          width: null,
          height: null,
          fileSize,
          fileSizeBytes,
          fileFormat,
          aspectRatio: '1:1',
        });
      }
    }, 3500);

    try {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          const width = img.naturalWidth || null;
          const height = img.naturalHeight || null;
          const dimensions = width && height ? `${width} × ${height}` : 'Not available';
          const aspectRatio = width && height ? calculateClosestAspectRatio(width, height) : '1:1';
          if (objectUrl) {
            try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
          }
          resolve({
            dimensions,
            width,
            height,
            fileSize,
            fileSizeBytes,
            fileFormat,
            aspectRatio,
          });
        }
      };

      img.onerror = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          if (objectUrl) {
            try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
          }
          resolve({
            dimensions: 'Not available',
            width: null,
            height: null,
            fileSize,
            fileSizeBytes,
            fileFormat,
            aspectRatio: '1:1',
          });
        }
      };

      img.src = objectUrl;
    } catch {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
        }
        resolve({
          dimensions: 'Not available',
          width: null,
          height: null,
          fileSize,
          fileSizeBytes,
          fileFormat,
          aspectRatio: '1:1',
        });
      }
    }
  });
}

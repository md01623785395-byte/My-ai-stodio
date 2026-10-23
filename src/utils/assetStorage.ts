import { Asset, AssetType, AspectRatioType } from '../types';

export const ASSET_DB_NAME = 'AICreatorStudioDB';
export const ASSET_STORE_NAME = 'assets';
export const SALES_STORE_NAME = 'adobe_stock_sales';
export const ASSET_DB_VERSION = 2;
export const LEGACY_LOCALSTORAGE_KEY = 'ai_creator_studio_assets';
export const MIGRATION_FLAG_KEY = 'ai_creator_studio_indexeddb_migrated_v1';

export interface StoredAssetRecord {
  id: string;
  title: string;
  type: AssetType;
  prompt: string;
  negativePrompt?: string;
  style: string;
  aspectRatio: AspectRatioType;
  dimensions: string;
  duration?: string;
  fps?: number;
  url: string; // Remote URL (like Unsplash) or legacy fallback
  thumbnailUrl: string;
  createdAt: string;
  isFavorite: boolean;
  model: string;
  views?: number;
  source?: 'Google Flow' | 'Studio' | 'MiniMax' | 'Gemini' | 'Imported';
  sourceUrl?: string;
  fileSize?: string;
  fileFormat?: string;
  mediaBlob?: Blob; // Native binary Blob in IndexedDB (no 5MB limit!)
  thumbnailBlob?: Blob; // Native thumbnail Blob
  storedAt: number;
}

// Track active ObjectURLs in the current session for clean memory management
const activeObjectURLs = new Set<string>();

/**
 * Registers an object URL for tracking and automatic cleanup
 */
export function trackObjectURL(url: string): string {
  if (url && url.startsWith('blob:')) {
    activeObjectURLs.add(url);
  }
  return url;
}

/**
 * Revokes all active object URLs to prevent memory leaks
 */
export function revokeAllTrackedObjectURLs(): void {
  if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
    for (const url of activeObjectURLs) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
  }
  activeObjectURLs.clear();
}

/**
 * Gets the active IndexedDB factory (window.indexedDB or injected custom factory for tests)
 */
function getIDBFactory(customIDB?: IDBFactory): IDBFactory | null {
  if (customIDB) return customIDB;
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB) {
    return (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB;
  }
  return null;
}

/**
 * Converts a Base64 dataURL to a binary Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    throw new Error('Invalid dataURL format');
  }
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const b64Data = parts[1] || '';
  
  // Use Buffer in Node environment or atob in browser
  if (typeof atob === 'function') {
    const byteString = atob(b64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  } else if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(b64Data, 'base64');
    return new Blob([buf], { type: mime });
  }

  throw new Error('Neither atob nor Buffer is available');
}

/**
 * Converts a Blob or File to a Base64 Data URL (for fallback or exports)
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return `data:${blob.type || 'application/octet-stream'};base64,${b64}`;
}

/**
 * Opens or initializes the IndexedDB database
 */
export function openAssetDB(customIDB?: IDBFactory): Promise<IDBDatabase> {
  const factory = getIDBFactory(customIDB);
  if (!factory) {
    return Promise.reject(
      new Error('IndexedDB is not supported in this environment / ব্রাউজারে IndexedDB সমর্থিত নয়।')
    );
  }

  return new Promise((resolve, reject) => {
    const request = factory.open(ASSET_DB_NAME, ASSET_DB_VERSION);

    request.onerror = () => {
      reject(
        new Error(
          `IndexedDB ওপেন করতে ব্যর্থ হয়েছে: ${request.error?.message || 'Unknown database error'}`
        )
      );
    };

    request.onblocked = () => {
      console.warn('IndexedDB database blocked: waiting for other connections to close');
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
        const store = db.createObjectStore(ASSET_STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
        store.createIndex('storedAt', 'storedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(SALES_STORE_NAME)) {
        const salesStore = db.createObjectStore(SALES_STORE_NAME, { keyPath: 'id' });
        salesStore.createIndex('assetId', 'assetId', { unique: false });
        salesStore.createIndex('saleDate', 'saleDate', { unique: false });
        salesStore.createIndex('license', 'license', { unique: false });
        salesStore.createIndex('dedupeKey', 'dedupeKey', { unique: true });
        salesStore.createIndex('importedAt', 'importedAt', { unique: false });
      }
    };
  });
}

/**
 * Converts a StoredAssetRecord to an active Asset ready for the UI
 */
export function hydrateStoredAsset(record: StoredAssetRecord): Asset {
  let displayUrl = record.url;
  let displayThumbnail = record.thumbnailUrl;

  // If native media Blob is available, generate an active Object URL
  if (record.mediaBlob && typeof URL !== 'undefined' && URL.createObjectURL) {
    try {
      displayUrl = trackObjectURL(URL.createObjectURL(record.mediaBlob));
    } catch (err) {
      console.warn(`Failed to create ObjectURL for asset ${record.id}:`, err);
    }
  }

  if (record.thumbnailBlob && typeof URL !== 'undefined' && URL.createObjectURL) {
    try {
      displayThumbnail = trackObjectURL(URL.createObjectURL(record.thumbnailBlob));
    } catch (err) {
      console.warn(`Failed to create thumbnail ObjectURL for asset ${record.id}:`, err);
    }
  } else if (!displayThumbnail && displayUrl) {
    displayThumbnail = displayUrl;
  }

  return {
    id: record.id,
    title: record.title || 'Untitled Asset',
    type: record.type || 'image',
    prompt: record.prompt || '',
    negativePrompt: record.negativePrompt,
    style: record.style || 'Custom',
    aspectRatio: record.aspectRatio || '16:9',
    dimensions: record.dimensions || 'Original Resolution',
    duration: record.duration,
    fps: record.fps,
    url: displayUrl,
    thumbnailUrl: displayThumbnail,
    createdAt: record.createdAt || 'Just now',
    isFavorite: !!record.isFavorite,
    model: record.model || 'Studio',
    views: record.views || 1,
    source: record.source,
    sourceUrl: record.sourceUrl,
    fileSize: record.fileSize,
    fileFormat: record.fileFormat,
  };
}

/**
 * Saves a single asset to IndexedDB with native Blob storage.
 * If asset.url is a base64 dataURL, it automatically converts it into a binary Blob
 * so it never consumes localStorage memory.
 */
export async function saveAssetToDB(
  asset: Asset,
  mediaBlob?: Blob,
  thumbnailBlob?: Blob,
  customIDB?: IDBFactory
): Promise<Asset> {
  const db = await openAssetDB(customIDB);

  let targetMediaBlob = mediaBlob;
  let targetThumbBlob = thumbnailBlob;

  // If no mediaBlob provided, but asset.url is a Base64 dataURL, convert to Blob
  if (!targetMediaBlob && asset.url && asset.url.startsWith('data:')) {
    try {
      targetMediaBlob = dataUrlToBlob(asset.url);
    } catch (err) {
      console.warn('Could not convert dataURL to Blob:', err);
    }
  }

  // If asset.url is a local blob: URL in browser, extract the Blob via fetch
  if (!targetMediaBlob && asset.url && asset.url.startsWith('blob:') && typeof fetch !== 'undefined') {
    try {
      const resp = await fetch(asset.url);
      targetMediaBlob = await resp.blob();
    } catch {
      // ignore
    }
  }

  // Check thumbnail data URL
  if (!targetThumbBlob && asset.thumbnailUrl && asset.thumbnailUrl.startsWith('data:')) {
    try {
      targetThumbBlob = dataUrlToBlob(asset.thumbnailUrl);
    } catch {
      // ignore
    }
  }

  // Calculate file format and file size if missing
  let fileSize = asset.fileSize;
  let fileFormat = asset.fileFormat;

  if (targetMediaBlob) {
    if (!fileSize) {
      const bytes = targetMediaBlob.size;
      fileSize = bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (!fileFormat && targetMediaBlob.type) {
      fileFormat = targetMediaBlob.type;
    }
  }

  const record: StoredAssetRecord = {
    id: asset.id,
    title: asset.title,
    type: asset.type,
    prompt: asset.prompt,
    negativePrompt: asset.negativePrompt,
    style: asset.style,
    aspectRatio: asset.aspectRatio,
    dimensions: asset.dimensions,
    duration: asset.duration,
    fps: asset.fps,
    // Store original remote URL (e.g. Unsplash) if it wasn't a blob/data URL
    url: asset.url && !asset.url.startsWith('blob:') && !asset.url.startsWith('data:') ? asset.url : '',
    thumbnailUrl: asset.thumbnailUrl && !asset.thumbnailUrl.startsWith('blob:') && !asset.thumbnailUrl.startsWith('data:') ? asset.thumbnailUrl : '',
    createdAt: asset.createdAt,
    isFavorite: asset.isFavorite,
    model: asset.model,
    views: asset.views,
    source: asset.source,
    sourceUrl: asset.sourceUrl,
    fileSize,
    fileFormat,
    mediaBlob: targetMediaBlob,
    thumbnailBlob: targetThumbBlob,
    storedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(ASSET_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(ASSET_STORE_NAME);
      const putRequest = store.put(record);

      putRequest.onsuccess = () => {
        resolve(hydrateStoredAsset(record));
      };

      putRequest.onerror = (e) => {
        const error = (e.target as IDBRequest).error;
        if (error?.name === 'QuotaExceededError') {
          reject(
            new Error(
              'ব্রাউজারের স্টোরেজ কোটা পূর্ণ হয়ে গেছে। দয়া করে কিছু পুরোনো ছবি বা ভিডিও মুছে ফেলুন। (Browser storage quota exceeded. Please delete some assets to free up space.)'
            )
          );
        } else {
          reject(new Error(`Failed to save asset: ${error?.message || 'Storage error'}`));
        }
      };

      transaction.onabort = (e) => {
        const error = (e.target as IDBTransaction).error;
        reject(new Error(`Transaction aborted: ${error?.message || 'Storage error'}`));
      };
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name === 'QuotaExceededError') {
        reject(
          new Error(
            'ব্রাউজারের স্টোরেজ কোটা পূর্ণ হয়ে গেছে। দয়া করে কিছু পুরোনো ছবি বা ভিডিও মুছে ফেলুন। (Storage quota exceeded)'
          )
        );
      } else {
        reject(new Error(`Error initiating asset storage: ${e?.message || 'Unknown error'}`));
      }
    }
  });
}

/**
 * Loads all assets from IndexedDB, ordered with newest assets first
 */
export async function loadAllAssetsFromDB(customIDB?: IDBFactory): Promise<Asset[]> {
  const db = await openAssetDB(customIDB);

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(ASSET_STORE_NAME, 'readonly');
      const store = transaction.objectStore(ASSET_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records: StoredAssetRecord[] = request.result || [];
        // Sort descending by storedAt or preserve order
        records.sort((a, b) => (b.storedAt || 0) - (a.storedAt || 0));

        const hydrated = records.map((rec) => hydrateStoredAsset(rec));
        resolve(hydrated);
      };

      request.onerror = (e) => {
        const error = (e.target as IDBRequest).error;
        reject(new Error(`Failed to load assets: ${error?.message || 'Read error'}`));
      };
    } catch (err: unknown) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Gets a single asset by ID from IndexedDB
 */
export async function getAssetByIdFromDB(id: string, customIDB?: IDBFactory): Promise<Asset | null> {
  const db = await openAssetDB(customIDB);

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(ASSET_STORE_NAME, 'readonly');
      const store = transaction.objectStore(ASSET_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        if (!request.result) {
          resolve(null);
        } else {
          resolve(hydrateStoredAsset(request.result));
        }
      };

      request.onerror = (e) => {
        const error = (e.target as IDBRequest).error;
        reject(new Error(`Failed to get asset: ${error?.message || 'Read error'}`));
      };
    } catch (err: unknown) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Gets a raw stored asset record including native binary Blobs by ID from IndexedDB
 */
export async function getAssetRecordByIdFromDB(id: string, customIDB?: IDBFactory): Promise<StoredAssetRecord | null> {
  const db = await openAssetDB(customIDB);

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(ASSET_STORE_NAME, 'readonly');
      const store = transaction.objectStore(ASSET_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = (e) => {
        const error = (e.target as IDBRequest).error;
        reject(new Error(`Failed to get asset record: ${error?.message || 'Read error'}`));
      };
    } catch (err: unknown) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Gets native binary mediaBlobs and thumbnailBlobs for an asset by ID
 */
export async function getAssetBlobsFromDB(id: string, customIDB?: IDBFactory): Promise<{ mediaBlob?: Blob; thumbnailBlob?: Blob } | null> {
  const rec = await getAssetRecordByIdFromDB(id, customIDB);
  if (!rec) return null;
  return {
    mediaBlob: rec.mediaBlob,
    thumbnailBlob: rec.thumbnailBlob,
  };
}

/**
 * Updates partial asset fields (e.g. isFavorite, title) in IndexedDB
 */
export async function updateAssetInDB(
  id: string,
  updates: Partial<Asset>,
  customIDB?: IDBFactory
): Promise<void> {
  const db = await openAssetDB(customIDB);

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(ASSET_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(ASSET_STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing: StoredAssetRecord = getReq.result;
        if (!existing) {
          resolve(); // nothing to update
          return;
        }

        const merged: StoredAssetRecord = {
          ...existing,
          ...updates,
          id: existing.id, // prevent id change
          mediaBlob: existing.mediaBlob, // preserve blob
          thumbnailBlob: existing.thumbnailBlob,
        };

        const putReq = store.put(merged);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(new Error('Failed to update asset in IndexedDB'));
      };

      getReq.onerror = () => reject(new Error('Failed to read asset for update'));
    } catch (err: unknown) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Deletes an asset by ID from IndexedDB
 */
export async function deleteAssetFromDB(id: string, customIDB?: IDBFactory): Promise<void> {
  const db = await openAssetDB(customIDB);

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(ASSET_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(ASSET_STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error('Failed to delete asset from IndexedDB'));
    } catch (err: unknown) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Clears all assets from IndexedDB
 */
export async function clearAllAssetsFromDB(customIDB?: IDBFactory): Promise<void> {
  const db = await openAssetDB(customIDB);

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(ASSET_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(ASSET_STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => {
        revokeAllTrackedObjectURLs();
        resolve();
      };
      req.onerror = () => reject(new Error('Failed to clear assets in IndexedDB'));
    } catch (err: unknown) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export interface StorageQuotaInfo {
  usedBytes: number;
  quotaBytes: number;
  usedFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
}

/**
 * Gets real browser storage usage and quota estimate via navigator.storage
 */
export async function getStorageQuotaInfo(): Promise<StorageQuotaInfo | null> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    !navigator.storage.estimate
  ) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usedBytes = estimate.usage || 0;
    const quotaBytes = estimate.quota || 0;

    const usedFormatted =
      usedBytes < 1024 * 1024
        ? `${(usedBytes / 1024).toFixed(1)} KB`
        : `${(usedBytes / (1024 * 1024)).toFixed(1)} MB`;

    const quotaFormatted =
      quotaBytes < 1024 * 1024 * 1024
        ? `${(quotaBytes / (1024 * 1024)).toFixed(0)} MB`
        : `${(quotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;

    const percentUsed = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0;

    return {
      usedBytes,
      quotaBytes,
      usedFormatted,
      quotaFormatted,
      percentUsed,
    };
  } catch {
    return null;
  }
}

export interface MigrationResult {
  migratedCount: number;
  success: boolean;
  source: 'localStorage' | 'none' | 'already-migrated';
  error?: string;
}

/**
 * Safely migrates assets from localStorage to IndexedDB.
 * Strict rules:
 * 1. Converts Base64 data URLs to binary Blobs.
 * 2. Writes each asset to IndexedDB.
 * 3. Verifies every asset is saved and readable from IndexedDB.
 * 4. Only after successful verification is the migration flag set and old localStorage key cleared.
 * 5. If verification fails, original localStorage data is kept 100% intact and descriptive error returned.
 */
export async function migrateFromLocalStorage(
  initialFallbackAssets: Asset[],
  customIDB?: IDBFactory
): Promise<MigrationResult> {
  // If in environment without localStorage, load initial fallback assets
  if (typeof localStorage === 'undefined') {
    const existing = await loadAllAssetsFromDB(customIDB);
    if (existing.length === 0) {
      for (const item of initialFallbackAssets) {
        await saveAssetToDB(item, undefined, undefined, customIDB);
      }
    }
    return { migratedCount: 0, success: true, source: 'none' };
  }

  try {
    // Check if IndexedDB already has assets
    const existingInDB = await loadAllAssetsFromDB(customIDB);
    if (existingInDB.length > 0) {
      return { migratedCount: existingInDB.length, success: true, source: 'already-migrated' };
    }

    // Check localStorage
    const rawSaved = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (!rawSaved) {
      // Seed with initial assets if DB is empty and localStorage has no assets
      for (const item of initialFallbackAssets) {
        await saveAssetToDB(item, undefined, undefined, customIDB);
      }
      return { migratedCount: initialFallbackAssets.length, success: true, source: 'none' };
    }

    let parsedAssets: Asset[] = [];
    try {
      parsedAssets = JSON.parse(rawSaved);
    } catch {
      return {
        migratedCount: 0,
        success: false,
        source: 'localStorage',
        error: 'localStorage-এর ডেটা পার্স করতে সমস্যা হয়েছে (Corrupted JSON in localStorage)',
      };
    }

    if (!Array.isArray(parsedAssets) || parsedAssets.length === 0) {
      for (const item of initialFallbackAssets) {
        await saveAssetToDB(item, undefined, undefined, customIDB);
      }
      return { migratedCount: initialFallbackAssets.length, success: true, source: 'none' };
    }

    // Attempt migration of each asset
    const successfullySavedIds: string[] = [];

    for (const asset of parsedAssets) {
      let mediaBlob: Blob | undefined;
      let thumbBlob: Blob | undefined;

      if (asset.url && asset.url.startsWith('data:')) {
        try {
          mediaBlob = dataUrlToBlob(asset.url);
        } catch (err) {
          console.warn(`Base64 decode warning for asset ${asset.id}:`, err);
        }
      }

      if (asset.thumbnailUrl && asset.thumbnailUrl.startsWith('data:')) {
        try {
          thumbBlob = dataUrlToBlob(asset.thumbnailUrl);
        } catch {
          // ignore
        }
      }

      await saveAssetToDB(asset, mediaBlob, thumbBlob, customIDB);
      successfullySavedIds.push(asset.id);
    }

    // Verification step: verify all assets were saved and are retrievable
    const verificationList = await loadAllAssetsFromDB(customIDB);
    const verifiedIds = new Set(verificationList.map((a) => a.id));

    const allVerified = successfullySavedIds.every((id) => verifiedIds.has(id));

    if (!allVerified || verificationList.length < successfullySavedIds.length) {
      // Verification failed! Do NOT touch localStorage!
      return {
        migratedCount: verificationList.length,
        success: false,
        source: 'localStorage',
        error:
          'IndexedDB-তে মাইগ্রেশন সম্পূর্ণ যাচাই করা যায়নি। ডেটা সুরক্ষার স্বার্থে পূর্বের localStorage ডেটা অক্ষত রাখা হলো। (Verification failed, localStorage intact)',
      };
    }

    // Verification PASSED! Safely mark migration flag and clear the heavy localStorage key
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);

    return {
      migratedCount: verificationList.length,
      success: true,
      source: 'localStorage',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // On any error, DO NOT delete localStorage!
    return {
      migratedCount: 0,
      success: false,
      source: 'localStorage',
      error: `মাইগ্রেশন ব্যর্থ হয়েছে: ${errorMsg}. মূল localStorage ডেটা সুরক্ষিত আছে।`,
    };
  }
}

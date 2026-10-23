/**
 * Adobe Stock Sales IndexedDB Storage
 * Priority 7.0 & 7.0.1: Versioned, isolated storage for contributor sales
 *
 * Persists parsed Adobe Stock sales records in IndexedDB ('adobe_stock_sales')
 * without modifying or breaking existing 'assets' store or pipeline schemas.
 * Enforces strict deduplication so repeated CSV imports do not duplicate sales counts.
 */

import { AdobeSaleRecord, ImportSalesResult } from '../types/salesAnalytics';
import { openAssetDB, SALES_STORE_NAME } from './assetStorage';

/**
 * Opens the database with the sales store initialized
 */
export async function openSalesDB(customIDB?: IDBFactory): Promise<IDBDatabase> {
  return openAssetDB(customIDB);
}

/**
 * Imports parsed Adobe Sales Records into IndexedDB with duplicate prevention
 */
export async function importSalesRecordsToDB(
  records: AdobeSaleRecord[],
  customIDB?: IDBFactory
): Promise<ImportSalesResult> {
  if (!records || records.length === 0) {
    const totalStored = await getSalesRecordsCount(customIDB);
    return {
      success: true,
      totalProvided: 0,
      importedCount: 0,
      duplicateCount: 0,
      duplicatesSkipped: [],
      totalStoredAfterImport: totalStored,
    };
  }

  const db = await openSalesDB(customIDB);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SALES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(SALES_STORE_NAME);

    // Fetch existing records to build an in-memory deduplication set
    const getAllReq = store.getAll();

    getAllReq.onerror = () => {
      reject(new Error(`বিদ্যমান রেকর্ড পড়তে ব্যর্থ হয়েছে: ${getAllReq.error?.message}`));
    };

    getAllReq.onsuccess = () => {
      const existing: AdobeSaleRecord[] = getAllReq.result || [];
      const existingDedupeSet = new Set<string>();
      existing.forEach((r) => {
        if (r.dedupeKey) existingDedupeSet.add(r.dedupeKey);
      });

      let importedCount = 0;
      let duplicateCount = 0;
      const duplicatesSkipped: string[] = [];

      for (const record of records) {
        if (existingDedupeSet.has(record.dedupeKey)) {
          duplicateCount++;
          if (duplicatesSkipped.length < 20) {
            duplicatesSkipped.push(
              `Asset #${record.assetId} (${record.saleDate}, ${record.license}, $${record.royalty})`
            );
          }
          continue;
        }

        // New record - add to store and to set
        store.put(record);
        existingDedupeSet.add(record.dedupeKey);
        importedCount++;
      }

      tx.oncomplete = () => {
        resolve({
          success: true,
          totalProvided: records.length,
          importedCount,
          duplicateCount,
          duplicatesSkipped,
          totalStoredAfterImport: existing.length + importedCount,
        });
      };

      tx.onerror = () => {
        reject(new Error(`রেকর্ড সেভ করতে ব্যর্থ হয়েছে: ${tx.error?.message}`));
      };
    };
  });
}

/**
 * Loads all saved Adobe Sales Records from IndexedDB, sorted newest first
 */
export async function loadAllSalesRecords(customIDB?: IDBFactory): Promise<AdobeSaleRecord[]> {
  const db = await openSalesDB(customIDB);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SALES_STORE_NAME, 'readonly');
    const store = tx.objectStore(SALES_STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const list: AdobeSaleRecord[] = req.result || [];
      // Sort descending by saleDate, then by importedAt
      list.sort((a, b) => {
        const dateDiff = b.saleDate.localeCompare(a.saleDate);
        if (dateDiff !== 0) return dateDiff;
        return (b.importedAt || 0) - (a.importedAt || 0);
      });
      resolve(list);
    };

    req.onerror = () => {
      reject(new Error(`বিক্রয় তথ্য লোড করতে ব্যর্থ হয়েছে: ${req.error?.message}`));
    };
  });
}

/**
 * Gets total count of stored sales records
 */
export async function getSalesRecordsCount(customIDB?: IDBFactory): Promise<number> {
  const db = await openSalesDB(customIDB);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SALES_STORE_NAME, 'readonly');
    const store = tx.objectStore(SALES_STORE_NAME);
    const req = store.count();

    req.onsuccess = () => {
      resolve(req.result || 0);
    };

    req.onerror = () => {
      reject(new Error(`রেকর্ড গণনা করতে ব্যর্থ হয়েছে: ${req.error?.message}`));
    };
  });
}

/**
 * Clears all sales records from IndexedDB
 */
export async function clearAllSalesRecords(customIDB?: IDBFactory): Promise<boolean> {
  const db = await openSalesDB(customIDB);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SALES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(SALES_STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => {
      resolve(true);
    };

    req.onerror = () => {
      reject(new Error(`বিক্রয় তথ্য মুছতে ব্যর্থ হয়েছে: ${req.error?.message}`));
    };
  });
}

/**
 * Deletes a single sales record by ID
 */
export async function deleteSalesRecord(id: string, customIDB?: IDBFactory): Promise<boolean> {
  const db = await openSalesDB(customIDB);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SALES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(SALES_STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => {
      resolve(true);
    };

    req.onerror = () => {
      reject(new Error(`রেকর্ড মুছতে ব্যর্থ হয়েছে: ${req.error?.message}`));
    };
  });
}

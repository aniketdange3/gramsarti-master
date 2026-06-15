/**
 * @file db.ts
 * @description IndexedDB caching layer for PropertyRecord[] data.
 * Provides instant UI loading from local cache while fresh data loads from the server.
 *
 * DB Name : gp_db
 * Store   : records
 * Key     : 'all' (single bulk-store strategy)
 */

import { PropertyRecord } from '../types';

const DB_NAME = 'gp_db';
const STORE_NAME = 'records';
const DB_VERSION = 1;

// Opens (or creates) the IndexedDB database
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Saves all property records to IndexedDB under the key 'all'.
 * Call this after fetching fresh records from the server.
 */
export async function saveRecordsToDB(records: PropertyRecord[]): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(records, 'all');
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
        db.close();
    } catch (e) {
        console.warn('[DB] saveRecordsToDB failed:', e);
    }
}

/**
 * Loads property records from IndexedDB.
 * Returns null if the cache is empty or on any error.
 */
export async function loadRecordsFromDB(): Promise<PropertyRecord[] | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get('all');
        return await new Promise<PropertyRecord[] | null>((res, rej) => {
            req.onsuccess = () => res(req.result ?? null);
            req.onerror = () => rej(req.error);
            tx.oncomplete = () => db.close();
        });
    } catch (e) {
        console.warn('[DB] loadRecordsFromDB failed:', e);
        return null;
    }
}

/**
 * Clears all cached records from IndexedDB.
 * Call this on logout to prevent stale data from showing for the next user.
 */
export async function clearRecordsDB(): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
        db.close();
    } catch (e) {
        console.warn('[DB] clearRecordsDB failed:', e);
    }
}

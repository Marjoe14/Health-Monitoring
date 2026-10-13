// ========================================
// OFFLINE-DB.js — IndexedDB Wrapper
// ========================================
(function () {
    'use strict';

    const DB_NAME = 'brgy_health_offline';
    const DB_VERSION = 1;
    const STORE_QUEUE = 'sync_queue';
    const STORE_CACHE = 'local_cache';

    let dbPromise = null;

    function openDB() {
        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error('IndexedDB not supported'));
                return;
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_QUEUE)) {
                    const store = db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('created_at', 'created_at', { unique: false });
                    store.createIndex('url', 'url', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORE_CACHE)) {
                    const cacheStore = db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
                    cacheStore.createIndex('updated_at', 'updated_at', { unique: false });
                }
            };

            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = () => reject(request.error);
        });

        return dbPromise;
    }

    async function withStore(storeName, mode, callback) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            let result;
            try { result = callback(store); } catch (err) { reject(err); return; }
            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
        });
    }

    const OfflineDB = {
        async addToQueue(action) {
            const entry = {
                url: action.url || '',
                method: (action.method || 'POST').toUpperCase(),
                body: action.body || {},
                label: action.label || 'Pending action',
                meta: action.meta || {},
                created_at: new Date().toISOString(),
                attempts: 0,
                last_error: null
            };
            return withStore(STORE_QUEUE, 'readwrite', (store) => store.add(entry))
                .then(() => {
                    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { type: 'add' } }));
                    return entry;
                });
        },

        async getQueue() {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_QUEUE, 'readonly');
                const index = tx.objectStore(STORE_QUEUE).index('created_at');
                const request = index.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        },

        async getQueueCount() {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_QUEUE, 'readonly');
                const request = tx.objectStore(STORE_QUEUE).count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        async removeFromQueue(id) {
            const result = await withStore(STORE_QUEUE, 'readwrite', (store) => store.delete(id));
            window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { type: 'remove', id } }));
            return result;
        },

        async updateQueueEntry(id, updates) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_QUEUE, 'readwrite');
                const store = tx.objectStore(STORE_QUEUE);
                const getReq = store.get(id);
                getReq.onsuccess = () => {
                    const entry = getReq.result;
                    if (!entry) { resolve(false); return; }
                    Object.assign(entry, updates);
                    store.put(entry);
                };
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        },

        async clearQueue() {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_QUEUE, 'readwrite');
                tx.objectStore(STORE_QUEUE).clear();
                tx.oncomplete = () => {
                    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { type: 'clear' } }));
                    resolve(true);
                };
                tx.onerror = () => reject(tx.error);
            });
        },

        async setCache(key, value) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_CACHE, 'readwrite');
                tx.objectStore(STORE_CACHE).put({ key, value, updated_at: new Date().toISOString() });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        },

        async getCache(key) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_CACHE, 'readonly');
                const request = tx.objectStore(STORE_CACHE).get(key);
                request.onsuccess = () => resolve(request.result ? request.result.value : null);
                request.onerror = () => reject(request.error);
            });
        },

        async removeCache(key) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_CACHE, 'readwrite');
                tx.objectStore(STORE_CACHE).delete(key);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        },

        async clearCache() {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_CACHE, 'readwrite');
                tx.objectStore(STORE_CACHE).clear();
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        },

        async clearAll() {
            await this.clearQueue();
            await this.clearCache();
        },

        isSupported() { return 'indexedDB' in window; }
    };

    window.OfflineDB = OfflineDB;
    console.log('📦 OfflineDB ready');
})();
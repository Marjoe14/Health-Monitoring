// ========================================
// OFFLINE-SYNC.js — Fetch wrapper + auto-sync
// ========================================
(function () {
    'use strict';

    if (!window.OfflineDB) {
        console.warn('[OfflineSync] OfflineDB not loaded. Aborting.');
        return;
    }

    const OFFLINE_QUEUE_LABELS = {
        'add_resident.php': 'Add Resident',
        'update_resident.php': 'Update Resident',
        'delete_resident.php': 'Delete Resident',
        'add_child.php': 'Add Child',
        'add_bmi.php': 'Record BMI',
        'add_prenatal.php': 'Add Prenatal Record',
        'add_prenatal_checkup.php': 'Add Prenatal Checkup',
        'add_immunization.php': 'Add Immunization',
        'update_immunization.php': 'Update Immunization',
        'delete_immunization.php': 'Delete Immunization',
        'add_opt.php': 'Record OPT',
        'update_opt.php': 'Update OPT',
        'delete_opt.php': 'Delete OPT',
        'add_appointment.php': 'Add Appointment',
        'update_appointment.php': 'Update Appointment',
        'delete_appointment.php': 'Delete Appointment',
        'complete_appointment.php': 'Complete Appointment',
        'add_vaccine.php': 'Add Vaccine',
        'update_vaccine.php': 'Update Vaccine',
        'delete_vaccine.php': 'Delete Vaccine',
        'send_sms.php': 'Send SMS',
        'request_cancellation.php': 'Request Cancellation',
        'process_cancellation.php': 'Process Cancellation',
        'mark_delivered.php': 'Mark Delivered',
        'reactivate_prenatal.php': 'Reactivate Prenatal',
        'delete_prenatal.php': 'Delete Prenatal',
        'mark_immunization_finished.php': 'Finish Immunization',
        'update_pregnancy_status.php': 'Update Pregnancy Status'
    };

    function getActionLabel(url) {
        for (const [key, label] of Object.entries(OFFLINE_QUEUE_LABELS)) {
            if (url.includes(key)) return label;
        }
        return 'Pending action';
    }

    function isAjaxForm(url) {
        return typeof url === 'string' && url.includes('ajax/');
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async function (resource, init = {}) {
        const url = typeof resource === 'string' ? resource : resource.url;
        const method = (init.method || 'GET').toUpperCase();

        if (method === 'POST' && isAjaxForm(url)) {
            if (!navigator.onLine) {
                const bodyParams = {};
                if (init.body) {
                    if (typeof init.body === 'string') {
                        new URLSearchParams(init.body).forEach((v, k) => { bodyParams[k] = v; });
                    } else if (init.body instanceof FormData) {
                        for (const [k, v] of init.body.entries()) bodyParams[k] = v;
                    }
                }
                const label = getActionLabel(url);
                await OfflineDB.addToQueue({
                    url: url, method: method, body: bodyParams, label: label,
                    meta: { savedOffline: true }
                });
                console.log('[OfflineSync] Queued offline action:', label);
                window.dispatchEvent(new CustomEvent('offline-action-queued', {
                    detail: { url, label, body: bodyParams }
                }));
                return new Response(
                    JSON.stringify({
                        success: true, offline: true, queued: true,
                        message: 'You are offline. "' + label + '" has been saved and will sync automatically.'
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }

            try {
                const response = await originalFetch(resource, init);
                if (!response.ok && response.status >= 500) {
                    console.warn('[OfflineSync] Server error', response.status, '— queueing');
                    await queueFailedRequest(url, init);
                }
                return response;
            } catch (err) {
                console.warn('[OfflineSync] Network error — queueing:', err.message);
                await queueFailedRequest(url, init);
                return new Response(
                    JSON.stringify({
                        success: true, offline: true, queued: true,
                        message: 'Connection issue. "' + getActionLabel(url) + '" has been saved and will sync automatically.'
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
        }

        return originalFetch(resource, init);
    };

    async function queueFailedRequest(url, init) {
        const bodyParams = {};
        if (init.body) {
            if (typeof init.body === 'string') {
                new URLSearchParams(init.body).forEach((v, k) => { bodyParams[k] = v; });
            } else if (init.body instanceof FormData) {
                for (const [k, v] of init.body.entries()) bodyParams[k] = v;
            }
        }
        await OfflineDB.addToQueue({
            url: url,
            method: (init.method || 'POST').toUpperCase(),
            body: bodyParams,
            label: getActionLabel(url),
            meta: { savedOffline: true, reason: 'network_failure' }
        });
        window.dispatchEvent(new CustomEvent('offline-action-queued', {
            detail: { url, label: getActionLabel(url), body: bodyParams }
        }));
    }

    let isSyncing = false;

    async function processSyncQueue() {
        if (isSyncing) return;
        if (!navigator.onLine) return;
        isSyncing = true;

        try {
            const queue = await OfflineDB.getQueue();
            if (queue.length === 0) { isSyncing = false; return; }

            console.log('[OfflineSync] Processing', queue.length, 'queued action(s)...');
            window.dispatchEvent(new CustomEvent('offline-sync-started', { detail: { total: queue.length } }));

            let successCount = 0;
            let failCount = 0;

            for (const item of queue) {
                try {
                    const bodyString = new URLSearchParams(item.body || {}).toString();
                    const response = await originalFetch(item.url, {
                        method: item.method,
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: bodyString
                    });

                    if (response.ok) {
                        await OfflineDB.removeFromQueue(item.id);
                        successCount++;
                        console.log('[OfflineSync] Synced:', item.label);
                    } else {
                        failCount++;
                        await OfflineDB.updateQueueEntry(item.id, {
                            attempts: (item.attempts || 0) + 1,
                            last_error: 'HTTP ' + response.status
                        });
                        if ((item.attempts || 0) + 1 >= 5) {
                            console.warn('[OfflineSync] Giving up on:', item.label);
                            await OfflineDB.removeFromQueue(item.id);
                        }
                    }
                } catch (err) {
                    failCount++;
                    await OfflineDB.updateQueueEntry(item.id, {
                        attempts: (item.attempts || 0) + 1,
                        last_error: err.message
                    });
                }
            }

            console.log('[OfflineSync] Sync done. Success:', successCount, 'Failed:', failCount);
            window.dispatchEvent(new CustomEvent('offline-sync-completed', {
                detail: { success: successCount, failed: failCount }
            }));

            if (successCount > 0) {
                window.dispatchEvent(new CustomEvent('offline-sync-reload-needed', {
                    detail: { synced: successCount }
                }));
            }
        } catch (err) {
            console.error('[OfflineSync] Sync error:', err);
        } finally {
            isSyncing = false;
        }
    }

    window.addEventListener('online', () => {
        console.log('[OfflineSync] Back online — syncing queue');
        setTimeout(processSyncQueue, 800);
    });

    setInterval(() => {
        if (navigator.onLine) {
            OfflineDB.getQueueCount().then((count) => {
                if (count > 0) processSyncQueue();
            });
        }
    }, 45000);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'PROCESS_SYNC_QUEUE') processSyncQueue();
        });
    }

    // ---- Toasts on queue/sync events ----
    window.addEventListener('offline-action-queued', (e) => {
        if (typeof window.showToast === 'function') {
            window.showToast('"' + e.detail.label + '" saved offline. Will sync when online.', 'warning');
        }
    });

    window.addEventListener('offline-sync-completed', (e) => {
        if (e.detail.success > 0 && typeof window.showToast === 'function') {
            window.showToast('Synced ' + e.detail.success + ' item(s) to server.', 'success');
        }
    });

    window.addEventListener('offline-sync-reload-needed', () => {
        if (typeof window.fetchAllRecords === 'function') try { window.fetchAllRecords(); } catch (e) {}
        if (typeof window.fetchDashboardData === 'function') try { window.fetchDashboardData(); } catch (e) {}
        if (typeof window.fetchBhwNotifications === 'function') try { window.fetchBhwNotifications(); } catch (e) {}
        if (typeof window.fetchNotifications === 'function') try { window.fetchNotifications(); } catch (e) {}
    });

    window.OfflineSync = { process: processSyncQueue };

    console.log('🔄 OfflineSync ready');
})();
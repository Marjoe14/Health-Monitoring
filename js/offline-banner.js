// ========================================
// OFFLINE-BANNER.js
// Shows a persistent banner when offline and a yellow one when syncing
// ========================================
(function () {
    'use strict';

    const BANNER_ID = 'offlineNoticeBanner';

    function ensureBanner() {
        if (document.getElementById(BANNER_ID)) return document.getElementById(BANNER_ID);

        const banner = document.createElement('div');
        banner.id = BANNER_ID;
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 99999;
            padding: 10px 20px;
            display: none;
            align-items: center;
            justify-content: center;
            gap: 12px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 0.88rem;
            font-weight: 600;
            text-align: center;
            color: #fff;
            box-shadow: 0 2px 12px rgba(0,0,0,0.15);
            transition: transform 0.3s ease, background 0.3s ease;
        `;
        banner.innerHTML = `
            <i class="fas fa-wifi" id="offlineBannerIcon"></i>
            <span id="offlineBannerText">You are offline — the system still works. Data will sync automatically.</span>
            <span id="offlineBannerCount" style="background: rgba(255,255,255,0.25); padding: 1px 10px; border-radius: 50px; font-size: 0.72rem; display: none;"></span>
        `;
        document.body.appendChild(banner);

        // Push page content down so banner doesn't cover header
        document.body.style.paddingTop = '0px';

        return banner;
    }

    function showBanner() {
        const banner = ensureBanner();
        banner.style.display = 'flex';
        // Push body down to make room
        document.body.style.paddingTop = banner.offsetHeight + 'px';
    }

    function hideBanner() {
        const banner = document.getElementById(BANNER_ID);
        if (banner) {
            banner.style.display = 'none';
        }
        document.body.style.paddingTop = '0px';
    }

    function updateBanner() {
        const banner = document.getElementById(BANNER_ID);
        if (!banner) return;

        const icon = document.getElementById('offlineBannerIcon');
        const text = document.getElementById('offlineBannerText');
        const countEl = document.getElementById('offlineBannerCount');

        const refreshCount = () => {
            if (window.OfflineDB) {
                window.OfflineDB.getQueueCount().then((count) => {
                    if (count > 0) {
                        countEl.style.display = 'inline-block';
                        countEl.textContent = count + ' pending';
                    } else {
                        countEl.style.display = 'none';
                    }
                });
            }
        };

        if (!navigator.onLine) {
            banner.style.background = 'linear-gradient(135deg, #E74C3C 0%, #C62828 100%)';
            icon.className = 'fas fa-wifi';
            text.textContent = 'You are offline — the system still works. Data will sync automatically.';
            showBanner();
            refreshCount();
        } else {
            if (window.OfflineDB) {
                window.OfflineDB.getQueueCount().then((count) => {
                    if (count > 0) {
                        banner.style.background = 'linear-gradient(135deg, #F0AD4E 0%, #E65100 100%)';
                        icon.className = 'fas fa-sync-alt fa-spin';
                        text.textContent = 'Back online — syncing your offline data...';
                        countEl.style.display = 'inline-block';
                        countEl.textContent = count + ' pending';
                        showBanner();
                    } else {
                        hideBanner();
                    }
                });
            } else {
                hideBanner();
            }
        }
    }

    // Watch for online/offline
    window.addEventListener('online', () => {
        updateBanner();
        setTimeout(updateBanner, 1500);
    });
    window.addEventListener('offline', updateBanner);

    // Watch for queue changes
    window.addEventListener('offline-queue-changed', updateBanner);

    // Watch for sync events
    window.addEventListener('offline-sync-started', updateBanner);
    window.addEventListener('offline-sync-completed', () => {
        setTimeout(updateBanner, 500);
    });

    // Watch for window resize (recalc banner height)
    window.addEventListener('resize', () => {
        const banner = document.getElementById(BANNER_ID);
        if (banner && banner.style.display === 'flex') {
            document.body.style.paddingTop = banner.offsetHeight + 'px';
        }
    });

    // Init after DOM ready
    function init() {
        // Give OfflineDB a moment to load
        setTimeout(updateBanner, 300);
        // Refresh every 5s as a safety net
        setInterval(updateBanner, 5000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.OfflineBanner = { update: updateBanner, hide: hideBanner, show: showBanner };

    console.log('📢 OfflineBanner ready');
})();
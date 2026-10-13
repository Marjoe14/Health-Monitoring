// ========================================
// PWA-INIT.js — Registers SW + install prompt
// ========================================
(function () {
    'use strict';

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((registration) => {
                    console.log('✅ Service Worker registered:', registration.scope);

                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('🔄 New Service Worker installing...');
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('✨ Update available — refresh to activate');
                                if (typeof window.showToast === 'function') {
                                    window.showToast('App update available. Refresh to apply.', 'info');
                                }
                            }
                        });
                    });
                })
                .catch((err) => {
                    console.warn('❌ Service Worker registration failed:', err);
                });
        });
    }

    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('📱 PWA install prompt available');
        const installBtn = document.getElementById('pwaInstall');
        if (installBtn) installBtn.style.display = 'flex';
    });

    window.addEventListener('appinstalled', () => {
        console.log('✅ PWA installed');
        deferredPrompt = null;
        const installBtn = document.getElementById('pwaInstall');
        if (installBtn) installBtn.style.display = 'none';
    });

    window.triggerPwaInstall = function () {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choice) => {
                console.log('Install choice:', choice.outcome);
                deferredPrompt = null;
            });
        }
    };

    window.addEventListener('online', () => console.log('🌐 Online'));
    window.addEventListener('offline', () => console.log('📴 Offline'));

    console.log('🌐 PWA-Init loaded. Online:', navigator.onLine);
})();
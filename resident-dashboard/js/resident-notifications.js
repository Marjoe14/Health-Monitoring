// ========================================
// RESIDENT NOTIFICATIONS
// ✅ Badge always reflects unread_count
// ========================================

// ========================================
// FETCH NOTIFICATIONS
// ========================================
function fetchNotifications() {
    fetch('ajax/get_notifications.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                renderNotifications(data.notifications, data.unread_count);
                updateNotificationBadge(data.unread_count);

                // ✅ Also update dashboard unread card
                const unreadEl = document.getElementById('unreadNotifications');
                if (unreadEl) {
                    unreadEl.textContent = parseInt(data.unread_count) || 0;
                }
            }
        })
        .catch(function() { /* silent fail */ });
}

// ========================================
// UPDATE NOTIFICATION BADGE (sidebar)
// ========================================
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    const num = parseInt(count) || 0;
    badge.textContent = num;
    badge.style.display = 'inline-block';
    badge.style.visibility = 'visible';
}

// ========================================
// RENDER NOTIFICATIONS
// ========================================
function renderNotifications(notifications, unreadCount) {
    const notifList = document.querySelector('.notifications-list');
    const notifBadge = document.getElementById('notificationBadge');
    const unreadNotifCount = document.getElementById('unreadNotifications');

    if (notifBadge) {
        notifBadge.textContent = parseInt(unreadCount) || 0;
    }

    if (unreadNotifCount) {
        unreadNotifCount.textContent = parseInt(unreadCount) || 0;
    }

    if (!notifications || notifications.length === 0) {
        if (notifList) {
            notifList.innerHTML = `
                <div class="notification-empty">
                    <div class="notification-empty-icon">
                        <i class="fas fa-bell-slash"></i>
                    </div>
                    <h4>No Notifications</h4>
                    <p>You don't have any notifications yet.</p>
                    <p class="empty-sub">Notifications will appear here when your BHW sends updates.</p>
                </div>
            `;
        }
        updateMarkAllButtonState(true);
        return;
    }

    let html = '';
    notifications.forEach(function(notif) {
        const isRead = notif.is_read == 1;
        const iconMap = {
            'appointment': 'fa-calendar-check',
            'immunization': 'fa-syringe',
            'prenatal': 'fa-baby-carriage',
            'health_advisory': 'fa-heartbeat',
            'general': 'fa-bell'
        };
        const icon = iconMap[notif.type] || 'fa-bell';
        const timeAgo = getTimeAgo(notif.created_at);
        const notifClass = isRead ? 'notification-item read' : 'notification-item unread';

        let linkHtml = '';
        if (notif.link) {
            if (notif.link.includes('#appointments')) {
                linkHtml = `<button class="notification-link-btn" data-page="appointments">View Details →</button>`;
            } else {
                linkHtml = `<a href="${notif.link}" class="notification-link">View Details →</a>`;
            }
        }

        html += `
            <div class="${notifClass}" data-id="${notif.id}" data-type="${notif.type}">
                <div class="notification-icon ${notif.type}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <span class="notification-title">${notif.title}</span>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    <p class="notification-message">${notif.message}</p>
                    ${linkHtml}
                </div>
                <div class="notification-actions">
                    ${isRead ?
                        `<button class="notification-mark-unread" data-id="${notif.id}" title="Mark as Unread"><i class="fas fa-undo"></i></button>` :
                        `<button class="notification-mark-read" data-id="${notif.id}" title="Mark as Read"><i class="fas fa-check"></i></button>`
                    }
                </div>
            </div>
        `;
    });

    if (notifList) {
        notifList.innerHTML = html;
    }

    updateMarkAllButtonState(false);

    document.querySelectorAll('.notification-mark-read').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            markNotificationRead(id);
        });
    });

    document.querySelectorAll('.notification-mark-unread').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            markNotificationUnread(id);
        });
    });

    document.querySelectorAll('.notification-item').forEach(function(item) {
        item.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const linkBtn = this.querySelector('.notification-link-btn');
            if (!this.classList.contains('read')) {
                markNotificationRead(id);
            }
            if (linkBtn) {
                navigateTo('appointments');
            }
        });
    });

    document.querySelectorAll('.notification-link-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const item = this.closest('.notification-item');
            const id = parseInt(item.dataset.id);
            if (!item.classList.contains('read')) {
                markNotificationRead(id);
            }
            navigateTo('appointments');
        });
    });
}

// ========================================
// UPDATE MARK ALL BUTTON STATE
// ========================================
function updateMarkAllButtonState(isEmpty) {
    const markAllBtn = document.getElementById('markAllReadBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    if (markAllBtn) markAllBtn.disabled = isEmpty;
    if (clearAllBtn) clearAllBtn.disabled = isEmpty;
}

// ========================================
// MARK NOTIFICATION AS READ
// ========================================
function markNotificationRead(notificationId) {
    const data = notificationId ? { notification_id: notificationId } : {};

    fetch('ajax/mark_notification_read.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString()
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            fetchNotifications();
        }
    })
    .catch(function() { /* silent fail */ });
}

// ========================================
// MARK NOTIFICATION AS UNREAD
// ========================================
function markNotificationUnread(notificationId) {
    if (!notificationId) {
        showToast('Invalid notification.', 'error');
        return;
    }

    fetch('ajax/mark_notification_unread.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ notification_id: notificationId }).toString()
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            fetchNotifications();
            showToast('Notification marked as unread.', 'info');
        } else {
            showToast(data.message || 'Failed to mark as unread.', 'error');
        }
    })
    .catch(function() {
        showToast('Error connecting to server.', 'error');
    });
}

// ========================================
// CLEAR ALL NOTIFICATIONS
// ========================================
function clearAllNotifications() {
    fetch('ajax/clear_notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            fetchNotifications();
        }
    })
    .catch(function() { /* silent fail */ });
}

// ========================================
// INIT NOTIFICATION BUTTONS
// ========================================
function initNotificationButtons() {
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
        const newBtn = markAllBtn.cloneNode(true);
        markAllBtn.parentNode.replaceChild(newBtn, markAllBtn);

        newBtn.addEventListener('click', function() {
            markNotificationRead(null);
        });
    }

    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        const newBtn = clearAllBtn.cloneNode(true);
        clearAllBtn.parentNode.replaceChild(newBtn, clearAllBtn);

        newBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear all notifications?')) {
                clearAllNotifications();
            }
        });
    }
}
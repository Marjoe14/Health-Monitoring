// ========================================
// RESIDENT INIT - Bootstrap, dashboard data, timing fix
// ✅ Dashboard counters accurate on load
// ✅ Notification badge auto-refresh
// ========================================

// ========================================
// FETCH DASHBOARD DATA
// ========================================
function fetchDashboardData() {
    fetch('ajax/get_resident_dashboard_data.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                // Dashboard stat cards
                const upcomingEl = document.getElementById('upcomingAppointments');
                if (upcomingEl) {
                    upcomingEl.textContent = data.upcoming_appointments || 0;
                }

                const unreadEl = document.getElementById('unreadNotifications');
                if (unreadEl) {
                    unreadEl.textContent = data.unread_notifications || 0;
                }

                const lastBmiEl = document.getElementById('lastBMI');
                if (lastBmiEl) {
                    lastBmiEl.textContent = data.last_bmi || '—';
                }

                const immunizationsEl = document.getElementById('immunizationsDue');
                if (immunizationsEl) {
                    immunizationsEl.textContent = data.immunizations_due || 0;
                }

                // Sidebar badge
                const badge = document.getElementById('notificationBadge');
                if (badge) {
                    const num = parseInt(data.unread_notifications) || 0;
                    badge.textContent = num;
                    badge.style.display = 'inline-block';
                }

                // Upcoming appointments table
                renderUpcomingAppointments(data.appointments || []);
            }
        })
        .catch(function() { /* silent fail */ });
}

// ========================================
// RENDER UPCOMING APPOINTMENTS (Dashboard)
// ========================================
function renderUpcomingAppointments(appointments) {
    const tbody = document.querySelector('#page-dashboard .appointments-table tbody');
    if (!tbody) return;

    if (!appointments || appointments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <span>No upcoming appointments</span>
                    <p class="empty-sub">Visit the Barangay Health Center to schedule an appointment.</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    appointments.forEach(function(app) {
        const statusClass = (app.status || 'Upcoming').toLowerCase();
        html += `
            <tr>
                <td>${app.appointment_date || '—'} ${app.appointment_time || ''}</td>
                <td>${app.type || 'General Check-up'}</td>
                <td>—</td>
                <td><span class="status-badge ${statusClass}">${app.status || 'Upcoming'}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary view-appointment" data-id="${app.id}">
                        View
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    document.querySelectorAll('#page-dashboard .view-appointment').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            viewResidentAppointmentDetail(id);
        });
    });
}

// ========================================
// FETCH ALL RESIDENT DATA - THEN RE-RENDER
// ========================================
function fetchResidentDataAndRefresh() {
    Promise.all([
        fetch('ajax/get_notifications.php').then(function(r) { return r.json(); }),
        fetch('ajax/get_resident_dashboard_data.php').then(function(r) { return r.json(); })
    ])
    .then(function(results) {
        // Notifications
        if (results[0].success) {
            renderNotifications(results[0].notifications, results[0].unread_count);
            updateNotificationBadge(results[0].unread_count);
        }

        // Dashboard data
        if (results[1].success) {
            const data = results[1];

            const upcomingEl = document.getElementById('upcomingAppointments');
            if (upcomingEl) upcomingEl.textContent = data.upcoming_appointments || 0;

            const unreadEl = document.getElementById('unreadNotifications');
            if (unreadEl) unreadEl.textContent = data.unread_notifications || 0;

            const lastBmiEl = document.getElementById('lastBMI');
            if (lastBmiEl) lastBmiEl.textContent = data.last_bmi || '—';

            const immunizationsEl = document.getElementById('immunizationsDue');
            if (immunizationsEl) immunizationsEl.textContent = data.immunizations_due || 0;

            const badge = document.getElementById('notificationBadge');
            if (badge) {
                const num = parseInt(data.unread_notifications) || 0;
                badge.textContent = num;
                badge.style.display = 'inline-block';
            }

            renderUpcomingAppointments(data.appointments || []);
        }

        // Re-render current page
        if (currentPage === 'notifications') {
            fetchNotifications();
        }
        if (currentPage === 'appointments') {
            fetchResidentAppointments();
        }
    })
    .catch(function() { /* silent fail */ });
}

// ========================================
// MAIN INIT
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 Initializing Resident Dashboard...');

    initNavigationEventListeners();
    initRecordTabs();
    initProfileModal();
    initEditProfileForm();
    initUppercaseInputs();
    initAppointmentEventListeners();
    initNotificationButtons();

    // Start on dashboard
    navigateTo('dashboard');

    // ✅ Fetch dashboard data immediately on load
    fetchDashboardData();

    // ✅ Fetch all data + re-render
    fetchResidentDataAndRefresh();

    // ✅ Fetch notifications immediately (updates badge)
    if (typeof fetchNotifications === 'function') {
        fetchNotifications();
    }

    // ✅ Auto-refresh every 30 seconds
    setInterval(function() {
        fetchDashboardData();
        if (typeof fetchNotifications === 'function') {
            fetchNotifications();
        }
    }, 30000);

    console.log('🏠 Smart Community Health Monitoring System · Resident Dashboard');
    console.log('✅ Dashboard counters + notification badge auto-refresh active');
});
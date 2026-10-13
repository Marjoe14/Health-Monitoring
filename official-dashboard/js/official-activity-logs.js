// ========================================
// OFFICIAL - Activity Logs
// ========================================

let activityLogs = [];
let activityRefreshInterval = null;

// ========================================
// INIT
// ========================================
function initActivityLogsPage() {
    console.log('📜 Initializing Activity Logs...');

    // Filter listeners
    const bhwFilter = document.getElementById('activityBhwFilter');
    const typeFilter = document.getElementById('activityTypeFilter');
    const dateFrom = document.getElementById('activityDateFrom');
    const dateTo = document.getElementById('activityDateTo');
    const search = document.getElementById('activitySearch');
    const clearBtn = document.getElementById('clearActivityFilters');

    if (bhwFilter) bhwFilter.addEventListener('change', fetchActivityLogs);
    if (typeFilter) typeFilter.addEventListener('change', fetchActivityLogs);
    if (dateFrom) dateFrom.addEventListener('change', fetchActivityLogs);
    if (dateTo) dateTo.addEventListener('change', fetchActivityLogs);

    if (search) {
        let searchTimeout;
        search.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(fetchActivityLogs, 400);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            if (bhwFilter) bhwFilter.value = '';
            if (typeFilter) typeFilter.value = '';
            if (dateFrom) dateFrom.value = '';
            if (dateTo) dateTo.value = '';
            if (search) search.value = '';
            fetchActivityLogs();
        });
    }

    // Initial load
    fetchActivityLogs();

    // Auto-refresh every 30 seconds
    if (activityRefreshInterval) clearInterval(activityRefreshInterval);
    activityRefreshInterval = setInterval(function () {
        if (currentPage === 'activity-logs') {
            fetchActivityLogs();
        }
    }, 30000);
}

// ========================================
// FETCH ACTIVITY LOGS
// ========================================
function fetchActivityLogs() {
    const params = new URLSearchParams();

    const bhwId = document.getElementById('activityBhwFilter') ? document.getElementById('activityBhwFilter').value : '';
    const action = document.getElementById('activityTypeFilter') ? document.getElementById('activityTypeFilter').value : '';
    const dateFrom = document.getElementById('activityDateFrom') ? document.getElementById('activityDateFrom').value : '';
    const dateTo = document.getElementById('activityDateTo') ? document.getElementById('activityDateTo').value : '';
    const search = document.getElementById('activitySearch') ? document.getElementById('activitySearch').value.trim() : '';

    if (bhwId) params.append('bhw_id', bhwId);
    if (action) params.append('action', action);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (search) params.append('search', search);

    // Loading state
    const tbody = document.getElementById('activityLogsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading...</span>
                </td>
            </tr>
        `;
    }

    fetch('ajax/get_activity_logs.php?' + params.toString())
        .then(function (response) { return response.json(); })
        .then(function (data) {
            if (data.success) {
                activityLogs = data.logs || [];
                renderActivityLogs(activityLogs);
                renderActivityStats(data.stats || {});
                populateBhwFilter(data.bhw_list || []);
                populateActionFilter(data.action_types || []);
            } else {
                renderActivityLogs([]);
                if (typeof showToast === 'function') {
                    showToast(data.message || 'Failed to load logs.', 'error');
                }
            }
        })
        .catch(function () {
            renderActivityLogs([]);
            if (typeof showToast === 'function') {
                showToast('Error connecting to server.', 'error');
            }
        });
}

// ========================================
// POPULATE BHW FILTER
// ========================================
function populateBhwFilter(bhwList) {
    const select = document.getElementById('activityBhwFilter');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">All BHWs</option>';

    bhwList.forEach(function (b) {
        const option = document.createElement('option');
        option.value = b.user_id;
        option.textContent = b.full_name.trim() + ' (@' + b.username + ')';
        select.appendChild(option);
    });

    if (currentValue) select.value = currentValue;
}

// ========================================
// POPULATE ACTION FILTER
// ========================================
function populateActionFilter(actionTypes) {
    const select = document.getElementById('activityTypeFilter');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">All Actions</option>';

    // Friendly labels
    const labels = {
        'add_resident': 'Add Resident',
        'add_child': 'Add Child',
        'update_resident': 'Update Resident',
        'delete_resident': 'Delete Resident',
        'create_account': 'Create Account',
        'add_bmi': 'Record BMI',
        'add_prenatal': 'Add Prenatal',
        'add_checkup': 'Add Checkup',
        'add_immunization': 'Add Immunization',
        'update_immunization': 'Update Immunization',
        'delete_immunization': 'Delete Immunization',
        'immunization_finished': 'Finish Immunization',
        'add_opt': 'Record OPT',
        'update_opt': 'Update OPT',
        'delete_opt': 'Delete OPT',
        'add_appointment': 'Add Appointment',
        'update_appointment': 'Update Appointment',
        'complete_appointment': 'Complete Appointment',
        'delete_appointment': 'Delete Appointment',
        'approve_cancellation': 'Approve Cancellation',
        'reject_cancellation': 'Reject Cancellation',
        'add_vaccine': 'Add Vaccine',
        'update_vaccine': 'Update Vaccine',
        'delete_vaccine': 'Delete Vaccine',
        'send_sms': 'Send SMS',
        'change_password': 'Change Password',
        'update_pregnancy_status': 'Update Pregnancy Status',
        'account_deletion_requested': 'Requested Account Deletion',
        'account_deletion_cancelled': 'Cancelled Account Deletion'
    };

    actionTypes.forEach(function (a) {
        const option = document.createElement('option');
        option.value = a;
        option.textContent = labels[a] || a;
        select.appendChild(option);
    });

    if (currentValue) select.value = currentValue;
}

// ========================================
// RENDER STATS
// ========================================
function renderActivityStats(stats) {
    const todayEl = document.getElementById('activityTodayCount');
    const weekEl = document.getElementById('activityWeekCount');
    const monthEl = document.getElementById('activityMonthCount');
    const bhwCountEl = document.getElementById('activityBHWCount');

    if (todayEl) todayEl.textContent = stats.today || 0;
    if (weekEl) weekEl.textContent = stats.this_week || 0;
    if (monthEl) monthEl.textContent = stats.this_month || 0;

    // Count unique BHWs who did something today
    if (bhwCountEl) {
        bhwCountEl.textContent = (stats.per_bhw_today || []).length;
    }
}

// ========================================
// RENDER LOGS
// ========================================
function renderActivityLogs(logs) {
    const tbody = document.getElementById('activityLogsTableBody');
    const resultsCount = document.getElementById('activityResults');

    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-history"></i>
                    <span>No activity logs found</span>
                    <p class="empty-sub">Try adjusting your filters, or wait for BHWs to record actions.</p>
                </td>
            </tr>
        `;
        if (resultsCount) resultsCount.textContent = '0 logs';
        return;
    }

    // Icon map for action types
    const iconMap = {
        'add_resident': { icon: 'fa-user-plus', color: '#4A90D9' },
        'add_child': { icon: 'fa-child', color: '#5CB85C' },
        'update_resident': { icon: 'fa-user-edit', color: '#4A90D9' },
        'delete_resident': { icon: 'fa-user-minus', color: '#E74C3C' },
        'create_account': { icon: 'fa-user-shield', color: '#7B1FA2' },
        'add_bmi': { icon: 'fa-weight', color: '#7B1FA2' },
        'add_prenatal': { icon: 'fa-baby-carriage', color: '#5CB85C' },
        'add_checkup': { icon: 'fa-notes-medical', color: '#5CB85C' },
        'add_immunization': { icon: 'fa-syringe', color: '#F0AD4E' },
        'update_immunization': { icon: 'fa-syringe', color: '#F0AD4E' },
        'delete_immunization': { icon: 'fa-trash', color: '#E74C3C' },
        'immunization_finished': { icon: 'fa-flag-checkered', color: '#5CB85C' },
        'add_opt': { icon: 'fa-child', color: '#7B1FA2' },
        'update_opt': { icon: 'fa-edit', color: '#7B1FA2' },
        'delete_opt': { icon: 'fa-trash', color: '#E74C3C' },
        'add_appointment': { icon: 'fa-calendar-plus', color: '#4A90D9' },
        'update_appointment': { icon: 'fa-calendar-edit', color: '#4A90D9' },
        'complete_appointment': { icon: 'fa-calendar-check', color: '#5CB85C' },
        'delete_appointment': { icon: 'fa-calendar-times', color: '#E74C3C' },
        'approve_cancellation': { icon: 'fa-check', color: '#5CB85C' },
        'reject_cancellation': { icon: 'fa-times', color: '#E74C3C' },
        'add_vaccine': { icon: 'fa-syringe', color: '#F0AD4E' },
        'update_vaccine': { icon: 'fa-syringe', color: '#F0AD4E' },
        'delete_vaccine': { icon: 'fa-trash', color: '#E74C3C' },
        'send_sms': { icon: 'fa-sms', color: '#4A90D9' },
        'change_password': { icon: 'fa-key', color: '#4A90D9' },
        'update_pregnancy_status': { icon: 'fa-female', color: '#E91E63' },
        'account_deletion_requested': { icon: 'fa-user-times', color: '#E74C3C' },
        'account_deletion_cancelled': { icon: 'fa-user-check', color: '#5CB85C' }
    };

    let html = '';
    logs.forEach(function (log) {
        const meta = iconMap[log.action_type] || { icon: 'fa-circle', color: '#A0B4C5' };
        const timeAgo = log.time_ago || '—';
        const fullDateTime = formatDateTime(log.created_at);

        const targetHtml = log.target_type
            ? `<span style="background:#EBF3FB; color:#4A90D9; padding:2px 10px; border-radius:50px; font-size:0.7rem; font-weight:600;">${escapeHtml(log.target_type)}</span>`
            : '<span style="color:#A0B4C5;">—</span>';

        html += `
            <tr>
                <td>
                    <div style="font-size:0.85rem; font-weight:600; color:#1A2A3A;">${timeAgo}</div>
                    <div style="font-size:0.7rem; color:#A0B4C5;">${fullDateTime}</div>
                </td>
                <td>
                    <strong>${escapeHtml(log.user_name)}</strong>
                </td>
                <td>
                    <span style="display:inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:50px; background:${meta.color}20; color:${meta.color}; font-size:0.75rem; font-weight:600;">
                        <i class="fas ${meta.icon}"></i>
                        ${escapeHtml((log.action_type || '').replace(/_/g, ' '))}
                    </span>
                </td>
                <td style="font-size:0.85rem;">${escapeHtml(log.description)}</td>
                <td>${targetHtml}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    if (resultsCount) resultsCount.textContent = logs.length + ' log' + (logs.length > 1 ? 's' : '');
}

// ========================================
// FORMAT DATE TIME
// ========================================
function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr.replace(' ', 'T'));
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
}

// ========================================
// ESCAPE HTML
// ========================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ========================================
// EXPOSE FOR NAVIGATION
// ========================================
window.initActivityLogsPage = initActivityLogsPage;
window.fetchActivityLogs = fetchActivityLogs;
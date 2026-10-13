// ========================================
// BHW PREGNANCY STATUS - 3 Tabs
// ✅ Loads all tab counts on page load
// ✅ Fetches list per tab on switch
// ========================================

let pregnancyCurrentTab = 'Pregnant';
let pregnancyRecords = {
    'Pregnant': [],
    'Delivered': [],
    'Not Pregnant': []
};

// ========================================
// INIT PREGNANCY PAGE
// ========================================
function initPregnancyPage() {
    // Tab click handlers
    document.querySelectorAll('.pregnancy-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            const status = this.dataset.status;
            switchPregnancyTab(status);
        });
    });

    // Search
    const search = document.getElementById('pregnancySearch');
    if (search) {
        search.addEventListener('input', function() {
            renderPregnancyList();
        });
    }

    // ✅ Load all tab counts immediately on init
    loadPregnancyCounts();
}

// ========================================
// LOAD ALL TAB COUNTS
// ========================================
function loadPregnancyCounts() {
    fetch('ajax/get_pregnancy_counts.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success && data.counts) {
                updatePregnancyTabCounts(data.counts);
            }
        })
        .catch(function() { /* silent fail */ });
}

// ========================================
// SWITCH TAB
// ========================================
function switchPregnancyTab(status) {
    pregnancyCurrentTab = status;

    document.querySelectorAll('.pregnancy-tab').forEach(function(tab) {
        tab.classList.toggle('active', tab.dataset.status === status);
    });

    // Show/hide subtitle / hint
    const hint = document.getElementById('pregnancyHint');
    if (hint) {
        if (status === 'Pregnant') {
            hint.innerHTML = '<i class="fas fa-info-circle"></i> These women appear in the <strong>Add Prenatal</strong> dropdown.';
        } else if (status === 'Delivered') {
            hint.innerHTML = '<i class="fas fa-info-circle"></i> Past pregnancies. Click <strong>View History</strong> to see full details.';
        } else {
            hint.innerHTML = '<i class="fas fa-info-circle"></i> All registered female residents aged 13–49. Click <strong>Mark as Pregnant</strong> to add them to the Pregnant list.';
        }
    }

    fetchPregnancyList(status);
}

// ========================================
// FETCH PREGNANCY LIST
// ========================================
function fetchPregnancyList(status) {
    const tbody = document.getElementById('pregnancyTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading...</span>
                </td>
            </tr>
        `;
    }

    fetch('ajax/get_pregnancy_list.php?status=' + encodeURIComponent(status))
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                pregnancyRecords[status] = data.records || [];
                renderPregnancyList();
            } else {
                pregnancyRecords[status] = [];
                renderPregnancyList();
                showToast(data.message || 'Failed to load records.', 'error');
            }
        })
        .catch(function() {
            pregnancyRecords[status] = [];
            renderPregnancyList();
            showToast('Error connecting to server.', 'error');
        });
}

// ========================================
// RENDER PREGNANCY LIST
// ========================================
function renderPregnancyList() {
    const tbody = document.getElementById('pregnancyTableBody');
    const resultsCount = document.getElementById('pregnancyResults');
    const searchTerm = document.getElementById('pregnancySearch') 
        ? document.getElementById('pregnancySearch').value.toLowerCase().trim() 
        : '';

    if (!tbody) return;

    let records = pregnancyRecords[pregnancyCurrentTab] || [];

    if (searchTerm) {
        records = records.filter(function(r) {
            return r.full_name.toLowerCase().includes(searchTerm) || 
                   (r.purok || '').toLowerCase().includes(searchTerm);
        });
    }

    if (records.length === 0) {
        const emptyMsg = searchTerm 
            ? 'No matches found for "' + searchTerm + '"'
            : getPregnancyEmptyMessage(pregnancyCurrentTab);

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-female"></i>
                    <span>${emptyMsg}</span>
                </td>
            </tr>
        `;
        if (resultsCount) resultsCount.textContent = '0 records';
        return;
    }

    let html = '';
    records.forEach(function(r) {
        html += renderPregnancyRow(r, pregnancyCurrentTab);
    });

    tbody.innerHTML = html;
    if (resultsCount) resultsCount.textContent = records.length + ' record' + (records.length > 1 ? 's' : '');

    // Attach event handlers
    attachPregnancyRowHandlers();
}

// ========================================
// RENDER ROW
// ========================================
function renderPregnancyRow(r, tab) {
    const accountBadge = r.account_status === 'Has Account' 
        ? '<span class="status-badge active">Has Account</span>' 
        : '<span class="status-badge inactive">No Account</span>';

    let actionsHtml = '';
    let historyHtml = '';

    if (tab === 'Pregnant') {
        actionsHtml = `
            <button class="btn btn-outline btn-sm view-pregnancy-history" data-id="${r.id}" title="View Prenatal History">
                <i class="fas fa-history"></i>
            </button>
            <button class="btn btn-success btn-sm mark-delivered-from-pregnancy" data-id="${r.id}" title="Mark as Delivered">
                <i class="fas fa-check"></i> Delivered
            </button>
            <button class="btn btn-warning btn-sm mark-not-pregnant" data-id="${r.id}" title="Mark as Not Pregnant">
                <i class="fas fa-times"></i>
            </button>
        `;
        historyHtml = `
            <span class="preg-stat"><strong>${r.total_pregnancies}</strong> Gravida</span>
            <span class="preg-stat"><strong>${r.total_deliveries}</strong> Para</span>
            <span class="preg-stat">Due: <strong>${r.last_due_date || '—'}</strong></span>
        `;
    } else if (tab === 'Delivered') {
        actionsHtml = `
            <button class="btn btn-outline btn-sm view-pregnancy-history" data-id="${r.id}" title="View Full Pregnancy History">
                <i class="fas fa-history"></i> History
            </button>
            <button class="btn btn-primary btn-sm mark-pregnant-again" data-id="${r.id}" title="Mark as Pregnant Again">
                <i class="fas fa-plus"></i> Pregnant Again
            </button>
        `;
        historyHtml = `
            <span class="preg-stat"><strong>${r.total_pregnancies}</strong> Gravida</span>
            <span class="preg-stat"><strong>${r.total_deliveries}</strong> Para</span>
            <span class="preg-stat">Last Delivery: <strong>${r.last_delivery || '—'}</strong></span>
            <span class="preg-stat"><strong>${r.total_checkups}</strong> Checkups</span>
        `;
    } else {
        // Not Pregnant
        actionsHtml = `
            <button class="btn btn-primary btn-sm mark-pregnant" data-id="${r.id}" title="Mark as Pregnant">
                <i class="fas fa-check"></i> Mark as Pregnant
            </button>
        `;
        if (r.total_pregnancies > 0) {
            historyHtml = `<span class="preg-stat"><strong>${r.total_pregnancies}</strong> past pregnanc${r.total_pregnancies > 1 ? 'ies' : 'y'}</span>`;
        } else {
            historyHtml = `<span class="preg-stat" style="color: var(--gray-light);">No previous pregnancies</span>`;
        }
    }

    return `
        <tr data-id="${r.id}">
            <td><strong>${r.full_name}</strong></td>
            <td>${r.age_display}</td>
            <td>${r.purok}</td>
            <td>${r.mobile}</td>
            <td>${accountBadge}</td>
            <td class="preg-stats-cell">${historyHtml}</td>
            <td>
                <span class="status-badge ${r.pregnancy_status.toLowerCase().replace(' ', '-')}">
                    ${r.pregnancy_status}
                </span>
            </td>
            <td class="actions-cell">${actionsHtml}</td>
        </tr>
    `;
}

// ========================================
// ATTACH ROW HANDLERS
// ========================================
function attachPregnancyRowHandlers() {
    document.querySelectorAll('.view-pregnancy-history').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            viewPregnancyHistory(id);
        });
    });

    document.querySelectorAll('.mark-pregnant').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const name = this.closest('tr').querySelector('td').textContent.trim();
            confirmPregnancyStatusChange(id, 'Pregnant', name);
        });
    });

    document.querySelectorAll('.mark-delivered-from-pregnancy').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const name = this.closest('tr').querySelector('td').textContent.trim();
            markDeliveredFromPregnancy(id, name);
        });
    });

    document.querySelectorAll('.mark-not-pregnant').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const name = this.closest('tr').querySelector('td').textContent.trim();
            confirmPregnancyStatusChange(id, 'Not Pregnant', name);
        });
    });

    document.querySelectorAll('.mark-pregnant-again').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const name = this.closest('tr').querySelector('td').textContent.trim();
            confirmPregnancyStatusChange(id, 'Pregnant', name);
        });
    });
}

// ========================================
// CONFIRM STATUS CHANGE
// ========================================
function confirmPregnancyStatusChange(residentId, newStatus, name) {
    let msg = '';
    if (newStatus === 'Pregnant') {
        msg = `Mark ${name} as PREGNANT?\n\nShe will appear in the "Add Prenatal" dropdown.`;
    } else if (newStatus === 'Not Pregnant') {
        msg = `Mark ${name} as NOT PREGNANT?\n\nShe will be removed from the Currently Pregnant list.`;
    } else if (newStatus === 'Delivered') {
        msg = `Mark ${name} as DELIVERED?`;
    }

    if (!confirm(msg)) return;

    updatePregnancyStatusApi(residentId, newStatus);
}

// ========================================
// MARK DELIVERED — needs delivery date
// ========================================
function markDeliveredFromPregnancy(residentId, name) {
    const today = new Date().toISOString().split('T')[0];
    const deliveryDate = prompt(
        `Enter delivery date for ${name} (YYYY-MM-DD):`,
        today
    );
    if (!deliveryDate) return;

    // Find her active prenatal record
    const record = (pregnancyRecords['Pregnant'] || []).find(function(r) {
        return r.id === residentId;
    });

    if (record && record.active_prenatal_id) {
        // Use mark_delivered.php to also update the prenatal record
        fetch('ajax/mark_delivered.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                id: record.active_prenatal_id,
                delivery_date: deliveryDate
            }).toString()
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('Marked as delivered successfully!', 'success');
                refreshAllPregnancyTabs();
            } else {
                showToast(data.message || 'Failed to mark as delivered.', 'error');
            }
        })
        .catch(function() {
            showToast('Error connecting to server.', 'error');
        });
    } else {
        // No active prenatal record — just change status
        updatePregnancyStatusApi(residentId, 'Delivered');
    }
}

// ========================================
// UPDATE STATUS API
// ========================================
function updatePregnancyStatusApi(residentId, newStatus) {
    fetch('ajax/update_pregnancy_status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            resident_id: residentId,
            status: newStatus
        }).toString()
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            showToast(data.message || 'Status updated successfully!', 'success');
            refreshAllPregnancyTabs();
        } else {
            showToast(data.message || 'Update failed.', 'error');
        }
    })
    .catch(function() {
        showToast('Error connecting to server.', 'error');
    });
}

// ========================================
// REFRESH ALL TABS (reloads counts + current tab)
// ========================================
function refreshAllPregnancyTabs() {
    // Reload counts for all tabs
    loadPregnancyCounts();

    // Reload the current tab's list
    fetchPregnancyList(pregnancyCurrentTab);

    // Also refresh residents if function available
    if (typeof fetchAllRecords === 'function') {
        setTimeout(fetchAllRecords, 300);
    }
}

// ========================================
// UPDATE TAB COUNTS
// ========================================
function updatePregnancyTabCounts(counts) {
    const pregEl = document.getElementById('pregnantTabCount');
    const delivEl = document.getElementById('deliveredTabCount');
    const notPregEl = document.getElementById('notPregnantTabCount');

    if (pregEl) pregEl.textContent = counts['Pregnant'] || 0;
    if (delivEl) delivEl.textContent = counts['Delivered'] || 0;
    if (notPregEl) notPregEl.textContent = counts['Not Pregnant'] || 0;
}

// ========================================
// EMPTY MESSAGE
// ========================================
function getPregnancyEmptyMessage(tab) {
    if (tab === 'Pregnant') {
        return 'No currently pregnant women. Go to "Not Pregnant" tab to mark someone as pregnant.';
    } else if (tab === 'Delivered') {
        return 'No delivered pregnancies yet.';
    } else {
        return 'No registered female residents aged 13–49.';
    }
}

// ========================================
// VIEW PREGNANCY HISTORY
// ========================================
function viewPregnancyHistory(residentId) {
    // Find resident name
    let residentName = 'Resident';
    let record = null;

    ['Pregnant', 'Delivered', 'Not Pregnant'].forEach(function(tab) {
        const found = (pregnancyRecords[tab] || []).find(function(r) { return r.id === residentId; });
        if (found) {
            residentName = found.full_name;
            record = found;
        }
    });

    const content = document.getElementById('residentDetailContent');
    if (content) {
        content.innerHTML = `
            <div style="text-align:center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
                <p style="margin-top: 12px; color: var(--gray);">Loading pregnancy history...</p>
            </div>
        `;
    }
    openModal(viewResidentModal);

    // Fetch all her prenatal records
    fetch('ajax/get_resident_pregnancy_history.php?resident_id=' + residentId)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (!data.success) {
                if (content) {
                    content.innerHTML = '<p style="text-align:center;padding:20px;">Failed to load history.</p>';
                }
                return;
            }

            const info = data.resident;
            const records = data.records || [];

            let html = `
                <div class="resident-detail">
                    <div class="detail-header">
                        <div class="detail-avatar">
                            <i class="fas fa-female"></i>
                        </div>
                        <div class="detail-name">
                            <h2>${info.full_name}</h2>
                            <span class="detail-type status-badge ${(info.pregnancy_status || '').toLowerCase().replace(' ', '-')}">${info.pregnancy_status || '—'}</span>
                        </div>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Age</span>
                            <span class="detail-value">${info.age_display}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Purok</span>
                            <span class="detail-value">${info.purok || '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Mobile</span>
                            <span class="detail-value">${info.mobile || '—'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Account</span>
                            <span class="detail-value">${info.account_status}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Gravida (Total Pregnancies)</span>
                            <span class="detail-value"><strong>${info.total_pregnancies}</strong></span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Para (Deliveries)</span>
                            <span class="detail-value"><strong>${info.total_deliveries}</strong></span>
                        </div>
                    </div>
            `;

            if (records.length === 0) {
                html += `
                    <div class="detail-section">
                        <h4><i class="fas fa-history"></i> Pregnancy Records</h4>
                        <p class="detail-empty">No prenatal records found.</p>
                    </div>
                `;
            } else {
                html += `
                    <div class="detail-section">
                        <h4><i class="fas fa-history"></i> Pregnancy History (${records.length} record${records.length > 1 ? 's' : ''})</h4>
                        <div class="table-responsive">
                            <table class="records-table" style="font-size: 0.8rem;">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>LMP</th>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                        <th>Delivery Date</th>
                                        <th>Checkups</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;

                records.forEach(function(r, i) {
                    const statusClass = (r.status || '').toLowerCase();
                    html += `
                        <tr>
                            <td><strong>#${records.length - i}</strong></td>
                            <td>${r.lmp || '—'}</td>
                            <td>${r.due_date || '—'}</td>
                            <td><span class="status-badge ${statusClass}">${r.status}</span></td>
                            <td>${r.delivery_date || '—'}</td>
                            <td>${r.checkup_count || 0}</td>
                        </tr>
                    `;
                });

                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            html += `</div>`;

            if (content) content.innerHTML = html;
        })
        .catch(function() {
            if (content) {
                content.innerHTML = '<p style="text-align:center;padding:20px;">Failed to load history.</p>';
            }
        });
}

// Expose for navigation
window.initPregnancyPage = initPregnancyPage;
window.switchPregnancyTab = switchPregnancyTab;
window.fetchPregnancyList = fetchPregnancyList;
window.loadPregnancyCounts = loadPregnancyCounts;
// ========================================
// BHW IMMUNIZATION - Immunization Records
// ✅ Strict dates
// ✅ Filter: exclude children with active immunization
// ✅ Late administration ("Record Next Dose")
// ✅ Finished button (marks resident as done)
// ========================================

let flatpickrImmDate = null;
let flatpickrImmNext = null;
let flatpickrEditImmDate = null;
let flatpickrEditImmNext = null;

// ========================================
// DATE HELPERS
// ========================================

function ymdToDisplay(ymd) {
    if (!ymd) return '';
    const parts = String(ymd).split('-');
    if (parts.length !== 3) return '';
    return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function getYMDfromDisplay(inputEl) {
    if (!inputEl || !inputEl.value) return '';
    const parts = inputEl.value.trim().split('/');
    if (parts.length !== 3) return '';
    const d = String(parts[0]).padStart(2, '0');
    const m = String(parts[1]).padStart(2, '0');
    const y = parts[2];
    if (y.length !== 4) return '';
    return y + '-' + m + '-' + d;
}

function getTodayYMD() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function getFiveYearsAgoYMD() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function parseYMD(ymd) {
    if (!ymd) return null;
    const parts = String(ymd).split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    if (y < 2020 || y > 2100) return null;
    if (m < 1 || m > 12) return null;
    if (d < 1 || d > 31) return null;
    const test = new Date(y, m - 1, d);
    if (test.getFullYear() !== y || test.getMonth() !== m - 1 || test.getDate() !== d) return null;
    return { y: y, m: m, d: d };
}

function toSerialDay(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const y2 = y + 4800 - a;
    const m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}

function validateImmDate(ymd) {
    if (!ymd) return { valid: false, message: 'Please select a date.' };
    const parsed = parseYMD(ymd);
    if (!parsed) return { valid: false, message: 'Invalid date.' };

    const pickedSerial = toSerialDay(parsed.y, parsed.m, parsed.d);
    const today = new Date();
    const todaySerial = toSerialDay(today.getFullYear(), today.getMonth() + 1, today.getDate());

    if (pickedSerial > todaySerial) {
        return { valid: false, message: 'Date Administered cannot be in the future.' };
    }

    const fiveYearsSerial = todaySerial - 1826;
    if (pickedSerial < fiveYearsSerial) {
        return { valid: false, message: 'Date Administered is too old (more than 5 years ago).' };
    }

    return { valid: true };
}

function validateNextDose(ymd, adminYmd) {
    if (!ymd) return { valid: true };
    const parsed = parseYMD(ymd);
    if (!parsed) return { valid: false, message: 'Invalid Next Dose date.' };

    if (!adminYmd) {
        return { valid: false, message: 'Please set Date Administered first.' };
    }

    const adminParsed = parseYMD(adminYmd);
    if (!adminParsed) return { valid: false, message: 'Invalid Date Administered.' };

    const adminSerial = toSerialDay(adminParsed.y, adminParsed.m, adminParsed.d);
    const nextSerial = toSerialDay(parsed.y, parsed.m, parsed.d);

    if (nextSerial <= adminSerial) {
        return { valid: false, message: 'Next Dose must be after the Date Administered.' };
    }

    const twoYearsSerial = adminSerial + 731;
    if (nextSerial > twoYearsSerial) {
        return { valid: false, message: 'Next Dose is too far in the future (max 2 years).' };
    }

    return { valid: true };
}

// ========================================
// DOSE AUTO-ADVANCE
// ========================================
function getNextDose(currentDose) {
    if (!currentDose) return '1st Dose';
    const map = {
        '1st Dose': '2nd Dose',
        '2nd Dose': '3rd Dose',
        '3rd Dose': '4th Dose',
        '4th Dose': 'Booster',
        'Booster': 'Booster'
    };
    return map[currentDose] || '1st Dose';
}

// ========================================
// FLATPICKR INIT — ADD IMMUNIZATION
// ========================================
function initFlatpickrAddImmunization() {
    if (typeof flatpickr === 'undefined') return;

    const dateInput = document.getElementById('immunizationDate');
    const nextInput = document.getElementById('immunizationNextDose');

    if (flatpickrImmDate) flatpickrImmDate.destroy();
    if (flatpickrImmNext) flatpickrImmNext.destroy();

    if (dateInput) {
        flatpickrImmDate = flatpickr(dateInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            maxDate: 'today',
            minDate: getFiveYearsAgoYMD(),
            disableMobile: true,
            onChange: function(selectedDates, dateStr, instance) {
                if (!selectedDates || !selectedDates.length) return;
                const picked = selectedDates[0];
                const ymd = picked.getFullYear() + '-' +
                    String(picked.getMonth() + 1).padStart(2, '0') + '-' +
                    String(picked.getDate()).padStart(2, '0');
                const check = validateImmDate(ymd);
                if (!check.valid) {
                    if (typeof showToast === 'function') showToast(check.message, 'error');
                    instance.clear();
                    return;
                }
                if (flatpickrImmNext) {
                    const minNext = new Date(picked);
                    minNext.setDate(minNext.getDate() + 1);
                    flatpickrImmNext.set('minDate', minNext);
                }
            }
        });
    }

    if (nextInput) {
        flatpickrImmNext = flatpickr(nextInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            disableMobile: true
        });
    }
}

// ========================================
// FLATPICKR INIT — EDIT IMMUNIZATION
// ========================================
function initFlatpickrEditImmunization() {
    if (typeof flatpickr === 'undefined') return;

    const dateInput = document.getElementById('editImmunizationDate');
    const nextInput = document.getElementById('editImmunizationNextDose');

    if (flatpickrEditImmDate) flatpickrEditImmDate.destroy();
    if (flatpickrEditImmNext) flatpickrEditImmNext.destroy();

    if (dateInput) {
        flatpickrEditImmDate = flatpickr(dateInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            maxDate: 'today',
            minDate: getFiveYearsAgoYMD(),
            disableMobile: true,
            onChange: function(selectedDates, dateStr, instance) {
                if (!selectedDates || !selectedDates.length) return;
                const picked = selectedDates[0];
                const ymd = picked.getFullYear() + '-' +
                    String(picked.getMonth() + 1).padStart(2, '0') + '-' +
                    String(picked.getDate()).padStart(2, '0');
                const check = validateImmDate(ymd);
                if (!check.valid) {
                    if (typeof showToast === 'function') showToast(check.message, 'error');
                    instance.clear();
                    return;
                }
                if (flatpickrEditImmNext) {
                    const minNext = new Date(picked);
                    minNext.setDate(minNext.getDate() + 1);
                    flatpickrEditImmNext.set('minDate', minNext);
                }
            }
        });
    }

    if (nextInput) {
        flatpickrEditImmNext = flatpickr(nextInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            disableMobile: true
        });
    }
}

// ========================================
// ADD IMMUNIZATION BUTTON (New Series)
// ========================================
function initAddImmunizationButton() {
    if (!addImmunizationBtn) return;

    addImmunizationBtn.addEventListener('click', function() {
        // Reset mode
        const modeInput = document.getElementById('immunizationMode');
        if (modeInput) modeInput.value = 'new';
        const prevIdInput = document.getElementById('immunizationPreviousId');
        if (prevIdInput) prevIdInput.value = '';

        // Enable child dropdown (in case previous was locked)
        const childSelect = document.getElementById('immunizationChild');
        if (childSelect) childSelect.disabled = false;

        populateImmunizationChildren();
        recordImmunizationForm.reset();
        const submitBtn = recordImmunizationForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Save Immunization';
        submitBtn.disabled = false;

        openModal(recordImmunizationModal);

        setTimeout(function() {
            initFlatpickrAddImmunization();
        }, 50);
    });
}

// ========================================
// POPULATE IMMUNIZATION CHILDREN DROPDOWN
// ✅ Only children WITHOUT active immunization
// ========================================
function populateImmunizationChildren() {
    const select = document.getElementById('immunizationChild');
    if (!select) return;

    select.innerHTML = '<option value="">Loading...</option>';

    fetch('ajax/get_children_for_immunization.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            select.innerHTML = '<option value="">Select child...</option>';

            if (!data.success || !data.children || data.children.length === 0) {
                select.innerHTML = '<option value="">No children available for new immunization</option>';
                if (typeof showToast === 'function') {
                    showToast('All registered children already have an active or completed immunization series.', 'info');
                }
                return;
            }

            data.children.forEach(function(r) {
                const option = document.createElement('option');
                option.value = r.id;
                const parentInfo = r.parent_name ? ' · Parent: ' + r.parent_name : ' · No Parent';
                option.textContent = r.full_name + ' (' + r.age_display + ', ' + r.purok + ')' + parentInfo;
                select.appendChild(option);
            });

            if (typeof loadVaccineDropdowns === 'function') {
                loadVaccineDropdowns();
            }
        })
        .catch(function() {
            select.innerHTML = '<option value="">Error loading children</option>';
        });
}

// ========================================
// IMMUNIZATION FORM SUBMIT
// ========================================
function initRecordImmunizationForm() {
    if (!recordImmunizationForm) return;

    recordImmunizationForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const childId = parseInt(document.getElementById('immunizationChild').value);
        const vaccine = document.getElementById('immunizationVaccine').value;
        const dose = document.getElementById('immunizationDose').value;

        const dateAdministeredYMD = getYMDfromDisplay(document.getElementById('immunizationDate'));
        const nextDoseYMD = getYMDfromDisplay(document.getElementById('immunizationNextDose'));
        const notes = document.getElementById('immunizationNotes').value;

        if (!childId || !vaccine || !dose || !dateAdministeredYMD) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        const dateCheck = validateImmDate(dateAdministeredYMD);
        if (!dateCheck.valid) {
            showToast(dateCheck.message, 'error');
            document.getElementById('immunizationDate').focus();
            return;
        }

        if (nextDoseYMD) {
            const nextCheck = validateNextDose(nextDoseYMD, dateAdministeredYMD);
            if (!nextCheck.valid) {
                showToast(nextCheck.message, 'error');
                document.getElementById('immunizationNextDose').focus();
                return;
            }
        }

        const child = residents.find(function(r) { return r.id === childId; });

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const immData = {
            child_id: childId,
            vaccine: vaccine,
            dose: dose,
            date_administered: dateAdministeredYMD,
            next_dose: nextDoseYMD || '',
            notes: notes || ''
        };

        fetch('ajax/add_immunization.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(immData).toString()
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('Immunization recorded for ' + (child ? child.fullName : 'child'), 'success');
                closeModal(recordImmunizationModal);
                recordImmunizationForm.reset();
                if (flatpickrImmDate) flatpickrImmDate.clear();
                if (flatpickrImmNext) flatpickrImmNext.clear();
                submitBtn.textContent = 'Save Immunization';
                submitBtn.disabled = false;
                fetchAllRecords();
            } else {
                showToast(data.message || 'Immunization recording failed.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Immunization';
            }
        })
        .catch(function() {
            showToast('Error connecting to server.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Immunization';
        });
    });
}

// ========================================
// RECORD NEXT DOSE (Late Administration)
// ========================================
function recordNextDose(recordId) {
    const record = immunizationRecords.find(function(r) { return r.id === recordId; });
    if (!record) {
        showToast('Record not found.', 'error');
        return;
    }

    // Reset mode + set
    const modeInput = document.getElementById('immunizationMode');
    if (modeInput) modeInput.value = 'next';
    const prevIdInput = document.getElementById('immunizationPreviousId');
    if (prevIdInput) prevIdInput.value = recordId;

    // Open modal
    recordImmunizationForm.reset();

    const childSelect = document.getElementById('immunizationChild');
    const vaccineSelect = document.getElementById('immunizationVaccine');
    const doseSelect = document.getElementById('immunizationDose');

    // Populate with just this child
    childSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = record.child_id || record.residentId;
    opt.textContent = record.child_name || 'Unknown';
    opt.selected = true;
    childSelect.appendChild(opt);
    childSelect.disabled = true;

    // Pre-fill vaccine
    if (vaccineSelect) {
        vaccineSelect.value = record.vaccine || '';
    }

    // Pre-fill next dose
    const nextDose = getNextDose(record.dose);
    if (doseSelect) {
        doseSelect.value = nextDose;
    }

    // Notes
    document.getElementById('immunizationNotes').value = 'Catch-up dose (previous: ' + record.dose + ' on ' + (record.date_administered || '—') + ')';

    // Load vaccine dropdowns but keep values
    if (typeof loadVaccineDropdowns === 'function') {
        setTimeout(function() {
            if (vaccineSelect) vaccineSelect.value = record.vaccine || '';
            if (doseSelect) doseSelect.value = nextDose;
        }, 150);
    }

    const submitBtn = recordImmunizationForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Save Next Dose';
    submitBtn.disabled = false;

    openModal(recordImmunizationModal);

    setTimeout(function() {
        initFlatpickrAddImmunization();

        // Default Date Administered = today
        const dateInput = document.getElementById('immunizationDate');
        if (dateInput) {
            dateInput.value = ymdToDisplay(getTodayYMD());
            if (flatpickrImmDate) {
                flatpickrImmDate.setDate(getTodayYMD(), false);
            }
            dateInput.value = ymdToDisplay(getTodayYMD());
        }
    }, 100);
}

// ========================================
// MARK IMMUNIZATION FINISHED
// ========================================
function markImmunizationFinished(childId, childName) {
    if (!confirm('✅ Mark ' + childName + ' as FINISHED with all immunizations?\n\nThis will be saved to their resident record.')) {
        return;
    }

    fetch('ajax/mark_immunization_finished.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'child_id=' + childId
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            showToast(data.message || 'Marked as finished!', 'success');
            fetchAllRecords();
        } else {
            showToast(data.message || 'Failed to mark as finished.', 'error');
        }
    })
    .catch(function() {
        showToast('Error connecting to server.', 'error');
    });
}

// ========================================
// VIEW IMMUNIZATION HISTORY
// ========================================
function viewImmunizationHistory(childId) {
    const content = document.getElementById('immunizationHistoryContent');
    if (!content) return;

    content.innerHTML = `
        <div style="text-align:center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
            <p style="margin-top: 12px; color: var(--gray);">Loading immunization history...</p>
        </div>
    `;

    openModal(document.getElementById('immunizationHistoryModal'));

    fetch('ajax/get_immunization_history.php?child_id=' + childId)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (!data.success) {
                content.innerHTML = '<p style="text-align:center; padding:20px;">Failed to load history.</p>';
                return;
            }

            const child = data.child;
            const records = data.records || [];

            let html = `
                <div class="resident-detail">
                    <div class="detail-header">
                        <div class="detail-avatar">
                            <i class="fas fa-child"></i>
                        </div>
                        <div class="detail-name">
                            <h2>${child.full_name}</h2>
                            <span class="detail-type status-badge child">${child.age_display}</span>
                        </div>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Purok</span>
                            <span class="detail-value">${child.purok}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Date of Birth</span>
                            <span class="detail-value">${ymdToDisplay(child.date_of_birth)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Parent/Guardian</span>
                            <span class="detail-value">${child.parent_name}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Contact</span>
                            <span class="detail-value">${child.parent_contact}</span>
                        </div>
                    </div>
            `;

            if (records.length === 0) {
                html += `
                    <div class="detail-section">
                        <h4><i class="fas fa-history"></i> Immunization Records</h4>
                        <p class="detail-empty">No immunization records found for this child.</p>
                    </div>
                `;
            } else {
                html += `
                    <div class="detail-section">
                        <h4><i class="fas fa-history"></i> Immunization History (${records.length} record${records.length > 1 ? 's' : ''})</h4>
                        <div class="table-responsive">
                            <table class="records-table" style="font-size: 0.82rem;">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Date Administered</th>
                                        <th>Vaccine</th>
                                        <th>Dose</th>
                                        <th>Next Dose</th>
                                        <th>Status</th>
                                        <th>Recorded By</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;

                records.forEach(function(r, i) {
                    const statusClass = (r.status || 'upcoming').toLowerCase();
                    html += `
                        <tr>
                            <td><strong>#${records.length - i}</strong></td>
                            <td>${ymdToDisplay(r.date_administered)}</td>
                            <td>${r.vaccine || '—'}</td>
                            <td>${r.dose || '—'}</td>
                            <td>${r.next_dose_date ? ymdToDisplay(r.next_dose_date) : '—'}</td>
                            <td><span class="status-badge ${statusClass}">${r.status || 'Upcoming'}</span></td>
                            <td>${r.recorded_by_name || '—'}</td>
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
            content.innerHTML = html;
        })
        .catch(function() {
            content.innerHTML = '<p style="text-align:center; padding:20px;">Failed to load history.</p>';
        });
}

// ========================================
// RENDER IMMUNIZATION
// ✅ Shows: History | Record Next Dose OR Finished | Edit | Delete
// ========================================
function renderImmunization() {
    const tbody = document.getElementById('immunizationTableBody');
    const resultsCount = document.getElementById('immunizationResults');

    if (!tbody) return;

    if (immunizationRecords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="empty-state">
                    <i class="fas fa-syringe"></i>
                    <span>No immunization records found</span>
                    <p class="empty-sub">Record vaccinations to ensure children are protected.</p>
                </td>
            </tr>
        `;
        if (resultsCount) resultsCount.textContent = '0 records';
        return;
    }

    // Group records by child to detect "series done"
    const childSeriesMap = {};
    immunizationRecords.forEach(function(r) {
        const cid = r.child_id || r.residentId;
        if (!childSeriesMap[cid]) childSeriesMap[cid] = [];
        childSeriesMap[cid].push(r);
    });

    tbody.innerHTML = immunizationRecords.map(function(r) {
        const statusClass = r.status ? r.status.toLowerCase() : 'upcoming';

        let parentDisplay = '—';
        if (r.parent_name && r.parent_name !== '—' && r.parent_name !== '') {
            parentDisplay = r.parent_name;
        } else if (r.parentName && r.parentName !== '—' && r.parentName !== '') {
            parentDisplay = r.parentName;
        }

        const childPurok = r.child_purok || r.purok || '—';
        const ageDisplay = r.child_age_display || r.child_age || '—';
        const childId = r.child_id || r.residentId;

        // Determine child series status
        const seriesRecords = childSeriesMap[childId] || [];
        const hasPendingNextDose = seriesRecords.some(function(s) {
            return s.next_dose && s.next_dose !== '—' && s.status !== 'Completed';
        });
        const hasOverdue = seriesRecords.some(function(s) {
            return s.status === 'Overdue';
        });
        const childStatus = r.child_immunization_status || 'None';
        const isCompleted = childStatus === 'Completed';

        // Action buttons
        let actionHtml = '';

        // If the child's series is completed → Finished button (no more next dose)
        if (isCompleted) {
            actionHtml = `
                <button class="btn btn-success btn-sm finished-badge" disabled title="Series completed">
                    <i class="fas fa-check-circle"></i> Finished
                </button>
            `;
        } else if (r.next_dose && r.next_dose !== '—' && r.status !== 'Completed') {
            // Has pending next dose → Record Next Dose
            actionHtml = `
                <button class="btn btn-primary btn-sm record-next-dose" data-id="${r.id}" title="Record Next Dose">
                    <i class="fas fa-plus"></i> Next Dose
                </button>
            `;
        } else if (r.next_dose && r.next_dose !== '—' && r.status === 'Completed') {
            // Completed but has next dose scheduled in future
            actionHtml = `
                <button class="btn btn-outline btn-sm" disabled title="Waiting for next dose date">
                    <i class="fas fa-clock"></i> Scheduled
                </button>
            `;
        } else {
            // No next dose scheduled → This vaccine is done.
            // Show "Finish Series" button to mark child complete (if not already)
            if (!isCompleted && !hasPendingNextDose) {
                actionHtml = `
                    <button class="btn btn-success btn-sm finish-immunization" data-child-id="${childId}" data-child-name="${(r.child_name || 'Child').replace(/"/g, '&quot;')}">
                        <i class="fas fa-flag-checkered"></i> Finish
                    </button>
                `;
            } else {
                actionHtml = `<span style="color:var(--gray-light); font-size:0.75rem;">—</span>`;
            }
        }

        return `
            <tr>
                <td><strong>${r.child_name || r.childName || 'Unknown'}</strong></td>
                <td>${childPurok}</td>
                <td>${ageDisplay}</td>
                <td>${parentDisplay}</td>
                <td>${r.vaccine || '—'}</td>
                <td>${r.dose || '—'}</td>
                <td>${r.date_administered || r.dateAdministered || '—'}</td>
                <td>${r.next_dose || r.nextDose || '—'}</td>
                <td><span class="status-badge ${statusClass}">${r.status || 'Upcoming'}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm view-immunization-history" data-child-id="${childId}" title="View Full History">
                        <i class="fas fa-history"></i>
                    </button>
                </td>
                <td>${actionHtml}</td>
                <td>
                    <button class="btn btn-outline btn-sm edit-immunization" data-id="${r.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm delete-immunization" data-id="${r.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (resultsCount) resultsCount.textContent = immunizationRecords.length + ' records';

    // Event handlers
    document.querySelectorAll('.view-immunization-history').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const childId = parseInt(this.dataset.childId);
            viewImmunizationHistory(childId);
        });
    });

    document.querySelectorAll('.record-next-dose').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            recordNextDose(id);
        });
    });

    document.querySelectorAll('.finish-immunization').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const childId = parseInt(this.dataset.childId);
            const childName = this.dataset.childName || 'this child';
            markImmunizationFinished(childId, childName);
        });
    });

    document.querySelectorAll('.edit-immunization').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            editImmunizationRecord(id);
        });
    });

    document.querySelectorAll('.delete-immunization').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            deleteImmunizationRecord(id);
        });
    });
}

// ========================================
// EDIT IMMUNIZATION RECORD
// ========================================
function editImmunizationRecord(recordId) {
    const record = immunizationRecords.find(function(r) { return r.id === recordId; });
    if (!record) {
        showToast('Record not found.', 'error');
        return;
    }

    document.getElementById('editImmunizationId').value = record.id;
    document.getElementById('editImmunizationChild').value = record.child_id || record.residentId || '';
    document.getElementById('editImmunizationVaccine').value = record.vaccine || '';
    document.getElementById('editImmunizationDose').value = record.dose || '';

    const dateYMD = record.date_administered && record.date_administered !== '—' ? record.date_administered : '';
    const nextYMD = record.next_dose && record.next_dose !== '—' ? record.next_dose : '';
    document.getElementById('editImmunizationDate').value = ymdToDisplay(dateYMD);
    document.getElementById('editImmunizationNextDose').value = ymdToDisplay(nextYMD);
    document.getElementById('editImmunizationNotes').value = record.notes || '';

    populateEditImmunizationChildren(record.child_id || record.residentId);
    openModal(editImmunizationModal);

    setTimeout(function() {
        initFlatpickrEditImmunization();

        if (flatpickrEditImmDate && dateYMD) {
            flatpickrEditImmDate.setDate(dateYMD, false);
        }
        if (flatpickrEditImmNext && nextYMD) {
            flatpickrEditImmNext.setDate(nextYMD, false);
        }

        document.getElementById('editImmunizationDate').value = ymdToDisplay(dateYMD);
        document.getElementById('editImmunizationNextDose').value = ymdToDisplay(nextYMD);
    }, 100);
}

// ========================================
// POPULATE EDIT IMMUNIZATION CHILDREN
// ========================================
function populateEditImmunizationChildren(selectedId) {
    const select = document.getElementById('editImmunizationChild');
    if (!select) return;

    select.innerHTML = '<option value="">Select child...</option>';

    const children = residents.filter(function(r) {
        let ageNum = parseInt(r.age);
        if (isNaN(ageNum) && r.age_display) {
            const ageMatch = String(r.age_display).match(/(\d+)/);
            if (ageMatch) {
                ageNum = parseInt(ageMatch[1]);
            }
        }
        let isInfant = false;
        if (r.age_display && typeof r.age_display === 'string') {
            const ageDisplayLower = r.age_display.toLowerCase();
            if (ageDisplayLower.includes('mos') || ageDisplayLower.includes('month')) {
                const mosMatch = ageDisplayLower.match(/(\d+)/);
                if (mosMatch) {
                    const months = parseInt(mosMatch[1]);
                    isInfant = months <= 60;
                }
            }
        }
        return !isNaN(ageNum) && ageNum >= 0 && ageNum <= 5 || isInfant;
    });

    if (children.length === 0) {
        select.innerHTML = '<option value="">No children registered (0-5 years old)</option>';
    } else {
        children.forEach(function(r) {
            const option = document.createElement('option');
            option.value = r.id;
            if (selectedId && selectedId == r.id) {
                option.selected = true;
            }
            const ageDisplay = r.age_display || r.age || 'Unknown age';
            const parentInfo = r.parentName ? ' · Parent: ' + r.parentName : ' · No Parent';
            const purokInfo = r.purok ? ', ' + r.purok : '';
            option.textContent = r.fullName + ' (' + ageDisplay + purokInfo + ')' + parentInfo;
            select.appendChild(option);
        });
    }
}

// ========================================
// EDIT IMMUNIZATION FORM SUBMIT
// ========================================
function initEditImmunizationForm() {
    if (!editImmunizationForm) return;

    editImmunizationForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const id = document.getElementById('editImmunizationId').value;
        const childId = parseInt(document.getElementById('editImmunizationChild').value);
        const vaccine = document.getElementById('editImmunizationVaccine').value;
        const dose = document.getElementById('editImmunizationDose').value;

        const dateAdministeredYMD = getYMDfromDisplay(document.getElementById('editImmunizationDate'));
        const nextDoseYMD = getYMDfromDisplay(document.getElementById('editImmunizationNextDose'));
        const notes = document.getElementById('editImmunizationNotes').value;

        if (!childId || !vaccine || !dose || !dateAdministeredYMD) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        const dateCheck = validateImmDate(dateAdministeredYMD);
        if (!dateCheck.valid) {
            showToast(dateCheck.message, 'error');
            document.getElementById('editImmunizationDate').focus();
            return;
        }

        if (nextDoseYMD) {
            const nextCheck = validateNextDose(nextDoseYMD, dateAdministeredYMD);
            if (!nextCheck.valid) {
                showToast(nextCheck.message, 'error');
                document.getElementById('editImmunizationNextDose').focus();
                return;
            }
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        const data = new URLSearchParams({
            id: id,
            child_id: childId,
            vaccine: vaccine,
            dose: dose,
            date_administered: dateAdministeredYMD,
            next_dose: nextDoseYMD || '',
            notes: notes || ''
        }).toString();

        fetch('ajax/update_immunization.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: data
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('Immunization record updated successfully!', 'success');
                closeModal(editImmunizationModal);
                fetchAllRecords();
            } else {
                showToast(data.message || 'Update failed.', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Immunization';
        })
        .catch(function() {
            showToast('Error connecting to server.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Immunization';
        });
    });
}

// ========================================
// DELETE IMMUNIZATION RECORD
// ========================================
function deleteImmunizationRecord(recordId) {
    if (!confirm('⚠️ Are you sure you want to delete this immunization record?\n\nThis action cannot be undone.')) {
        return;
    }

    fetch('ajax/delete_immunization.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'id=' + recordId
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            showToast('Immunization record deleted successfully!', 'success');
            fetchAllRecords();
        } else {
            showToast(data.message || 'Delete failed.', 'error');
        }
    })
    .catch(function() {
        showToast('Error connecting to server.', 'error');
    });
}

// ========================================
// APPLY IMMUNIZATION FILTERS
// ========================================
function applyImmunizationFilters() {
    const search = document.getElementById('immunizationSearch')?.value.trim() || '';
    const purok = document.getElementById('immunizationPurokFilter')?.value || '';
    const vaccine = document.getElementById('immunizationVaccineFilter')?.value || '';
    const dose = document.getElementById('immunizationDoseFilter')?.value || '';
    const date = document.getElementById('immunizationDateFilter')?.value || '';
    const status = document.getElementById('immunizationStatusFilter')?.value || '';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (purok) params.append('purok', purok);
    if (vaccine) params.append('vaccine_type', vaccine);
    if (dose) params.append('dose', dose);
    if (date) params.append('date', date);
    if (status) params.append('status', status);

    fetch('ajax/get_immunization.php?' + params.toString())
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                immunizationRecords = data.records.map(function(r) {
                    let parentName = r.parent_name || '—';

                    if (!parentName || parentName === '—' || parentName === '') {
                        if (r.child_id) {
                            const child = residents.find(function(res) {
                                return res.id === parseInt(r.child_id);
                            });
                            if (child && child.parentName) {
                                parentName = child.parentName;
                            }
                        }

                        if (r.parent_id && !parentName) {
                            const parent = residents.find(function(res) {
                                return res.id === parseInt(r.parent_id);
                            });
                            if (parent) {
                                parentName = parent.fullName || parent.firstName + ' ' + parent.lastName;
                            }
                        }
                    }

                    return {
                        id: r.id,
                        residentId: r.resident_id,
                        child_id: r.child_id || r.resident_id,
                        child_name: r.child_name || 'Unknown',
                        child_age: r.child_age || '—',
                        child_age_display: r.child_age_display || (r.child_age !== '—' && r.child_age !== undefined ? r.child_age + ' yrs' : '—'),
                        child_purok: r.child_purok || '—',
                        parent_id: r.parent_id || null,
                        parent_name: parentName,
                        parent_contact: r.parent_contact || '—',
                        vaccine: r.vaccine || '—',
                        dose: r.dose || '—',
                        date_administered: r.date_administered || '—',
                        next_dose: r.next_dose || '—',
                        status: r.status || 'Upcoming',
                        notes: r.notes || '',
                        child_immunization_status: r.child_immunization_status || 'None',
                        created_at: r.created_at || new Date().toISOString()
                    };
                });
                renderImmunization();
            }
        })
        .catch(function() { /* silent fail */ });
}

// ========================================
// INIT IMMUNIZATION FILTER EVENTS
// ========================================
function initImmunizationFilterEvents() {
    document.getElementById('immunizationSearch')?.addEventListener('input', applyImmunizationFilters);
    document.getElementById('immunizationPurokFilter')?.addEventListener('change', applyImmunizationFilters);
    document.getElementById('immunizationVaccineFilter')?.addEventListener('change', applyImmunizationFilters);
    document.getElementById('immunizationDoseFilter')?.addEventListener('change', applyImmunizationFilters);
    document.getElementById('immunizationDateFilter')?.addEventListener('change', applyImmunizationFilters);
    document.getElementById('immunizationStatusFilter')?.addEventListener('change', applyImmunizationFilters);

    document.getElementById('clearImmunizationFilters')?.addEventListener('click', function() {
        document.getElementById('immunizationSearch').value = '';
        document.getElementById('immunizationPurokFilter').value = '';
        document.getElementById('immunizationVaccineFilter').value = '';
        document.getElementById('immunizationDoseFilter').value = '';
        document.getElementById('immunizationDateFilter').value = '';
        document.getElementById('immunizationStatusFilter').value = '';
        applyImmunizationFilters();
    });

    document.querySelectorAll('.close-history-modal').forEach(function(btn) {
        btn.addEventListener('click', function() {
            closeModal(document.getElementById('immunizationHistoryModal'));
        });
    });
}
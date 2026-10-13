// ========================================
// BHW PRENATAL - Prenatal Care Records
// ✅ Flatpickr date picker (dd/mm/yyyy display, YYYY-MM-DD internal)
// ✅ LMP validation: 9-month window
// ✅ Next Checkup: tomorrow or later
// ========================================

// ========================================
// CONSTANTS
// ========================================
const LMP_MAX_DAYS_BACK = 280;

// Flatpickr instances
let flatpickrAddLmp = null;
let flatpickrAddDue = null;
let flatpickrAddNextCheckup = null;
let flatpickrEditLmp = null;
let flatpickrEditDue = null;
let flatpickrEditNextCheckup = null;
let flatpickrCheckupDate = null;
let flatpickrCheckupNextCheckup = null;

// ========================================
// DATE HELPERS
// ========================================

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

function getTodaySerial() {
    const now = new Date();
    return toSerialDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function serialDayToYMD(serial) {
    let a = serial + 32044;
    let b = Math.floor((4 * a + 3) / 146097);
    let c = a - Math.floor(146097 * b / 4);
    let d2 = Math.floor((4 * c + 3) / 1461);
    let e = c - Math.floor(1461 * d2 / 4);
    let m = Math.floor((5 * e + 2) / 153);
    let day = e - Math.floor((153 * m + 2) / 5) + 1;
    let month = m + 3 - 12 * Math.floor(m / 10);
    let year = 100 * b + d2 - 4800 + Math.floor(m / 10);
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return year + '-' + mm + '-' + dd;
}

function getTodayYMD() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function getTomorrowYMD() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function getTomorrowDisplay() {
    return ymdToDisplay(getTomorrowYMD());
}

function ymdToDisplay(ymd) {
    if (!ymd) return '';
    const parts = String(ymd).split('-');
    if (parts.length !== 3) return '';
    return parts[2] + '/' + parts[1] + '/' + parts[0];
}

/**
 * Get YYYY-MM-DD from a flatpickr input (which holds dd/mm/yyyy)
 */
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

/**
 * Validate Next Checkup date — must be tomorrow or later
 */
function validateNextCheckup(value) {
    if (!value) {
        return { valid: true }; // optional field
    }
    const parsed = parseYMD(value);
    if (!parsed) {
        return { valid: false, message: 'Invalid Next Checkup date.' };
    }
    const nextSerial = toSerialDay(parsed.y, parsed.m, parsed.d);
    const todaySerial = getTodaySerial();
    if (nextSerial <= todaySerial) {
        return { valid: false, message: 'Next Checkup must be tomorrow or later.' };
    }
    return { valid: true };
}

// ========================================
// FLATPICKR INITIALIZATION
// ========================================

function initFlatpickrAdd() {
    if (typeof flatpickr === 'undefined') {
        console.warn('Flatpickr not loaded');
        return;
    }

    const lmpInput = document.getElementById('prenatalLmp');
    const dueInput = document.getElementById('prenatalDueDate');
    const nextCheckupInput = document.getElementById('prenatalNextCheckup');

    // Destroy existing
    if (flatpickrAddLmp) flatpickrAddLmp.destroy();
    if (flatpickrAddDue) flatpickrAddDue.destroy();
    if (flatpickrAddNextCheckup) flatpickrAddNextCheckup.destroy();

    // LMP picker
    if (lmpInput) {
        flatpickrAddLmp = flatpickr(lmpInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            maxDate: 'today',
            disableMobile: true,
            onChange: function(selectedDates, dateStr, instance) {
                if (!selectedDates || !selectedDates.length) {
                    if (dueInput) dueInput.value = '';
                    const gestAge = document.getElementById('prenatalGestationalAge');
                    if (gestAge) gestAge.value = '';
                    return;
                }

                const lmpDate = selectedDates[0];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const lmpMidnight = new Date(lmpDate.getFullYear(), lmpDate.getMonth(), lmpDate.getDate());
                const diffDays = Math.round((today - lmpMidnight) / (1000 * 60 * 60 * 24));

                if (diffDays > LMP_MAX_DAYS_BACK) {
                    if (typeof showToast === 'function') {
                        showToast('LMP is too old (' + diffDays + ' days ago, max is 280 days).', 'error');
                    }
                    instance.clear();
                    if (dueInput) dueInput.value = '';
                    const gestAge = document.getElementById('prenatalGestationalAge');
                    if (gestAge) gestAge.value = '';
                    return;
                }

                const weeks = Math.floor(diffDays / 7);
                const gestAgeEl = document.getElementById('prenatalGestationalAge');
                if (gestAgeEl) gestAgeEl.value = weeks;

                if (dueInput) {
                    const dueDate = new Date(lmpMidnight);
                    dueDate.setDate(dueDate.getDate() + 280);
                    dueInput.value = ymdToDisplay(
                        dueDate.getFullYear() + '-' +
                        String(dueDate.getMonth() + 1).padStart(2, '0') + '-' +
                        String(dueDate.getDate()).padStart(2, '0')
                    );
                }
            }
        });
    }

    // Due date picker (readonly, no picker needed)
    if (dueInput) {
        flatpickrAddDue = flatpickr(dueInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            disableMobile: true
        });
    }

    // ✅ Next Checkup — minimum tomorrow
    if (nextCheckupInput) {
        flatpickrAddNextCheckup = flatpickr(nextCheckupInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            minDate: 'tomorrow',
            disableMobile: true,
            onChange: function(selectedDates, dateStr, instance) {
                if (!selectedDates || !selectedDates.length) return;

                const pickedDate = selectedDates[0];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const pickedMidnight = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate());

                if (pickedMidnight.getTime() <= today.getTime()) {
                    if (typeof showToast === 'function') {
                        showToast('Next Checkup must be tomorrow or later.', 'error');
                    }
                    instance.clear();
                }
            }
        });
    }
}

function initFlatpickrEdit() {
    if (typeof flatpickr === 'undefined') return;

    const lmpInput = document.getElementById('editPrenatalLmp');
    const dueInput = document.getElementById('editPrenatalDueDate');
    const nextCheckupInput = document.getElementById('editPrenatalNextCheckup');

    if (flatpickrEditLmp) flatpickrEditLmp.destroy();
    if (flatpickrEditDue) flatpickrEditDue.destroy();
    if (flatpickrEditNextCheckup) flatpickrEditNextCheckup.destroy();

    if (lmpInput) {
        flatpickrEditLmp = flatpickr(lmpInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            maxDate: 'today',
            disableMobile: true,
            onChange: function(selectedDates, dateStr, instance) {
                if (!selectedDates || !selectedDates.length) {
                    if (dueInput) dueInput.value = '';
                    const gestAge = document.getElementById('editPrenatalGestationalAge');
                    if (gestAge) gestAge.value = '';
                    return;
                }

                const lmpDate = selectedDates[0];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const lmpMidnight = new Date(lmpDate.getFullYear(), lmpDate.getMonth(), lmpDate.getDate());
                const diffDays = Math.round((today - lmpMidnight) / (1000 * 60 * 60 * 24));

                if (diffDays > LMP_MAX_DAYS_BACK) {
                    if (typeof showToast === 'function') {
                        showToast('LMP is too old (' + diffDays + ' days ago, max is 280 days).', 'error');
                    }
                    instance.clear();
                    if (dueInput) dueInput.value = '';
                    const gestAge = document.getElementById('editPrenatalGestationalAge');
                    if (gestAge) gestAge.value = '';
                    return;
                }

                const weeks = Math.floor(diffDays / 7);
                const gestAgeEl = document.getElementById('editPrenatalGestationalAge');
                if (gestAgeEl) gestAgeEl.value = weeks;

                if (dueInput) {
                    const dueDate = new Date(lmpMidnight);
                    dueDate.setDate(dueDate.getDate() + 280);
                    dueInput.value = ymdToDisplay(
                        dueDate.getFullYear() + '-' +
                        String(dueDate.getMonth() + 1).padStart(2, '0') + '-' +
                        String(dueDate.getDate()).padStart(2, '0')
                    );
                }
            }
        });
    }

    if (dueInput) {
        flatpickrEditDue = flatpickr(dueInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            disableMobile: true
        });
    }

    // ✅ Edit Next Checkup — min tomorrow
    if (nextCheckupInput) {
        flatpickrEditNextCheckup = flatpickr(nextCheckupInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            minDate: 'tomorrow',
            disableMobile: true,
            onChange: function(selectedDates, dateStr, instance) {
                if (!selectedDates || !selectedDates.length) return;
                const pickedDate = selectedDates[0];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const pickedMidnight = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate());
                if (pickedMidnight.getTime() <= today.getTime()) {
                    if (typeof showToast === 'function') {
                        showToast('Next Checkup must be tomorrow or later.', 'error');
                    }
                    instance.clear();
                }
            }
        });
    }
}

function initFlatpickrCheckup() {
    if (typeof flatpickr === 'undefined') return;

    const checkupDateInput = document.getElementById('checkupDate');
    const nextCheckupInput = document.getElementById('checkupNextCheckup');

    if (flatpickrCheckupDate) flatpickrCheckupDate.destroy();
    if (flatpickrCheckupNextCheckup) flatpickrCheckupNextCheckup.destroy();

    if (checkupDateInput) {
        flatpickrCheckupDate = flatpickr(checkupDateInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            maxDate: 'today',
            disableMobile: true
        });
    }

    // ✅ Checkup Next Checkup — min tomorrow
    if (nextCheckupInput) {
        flatpickrCheckupNextCheckup = flatpickr(nextCheckupInput, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            minDate: 'tomorrow',
            disableMobile: true,
            onChange: function(selectedDates, dateStr, instance) {
                if (!selectedDates || !selectedDates.length) return;
                const pickedDate = selectedDates[0];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const pickedMidnight = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate());
                if (pickedMidnight.getTime() <= today.getTime()) {
                    if (typeof showToast === 'function') {
                        showToast('Next Checkup must be tomorrow or later.', 'error');
                    }
                    instance.clear();
                }
            }
        });
    }
}

// ========================================
// ADD PRENATAL BUTTON
// ========================================
function initAddPrenatalButton() {
    if (!addPrenatalBtn) return;

    addPrenatalBtn.addEventListener('click', function() {
        populatePrenatalResidents();
        addPrenatalForm.reset();

        setTimeout(function() {
            initFlatpickrAdd();
        }, 50);

        const submitBtn = addPrenatalForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Save Prenatal Record';
        submitBtn.disabled = false;
        openModal(addPrenatalModal);
    });
}

// ========================================
// POPULATE PRENATAL RESIDENTS DROPDOWN
// ========================================
function populatePrenatalResidents() {
    const select = document.getElementById('prenatalResident');
    if (!select) return;
    select.innerHTML = '<option value="">Select pregnant woman...</option>';

    const pregnantWomen = residents.filter(function(r) {
        return r.sex === 'Female' && r.pregnancy_status === 'Pregnant';
    });

    const eligible = pregnantWomen.filter(function(r) {
        const hasActiveRecord = prenatalRecords.some(function(p) {
            return p.residentId === r.id && p.status === 'Active';
        });
        return !hasActiveRecord;
    });

    if (eligible.length === 0) {
        if (pregnantWomen.length === 0) {
            select.innerHTML = '<option value="">No pregnant women registered</option>';
            if (typeof showToast === 'function') {
                showToast('No pregnant women found. Mark a woman as Pregnant in the Pregnancy Status page first.', 'info');
            }
        } else {
            select.innerHTML = '<option value="">All pregnant women already have an active prenatal record</option>';
            if (typeof showToast === 'function') {
                showToast('All pregnant women already have an Active prenatal record. Edit the existing record instead.', 'info');
            }
        }
    } else {
        eligible.forEach(function(r) {
            const option = document.createElement('option');
            option.value = r.id;
            option.textContent = r.fullName + ' (' + (r.age_display || r.age) + ', ' + r.purok + ')';
            select.appendChild(option);
        });
    }
}

// ========================================
// POPULATE EDIT PRENATAL RESIDENTS
// ========================================
function populateEditPrenatalResidents(selectedId) {
    const select = document.getElementById('editPrenatalResident');
    if (!select) return;
    select.innerHTML = '<option value="">Select resident...</option>';

    const eligible = residents.filter(function(r) {
        if (r.sex !== 'Female') return false;
        if (selectedId && r.id == selectedId) return true;

        if (r.pregnancy_status === 'Pregnant') {
            const hasActiveRecord = prenatalRecords.some(function(p) {
                return p.residentId === r.id && p.status === 'Active';
            });
            return !hasActiveRecord;
        }
        return false;
    });

    if (eligible.length === 0) {
        select.innerHTML = '<option value="">No eligible women</option>';
    } else {
        eligible.forEach(function(r) {
            const option = document.createElement('option');
            option.value = r.id;
            if (selectedId && selectedId == r.id) option.selected = true;
            option.textContent = r.fullName + ' (' + (r.age_display || r.age) + ', ' + r.purok + ')';
            select.appendChild(option);
        });
    }
}

// ========================================
// AUTO-CALCULATE GESTATIONAL AGE (legacy hook)
// ========================================
function initPrenatalLmpCalculation() {
    initFlatpickrAdd();
}

// ========================================
// PRENATAL FORM SUBMIT
// ========================================
function initAddPrenatalForm() {
    if (!addPrenatalForm) return;

    addPrenatalForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const residentId = parseInt(document.getElementById('prenatalResident').value);

        const lmp = getYMDfromDisplay(document.getElementById('prenatalLmp'));
        const dueDate = getYMDfromDisplay(document.getElementById('prenatalDueDate'));
        const nextCheckupDisplay = document.getElementById('prenatalNextCheckup').value;
        const nextCheckup = getYMDfromDisplay(document.getElementById('prenatalNextCheckup'));

        const gestationalAge = document.getElementById('prenatalGestationalAge').value || 0;
        const status = document.getElementById('prenatalStatus').value;
        const milestoneNotes = document.getElementById('prenatalMilestoneNotes').value;

        const bloodPressure = document.getElementById('prenatalBP') ? document.getElementById('prenatalBP').value.trim() : '';
        const weight = document.getElementById('prenatalWeight') ? document.getElementById('prenatalWeight').value : '';
        const heartPulse = document.getElementById('prenatalHeartPulse') ? document.getElementById('prenatalHeartPulse').value : '';
        const bodyTemp = document.getElementById('prenatalBodyTemp') ? document.getElementById('prenatalBodyTemp').value : '';
        const respRate = document.getElementById('prenatalRespRate') ? document.getElementById('prenatalRespRate').value : '';

        if (!residentId) {
            showToast('Please select a resident.', 'error');
            return;
        }
        if (!lmp) {
            showToast('Please enter a valid LMP date (dd/mm/yyyy).', 'error');
            document.getElementById('prenatalLmp').focus();
            return;
        }
        if (!dueDate) {
            showToast('Due date missing. Please re-pick the LMP date.', 'error');
            return;
        }

        // Validate LMP window
        const parsed = parseYMD(lmp);
        if (!parsed) {
            showToast('Invalid LMP date.', 'error');
            return;
        }

        const lmpSerial = toSerialDay(parsed.y, parsed.m, parsed.d);
        const todaySerial = getTodaySerial();
        const diffDays = todaySerial - lmpSerial;

        if (diffDays < 0) {
            showToast('LMP cannot be in the future.', 'error');
            return;
        }
        if (diffDays > LMP_MAX_DAYS_BACK) {
            showToast('LMP is too old (' + diffDays + ' days ago, max is 280 days).', 'error');
            return;
        }

        // ✅ Validate Next Checkup
        if (nextCheckupDisplay) {
            const check = validateNextCheckup(nextCheckup);
            if (!check.valid) {
                showToast(check.message, 'error');
                document.getElementById('prenatalNextCheckup').focus();
                return;
            }
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const prenatalData = {
            resident_id: residentId,
            lmp: lmp,
            due_date: dueDate,
            gestational_age: gestationalAge,
            status: status,
            next_checkup: nextCheckup || '',
            milestone_notes: milestoneNotes || '',
            blood_pressure: bloodPressure || '',
            weight: weight || '',
            heart_pulse: heartPulse || '',
            body_temperature: bodyTemp || '',
            respiratory_rate: respRate || ''
        };

        fetch('ajax/add_prenatal.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(prenatalData).toString()
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('Prenatal record added successfully!', 'success');
                closeModal(addPrenatalModal);
                addPrenatalForm.reset();

                if (flatpickrAddLmp) flatpickrAddLmp.clear();
                if (flatpickrAddDue) flatpickrAddDue.clear();
                if (flatpickrAddNextCheckup) flatpickrAddNextCheckup.clear();

                submitBtn.textContent = 'Save Prenatal Record';
                submitBtn.disabled = false;
                fetchAllRecords();
            } else {
                showToast(data.message || 'Failed to add prenatal record.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Prenatal Record';
            }
        })
        .catch(function() {
            showToast('Error connecting to server.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Prenatal Record';
        });
    });
}

// ========================================
// EDIT PRENATAL RECORD
// ========================================
function editPrenatalRecord(recordId) {
    const record = prenatalRecords.find(function(r) { return r.id === recordId; });
    if (!record) {
        showToast('Record not found.', 'error');
        return;
    }

    const editIdEl = document.getElementById('editPrenatalId');
    const editResidentEl = document.getElementById('editPrenatalResident');
    const editLmpEl = document.getElementById('editPrenatalLmp');
    const editDueDateEl = document.getElementById('editPrenatalDueDate');
    const editGestAgeEl = document.getElementById('editPrenatalGestationalAge');
    const editStatusEl = document.getElementById('editPrenatalStatus');
    const editMilestoneEl = document.getElementById('editPrenatalMilestoneNotes');
    const editNextCheckupEl = document.getElementById('editPrenatalNextCheckup');

    if (!editIdEl || !editResidentEl || !editLmpEl || !editDueDateEl || !editGestAgeEl || !editStatusEl) return;

    editIdEl.value = record.id;
    editResidentEl.value = record.residentId || '';
    editGestAgeEl.value = record.gestationalAge || '';
    editStatusEl.value = record.status || 'Active';
    if (editMilestoneEl) editMilestoneEl.value = record.milestoneNotes || '';

    const lmpYMD = record.lmp || '';
    const dueYMD = record.dueDate || '';
    const nextCheckupYMD = record.nextCheckup || '';

    editLmpEl.value = ymdToDisplay(lmpYMD);
    editDueDateEl.value = ymdToDisplay(dueYMD);
    if (editNextCheckupEl) editNextCheckupEl.value = ymdToDisplay(nextCheckupYMD);

    populateEditPrenatalResidents(record.residentId);

    if (editPrenatalModal) openModal(editPrenatalModal);

    setTimeout(function() {
        initFlatpickrEdit();

        if (flatpickrEditLmp && lmpYMD) flatpickrEditLmp.setDate(lmpYMD, false);
        if (flatpickrEditDue && dueYMD) flatpickrEditDue.setDate(dueYMD, false);
        if (flatpickrEditNextCheckup && nextCheckupYMD) flatpickrEditNextCheckup.setDate(nextCheckupYMD, false);

        editLmpEl.value = ymdToDisplay(lmpYMD);
        editDueDateEl.value = ymdToDisplay(dueYMD);
        if (editNextCheckupEl) editNextCheckupEl.value = ymdToDisplay(nextCheckupYMD);
    }, 100);
}

// ========================================
// RENDER PRENATAL RECORDS
// ========================================
function renderPrenatal() {
    const tbody = document.getElementById('prenatalTableBody');
    const resultsCount = document.getElementById('prenatalResults');
    const searchTerm = document.getElementById('prenatalSearch') ? document.getElementById('prenatalSearch').value.toLowerCase().trim() : '';
    const statusFilter = document.getElementById('prenatalStatusFilter') ? document.getElementById('prenatalStatusFilter').value : '';

    if (!tbody) return;

    let filtered = [...prenatalRecords];

    if (searchTerm) {
        filtered = filtered.filter(function(r) {
            return r.residentName.toLowerCase().includes(searchTerm);
        });
    }

    if (statusFilter) {
        filtered = filtered.filter(function(r) {
            return r.status === statusFilter;
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-state">
                    <i class="fas fa-baby-carriage"></i>
                    <span>No prenatal records found</span>
                    <p class="empty-sub">Track pregnant women to ensure proper maternal care.</p>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = filtered.map(function(r) {
            const statusClass = r.status.toLowerCase();
            const milestonePreview = r.milestoneNotes ?
                (r.milestoneNotes.length > 40 ? r.milestoneNotes.substring(0, 40) + '...' : r.milestoneNotes) :
                '—';

            const deliveryInfo = r.status === 'Delivered' && r.deliveryDate ?
                ' (Delivered: ' + r.deliveryDate + ')' : '';

            const checkupCount = r.checkupCount || 0;
            const checkupBadge = checkupCount > 0 ?
                `<span class="status-badge active" style="font-size:0.7rem;">${checkupCount} checkup${checkupCount > 1 ? 's' : ''}</span>` : '—';

            return `
                <tr>
                    <td><strong>${r.residentName}</strong></td>
                    <td>${r.lmp}</td>
                    <td>${r.dueDate}</td>
                    <td>${r.gestationalAge} weeks</td>
                    <td><span class="status-badge ${statusClass}">${r.status}${deliveryInfo}</span></td>
                    <td>${checkupBadge}</td>
                    <td><span title="${r.milestoneNotes || ''}" style="cursor:help;">${milestonePreview}</span></td>
                    <td>${r.nextCheckup || '—'}</td>
                    <td>
                        <button class="btn btn-outline btn-sm view-prenatal" data-id="${r.id}">View</button>
                        <button class="btn btn-primary btn-sm add-checkup" data-id="${r.id}">
                            <i class="fas fa-plus"></i> Checkup
                        </button>
                    </td>
                    <td>
                        <button class="btn btn-outline btn-sm edit-prenatal" data-id="${r.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${r.status === 'Active' ?
                            `<button class="btn btn-success btn-sm mark-delivered" data-id="${r.id}">
                                <i class="fas fa-check"></i>
                            </button>` :
                            `<button class="btn btn-warning btn-sm reactivate-prenatal" data-id="${r.id}">
                                <i class="fas fa-undo"></i>
                            </button>`
                        }
                        <button class="btn btn-danger btn-sm delete-prenatal" data-id="${r.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    if (resultsCount) resultsCount.textContent = filtered.length + ' records';

    document.querySelectorAll('.view-prenatal').forEach(function(btn) {
        btn.addEventListener('click', function() {
            viewPrenatalRecord(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('.add-checkup').forEach(function(btn) {
        btn.addEventListener('click', function() {
            openAddCheckupModal(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('.edit-prenatal').forEach(function(btn) {
        btn.addEventListener('click', function() {
            editPrenatalRecord(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('.mark-delivered').forEach(function(btn) {
        btn.addEventListener('click', function() {
            markPrenatalDelivered(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('.reactivate-prenatal').forEach(function(btn) {
        btn.addEventListener('click', function() {
            reactivatePrenatal(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('.delete-prenatal').forEach(function(btn) {
        btn.addEventListener('click', function() {
            deletePrenatalRecord(parseInt(this.dataset.id));
        });
    });
}

// ========================================
// VIEW PRENATAL RECORD
// ========================================
function viewPrenatalRecord(recordId) {
    const record = prenatalRecords.find(function(r) { return r.id === recordId; });
    if (!record) {
        showToast('Record not found.', 'error');
        return;
    }

    const statusClass = record.status.toLowerCase();
    const deliveryInfo = record.status === 'Delivered' && record.deliveryDate ?
        'Delivered on: ' + record.deliveryDate : '';

    const content = document.getElementById('residentDetailContent');
    if (content) {
        content.innerHTML = `
            <div style="text-align:center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
                <p style="margin-top: 12px; color: var(--gray);">Loading checkup history...</p>
            </div>
        `;
    }
    openModal(viewResidentModal);

    fetch('ajax/get_prenatal_checkups.php?prenatal_id=' + recordId)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            const checkups = (data.success && data.checkups) ? data.checkups : [];

            let checkupTable = '';
            if (checkups.length === 0) {
                checkupTable = '<p class="detail-empty">No checkups recorded yet.</p>';
            } else {
                checkupTable = `
                    <div class="table-responsive">
                        <table class="records-table" style="font-size: 0.8rem;">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>BP</th>
                                    <th>Weight</th>
                                    <th>Pulse</th>
                                    <th>Temp</th>
                                    <th>Resp</th>
                                    <th>Next Checkup</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${checkups.map(function(c, i) {
                                    return `
                                        <tr>
                                            <td><strong>#${checkups.length - i}</strong></td>
                                            <td>${c.checkup_date}</td>
                                            <td>${c.blood_pressure || '—'}</td>
                                            <td>${c.weight ? c.weight + ' kg' : '—'}</td>
                                            <td>${c.heart_pulse ? c.heart_pulse + ' bpm' : '—'}</td>
                                            <td>${c.body_temperature ? c.body_temperature + '°C' : '—'}</td>
                                            <td>${c.respiratory_rate ? c.respiratory_rate + '/min' : '—'}</td>
                                            <td>${c.next_checkup || '—'}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            const html = `
                <div class="resident-detail">
                    <div class="detail-header">
                        <div class="detail-avatar">
                            <i class="fas fa-baby-carriage"></i>
                        </div>
                        <div class="detail-name">
                            <h2>${record.residentName}</h2>
                            <span class="detail-type status-badge ${statusClass}">${record.status}</span>
                            ${deliveryInfo ? `<span style="margin-left:8px;font-size:0.8rem;color:var(--gray);">${deliveryInfo}</span>` : ''}
                        </div>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">LMP</span>
                            <span class="detail-value">${record.lmp}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Due Date</span>
                            <span class="detail-value">${record.dueDate}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Gestational Age</span>
                            <span class="detail-value">${record.gestationalAge} weeks</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Next Checkup</span>
                            <span class="detail-value">${record.nextCheckup || '—'}</span>
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4><i class="fas fa-history"></i> Checkup History (${checkups.length})</h4>
                        ${checkupTable}
                    </div>
                    ${record.milestoneNotes ? `
                        <div class="detail-section">
                            <h4><i class="fas fa-flag-checkered"></i> Latest Milestone Notes</h4>
                            <p class="detail-medical">${record.milestoneNotes}</p>
                        </div>
                    ` : ''}
                </div>
            `;

            if (content) content.innerHTML = html;
        })
        .catch(function() {
            if (content) {
                content.innerHTML = '<p style="text-align:center; padding:20px;">Failed to load checkups.</p>';
            }
        });
}

// ========================================
// OPEN ADD CHECKUP MODAL
// ========================================
function openAddCheckupModal(prenatalId) {
    const record = prenatalRecords.find(function(r) { return r.id === prenatalId; });
    if (!record) {
        showToast('Prenatal record not found.', 'error');
        return;
    }

    document.getElementById('checkupPrenatalId').value = prenatalId;
    document.getElementById('checkupResidentName').textContent = record.residentName;

    document.getElementById('checkupDate').value = '';
    document.getElementById('checkupBP').value = '';
    document.getElementById('checkupWeight').value = '';
    document.getElementById('checkupHeartPulse').value = '';
    document.getElementById('checkupBodyTemp').value = '';
    document.getElementById('checkupRespRate').value = '';
    document.getElementById('checkupMilestoneNotes').value = '';
    document.getElementById('checkupNextCheckup').value = '';

    openModal(addCheckupModal);

    setTimeout(function() {
        initFlatpickrCheckup();

        // Default checkup date = today
        const checkupDateEl = document.getElementById('checkupDate');
        if (checkupDateEl) {
            checkupDateEl.value = ymdToDisplay(getTodayYMD());
            if (flatpickrCheckupDate) flatpickrCheckupDate.setDate(getTodayYMD(), false);
            checkupDateEl.value = ymdToDisplay(getTodayYMD());
        }
    }, 100);
}

// ========================================
// CHECKUP FORM SUBMIT
// ========================================
function initAddCheckupForm() {
    const checkupForm = document.getElementById('addCheckupForm');
    if (!checkupForm) return;

    checkupForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const prenatalId = parseInt(document.getElementById('checkupPrenatalId').value);
        const checkupDate = getYMDfromDisplay(document.getElementById('checkupDate'));
        const nextCheckupDisplay = document.getElementById('checkupNextCheckup').value;
        const nextCheckup = getYMDfromDisplay(document.getElementById('checkupNextCheckup'));

        const bp = document.getElementById('checkupBP').value.trim();
        const weight = document.getElementById('checkupWeight').value;
        const heartPulse = document.getElementById('checkupHeartPulse').value;
        const bodyTemp = document.getElementById('checkupBodyTemp').value;
        const respRate = document.getElementById('checkupRespRate').value;
        const milestoneNotes = document.getElementById('checkupMilestoneNotes').value;

        if (!prenatalId || !checkupDate) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        // ✅ Validate Next Checkup
        if (nextCheckupDisplay) {
            const check = validateNextCheckup(nextCheckup);
            if (!check.valid) {
                showToast(check.message, 'error');
                document.getElementById('checkupNextCheckup').focus();
                return;
            }
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const data = new URLSearchParams({
            prenatal_id: prenatalId,
            checkup_date: checkupDate,
            blood_pressure: bp || '',
            weight: weight || '',
            heart_pulse: heartPulse || '',
            body_temperature: bodyTemp || '',
            respiratory_rate: respRate || '',
            milestone_notes: milestoneNotes || '',
            next_checkup: nextCheckup || ''
        }).toString();

        fetch('ajax/add_prenatal_checkup.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: data
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('Checkup recorded successfully!', 'success');
                closeModal(addCheckupModal);
                checkupForm.reset();
                submitBtn.textContent = 'Save Checkup';
                submitBtn.disabled = false;
                fetchAllRecords();
            } else {
                showToast(data.message || 'Failed to save checkup.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Checkup';
            }
        })
        .catch(function() {
            showToast('Error connecting to server.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Checkup';
        });
    });
}

// ========================================
// MARK PRENATAL DELIVERED
// ========================================
function markPrenatalDelivered(recordId) {
    const record = prenatalRecords.find(function(r) { return r.id === recordId; });
    if (!record) {
        showToast('Record not found.', 'error');
        return;
    }

    const today = getTodayYMD();
    const deliveryDate = prompt('Enter delivery date (YYYY-MM-DD):', today);
    if (!deliveryDate) return;

    if (!confirm('⚠️ Mark this pregnancy as Delivered?\n\nResident: ' + record.residentName + '\nDelivery Date: ' + deliveryDate + '\n\nThis will change the status to "Delivered".')) {
        return;
    }

    fetch('ajax/mark_delivered.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            id: recordId,
            delivery_date: deliveryDate
        }).toString()
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            showToast(data.message || 'Marked as delivered successfully!', 'success');
            fetchAllRecords();
        } else {
            showToast(data.message || 'Failed to mark as delivered.', 'error');
        }
    })
    .catch(function() {
        showToast('Error connecting to server.', 'error');
    });
}

// ========================================
// REACTIVATE PRENATAL
// ========================================
function reactivatePrenatal(recordId) {
    const record = prenatalRecords.find(function(r) { return r.id === recordId; });
    if (!record) {
        showToast('Record not found.', 'error');
        return;
    }

    if (!confirm('⚠️ Reactivate this prenatal record?\n\nResident: ' + record.residentName + '\n\nThis will change the status back to "Active".')) {
        return;
    }

    fetch('ajax/reactivate_prenatal.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'id=' + recordId
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            showToast(data.message || 'Record reactivated successfully!', 'success');
            fetchAllRecords();
        } else {
            showToast(data.message || 'Failed to reactivate record.', 'error');
        }
    })
    .catch(function() {
        showToast('Error connecting to server.', 'error');
    });
}

// ========================================
// DELETE PRENATAL RECORD
// ========================================
function deletePrenatalRecord(recordId) {
    if (!confirm('⚠️ Are you sure you want to delete this prenatal record?\n\nThis will also delete all checkup history.')) {
        return;
    }

    fetch('ajax/delete_prenatal.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'id=' + recordId
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            showToast('Prenatal record deleted successfully!', 'success');
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
// EDIT PRENATAL FORM SUBMIT
// ========================================
function initEditPrenatalForm() {
    const editPrenatalForm = document.getElementById('editPrenatalForm');
    if (!editPrenatalForm) return;

    editPrenatalForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const id = document.getElementById('editPrenatalId').value;
        const residentId = parseInt(document.getElementById('editPrenatalResident').value);

        const lmp = getYMDfromDisplay(document.getElementById('editPrenatalLmp'));
        const dueDate = getYMDfromDisplay(document.getElementById('editPrenatalDueDate'));
        const nextCheckupDisplay = document.getElementById('editPrenatalNextCheckup') ? document.getElementById('editPrenatalNextCheckup').value : '';
        const nextCheckup = document.getElementById('editPrenatalNextCheckup') ? getYMDfromDisplay(document.getElementById('editPrenatalNextCheckup')) : '';

        const gestationalAge = document.getElementById('editPrenatalGestationalAge').value || 0;
        const status = document.getElementById('editPrenatalStatus').value;
        const milestoneNotes = document.getElementById('editPrenatalMilestoneNotes') ? document.getElementById('editPrenatalMilestoneNotes').value : '';

        if (!residentId) {
            showToast('Please select a resident.', 'error');
            return;
        }
        if (!lmp) {
            showToast('Please enter a valid LMP date (dd/mm/yyyy).', 'error');
            document.getElementById('editPrenatalLmp').focus();
            return;
        }
        if (!dueDate) {
            showToast('Due date missing. Please re-pick the LMP date.', 'error');
            return;
        }

        const parsed = parseYMD(lmp);
        if (!parsed) {
            showToast('Invalid LMP date.', 'error');
            return;
        }

        const lmpSerial = toSerialDay(parsed.y, parsed.m, parsed.d);
        const todaySerial = getTodaySerial();
        const diffDays = todaySerial - lmpSerial;

        if (diffDays < 0) {
            showToast('LMP cannot be in the future.', 'error');
            return;
        }
        if (diffDays > LMP_MAX_DAYS_BACK) {
            showToast('LMP is too old (' + diffDays + ' days ago, max is 280 days).', 'error');
            return;
        }

        // ✅ Validate Next Checkup
        if (nextCheckupDisplay) {
            const check = validateNextCheckup(nextCheckup);
            if (!check.valid) {
                showToast(check.message, 'error');
                document.getElementById('editPrenatalNextCheckup').focus();
                return;
            }
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        const data = new URLSearchParams({
            id: id,
            resident_id: residentId,
            lmp: lmp,
            due_date: dueDate,
            gestational_age: gestationalAge,
            status: status,
            milestone_notes: milestoneNotes || '',
            next_checkup: nextCheckup || ''
        }).toString();

        fetch('ajax/update_prenatal.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: data
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('Prenatal record updated successfully!', 'success');
                closeModal(editPrenatalModal);
                fetchAllRecords();
            } else {
                showToast(data.message || 'Update failed.', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Prenatal Record';
        })
        .catch(function() {
            showToast('Error connecting to server.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Prenatal Record';
        });
    });
}
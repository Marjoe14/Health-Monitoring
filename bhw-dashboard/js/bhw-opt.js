// ========================================
// BHW OPT - Operation Timbang Records
// ✅ Auto nutritional status (readonly)
// ✅ Strict past-date input via flatpickr (dd/mm/yyyy)
// ========================================

// Flatpickr instances
let flatpickrOptDate = null;
let flatpickrEditOptDate = null;

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

// 5 years ago = min allowed date (for realistic children's records)
function getOptMinDate() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

/**
 * Validate OPT date — must be in the past (or today), not more than 5 years ago
 */
function validateOptDate(ymd) {
    if (!ymd) {
        return { valid: false, message: 'Please select a date.' };
    }
    const parts = ymd.split('-');
    if (parts.length !== 3) {
        return { valid: false, message: 'Invalid date format.' };
    }
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) {
        return { valid: false, message: 'Invalid date.' };
    }

    const test = new Date(y, m - 1, d);
    if (test.getFullYear() !== y || test.getMonth() !== m - 1 || test.getDate() !== d) {
        return { valid: false, message: 'Invalid date.' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(y, m - 1, d);
    picked.setHours(0, 0, 0, 0);

    // Future
    if (picked.getTime() > today.getTime()) {
        return { valid: false, message: 'Date cannot be in the future.' };
    }

    // Too old (more than 5 years)
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 5);
    minDate.setHours(0, 0, 0, 0);
    if (picked.getTime() < minDate.getTime()) {
        return { valid: false, message: 'Date is too old (more than 5 years ago).' };
    }

    return { valid: true };
}

// ========================================
// FLATPICKR INIT — ADD OPT
// ========================================
function initFlatpickrOptDate() {
    if (typeof flatpickr === 'undefined') return;

    const input = document.getElementById('optDate');
    if (!input) return;

    if (flatpickrOptDate) flatpickrOptDate.destroy();

    flatpickrOptDate = flatpickr(input, {
        dateFormat: 'd/m/Y',
        allowInput: true,
        maxDate: 'today',
        minDate: getOptMinDate(),
        disableMobile: true,
        onChange: function(selectedDates, dateStr, instance) {
            if (!selectedDates || !selectedDates.length) return;

            const picked = selectedDates[0];
            const check = validateOptDate(
                picked.getFullYear() + '-' +
                String(picked.getMonth() + 1).padStart(2, '0') + '-' +
                String(picked.getDate()).padStart(2, '0')
            );
            if (!check.valid) {
                if (typeof showToast === 'function') showToast(check.message, 'error');
                instance.clear();
            }
        }
    });
}

// ========================================
// FLATPICKR INIT — EDIT OPT
// ========================================
function initFlatpickrEditOptDate() {
    if (typeof flatpickr === 'undefined') return;

    const input = document.getElementById('editOptDate');
    if (!input) return;

    if (flatpickrEditOptDate) flatpickrEditOptDate.destroy();

    flatpickrEditOptDate = flatpickr(input, {
        dateFormat: 'd/m/Y',
        allowInput: true,
        maxDate: 'today',
        minDate: getOptMinDate(),
        disableMobile: true,
        onChange: function(selectedDates, dateStr, instance) {
            if (!selectedDates || !selectedDates.length) return;

            const picked = selectedDates[0];
            const check = validateOptDate(
                picked.getFullYear() + '-' +
                String(picked.getMonth() + 1).padStart(2, '0') + '-' +
                String(picked.getDate()).padStart(2, '0')
            );
            if (!check.valid) {
                if (typeof showToast === 'function') showToast(check.message, 'error');
                instance.clear();
            }
        }
    });
}

// ========================================
// ADD OPT BUTTON
// ========================================
function initAddOptButton() {
    if (!addOptBtn) return;

    addOptBtn.addEventListener('click', function() {
        populateOptChildren();
        addOptForm.reset();

        // Clear auto-calculated status
        const statusInput = document.getElementById('optNutritionalStatus');
        if (statusInput) statusInput.value = '';

        // Clear preview
        const statusPreview = document.querySelector('.opt-status-preview');
        if (statusPreview) statusPreview.style.display = 'none';

        const submitBtn = addOptForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Save OPT Record';
        submitBtn.disabled = false;

        openModal(addOptModal);

        // Init flatpickr after modal is visible
        setTimeout(function() {
            initFlatpickrOptDate();
        }, 50);
    });
}

// ========================================
// POPULATE OPT CHILDREN DROPDOWN
// ========================================
function populateOptChildren() {
    const select = document.getElementById('optChild');
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
        select.innerHTML = '<option value="">No children (0-5 years old)</option>';
        showToast('No children (0-5 years old) found. Please add a child first.', 'info');
    } else {
        children.forEach(function(r) {
            const option = document.createElement('option');
            option.value = r.id;
            const ageDisplay = r.age_display || r.age || 'Unknown age';
            const parentInfo = r.parentName ? ' · Parent: ' + r.parentName : '';
            const purokInfo = r.purok ? ', ' + r.purok : '';
            option.textContent = r.fullName + ' (' + ageDisplay + purokInfo + ')' + parentInfo;
            select.appendChild(option);
        });
    }
}

// ========================================
// CALCULATE OPT NUTRITIONAL STATUS
// ========================================
function calculateOptNutritionalStatus(weight, height, age) {
    if (!weight || !height || !age) return '';

    let ageMonths = 0;
    if (typeof age === 'string') {
        const ageLower = age.toLowerCase();
        if (ageLower.includes('mos') || ageLower.includes('month')) {
            const match = ageLower.match(/(\d+)/);
            if (match) {
                ageMonths = parseInt(match[1]);
            }
        } else if (ageLower.includes('yr') || ageLower.includes('year')) {
            const match = ageLower.match(/(\d+)/);
            if (match) {
                ageMonths = parseInt(match[1]) * 12;
            }
        }
    } else if (typeof age === 'number') {
        ageMonths = age * 12;
    }

    if (ageMonths === 0) ageMonths = 36;

    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);

    let status = 'Normal';

    if (ageMonths <= 12) {
        if (bmi < 13) status = 'Underweight';
        else if (bmi > 18) status = 'Overweight';
        else status = 'Normal';
    } else if (ageMonths <= 24) {
        if (bmi < 14) status = 'Underweight';
        else if (bmi > 19) status = 'Overweight';
        else status = 'Normal';
    } else if (ageMonths <= 36) {
        if (bmi < 14.5) status = 'Underweight';
        else if (bmi > 19.5) status = 'Overweight';
        else status = 'Normal';
    } else if (ageMonths <= 48) {
        if (bmi < 15) status = 'Underweight';
        else if (bmi > 20) status = 'Overweight';
        else status = 'Normal';
    } else if (ageMonths <= 60) {
        if (bmi < 15.5) status = 'Underweight';
        else if (bmi > 20.5) status = 'Overweight';
        else status = 'Normal';
    } else {
        if (bmi < 16) status = 'Underweight';
        else if (bmi > 21) status = 'Overweight';
        else status = 'Normal';
    }

    return status;
}

// ========================================
// UPDATE OPT STATUS PREVIEW
// ========================================
function updateOptStatusPreview() {
    const optStatusPreview = document.querySelector('.opt-status-preview');
    const weight = parseFloat(optWeightInput ? optWeightInput.value : 0);
    const height = parseFloat(optHeightInput ? optHeightInput.value : 0);
    const childId = parseInt(optChildSelect ? optChildSelect.value : 0);

    const statusInput = document.getElementById('optNutritionalStatus');

    if (weight && height && childId) {
        const child = residents.find(function(r) { return r.id === childId; });
        if (child) {
            const childAge = child.age_display || child.age;
            const status = calculateOptNutritionalStatus(weight, height, childAge);

            // ✅ Auto-fill readonly input
            if (statusInput) statusInput.value = status;

            if (optStatusPreview) {
                optStatusPreview.style.display = 'block';

                let color = '';
                let bgColor = '';
                if (status === 'Normal') {
                    color = '#2E7D32';
                    bgColor = '#E8F5E9';
                } else if (status === 'Underweight') {
                    color = '#E65100';
                    bgColor = '#FFF3E0';
                } else if (status === 'Overweight') {
                    color = '#C62828';
                    bgColor = '#FDEDEC';
                }

                optStatusPreview.style.color = color;
                optStatusPreview.style.backgroundColor = bgColor;
                optStatusPreview.style.border = '1px solid ' + color;
                optStatusPreview.innerHTML = '<i class="fas fa-thermometer-half"></i> Nutritional Status: <strong>' + status + '</strong> (auto-calculated)';
            }
        }
    } else {
        if (statusInput) statusInput.value = '';
        if (optStatusPreview) optStatusPreview.style.display = 'none';
    }
}

// ========================================
// INIT OPT STATUS PREVIEW
// ========================================
function initOptStatusPreview() {
    const optStatusPreview = document.createElement('div');
    optStatusPreview.className = 'opt-status-preview';
    optStatusPreview.style.cssText = `
        margin-top: 8px;
        padding: 8px 12px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.85rem;
        display: none;
    `;

    if (optStatusSelect) {
        optStatusSelect.parentNode.appendChild(optStatusPreview);
    }

    if (optWeightInput) {
        optWeightInput.addEventListener('input', updateOptStatusPreview);
    }

    if (optHeightInput) {
        optHeightInput.addEventListener('input', updateOptStatusPreview);
    }

    if (optChildSelect) {
        optChildSelect.addEventListener('change', updateOptStatusPreview);
    }
}

// ========================================
// ADD OPT FORM SUBMIT
// ========================================
function initAddOptForm() {
    if (!addOptForm) return;

    addOptForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const childId = parseInt(document.getElementById('optChild').value);
        const weight = parseFloat(document.getElementById('optWeight').value);
        const height = parseFloat(document.getElementById('optHeight').value);
        const dateYMD = getYMDfromDisplay(document.getElementById('optDate'));

        if (!childId || !weight || !height || !dateYMD) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        // ✅ Strict date validation
        const dateCheck = validateOptDate(dateYMD);
        if (!dateCheck.valid) {
            showToast(dateCheck.message, 'error');
            document.getElementById('optDate').focus();
            return;
        }

        const child = residents.find(function(r) { return r.id === childId; });
        const childAge = child ? (child.age_display || child.age) : 'Unknown';

        const nutritionalStatus = calculateOptNutritionalStatus(weight, height, childAge);

        if (!nutritionalStatus) {
            showToast('Could not calculate nutritional status.', 'error');
            return;
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const optData = {
            child_id: childId,
            weight: weight,
            height: height,
            date: dateYMD,
            nutritional_status: nutritionalStatus,
            notes: document.getElementById('optNotes').value || ''
        };

        fetch('ajax/add_opt.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(optData).toString()
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('OPT record added successfully! Status: ' + nutritionalStatus, 'success');
                closeModal(addOptModal);
                addOptForm.reset();
                if (flatpickrOptDate) flatpickrOptDate.clear();
                const statusInput = document.getElementById('optNutritionalStatus');
                if (statusInput) statusInput.value = '';
                const statusPreview = document.querySelector('.opt-status-preview');
                if (statusPreview) statusPreview.style.display = 'none';
                submitBtn.textContent = 'Save OPT Record';
                submitBtn.disabled = false;
                fetchAllRecords();
            } else {
                showToast(data.message || 'Failed to add OPT record.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save OPT Record';
            }
        })
        .catch(function() {
            showToast('Error connecting to server.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save OPT Record';
        });
    });
}

// ========================================
// EDIT OPT RECORD
// ========================================
function editOptRecord(recordId) {
    const record = optRecords.find(function(r) { return r.id === recordId; });
    if (!record) {
        showToast('Record not found.', 'error');
        return;
    }

    document.getElementById('editOptId').value = record.id;
    document.getElementById('editOptChild').value = record.residentId || '';
    document.getElementById('editOptWeight').value = record.weight || '';
    document.getElementById('editOptHeight').value = record.height || '';
    document.getElementById('editOptNutritionalStatus').value = record.nutritionalStatus || 'Normal';
    document.getElementById('editOptNotes').value = record.notes || '';

    populateEditOptChildren(record.residentId);

    // Set date
    const editDateEl = document.getElementById('editOptDate');
    const dateYMD = record.date && record.date !== '—' ? record.date : '';
    if (editDateEl) editDateEl.value = ymdToDisplay(dateYMD);

    openModal(editOptModal);

    // Init flatpickr + setup auto-calculate
    setTimeout(function() {
        initFlatpickrEditOptDate();

        if (flatpickrEditOptDate && dateYMD) {
            flatpickrEditOptDate.setDate(dateYMD, false);
        }
        if (editDateEl) editDateEl.value = ymdToDisplay(dateYMD);

        setupEditOptAutoCalculate();
    }, 100);
}

// ========================================
// POPULATE EDIT OPT CHILDREN
// ========================================
function populateEditOptChildren(selectedId) {
    const select = document.getElementById('editOptChild');
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
        select.innerHTML = '<option value="">No children (0-5 years old)</option>';
    } else {
        children.forEach(function(r) {
            const option = document.createElement('option');
            option.value = r.id;
            if (selectedId && selectedId == r.id) {
                option.selected = true;
            }
            const ageDisplay = r.age_display || r.age || 'Unknown age';
            const parentInfo = r.parentName ? ' · Parent: ' + r.parentName : '';
            const purokInfo = r.purok ? ', ' + r.purok : '';
            option.textContent = r.fullName + ' (' + ageDisplay + purokInfo + ')' + parentInfo;
            select.appendChild(option);
        });
    }
}

// ========================================
// SETUP EDIT OPT AUTO-CALCULATE
// ========================================
function setupEditOptAutoCalculate() {
    const editOptWeight = document.getElementById('editOptWeight');
    const editOptHeight = document.getElementById('editOptHeight');
    const editOptChild = document.getElementById('editOptChild');
    const editOptStatus = document.getElementById('editOptNutritionalStatus');

    const editStatusPreview = document.createElement('div');
    editStatusPreview.className = 'edit-opt-status-preview';
    editStatusPreview.style.cssText = `
        margin-top: 8px;
        padding: 8px 12px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.85rem;
        display: none;
        transition: all 0.3s ease;
    `;

    const existingPreview = document.querySelector('.edit-opt-status-preview');
    if (existingPreview) {
        existingPreview.remove();
    }

    if (editOptStatus) {
        editOptStatus.parentNode.appendChild(editStatusPreview);
    }

    function updateEditOptStatusPreview() {
        const weight = parseFloat(editOptWeight ? editOptWeight.value : 0);
        const height = parseFloat(editOptHeight ? editOptHeight.value : 0);
        const childId = parseInt(editOptChild ? editOptChild.value : 0);

        if (weight && height && childId) {
            const child = residents.find(function(r) { return r.id === childId; });
            if (child) {
                const childAge = child.age_display || child.age;
                const status = calculateOptNutritionalStatus(weight, height, childAge);

                if (editOptStatus) editOptStatus.value = status;

                editStatusPreview.style.display = 'block';

                let color = '';
                let bgColor = '';
                if (status === 'Normal') {
                    color = '#2E7D32';
                    bgColor = '#E8F5E9';
                } else if (status === 'Underweight') {
                    color = '#E65100';
                    bgColor = '#FFF3E0';
                } else if (status === 'Overweight') {
                    color = '#C62828';
                    bgColor = '#FDEDEC';
                }

                editStatusPreview.style.color = color;
                editStatusPreview.style.backgroundColor = bgColor;
                editStatusPreview.style.border = '1px solid ' + color;
                editStatusPreview.innerHTML = '<i class="fas fa-thermometer-half"></i> Nutritional Status: <strong>' + status + '</strong> (auto-calculated)';
            }
        } else {
            editStatusPreview.style.display = 'none';
        }
    }

    if (editOptWeight) {
        editOptWeight.addEventListener('input', updateEditOptStatusPreview);
    }

    if (editOptHeight) {
        editOptHeight.addEventListener('input', updateEditOptStatusPreview);
    }

    if (editOptChild) {
        editOptChild.addEventListener('change', function() {
            setTimeout(updateEditOptStatusPreview, 100);
        });
    }

    setTimeout(updateEditOptStatusPreview, 200);
}

// ========================================
// EDIT OPT FORM SUBMIT
// ========================================
function initEditOptForm() {
    if (!editOptForm) return;

    editOptForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const id = document.getElementById('editOptId').value;
        const childId = parseInt(document.getElementById('editOptChild').value);
        const weight = parseFloat(document.getElementById('editOptWeight').value);
        const height = parseFloat(document.getElementById('editOptHeight').value);
        const dateYMD = getYMDfromDisplay(document.getElementById('editOptDate'));

        const nutritionalStatus = document.getElementById('editOptNutritionalStatus').value;
        const notes = document.getElementById('editOptNotes').value;

        if (!childId || !weight || !height || !dateYMD) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        // ✅ Strict date validation
        const dateCheck = validateOptDate(dateYMD);
        if (!dateCheck.valid) {
            showToast(dateCheck.message, 'error');
            document.getElementById('editOptDate').focus();
            return;
        }

        if (!nutritionalStatus) {
            showToast('Please wait for nutritional status to be calculated.', 'error');
            return;
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        const data = new URLSearchParams({
            id: id,
            child_id: childId,
            weight: weight,
            height: height,
            date: dateYMD,
            nutritional_status: nutritionalStatus,
            notes: notes || ''
        }).toString();

        fetch('ajax/update_opt.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: data
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('OPT record updated successfully! Status: ' + nutritionalStatus, 'success');
                closeModal(editOptModal);
                const preview = document.querySelector('.edit-opt-status-preview');
                if (preview) preview.remove();
                fetchAllRecords();
            } else {
                showToast(data.message || 'Update failed.', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update OPT Record';
        })
        .catch(function() {
            showToast('Error connecting to server.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update OPT Record';
        });
    });
}

// ========================================
// DELETE OPT RECORD
// ========================================
function deleteOptRecord(recordId) {
    if (!confirm('⚠️ Are you sure you want to delete this OPT record?\n\nThis action cannot be undone.')) {
        return;
    }

    fetch('ajax/delete_opt.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'id=' + recordId
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            showToast('OPT record deleted successfully!', 'success');
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
// RENDER OPT RECORDS
// ========================================
function renderOpt() {
    const tbody = document.getElementById('optTableBody');
    const resultsCount = document.getElementById('optResults');
    const searchTerm = document.getElementById('optSearch') ? document.getElementById('optSearch').value.toLowerCase().trim() : '';
    const statusFilter = document.getElementById('optStatusFilter') ? document.getElementById('optStatusFilter').value : '';

    if (!tbody) return;

    let filtered = [...optRecords];

    if (searchTerm) {
        filtered = filtered.filter(function(r) {
            return r.childName.toLowerCase().includes(searchTerm);
        });
    }

    if (statusFilter) {
        filtered = filtered.filter(function(r) {
            return r.nutritionalStatus === statusFilter;
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-child"></i>
                    <span>No OPT records found</span>
                    <p class="empty-sub">${optRecords.length === 0 ? 'Monitor children\'s growth through regular weighing.' : 'Try adjusting your search filters.'}</p>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = filtered.map(function(r) {
            const statusClass = r.nutritionalStatus.toLowerCase();

            let ageDisplay = r.childAge || '—';

            if (ageDisplay !== '—' && !isNaN(ageDisplay)) {
                const num = parseInt(ageDisplay);
                if (num < 1) {
                    ageDisplay = num + ' mos';
                } else {
                    ageDisplay = num + ' yr' + (num > 1 ? 's' : '');
                }
            }

            return `
                <tr>
                    <td>${r.childName}</td>
                    <td>${ageDisplay}</td>
                    <td>${r.parentName}</td>
                    <td>${r.date}</td>
                    <td>${r.weight}</td>
                    <td>${r.height || '—'}</td>
                    <td><span class="status-badge ${statusClass}">${r.nutritionalStatus}</span></td>
                    <td>
                        <button class="btn btn-outline btn-sm edit-opt" data-id="${r.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                    <td>
                        <button class="btn btn-danger btn-sm delete-opt" data-id="${r.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    if (resultsCount) resultsCount.textContent = filtered.length + ' records';

    document.querySelectorAll('.edit-opt').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            editOptRecord(id);
        });
    });

    document.querySelectorAll('.delete-opt').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            deleteOptRecord(id);
        });
    });
}
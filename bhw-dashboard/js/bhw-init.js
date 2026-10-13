// ========================================
// BHW INIT - Bootstrap, Data Fetching, Dashboard
// ========================================

// ========================================
// MAP RESIDENT RECORD (single source of truth)
// ========================================
function mapResidentRecord(r) {
    let accountStatus = r.account_status || 'No Account';
    return {
        id: r.id,
        firstName: r.first_name || '',
        middleName: r.middle_name || '—',
        lastName: r.last_name || '',
        fullName: (r.first_name || '') + (r.middle_name ? ' ' + r.middle_name : '') + ' ' + (r.last_name || ''),
        dob: r.dob || '',
        age: r.age_years || '—',
        age_display: r.age_display || r.age_years || '—',
        type: r.type || 'Unknown',
        age_months: r.age_months || 0,
        sex: r.sex || '—',
        purok: r.purok || '—',
        address: r.address || '—',
        mobile: r.mobile || '—',
        household: r.household || '—',
        emergencyContact: r.emergency_contact || '—',
        emergencyNumber: r.emergency_number || '—',
        medicalHistory: r.medical_history || '—',
        isMinor: r.age_years < 18,
        parentId: r.parent_id || null,
        parentName: r.parent_name || null,
        parentContact: r.parent_contact || null,
        relationship: r.relationship || null,
        account_status: accountStatus,
        pregnancy_status: r.pregnancy_status || 'Not Pregnant',
        immunization_status: r.immunization_status || 'None',
        children: [],
        createdAt: r.created_at || new Date().toISOString()
    };
}

// ========================================
// UPDATE STATS
// ✅ Does NOT touch notification badge
// ========================================
function updateStats() {
    const totalResidents = residents.length;
    const pregnantCount = residents.filter(function(r) {
        return r.sex === 'Female' && r.pregnancy_status === 'Pregnant';
    }).length;
    const immunizationDue = immunizationRecords.filter(function(r) {
        return r.status === 'Upcoming' || r.status === 'Overdue';
    }).length;
    const todayAppointments = appointments.filter(function(r) {
        return r.date === new Date().toISOString().split('T')[0] && r.status === 'Upcoming';
    }).length;

    const totalResidentsEl = document.getElementById('totalResidents');
    const pregnantEl = document.getElementById('pregnantCount');
    const immunizationEl = document.getElementById('immunizationDue');
    const todayApptsEl = document.getElementById('todayAppointments');
    const residentCountEl = document.getElementById('residentCount');
    const pregBadge = document.getElementById('pregnantCountBadge');

    if (totalResidentsEl) totalResidentsEl.textContent = totalResidents;
    if (pregnantEl) pregnantEl.textContent = pregnantCount;
    if (immunizationEl) immunizationEl.textContent = immunizationDue;
    if (todayApptsEl) todayApptsEl.textContent = todayAppointments;
    if (residentCountEl) residentCountEl.textContent = totalResidents;
    if (pregBadge) pregBadge.textContent = pregnantCount;

    // ⚠️ Do NOT touch bhwNotificationBadge here — it's managed by fetchBhwNotifications()
}

// ========================================
// FETCH DASHBOARD DATA
// ========================================
function fetchDashboardData() {
    fetch('ajax/get_dashboard_data.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                const totalResidentsEl = document.getElementById('totalResidents');
                const pregnantEl = document.getElementById('pregnantCount');
                const immunizationEl = document.getElementById('immunizationDue');
                const todayApptsEl = document.getElementById('todayAppointments');

                if (totalResidentsEl) totalResidentsEl.textContent = data.total_residents || 0;
                if (pregnantEl) pregnantEl.textContent = data.pregnant_count || 0;
                if (immunizationEl) immunizationEl.textContent = data.immunization_due || 0;
                if (todayApptsEl) todayApptsEl.textContent = data.count || 0;

                renderTodayAppointments(data.today_appointments || []);
            }
        })
        .catch(function() { /* silent fail */ });
}

// ========================================
// RENDER TODAY'S APPOINTMENTS
// ========================================
function renderTodayAppointments(appointments) {
    const tbody = document.getElementById('todayAppointmentsBody');
    if (!tbody) return;

    if (!appointments || appointments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <span>No appointments scheduled for today</span>
                    <p class="empty-sub">Schedule appointments to keep track of your visits.</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    appointments.forEach(function(app) {
        const statusClass = app.status ? app.status.toLowerCase() : 'upcoming';
        const timeDisplay = app.appointment_time || '—';

        html += `
            <tr>
                <td>${timeDisplay}</td>
                <td><strong>${app.resident_name || 'Unknown'}</strong></td>
                <td>${app.type || 'General Check-up'}</td>
                <td><span class="status-badge ${statusClass}">${app.status || 'Upcoming'}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary view-today-appointment" data-id="${app.id}">
                        View
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    document.querySelectorAll('.view-today-appointment').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = parseInt(this.dataset.id);
            viewAppointment(id);
        });
    });
}

// ========================================
// FETCH RECENT ACTIVITY LOGS
// ========================================
function fetchRecentActivity() {
    fetch('ajax/get_activity_logs.php?limit=5')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                renderRecentActivity(data.logs);
            }
        })
        .catch(function() { /* silent fail */ });
}

// ========================================
// RENDER RECENT ACTIVITY
// ========================================
function renderRecentActivity(logs) {
    const list = document.querySelector('#page-dashboard .activity-list');
    if (!list) return;

    if (!logs || logs.length === 0) {
        list.innerHTML = `
            <div class="activity-item empty">
                <div class="activity-icon gray">
                    <i class="fas fa-inbox"></i>
                </div>
                <div class="activity-details">
                    <p>No recent activity</p>
                    <span class="activity-time">Start by adding residents and recording health data</span>
                </div>
            </div>
        `;
        return;
    }

    const iconMap = {
        'add_resident': { icon: 'fa-user-plus', color: 'blue' },
        'add_child': { icon: 'fa-child', color: 'green' },
        'update_resident': { icon: 'fa-user-edit', color: 'blue' },
        'delete_resident': { icon: 'fa-user-minus', color: 'red' },
        'create_account': { icon: 'fa-user-shield', color: 'purple' },
        'add_bmi': { icon: 'fa-weight', color: 'purple' },
        'add_prenatal': { icon: 'fa-baby-carriage', color: 'green' },
        'add_checkup': { icon: 'fa-notes-medical', color: 'green' },
        'add_immunization': { icon: 'fa-syringe', color: 'orange' },
        'add_opt': { icon: 'fa-child', color: 'purple' },
        'add_appointment': { icon: 'fa-calendar-plus', color: 'blue' },
        'complete_appointment': { icon: 'fa-check-circle', color: 'green' },
        'approve_cancellation': { icon: 'fa-check', color: 'green' },
        'reject_cancellation': { icon: 'fa-times', color: 'red' },
        'add_vaccine': { icon: 'fa-syringe', color: 'orange' },
        'send_sms': { icon: 'fa-sms', color: 'blue' },
        'update_pregnancy_status': { icon: 'fa-female', color: 'purple' },
        'change_password': { icon: 'fa-key', color: 'blue' },
        'immunization_finished': { icon: 'fa-flag-checkered', color: 'green' }
    };

    let html = '';
    logs.forEach(function(log) {
        const meta = iconMap[log.action_type] || { icon: 'fa-circle', color: 'gray' };
        const timeAgo = getTimeAgo(log.created_at);

        html += `
            <div class="activity-item">
                <div class="activity-icon ${meta.color}">
                    <i class="fas ${meta.icon}"></i>
                </div>
                <div class="activity-details">
                    <p>${log.description}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

// ========================================
// FETCH ALL RECORDS FROM DATABASE
// ========================================
function fetchAllRecords() {
    fetch('ajax/get_residents.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                residents = data.records.map(mapResidentRecord);
                currentId = residents.length + 1;
                updateStats();
                renderResidents();
            }
        })
        .catch(function() { /* silent fail */ });

    fetch('ajax/get_bmi.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                bmiRecords = data.records.map(function(r) {
                    return {
                        id: r.id,
                        residentId: r.resident_id,
                        residentName: r.resident_name || 'Unknown',
                        height: r.height,
                        weight: r.weight,
                        bmi: r.bmi,
                        category: r.category,
                        date: r.date,
                        notes: r.notes || ''
                    };
                });
                renderBmi();
            }
        })
        .catch(function() { /* silent fail */ });

    fetch('ajax/get_prenatal.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                prenatalRecords = data.records.map(function(r) {
                    return {
                        id: r.id,
                        residentId: r.residentId,
                        residentName: r.residentName || 'Unknown',
                        lmp: r.lmp || '—',
                        dueDate: r.dueDate || '—',
                        gestationalAge: r.gestationalAge || 0,
                        status: r.status || 'Active',
                        vitalSigns: r.vitalSigns || '',
                        milestoneNotes: r.milestoneNotes || '',
                        nextCheckup: r.nextCheckup || '',
                        deliveryDate: r.deliveryDate || null,
                        checkupCount: r.checkupCount || 0,
                        createdAt: r.created_at || new Date().toISOString()
                    };
                });
                renderPrenatal();
            }
        })
        .catch(function() { /* silent fail */ });

    fetch('ajax/get_immunization.php')
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
                updateStats();
            }
        })
        .catch(function() { /* silent fail */ });

    fetch('ajax/get_opt.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                optRecords = data.records.map(function(r) {
                    let ageDisplay = r.age_display || r.child_age_display || r.child_age || r.age_years || '—';

                    if (typeof ageDisplay === 'string') {
                        if (ageDisplay.includes('yrs') || ageDisplay.includes('yr')) {
                            const match = ageDisplay.match(/(\d+)/);
                            if (match) {
                                const num = parseInt(match[1]);
                                ageDisplay = num + ' yr' + (num > 1 ? 's' : '');
                            }
                        }
                    }

                    return {
                        id: r.id,
                        residentId: r.resident_id,
                        childName: r.child_name || 'Unknown',
                        childAge: ageDisplay,
                        parentName: r.parent_name || '—',
                        date: r.date || '—',
                        weight: r.weight || '—',
                        height: r.height || '—',
                        nutritionalStatus: r.nutritional_status || 'Normal',
                        notes: r.notes || ''
                    };
                });
                renderOpt();
            }
        })
        .catch(function() { /* silent fail */ });

    fetch('ajax/get_appointments.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                appointments = data.records.map(function(r) {
                    return {
                        id: r.id,
                        residentId: r.resident_id,
                        residentName: r.resident_name || 'Unknown',
                        date: r.date || '—',
                        time: r.time || '—',
                        type: r.type || 'General Check-up',
                        location: r.location || 'Barangay Health Center',
                        status: r.status || 'Upcoming',
                        notes: r.notes || '',
                        scheduledBy: r.scheduled_by || null,
                        createdAt: r.created_at || new Date().toISOString(),
                        cancellation_requested: r.cancellation_requested || false,
                        cancellation_reason: r.cancellation_reason || '',
                        cancellation_notes: r.cancellation_notes || '',
                        cancellation_status: r.cancellation_status || '',
                        cancellation_requested_at: r.cancellation_requested_at || null,
                        cancellation_approved_at: r.cancellation_approved_at || null
                    };
                });
                renderAppointments();
            }
        })
        .catch(function() { /* silent fail */ });
}

// ========================================
// LOAD PHP RESIDENTS INTO STATE
// ========================================
function loadPhpResidents() {
    if (typeof phpResidents !== 'undefined' && phpResidents.length > 0) {
        residents = phpResidents.map(mapResidentRecord);
        currentId = residents.length + 1;
    }
}

// ========================================
// MAIN INIT
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing BHW Dashboard...');

    // Init UI
    if (typeof initUIEventListeners === 'function') initUIEventListeners();

    // Init navigation
    if (typeof initNavigationEventListeners === 'function') initNavigationEventListeners();

    // Init resident listeners
    if (typeof initAdultAgeCalculation === 'function') initAdultAgeCalculation();
    if (typeof initChildAgeCalculation === 'function') initChildAgeCalculation();
    if (typeof initAddAdultButton === 'function') initAddAdultButton();
    if (typeof initAddAdultForm === 'function') initAddAdultForm();
    if (typeof initAddChildButton === 'function') initAddChildButton();
    if (typeof initParentSearch === 'function') initParentSearch();
    if (typeof initAddChildForm === 'function') initAddChildForm();
    if (typeof initResidentFilterEvents === 'function') initResidentFilterEvents();

    // Init BMI
    if (typeof initAddBmiButton === 'function') initAddBmiButton();
    if (typeof initBmiInputListeners === 'function') initBmiInputListeners();
    if (typeof initBmiFormSubmit === 'function') initBmiFormSubmit();

    // Init Pregnancy Page
    if (typeof initPregnancyPage === 'function') initPregnancyPage();

    // Init Prenatal
    if (typeof initAddPrenatalButton === 'function') initAddPrenatalButton();
    if (typeof initPrenatalLmpCalculation === 'function') initPrenatalLmpCalculation();
    if (typeof initAddPrenatalForm === 'function') initAddPrenatalForm();
    if (typeof initEditPrenatalForm === 'function') initEditPrenatalForm();
    if (typeof initAddCheckupForm === 'function') initAddCheckupForm();

    // Init Immunization
    if (typeof initAddImmunizationButton === 'function') initAddImmunizationButton();
    if (typeof initRecordImmunizationForm === 'function') initRecordImmunizationForm();
    if (typeof initEditImmunizationForm === 'function') initEditImmunizationForm();
    if (typeof initImmunizationFilterEvents === 'function') initImmunizationFilterEvents();

    // Init OPT
    if (typeof initAddOptButton === 'function') initAddOptButton();
    if (typeof initOptStatusPreview === 'function') initOptStatusPreview();
    if (typeof initAddOptForm === 'function') initAddOptForm();
    if (typeof initEditOptForm === 'function') initEditOptForm();

    // Init Appointments
    if (typeof initAddAppointmentButton === 'function') initAddAppointmentButton();
    if (typeof initAddAppointmentForm === 'function') initAddAppointmentForm();
    if (typeof initEditAppointmentForm === 'function') initEditAppointmentForm();
    if (typeof initAppointmentFilterEvents === 'function') initAppointmentFilterEvents();
    if (typeof initCancellationDecisionButtons === 'function') initCancellationDecisionButtons();

    // Init Notifications
    if (typeof initNotificationButtons === 'function') initNotificationButtons();

    // Init SMS
    if (typeof initSmsEventListeners === 'function') initSmsEventListeners();
    if (typeof initSendSmsButton === 'function') initSendSmsButton();

    // Init Change Password (Settings)
    if (typeof initChangePassword === 'function') initChangePassword();

    // Load PHP residents into global state
    loadPhpResidents();

    // Initial renders
    updateStats();
    renderResidents();
    renderBmi();
    renderPrenatal();
    renderImmunization();
    renderOpt();
    renderAppointments();
    renderSmsHistory();
    navigateTo('dashboard');

    // ✅ Update immunization statuses + overdue notifications
    fetch('ajax/update_immunization_status.php')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                console.log('✅ Immunization statuses refreshed. Overdue:', data.overdue_updated, 'Notifs:', data.notifications_created);
            }
        })
        .catch(function() { /* silent fail */ });

    // Fetch all records, then re-render current page
    fetchAllRecordsAndRefresh();

    // Fetch recent activity logs for dashboard
    fetchRecentActivity();

    // ✅ Fetch notifications immediately on page load
    if (typeof fetchBhwNotifications === 'function') {
        fetchBhwNotifications();
    }

    // ✅ Auto-refresh notifications every 30 seconds
    setInterval(function() {
        if (typeof fetchBhwNotifications === 'function') {
            fetchBhwNotifications();
        }
    }, 30000);
});

// ========================================
// FETCH ALL RECORDS - THEN RE-RENDER
// ========================================
function fetchAllRecordsAndRefresh() {
    Promise.all([
        fetch('ajax/get_residents.php').then(function(r) { return r.json(); }),
        fetch('ajax/get_bmi.php').then(function(r) { return r.json(); }),
        fetch('ajax/get_prenatal.php').then(function(r) { return r.json(); }),
        fetch('ajax/get_immunization.php').then(function(r) { return r.json(); }),
        fetch('ajax/get_opt.php').then(function(r) { return r.json(); }),
        fetch('ajax/get_appointments.php').then(function(r) { return r.json(); })
    ])
    .then(function(results) {
        // RESIDENTS
        if (results[0].success) {
            residents = results[0].records.map(mapResidentRecord);
            currentId = residents.length + 1;
            renderResidents();
        }

        // BMI
        if (results[1].success) {
            bmiRecords = results[1].records.map(function(r) {
                return {
                    id: r.id,
                    residentId: r.resident_id,
                    residentName: r.resident_name || 'Unknown',
                    height: r.height,
                    weight: r.weight,
                    bmi: r.bmi,
                    category: r.category,
                    date: r.date,
                    notes: r.notes || ''
                };
            });
            renderBmi();
        }

        // PRENATAL
        if (results[2].success) {
            prenatalRecords = results[2].records.map(function(r) {
                return {
                    id: r.id,
                    residentId: r.residentId,
                    residentName: r.residentName || 'Unknown',
                    lmp: r.lmp || '—',
                    dueDate: r.dueDate || '—',
                    gestationalAge: r.gestationalAge || 0,
                    status: r.status || 'Active',
                    vitalSigns: r.vitalSigns || '',
                    milestoneNotes: r.milestoneNotes || '',
                    nextCheckup: r.nextCheckup || '',
                    deliveryDate: r.deliveryDate || null,
                    checkupCount: r.checkupCount || 0,
                    createdAt: r.created_at || new Date().toISOString()
                };
            });
            renderPrenatal();
        }

        // IMMUNIZATION
        if (results[3].success) {
            immunizationRecords = results[3].records.map(function(r) {
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

        // OPT
        if (results[4].success) {
            optRecords = results[4].records.map(function(r) {
                let ageDisplay = r.age_display || r.child_age_display || r.child_age || r.age_years || '—';
                if (typeof ageDisplay === 'string') {
                    if (ageDisplay.includes('yrs') || ageDisplay.includes('yr')) {
                        const match = ageDisplay.match(/(\d+)/);
                        if (match) {
                            const num = parseInt(match[1]);
                            ageDisplay = num + ' yr' + (num > 1 ? 's' : '');
                        }
                    }
                }
                return {
                    id: r.id,
                    residentId: r.resident_id,
                    childName: r.child_name || 'Unknown',
                    childAge: ageDisplay,
                    parentName: r.parent_name || '—',
                    date: r.date || '—',
                    weight: r.weight || '—',
                    height: r.height || '—',
                    nutritionalStatus: r.nutritional_status || 'Normal',
                    notes: r.notes || ''
                };
            });
            renderOpt();
        }

        // APPOINTMENTS
        if (results[5].success) {
            appointments = results[5].records.map(function(r) {
                return {
                    id: r.id,
                    residentId: r.resident_id,
                    residentName: r.resident_name || 'Unknown',
                    date: r.date || '—',
                    time: r.time || '—',
                    type: r.type || 'General Check-up',
                    location: r.location || 'Barangay Health Center',
                    status: r.status || 'Upcoming',
                    notes: r.notes || '',
                    scheduledBy: r.scheduled_by || null,
                    createdAt: r.created_at || new Date().toISOString(),
                    cancellation_requested: r.cancellation_requested || false,
                    cancellation_reason: r.cancellation_reason || '',
                    cancellation_notes: r.cancellation_notes || '',
                    cancellation_status: r.cancellation_status || '',
                    cancellation_requested_at: r.cancellation_requested_at || null,
                    cancellation_approved_at: r.cancellation_approved_at || null
                };
            });
            renderAppointments();
        }

        updateStats();

        console.log('✅ BHW Dashboard fully initialized');
    })
    .catch(function(error) {
        console.error('❌ Error fetching records:', error);
    });
}
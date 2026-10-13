// ========================================
// BHW SETTINGS - Change Password + Account Deletion
// ========================================

// ========================================
// INIT CHANGE PASSWORD + DELETE ACCOUNT
// ========================================
function initChangePassword() {
    // Open password modal
    document.querySelectorAll('.change-password-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            openChangePasswordModal();
        });
    });

    // Open delete account modal
    document.querySelectorAll('.delete-account-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            openDeleteAccountModal();
        });
    });

    // Close password modal
    document.querySelectorAll('.close-password-modal').forEach(function(btn) {
        btn.addEventListener('click', function() {
            closeModal(document.getElementById('changePasswordModal'));
        });
    });

    // Close delete modal
    document.querySelectorAll('.close-delete-modal').forEach(function(btn) {
        btn.addEventListener('click', function() {
            closeModal(document.getElementById('deleteAccountModal'));
        });
    });

    // Toggle password visibility (both modals)
    document.querySelectorAll('.toggle-password').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            if (input) {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                const icon = this.querySelector('i');
                if (icon) {
                    icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
                }
            }
        });
    });

    // Change password form submit
    const passForm = document.getElementById('changePasswordForm');
    if (passForm) {
        passForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitChangePassword();
        });
    }

    // Delete account form submit
    const delForm = document.getElementById('deleteAccountForm');
    if (delForm) {
        delForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitDeleteAccount();
        });
    }

    // Cancel deletion buttons (banner)
    document.querySelectorAll('.cancel-deletion-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            cancelAccountDeletion();
        });
    });

    // ✅ Check account status on load
    checkAccountStatus();
}

// ========================================
// OPEN CHANGE PASSWORD MODAL
// ========================================
function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (!modal) return;

    const form = document.getElementById('changePasswordForm');
    if (form) form.reset();

    const errorDiv = document.getElementById('changePasswordError');
    if (errorDiv) errorDiv.style.display = 'none';

    ['currentPassword', 'newPassword', 'confirmNewPassword'].forEach(function(id) {
        const input = document.getElementById(id);
        if (input) input.setAttribute('type', 'password');
    });

    document.querySelectorAll('#changePasswordModal .toggle-password i').forEach(function(icon) {
        icon.className = 'fas fa-eye';
    });

    openModal(modal);
}

// ========================================
// SUBMIT CHANGE PASSWORD
// ========================================
function submitChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    const errorDiv = document.getElementById('changePasswordError');
    const errorMsg = document.getElementById('changePasswordErrorMessage');

    if (errorDiv) errorDiv.style.display = 'none';

    if (!currentPassword || !newPassword || !confirmPassword) {
        if (errorMsg) errorMsg.textContent = 'Please fill in all fields.';
        if (errorDiv) errorDiv.style.display = 'block';
        return;
    }

    if (newPassword.length < 6) {
        if (errorMsg) errorMsg.textContent = 'New password must be at least 6 characters.';
        if (errorDiv) errorDiv.style.display = 'block';
        return;
    }

    if (newPassword !== confirmPassword) {
        if (errorMsg) errorMsg.textContent = 'New passwords do not match.';
        if (errorDiv) errorDiv.style.display = 'block';
        return;
    }

    if (newPassword === currentPassword) {
        if (errorMsg) errorMsg.textContent = 'New password must be different from current password.';
        if (errorDiv) errorDiv.style.display = 'block';
        return;
    }

    const submitBtn = document.getElementById('submitPasswordBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    fetch('ajax/change_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword
        }).toString()
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            if (typeof showToast === 'function') {
                showToast(data.message || 'Password updated successfully!', 'success');
            }
            closeModal(document.getElementById('changePasswordModal'));
        } else {
            if (errorMsg) errorMsg.textContent = data.message || 'Failed to update password.';
            if (errorDiv) errorDiv.style.display = 'block';
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Password';
    })
    .catch(function() {
        if (errorMsg) errorMsg.textContent = 'Error connecting to server.';
        if (errorDiv) errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Password';
    });
}

// ========================================
// OPEN DELETE ACCOUNT MODAL
// ========================================
function openDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (!modal) return;

    const form = document.getElementById('deleteAccountForm');
    if (form) form.reset();

    const errorDiv = document.getElementById('deleteAccountError');
    if (errorDiv) errorDiv.style.display = 'none';

    const confirmInput = document.getElementById('deleteConfirmText');
    if (confirmInput) confirmInput.value = '';

    const check1 = document.getElementById('deleteConfirmCheck1');
    const check2 = document.getElementById('deleteConfirmCheck2');
    if (check1) check1.checked = false;
    if (check2) check2.checked = false;

    const submitBtn = document.getElementById('submitDeleteBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Account';
    }

    openModal(modal);

    // Attach checkbox/input listeners
    setTimeout(function() {
        const input = document.getElementById('deleteConfirmText');
        const c1 = document.getElementById('deleteConfirmCheck1');
        const c2 = document.getElementById('deleteConfirmCheck2');

        function checkValid() {
            const ok = input && input.value.trim().toUpperCase() === 'DELETE'
                && c1 && c1.checked
                && c2 && c2.checked;
            if (submitBtn) submitBtn.disabled = !ok;
        }

        if (input) input.addEventListener('input', checkValid);
        if (c1) c1.addEventListener('change', checkValid);
        if (c2) c2.addEventListener('change', checkValid);
    }, 50);
}

// ========================================
// SUBMIT DELETE ACCOUNT
// ========================================
function submitDeleteAccount() {
    const password = document.getElementById('deleteAccountPassword').value;
    const confirmText = document.getElementById('deleteConfirmText').value.trim().toUpperCase();

    const errorDiv = document.getElementById('deleteAccountError');
    const errorMsg = document.getElementById('deleteAccountErrorMessage');

    if (errorDiv) errorDiv.style.display = 'none';

    if (!password) {
        if (errorMsg) errorMsg.textContent = 'Please enter your password.';
        if (errorDiv) errorDiv.style.display = 'block';
        return;
    }

    if (confirmText !== 'DELETE') {
        if (errorMsg) errorMsg.textContent = 'Please type DELETE to confirm.';
        if (errorDiv) errorDiv.style.display = 'block';
        return;
    }

    if (!confirm('⚠️ FINAL CONFIRMATION\n\nYour account will be scheduled for deletion in 30 days.\n\nDuring these 30 days:\n• You CANNOT use the system\n• You CAN ONLY cancel the deletion from Settings\n\nAfter 30 days, your account will be permanently deleted.\n\nProceed?')) {
        return;
    }

    const submitBtn = document.getElementById('submitDeleteBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    fetch('ajax/request_account_deletion.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ password: password }).toString()
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            closeModal(document.getElementById('deleteAccountModal'));
            if (typeof showToast === 'function') {
                showToast(data.message, 'warning');
            }
            // Reload page to activate lockdown
            setTimeout(function() {
                window.location.reload();
            }, 800);
        } else {
            if (errorMsg) errorMsg.textContent = data.message || 'Failed to schedule deletion.';
            if (errorDiv) errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Account';
        }
    })
    .catch(function() {
        if (errorMsg) errorMsg.textContent = 'Error connecting to server.';
        if (errorDiv) errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Account';
    });
}

// ========================================
// CHECK ACCOUNT STATUS (LOCKDOWN)
// ========================================
function checkAccountStatus() {
    fetch('ajax/get_account_status.php')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success && data.deletion_pending) {
                activateAccountLockdown(data.days_remaining, data.deletion_scheduled_at);
            }
        })
        .catch(function() { /* silent fail */ });
}

// ========================================
// ACTIVATE ACCOUNT LOCKDOWN
// ========================================
function activateAccountLockdown(daysRemaining, scheduledAt) {
    // 1. Disable all sidebar items except settings
    document.querySelectorAll('.sidebar .nav-item').forEach(function(item) {
        const page = item.dataset.page;
        if (page !== 'settings') {
            item.style.pointerEvents = 'none';
            item.style.opacity = '0.4';
            item.style.cursor = 'not-allowed';
        }
    });

    // 2. Force navigate to settings
    if (typeof navigateTo === 'function') {
        navigateTo('settings');
    }

    // 3. Inject banner at top of every page
    if (!document.getElementById('deletionBanner')) {
        const banner = document.createElement('div');
        banner.id = 'deletionBanner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #E74C3C 0%, #C62828 100%);
            color: white;
            padding: 14px 24px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
            font-family: var(--font);
        `;
        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 280px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 1.4rem;"></i>
                <div>
                    <strong style="display: block; font-size: 1rem;">Account Scheduled for Deletion</strong>
                    <span style="font-size: 0.85rem; opacity: 0.95;">
                        Your account will be permanently deleted in <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</strong>
                        (${scheduledAt}).
                        You cannot use the system until you cancel this request.
                    </span>
                </div>
            </div>
            <button class="cancel-deletion-btn" style="
                background: white;
                color: #C62828;
                border: none;
                padding: 10px 20px;
                border-radius: 50px;
                font-weight: 700;
                cursor: pointer;
                font-size: 0.9rem;
                font-family: var(--font);
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            ">
                <i class="fas fa-undo"></i> Cancel Deletion
            </button>
        `;
        document.body.appendChild(banner);

        // Push body down
        document.body.style.paddingTop = '70px';

        // Attach cancel listener
        banner.querySelector('.cancel-deletion-btn').addEventListener('click', function() {
            cancelAccountDeletion();
        });
    }
}

// ========================================
// CANCEL ACCOUNT DELETION
// ========================================
function cancelAccountDeletion() {
    if (!confirm('Cancel account deletion?\n\nYour account will be restored to full access.')) {
        return;
    }

    fetch('ajax/cancel_account_deletion.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            if (typeof showToast === 'function') {
                showToast(data.message || 'Account deletion cancelled.', 'success');
            }
            setTimeout(function() {
                window.location.reload();
            }, 800);
        } else {
            if (typeof showToast === 'function') {
                showToast(data.message || 'Failed to cancel deletion.', 'error');
            }
        }
    })
    .catch(function() {
        if (typeof showToast === 'function') {
            showToast('Error connecting to server.', 'error');
        }
    });
}

// ========================================
// EXPOSE
// ========================================
window.initChangePassword = initChangePassword;
window.openChangePasswordModal = openChangePasswordModal;
window.openDeleteAccountModal = openDeleteAccountModal;
window.checkAccountStatus = checkAccountStatus;
window.cancelAccountDeletion = cancelAccountDeletion;
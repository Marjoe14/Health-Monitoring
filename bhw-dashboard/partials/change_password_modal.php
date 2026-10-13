<?php
// ========================================
// BHW CHANGE PASSWORD MODAL (Partial)
// Included in bhw.php
// ========================================
?>
<!-- ===== CHANGE PASSWORD MODAL ===== -->
<div class="modal-overlay" id="changePasswordModal">
    <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
            <h3><i class="fas fa-key"></i> Change Password</h3>
            <button class="modal-close close-password-modal">&times;</button>
        </div>
        <form id="changePasswordForm">
            <div class="form-group">
                <label for="currentPassword">Current Password <span class="required">*</span></label>
                <div class="password-wrapper">
                    <input type="password" id="currentPassword" placeholder="Enter your current password" required autocomplete="current-password">
                    <button type="button" class="toggle-password" data-target="currentPassword">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>

            <div class="form-group">
                <label for="newPassword">New Password <span class="required">*</span></label>
                <div class="password-wrapper">
                    <input type="password" id="newPassword" placeholder="Enter new password (min 6 characters)" required autocomplete="new-password">
                    <button type="button" class="toggle-password" data-target="newPassword">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <span class="helper-text">At least 6 characters</span>
            </div>

            <div class="form-group">
                <label for="confirmNewPassword">Confirm New Password <span class="required">*</span></label>
                <div class="password-wrapper">
                    <input type="password" id="confirmNewPassword" placeholder="Re-enter new password" required autocomplete="new-password">
                    <button type="button" class="toggle-password" data-target="confirmNewPassword">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>

            <div id="changePasswordError" style="display:none; background:#FDEDEC; color:#C62828; padding:10px 14px; border-radius:8px; margin-top:8px; border:1px solid #F5C6CB;">
                <i class="fas fa-exclamation-circle"></i> <span id="changePasswordErrorMessage"></span>
            </div>

            <div class="modal-actions">
                <button type="button" class="btn btn-outline close-password-modal">Cancel</button>
                <button type="submit" class="btn btn-primary" id="submitPasswordBtn">
                    <i class="fas fa-save"></i> Update Password
                </button>
            </div>
        </form>
    </div>
</div>
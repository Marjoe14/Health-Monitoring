<?php
// ========================================
// PURGE EXPIRED ACCOUNTS
// Called automatically — deletes accounts whose 30-day grace period has ended
// ========================================

function purgeExpiredAccounts($pdo) {
    try {
        // Find users whose deletion_scheduled_at has passed
        $stmt = $pdo->prepare("
            SELECT id, username 
            FROM users 
            WHERE deletion_scheduled_at IS NOT NULL 
              AND deletion_scheduled_at <= NOW()
        ");
        $stmt->execute();
        $expired = $stmt->fetchAll();

        foreach ($expired as $user) {
            $userId = $user['id'];

            // Delete user (cascades will remove residents, records, etc. depending on schema)
            $delStmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $delStmt->execute([$userId]);
        }

        return count($expired);
    } catch (PDOException $e) {
        error_log('Purge expired accounts error: ' . $e->getMessage());
        return 0;
    }
}
?>
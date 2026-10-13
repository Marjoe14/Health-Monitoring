<?php
function logActivity($pdo, $userId, $actionType, $description, $targetId = null, $targetType = null) {
    try {
        // Get user name
        $userName = 'Unknown';
        $userRole = 'unknown';
        
        $stmt = $pdo->prepare("
            SELECT 
                COALESCE(b.first_name, r.first_name, o.first_name, u.username) AS first_name,
                COALESCE(b.last_name, r.last_name, o.last_name, '') AS last_name,
                u.role
            FROM users u
            LEFT JOIN bhw b ON b.user_id = u.id
            LEFT JOIN residents r ON r.user_id = u.id
            LEFT JOIN officials o ON o.user_id = u.id
            WHERE u.id = ?
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if ($user) {
            $userName = trim($user['first_name'] . ' ' . $user['last_name']);
            $userRole = $user['role'];
        }
        
        // Insert log
        $stmt = $pdo->prepare("
            INSERT INTO activity_logs 
            (user_id, user_role, user_name, action_type, description, target_id, target_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $userId,
            $userRole,
            $userName,
            $actionType,
            $description,
            $targetId,
            $targetType
        ]);
        
        return true;
    } catch (PDOException $e) {
        error_log("Activity log failed: " . $e->getMessage());
        return false;
    }
}
?>
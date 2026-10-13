<?php
session_start();
header('Content-Type: application/json');

date_default_timezone_set('Asia/Manila');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'bhw') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$userId = $_SESSION['user_id'];

try {
    $stmt = $pdo->prepare("SELECT deletion_scheduled_at FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    $scheduled = $user['deletion_scheduled_at'];
    $isPending = ($scheduled !== null);

    $daysRemaining = 0;
    if ($isPending) {
        $scheduledTime = strtotime($scheduled);
        $now = time();
        $diff = $scheduledTime - $now;
        $daysRemaining = max(0, (int) ceil($diff / 86400));
    }

    echo json_encode([
        'success' => true,
        'deletion_pending' => $isPending,
        'deletion_scheduled_at' => $scheduled,
        'days_remaining' => $daysRemaining
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
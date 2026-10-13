<?php
session_start();
header('Content-Type: application/json');

date_default_timezone_set('Asia/Manila');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'bhw') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/activity_log.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$userId = $_SESSION['user_id'];

try {
    $updateStmt = $pdo->prepare("
        UPDATE users 
        SET deletion_scheduled_at = NULL,
            deletion_requested_at = NULL
        WHERE id = ?
    ");
    $updateStmt->execute([$userId]);

    logActivity(
        $pdo,
        $userId,
        'account_deletion_cancelled',
        'Cancelled account deletion request',
        $userId,
        'user'
    );

    echo json_encode([
        'success' => true,
        'message' => 'Account deletion cancelled. Your account is safe.'
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
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
$password = $_POST['password'] ?? '';

if (!$password) {
    echo json_encode(['success' => false, 'message' => 'Please enter your password to confirm.']);
    exit();
}

try {
    // Get user
    $stmt = $pdo->prepare("SELECT id, username, password, deletion_scheduled_at FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found.']);
        exit();
    }

    if ($user['deletion_scheduled_at'] !== null) {
        echo json_encode(['success' => false, 'message' => 'Account is already scheduled for deletion.']);
        exit();
    }

    // Verify password
    if (!password_verify($password, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'Incorrect password.']);
        exit();
    }

    // Schedule deletion 30 days from now
    $updateStmt = $pdo->prepare("
        UPDATE users 
        SET deletion_scheduled_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
            deletion_requested_at = NOW()
        WHERE id = ?
    ");
    $updateStmt->execute([$userId]);

    // Log
    logActivity(
        $pdo,
        $userId,
        'account_deletion_requested',
        'Scheduled account for deletion (30-day grace period)',
        $userId,
        'user'
    );

    echo json_encode([
        'success' => true,
        'message' => 'Account scheduled for deletion in 30 days. You may cancel this anytime before then.',
        'deletion_scheduled_at' => date('M d, Y', strtotime('+30 days'))
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
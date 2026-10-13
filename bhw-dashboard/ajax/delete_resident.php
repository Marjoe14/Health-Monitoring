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

$id = $_POST['id'] ?? 0;

try {
    $pdo->beginTransaction();

    // Get resident name before deletion
    $nameStmt = $pdo->prepare("SELECT first_name, last_name, user_id FROM residents WHERE id = ?");
    $nameStmt->execute([$id]);
    $resident = $nameStmt->fetch();

    if (!$resident) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Resident not found']);
        exit();
    }

    $residentName = $resident['first_name'] . ' ' . $resident['last_name'];
    $userId = $resident['user_id'];

    // Delete resident
    $stmt = $pdo->prepare("DELETE FROM residents WHERE id = ?");
    $result = $stmt->execute([$id]);

    // Delete associated user
    if ($userId) {
        $userStmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $userStmt->execute([$userId]);
    }

    // LOG ACTIVITY
    logActivity(
        $pdo,
        $_SESSION['user_id'],
        'delete_resident',
        'Deleted resident: ' . $residentName,
        $id,
        'resident'
    );

    $pdo->commit();

    if ($result && $stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Resident and associated user account deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Resident not found']);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
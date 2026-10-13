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

$id = (int)($_POST['id'] ?? 0);

if (!$id) {
    echo json_encode(['success' => false, 'message' => 'Vaccine ID required']);
    exit();
}

try {
    // Get vaccine name for logging
    $nameStmt = $pdo->prepare("SELECT name FROM vaccines WHERE id = ?");
    $nameStmt->execute([$id]);
    $vaccine = $nameStmt->fetch();

    if (!$vaccine) {
        echo json_encode(['success' => false, 'message' => 'Vaccine not found']);
        exit();
    }

    $vaccineName = $vaccine['name'];

    // Check if vaccine is in use
    $check = $pdo->prepare("SELECT COUNT(*) FROM immunization_records WHERE vaccine = ?");
    $check->execute([$vaccineName]);
    $used = $check->fetchColumn();

    if ($used > 0) {
        echo json_encode(['success' => false, 'message' => 'Cannot delete: This vaccine is being used in immunization records']);
        exit();
    }

    // Delete vaccine
    $stmt = $pdo->prepare("DELETE FROM vaccines WHERE id = ?");
    $result = $stmt->execute([$id]);

    if ($result && $stmt->rowCount() > 0) {
        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'delete_vaccine',
            'Deleted vaccine type: ' . $vaccineName,
            $id,
            'vaccine'
        );

        echo json_encode(['success' => true, 'message' => 'Vaccine deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Vaccine not found']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
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

if (!$id) {
    echo json_encode(['success' => false, 'message' => 'Immunization ID required']);
    exit();
}

try {
    // Get details BEFORE deleting
    $infoStmt = $pdo->prepare("
        SELECT 
            i.vaccine,
            i.dose,
            r.first_name,
            r.last_name
        FROM immunization_records i
        JOIN residents r ON i.resident_id = r.id
        WHERE i.id = ?
    ");
    $infoStmt->execute([$id]);
    $info = $infoStmt->fetch();

    $childName = $info ? ($info['first_name'] . ' ' . $info['last_name']) : 'Unknown';
    $vaccine = $info ? ($info['vaccine'] ?? 'Unknown') : 'Unknown';
    $dose = $info ? ($info['dose'] ?? '') : '';

    $stmt = $pdo->prepare("DELETE FROM immunization_records WHERE id = ?");
    $result = $stmt->execute([$id]);

    if ($result && $stmt->rowCount() > 0) {
        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'delete_immunization',
            'Deleted immunization record: ' . $vaccine . ' (' . $dose . ') for ' . $childName,
            $id,
            'immunization_record'
        );

        echo json_encode(['success' => true, 'message' => 'Immunization record deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Record not found or already deleted']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
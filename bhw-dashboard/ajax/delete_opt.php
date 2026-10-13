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
    echo json_encode(['success' => false, 'message' => 'OPT ID required']);
    exit();
}

try {
    // Get details BEFORE deleting
    $infoStmt = $pdo->prepare("
        SELECT 
            o.nutritional_status,
            r.first_name,
            r.last_name
        FROM opt_records o
        JOIN residents r ON o.resident_id = r.id
        WHERE o.id = ?
    ");
    $infoStmt->execute([$id]);
    $info = $infoStmt->fetch();

    $childName = $info ? ($info['first_name'] . ' ' . $info['last_name']) : 'Unknown';
    $status = $info ? ($info['nutritional_status'] ?? 'Unknown') : 'Unknown';

    $stmt = $pdo->prepare("DELETE FROM opt_records WHERE id = ?");
    $result = $stmt->execute([$id]);

    if ($result && $stmt->rowCount() > 0) {
        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'delete_opt',
            'Deleted OPT record for ' . $childName . ' (' . $status . ')',
            $id,
            'opt_record'
        );

        echo json_encode(['success' => true, 'message' => 'OPT record deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Record not found or already deleted']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
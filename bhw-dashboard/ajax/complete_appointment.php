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
    // Get appointment + resident name
    $infoStmt = $pdo->prepare("
        SELECT a.appointment_date, r.first_name, r.last_name
        FROM appointments a
        JOIN residents r ON a.resident_id = r.id
        WHERE a.id = ?
    ");
    $infoStmt->execute([$id]);
    $info = $infoStmt->fetch();
    $residentName = $info ? ($info['first_name'] . ' ' . $info['last_name']) : 'Unknown';

    $stmt = $pdo->prepare("UPDATE appointments SET status = 'Completed' WHERE id = ?");
    $result = $stmt->execute([$id]);

    if ($result && $stmt->rowCount() > 0) {
        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'complete_appointment',
            'Marked appointment as completed for ' . $residentName,
            $id,
            'appointment'
        );

        echo json_encode(['success' => true, 'message' => 'Appointment marked as completed']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Appointment not found']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
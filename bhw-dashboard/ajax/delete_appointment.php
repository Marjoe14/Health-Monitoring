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
    echo json_encode(['success' => false, 'message' => 'Appointment ID required']);
    exit();
}

try {
    // Get details BEFORE deleting
    $infoStmt = $pdo->prepare("
        SELECT 
            a.appointment_date,
            a.appointment_time,
            a.type,
            r.first_name,
            r.last_name
        FROM appointments a
        JOIN residents r ON a.resident_id = r.id
        WHERE a.id = ?
    ");
    $infoStmt->execute([$id]);
    $info = $infoStmt->fetch();

    $residentName = $info ? ($info['first_name'] . ' ' . $info['last_name']) : 'Unknown';
    $apptDate = $info ? ($info['appointment_date'] ?? '') : '';
    $apptTime = $info ? ($info['appointment_time'] ?? '') : '';
    $apptType = $info ? ($info['type'] ?? 'Appointment') : 'Appointment';

    $stmt = $pdo->prepare("DELETE FROM appointments WHERE id = ?");
    $result = $stmt->execute([$id]);

    if ($result && $stmt->rowCount() > 0) {
        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'delete_appointment',
            'Deleted ' . $apptType . ' appointment for ' . $residentName . ' on ' . $apptDate . ' at ' . $apptTime,
            $id,
            'appointment'
        );

        echo json_encode(['success' => true, 'message' => 'Appointment deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Appointment not found']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
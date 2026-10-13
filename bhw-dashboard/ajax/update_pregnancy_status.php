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

$residentId = (int)($_POST['resident_id'] ?? 0);
$newStatus  = $_POST['status'] ?? '';

if (!$residentId || !in_array($newStatus, ['Pregnant', 'Delivered', 'Not Pregnant'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit();
}

try {
    // Get resident
    $stmt = $pdo->prepare("SELECT id, first_name, last_name, sex, pregnancy_status FROM residents WHERE id = ?");
    $stmt->execute([$residentId]);
    $resident = $stmt->fetch();

    if (!$resident) {
        echo json_encode(['success' => false, 'message' => 'Resident not found']);
        exit();
    }

    if ($resident['sex'] !== 'Female') {
        echo json_encode(['success' => false, 'message' => 'Only female residents can have pregnancy status']);
        exit();
    }

    $oldStatus = $resident['pregnancy_status'];
    $residentName = $resident['first_name'] . ' ' . $resident['last_name'];

    // Update status
    $stmt = $pdo->prepare("UPDATE residents SET pregnancy_status = ? WHERE id = ?");
    $stmt->execute([$newStatus, $residentId]);

    // Log activity
    logActivity(
        $pdo,
        $_SESSION['user_id'],
        'update_pregnancy_status',
        "Changed pregnancy status of {$residentName} from '{$oldStatus}' to '{$newStatus}'",
        $residentId,
        'resident'
    );

    $messages = [
        'Pregnant'      => "{$residentName} marked as PREGNANT. She will now appear in Add Prenatal dropdown.",
        'Delivered'     => "{$residentName} marked as DELIVERED. She has been moved to the Delivered tab.",
        'Not Pregnant'  => "{$residentName} marked as NOT PREGNANT.",
    ];

    echo json_encode([
        'success' => true,
        'message' => $messages[$newStatus],
        'old_status' => $oldStatus,
        'new_status' => $newStatus
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
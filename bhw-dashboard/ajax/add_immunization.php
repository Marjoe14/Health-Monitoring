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

$childId = $_POST['child_id'] ?? 0;
$vaccine = $_POST['vaccine'] ?? '';
$dose = $_POST['dose'] ?? '';
$dateAdministered = $_POST['date_administered'] ?? '';
$nextDose = $_POST['next_dose'] ?? '';
$notes = $_POST['notes'] ?? '';

$today = date('Y-m-d');
$status = 'Upcoming';

if ($dateAdministered <= $today) {
    $status = 'Completed';
    if ($nextDose && $nextDose < $today) {
        $status = 'Overdue';
    }
} elseif ($dateAdministered > $today) {
    $status = 'Upcoming';
}

try {
    // Get child name
    $nameStmt = $pdo->prepare("SELECT first_name, last_name FROM residents WHERE id = ?");
    $nameStmt->execute([$childId]);
    $res = $nameStmt->fetch();
    $childName = $res ? ($res['first_name'] . ' ' . $res['last_name']) : 'Unknown';

    $stmt = $pdo->prepare("
        INSERT INTO immunization_records 
        (resident_id, vaccine, dose, date_administered, next_dose_date, status, recorded_by, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $result = $stmt->execute([
        $childId, $vaccine, $dose, $dateAdministered, 
        $nextDose ?: null, $status, $_SESSION['user_id'], $notes
    ]);

    if ($result) {
        $immId = $pdo->lastInsertId();

        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'add_immunization',
            'Recorded ' . $vaccine . ' (' . $dose . ') for ' . $childName,
            $immId,
            'immunization_record'
        );

        echo json_encode([
            'success' => true, 
            'id' => $immId, 
            'message' => 'Immunization recorded successfully',
            'child_id' => $childId
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to record immunization']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
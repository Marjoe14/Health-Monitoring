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

$residentId = $_POST['resident_id'] ?? 0;
$height = $_POST['height'] ?? 0;
$weight = $_POST['weight'] ?? 0;
$bmi = $_POST['bmi'] ?? 0;
$category = $_POST['category'] ?? '';
$recordedAt = $_POST['date'] ?? date('Y-m-d');
$notes = $_POST['notes'] ?? '';

try {
    // Get resident name
    $nameStmt = $pdo->prepare("SELECT first_name, last_name FROM residents WHERE id = ?");
    $nameStmt->execute([$residentId]);
    $res = $nameStmt->fetch();
    $residentName = $res ? ($res['first_name'] . ' ' . $res['last_name']) : 'Unknown';

    $stmt = $pdo->prepare("
        INSERT INTO bmi_records 
        (resident_id, height, weight, bmi, category, recorded_by, recorded_at, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $result = $stmt->execute([
        $residentId, $height, $weight, $bmi, $category, $_SESSION['user_id'], $recordedAt, $notes
    ]);

    if ($result) {
        $bmiId = $pdo->lastInsertId();

        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'add_bmi',
            'Recorded BMI for ' . $residentName . ': ' . $bmi . ' (' . $category . ')',
            $bmiId,
            'bmi_record'
        );

        echo json_encode(['success' => true, 'id' => $bmiId, 'message' => 'BMI recorded successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to record BMI']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
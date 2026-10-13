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

$prenatalId = $_POST['prenatal_id'] ?? 0;
$checkupDate = $_POST['checkup_date'] ?? date('Y-m-d');
$bp = $_POST['blood_pressure'] ?? '';
$weight = $_POST['weight'] ?? '';
$heartPulse = $_POST['heart_pulse'] ?? '';
$bodyTemp = $_POST['body_temperature'] ?? '';
$respRate = $_POST['respiratory_rate'] ?? '';
$milestoneNotes = $_POST['milestone_notes'] ?? '';
$nextCheckup = $_POST['next_checkup'] ?? null;
$recordedBy = $_SESSION['user_id'];

if (!$prenatalId || !$checkupDate) {
    echo json_encode(['success' => false, 'message' => 'Prenatal ID and checkup date are required']);
    exit();
}

// ✅ Validate Next Checkup — must be tomorrow or later
if ($nextCheckup) {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $nextCheckup, $m)) {
        echo json_encode(['success' => false, 'message' => 'Invalid Next Checkup format.']);
        exit();
    }
    $ncYear  = (int) $m[1];
    $ncMonth = (int) $m[2];
    $ncDay   = (int) $m[3];

    if (!checkdate($ncMonth, $ncDay, $ncYear)) {
        echo json_encode(['success' => false, 'message' => 'Invalid Next Checkup date.']);
        exit();
    }

    $todayYear  = (int) date('Y');
    $todayMonth = (int) date('n');
    $todayDay   = (int) date('j');

    $ncTimestamp = mktime(0, 0, 0, $ncMonth, $ncDay, $ncYear);
    $todayTimestamp = mktime(0, 0, 0, $todayMonth, $todayDay, $todayYear);

    if ($ncTimestamp <= $todayTimestamp) {
        echo json_encode(['success' => false, 'message' => 'Next Checkup must be tomorrow or later.']);
        exit();
    }
}

try {
    $pdo->beginTransaction();

    $nameStmt = $pdo->prepare("
        SELECT r.first_name, r.last_name 
        FROM prenatal_records p
        JOIN residents r ON p.resident_id = r.id
        WHERE p.id = ?
    ");
    $nameStmt->execute([$prenatalId]);
    $res = $nameStmt->fetch();
    $residentName = $res ? ($res['first_name'] . ' ' . $res['last_name']) : 'Unknown';

    $stmt = $pdo->prepare("
        INSERT INTO prenatal_checkups 
        (prenatal_id, checkup_date, blood_pressure, weight, heart_pulse, body_temperature, respiratory_rate, milestone_notes, next_checkup, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $prenatalId,
        $checkupDate,
        $bp ?: null,
        $weight ?: null,
        $heartPulse ?: null,
        $bodyTemp ?: null,
        $respRate ?: null,
        $milestoneNotes ?: null,
        $nextCheckup ?: null,
        $recordedBy
    ]);

    $checkupId = $pdo->lastInsertId();

    if ($nextCheckup) {
        $updateStmt = $pdo->prepare("
            UPDATE prenatal_records 
            SET next_checkup = ?, milestone_notes = ?
            WHERE id = ?
        ");
        $updateStmt->execute([$nextCheckup, $milestoneNotes ?: null, $prenatalId]);
    }

    logActivity(
        $pdo,
        $_SESSION['user_id'],
        'add_checkup',
        'Recorded prenatal checkup for ' . $residentName . ' on ' . $checkupDate,
        $checkupId,
        'prenatal_checkup'
    );

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'id' => $checkupId,
        'message' => 'Checkup recorded successfully'
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
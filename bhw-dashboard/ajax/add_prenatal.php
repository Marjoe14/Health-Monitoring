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
$lmp = $_POST['lmp'] ?? '';
$dueDate = $_POST['due_date'] ?? '';
$gestationalAge = $_POST['gestational_age'] ?? 0;
$status = $_POST['status'] ?? 'Active';
$milestoneNotes = $_POST['milestone_notes'] ?? '';
$nextCheckup = $_POST['next_checkup'] ?? null;
$recordedBy = $_SESSION['user_id'];

$bloodPressure = $_POST['blood_pressure'] ?? '';
$weight = $_POST['weight'] ?? '';
$heartPulse = $_POST['heart_pulse'] ?? '';
$bodyTemp = $_POST['body_temperature'] ?? '';
$respRate = $_POST['respiratory_rate'] ?? '';

if (!$residentId || !$lmp || !$dueDate) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
    exit();
}

// LMP validation — strict YYYY-MM-DD
if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $lmp, $m)) {
    echo json_encode(['success' => false, 'message' => 'Invalid LMP format.']);
    exit();
}

$lmpYear  = (int) $m[1];
$lmpMonth = (int) $m[2];
$lmpDay   = (int) $m[3];

if ($lmpYear < 2020 || $lmpYear > 2100) {
    echo json_encode(['success' => false, 'message' => 'LMP year is out of range.']);
    exit();
}

if (!checkdate($lmpMonth, $lmpDay, $lmpYear)) {
    echo json_encode(['success' => false, 'message' => 'Invalid LMP date.']);
    exit();
}

$todayYear  = (int) date('Y');
$todayMonth = (int) date('n');
$todayDay   = (int) date('j');

function toSerialDay($year, $month, $day) {
    $a = (int) floor((14 - $month) / 12);
    $y = $year + 4800 - $a;
    $m = $month + 12 * $a - 3;
    return $day + (int) floor((153 * $m + 2) / 5) + 365 * $y + (int) floor($y / 4) - (int) floor($y / 100) + (int) floor($y / 400) - 32045;
}

$lmpSerial   = toSerialDay($lmpYear, $lmpMonth, $lmpDay);
$todaySerial = toSerialDay($todayYear, $todayMonth, $todayDay);

$diffDays = $todaySerial - $lmpSerial;

if ($diffDays < 0) {
    echo json_encode(['success' => false, 'message' => 'LMP cannot be in the future.']);
    exit();
}

if ($diffDays > 280) {
    echo json_encode(['success' => false, 'message' => 'LMP is too old (' . $diffDays . ' days ago, max is 280 days).']);
    exit();
}

try {
    $pdo->beginTransaction();

    $nameStmt = $pdo->prepare("SELECT first_name, last_name, sex, pregnancy_status FROM residents WHERE id = ?");
    $nameStmt->execute([$residentId]);
    $res = $nameStmt->fetch();
    $residentName = $res ? ($res['first_name'] . ' ' . $res['last_name']) : 'Unknown';

    if (!$res) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Resident not found']);
        exit();
    }

    if ($res['sex'] !== 'Female') {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Prenatal records can only be added for female residents']);
        exit();
    }

    if ($res['pregnancy_status'] !== 'Pregnant') {
        $pdo->rollBack();
        echo json_encode([
            'success' => false,
            'message' => 'This resident is not marked as Pregnant. Please mark her as Pregnant first in the Pregnancy Status page.'
        ]);
        exit();
    }

    $dupStmt = $pdo->prepare("SELECT COUNT(*) FROM prenatal_records WHERE resident_id = ? AND status = 'Active'");
    $dupStmt->execute([$residentId]);
    $activeCount = (int) $dupStmt->fetchColumn();

    if ($activeCount > 0) {
        $pdo->rollBack();
        echo json_encode([
            'success' => false,
            'message' => 'This woman already has an Active prenatal record. Please edit the existing record instead.'
        ]);
        exit();
    }

    $stmt = $pdo->prepare("
        INSERT INTO prenatal_records 
        (resident_id, lmp, due_date, gestational_age, status, milestone_notes, vital_signs, next_checkup, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $residentId,
        $lmp,
        $dueDate,
        $gestationalAge,
        $status,
        $milestoneNotes,
        '',
        $nextCheckup,
        $recordedBy
    ]);

    $prenatalId = $pdo->lastInsertId();

    if ($bloodPressure || $weight || $heartPulse || $bodyTemp || $respRate) {
        $checkupStmt = $pdo->prepare("
            INSERT INTO prenatal_checkups 
            (prenatal_id, checkup_date, blood_pressure, weight, heart_pulse, body_temperature, respiratory_rate, milestone_notes, next_checkup, recorded_by, created_at)
            VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $checkupStmt->execute([
            $prenatalId,
            $bloodPressure ?: null,
            $weight ?: null,
            $heartPulse ?: null,
            $bodyTemp ?: null,
            $respRate ?: null,
            $milestoneNotes ?: null,
            $nextCheckup ?: null,
            $recordedBy
        ]);
    }

    logActivity(
        $pdo,
        $_SESSION['user_id'],
        'add_prenatal',
        'Added prenatal record for ' . $residentName . ' (Due: ' . $dueDate . ')',
        $prenatalId,
        'prenatal_record'
    );

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'id' => $prenatalId,
        'message' => 'Prenatal record added successfully'
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
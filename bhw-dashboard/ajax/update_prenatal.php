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
$residentId = $_POST['resident_id'] ?? 0;
$lmp = $_POST['lmp'] ?? '';
$dueDate = $_POST['due_date'] ?? '';
$gestationalAge = $_POST['gestational_age'] ?? 0;
$status = $_POST['status'] ?? 'Active';
$milestoneNotes = $_POST['milestone_notes'] ?? '';
$nextCheckup = $_POST['next_checkup'] ?? null;

if (!$id || !$residentId || !$lmp || !$dueDate) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
    exit();
}

// Strict YYYY-MM-DD validation
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

try {
    $nameStmt = $pdo->prepare("SELECT first_name, last_name FROM residents WHERE id = ?");
    $nameStmt->execute([$residentId]);
    $res = $nameStmt->fetch();
    $residentName = $res ? ($res['first_name'] . ' ' . $res['last_name']) : 'Unknown';

    $stmt = $pdo->prepare("
        UPDATE prenatal_records 
        SET resident_id = ?, lmp = ?, due_date = ?, gestational_age = ?, 
            status = ?, milestone_notes = ?, next_checkup = ?
        WHERE id = ?
    ");
    $result = $stmt->execute([
        $residentId, $lmp, $dueDate, $gestationalAge,
        $status, $milestoneNotes, $nextCheckup,
        $id
    ]);

    if ($result) {
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'update_prenatal',
            'Updated prenatal record for ' . $residentName . ' (Due: ' . $dueDate . ')',
            $id,
            'prenatal_record'
        );

        echo json_encode([
            'success' => true, 
            'message' => 'Prenatal record updated successfully'
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update prenatal record']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
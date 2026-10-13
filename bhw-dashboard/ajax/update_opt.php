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
$childId = $_POST['child_id'] ?? 0;
$weight = $_POST['weight'] ?? 0;
$height = $_POST['height'] ?? 0;
$date = $_POST['date'] ?? '';
$nutritionalStatus = $_POST['nutritional_status'] ?? 'Normal';
$notes = $_POST['notes'] ?? '';

if (!$id || !$childId || !$date) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

// ✅ Strict date validation
if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m)) {
    echo json_encode(['success' => false, 'message' => 'Invalid date format.']);
    exit();
}

$y = (int) $m[1];
$mo = (int) $m[2];
$d = (int) $m[3];

if (!checkdate($mo, $d, $y)) {
    echo json_encode(['success' => false, 'message' => 'Invalid date.']);
    exit();
}

$picked = mktime(0, 0, 0, $mo, $d, $y);
$today = mktime(0, 0, 0, (int)date('n'), (int)date('j'), (int)date('Y'));

if ($picked > $today) {
    echo json_encode(['success' => false, 'message' => 'Date cannot be in the future.']);
    exit();
}

$minDate = strtotime('-5 years', $today);
if ($picked < $minDate) {
    echo json_encode(['success' => false, 'message' => 'Date is too old (more than 5 years ago).']);
    exit();
}

try {
    $nameStmt = $pdo->prepare("SELECT first_name, last_name FROM residents WHERE id = ?");
    $nameStmt->execute([$childId]);
    $res = $nameStmt->fetch();
    $childName = $res ? ($res['first_name'] . ' ' . $res['last_name']) : 'Unknown';

    $stmt = $pdo->prepare("
        UPDATE opt_records 
        SET resident_id = ?, weight = ?, height = ?, recorded_date = ?, 
            nutritional_status = ?, notes = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $result = $stmt->execute([
        $childId,
        $weight,
        $height,
        $date,
        $nutritionalStatus,
        $notes,
        $id
    ]);

    if ($result && $stmt->rowCount() > 0) {
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'update_opt',
            'Updated OPT record for ' . $childName . ': ' . $nutritionalStatus,
            $id,
            'opt_record'
        );

        echo json_encode(['success' => true, 'message' => 'OPT record updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No changes made or record not found']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
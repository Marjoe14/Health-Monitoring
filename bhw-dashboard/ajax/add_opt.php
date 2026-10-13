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

if (!$childId || !$vaccine || !$dose || !$dateAdministered) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
    exit();
}

// ============================================================
// ✅ Validate Date Administered — past or today, not more than 5 years ago
// ============================================================
if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $dateAdministered, $m)) {
    echo json_encode(['success' => false, 'message' => 'Invalid Date Administered format.']);
    exit();
}

$y = (int) $m[1];
$mo = (int) $m[2];
$d = (int) $m[3];

if (!checkdate($mo, $d, $y)) {
    echo json_encode(['success' => false, 'message' => 'Invalid Date Administered.']);
    exit();
}

$adminTs = mktime(0, 0, 0, $mo, $d, $y);
$todayTs = mktime(0, 0, 0, (int)date('n'), (int)date('j'), (int)date('Y'));

if ($adminTs > $todayTs) {
    echo json_encode(['success' => false, 'message' => 'Date Administered cannot be in the future.']);
    exit();
}

$fiveYearsAgo = strtotime('-5 years', $todayTs);
if ($adminTs < $fiveYearsAgo) {
    echo json_encode(['success' => false, 'message' => 'Date Administered is too old (more than 5 years ago).']);
    exit();
}

// ============================================================
// ✅ Validate Next Dose Date — must be after Date Administered, max 2 years ahead
// ============================================================
if ($nextDose) {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $nextDose, $m2)) {
        echo json_encode(['success' => false, 'message' => 'Invalid Next Dose format.']);
        exit();
    }

    $y2 = (int) $m2[1];
    $mo2 = (int) $m2[2];
    $d2 = (int) $m2[3];

    if (!checkdate($mo2, $d2, $y2)) {
        echo json_encode(['success' => false, 'message' => 'Invalid Next Dose date.']);
        exit();
    }

    $nextTs = mktime(0, 0, 0, $mo2, $d2, $y2);

    if ($nextTs <= $adminTs) {
        echo json_encode(['success' => false, 'message' => 'Next Dose must be after the Date Administered.']);
        exit();
    }

    $twoYearsFromAdmin = strtotime('+2 years', $adminTs);
    if ($nextTs > $twoYearsFromAdmin) {
        echo json_encode(['success' => false, 'message' => 'Next Dose is too far in the future (max 2 years after the administered date).']);
        exit();
    }
}

// ============================================================
// Determine status
// ============================================================
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
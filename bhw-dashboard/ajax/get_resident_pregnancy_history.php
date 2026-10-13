<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'bhw') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$residentId = (int)($_GET['resident_id'] ?? 0);
if (!$residentId) {
    echo json_encode(['success' => false, 'message' => 'Resident ID required']);
    exit();
}

try {
    // Resident info
    $infoStmt = $pdo->prepare("
        SELECT 
            r.id,
            r.first_name,
            r.middle_name,
            r.last_name,
            r.date_of_birth,
            TIMESTAMPDIFF(YEAR, r.date_of_birth, CURDATE()) AS age_years,
            r.purok,
            r.mobile_number,
            r.user_id,
            r.pregnancy_status,
            CASE WHEN r.user_id IS NOT NULL THEN 'Has Account' ELSE 'No Account' END AS account_status,
            (SELECT COUNT(*) FROM prenatal_records WHERE resident_id = r.id) AS total_pregnancies,
            (SELECT COUNT(*) FROM prenatal_records WHERE resident_id = r.id AND status = 'Delivered') AS total_deliveries
        FROM residents r
        WHERE r.id = ?
    ");
    $infoStmt->execute([$residentId]);
    $info = $infoStmt->fetch();

    if (!$info) {
        echo json_encode(['success' => false, 'message' => 'Resident not found']);
        exit();
    }

    // All prenatal records with checkup count
    $recStmt = $pdo->prepare("
        SELECT 
            p.id,
            p.lmp,
            p.due_date,
            p.delivery_date,
            p.status,
            p.gestational_age,
            p.milestone_notes,
            p.next_checkup,
            p.created_at,
            (SELECT COUNT(*) FROM prenatal_checkups WHERE prenatal_id = p.id) AS checkup_count
        FROM prenatal_records p
        WHERE p.resident_id = ?
        ORDER BY p.created_at DESC
    ");
    $recStmt->execute([$residentId]);
    $records = $recStmt->fetchAll();

    $age = (int)$info['age_years'];
    $ageDisplay = $age > 0 ? $age . ' yr' . ($age > 1 ? 's' : '') : '—';

    echo json_encode([
        'success' => true,
        'resident' => [
            'id'                => (int)$info['id'],
            'full_name'         => trim($info['first_name'] . ' ' . ($info['middle_name'] ? $info['middle_name'] . ' ' : '') . $info['last_name']),
            'age_display'       => $ageDisplay,
            'purok'             => $info['purok'] ?? '—',
            'mobile'            => $info['mobile_number'] ?? '—',
            'account_status'    => $info['account_status'],
            'pregnancy_status'  => $info['pregnancy_status'],
            'total_pregnancies' => (int)$info['total_pregnancies'],
            'total_deliveries'  => (int)$info['total_deliveries'],
        ],
        'records' => $records
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
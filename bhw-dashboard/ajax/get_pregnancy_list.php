<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'bhw') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized', 'records' => []]);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed', 'records' => []]);
    exit();
}

$status = $_GET['status'] ?? '';

if (!in_array($status, ['Pregnant', 'Delivered', 'Not Pregnant'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid status', 'records' => []]);
    exit();
}

try {
    // Base query — all female residents 13–49
    $sql = "
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
            (SELECT COUNT(*) FROM prenatal_records WHERE resident_id = r.id AND status = 'Delivered') AS total_deliveries,
            (SELECT MAX(delivery_date) FROM prenatal_records WHERE resident_id = r.id AND status = 'Delivered') AS last_delivery,
            (SELECT MAX(due_date) FROM prenatal_records WHERE resident_id = r.id) AS last_due_date,
            (SELECT MAX(lmp) FROM prenatal_records WHERE resident_id = r.id) AS last_lmp,
            (SELECT id FROM prenatal_records WHERE resident_id = r.id AND status = 'Active' ORDER BY id DESC LIMIT 1) AS active_prenatal_id,
            (SELECT COUNT(*) FROM prenatal_checkups pc 
                JOIN prenatal_records pr ON pc.prenatal_id = pr.id 
                WHERE pr.resident_id = r.id) AS total_checkups
        FROM residents r
        WHERE r.sex = 'Female'
          AND r.pregnancy_status = ?
        ORDER BY r.first_name ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$status]);
    $records = $stmt->fetchAll();

    $formatted = array_map(function($row) {
        $age = (int)$row['age_years'];
        return [
            'id'                => (int)$row['id'],
            'full_name'         => trim($row['first_name'] . ' ' . ($row['middle_name'] ? $row['middle_name'] . ' ' : '') . $row['last_name']),
            'age'               => $age,
            'age_display'       => $age > 0 ? $age . ' yr' . ($age > 1 ? 's' : '') : '—',
            'purok'             => $row['purok'] ?? '—',
            'mobile'            => $row['mobile_number'] ?? '—',
            'account_status'    => $row['account_status'],
            'pregnancy_status'  => $row['pregnancy_status'],
            'total_pregnancies' => (int)$row['total_pregnancies'],
            'total_deliveries'  => (int)$row['total_deliveries'],
            'last_delivery'     => $row['last_delivery'] ?? null,
            'last_due_date'     => $row['last_due_date'] ?? null,
            'last_lmp'          => $row['last_lmp'] ?? null,
            'active_prenatal_id'=> $row['active_prenatal_id'] ? (int)$row['active_prenatal_id'] : null,
            'total_checkups'    => (int)$row['total_checkups'],
        ];
    }, $records);

    echo json_encode(['success' => true, 'records' => $formatted]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage(), 'records' => []]);
}
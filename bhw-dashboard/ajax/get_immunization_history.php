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

$childId = (int) ($_GET['child_id'] ?? 0);

if (!$childId) {
    echo json_encode(['success' => false, 'message' => 'Child ID required']);
    exit();
}

try {
    // Child info
    $childStmt = $pdo->prepare("
        SELECT 
            r.id,
            r.first_name,
            r.middle_name,
            r.last_name,
            r.date_of_birth,
            TIMESTAMPDIFF(YEAR, r.date_of_birth, CURDATE()) AS age_years,
            TIMESTAMPDIFF(MONTH, r.date_of_birth, CURDATE()) AS age_months,
            r.sex,
            r.purok,
            r.parent_id,
            CONCAT(p.first_name, ' ', IFNULL(p.middle_name, ''), ' ', p.last_name) AS parent_name,
            p.mobile_number AS parent_contact
        FROM residents r
        LEFT JOIN residents p ON r.parent_id = p.id
        WHERE r.id = ?
    ");
    $childStmt->execute([$childId]);
    $child = $childStmt->fetch();

    if (!$child) {
        echo json_encode(['success' => false, 'message' => 'Child not found']);
        exit();
    }

    // All immunization records sorted by date DESC
    $recStmt = $pdo->prepare("
        SELECT 
            i.id,
            i.vaccine,
            i.dose,
            i.date_administered,
            i.next_dose_date,
            i.status,
            i.notes,
            i.created_at,
            CONCAT(bhw.first_name, ' ', IFNULL(bhw.last_name, '')) AS recorded_by_name
        FROM immunization_records i
        LEFT JOIN bhw ON i.recorded_by = bhw.user_id
        WHERE i.resident_id = ?
        ORDER BY i.date_administered DESC, i.id DESC
    ");
    $recStmt->execute([$childId]);
    $records = $recStmt->fetchAll();

    // Age display
    $ageYears = (int) $child['age_years'];
    $ageMonths = (int) $child['age_months'];
    $ageDisplay = '—';
    if ($ageYears > 0) {
        $ageDisplay = $ageYears . ' yr' . ($ageYears > 1 ? 's' : '');
    } else if ($ageMonths > 0) {
        $ageDisplay = $ageMonths . ' mos';
    }

    // Group records by vaccine for summary
    $byVaccine = [];
    foreach ($records as $r) {
        $v = $r['vaccine'] ?: 'Unknown';
        if (!isset($byVaccine[$v])) {
            $byVaccine[$v] = [];
        }
        $byVaccine[$v][] = $r;
    }

    echo json_encode([
        'success' => true,
        'child' => [
            'id' => (int) $child['id'],
            'full_name' => trim($child['first_name'] . ' ' . ($child['middle_name'] ? $child['middle_name'] . ' ' : '') . $child['last_name']),
            'age_display' => $ageDisplay,
            'age_months' => $ageMonths,
            'sex' => $child['sex'],
            'purok' => $child['purok'] ?? '—',
            'parent_name' => $child['parent_name'] ?: '—',
            'parent_contact' => $child['parent_contact'] ?: '—',
            'date_of_birth' => $child['date_of_birth']
        ],
        'records' => $records,
        'summary_by_vaccine' => $byVaccine
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
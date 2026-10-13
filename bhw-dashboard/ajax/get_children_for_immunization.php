<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'bhw') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized', 'children' => []]);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed', 'children' => []]);
    exit();
}

try {
    // Only children 0-5 years old who DON'T have an active immunization series
    $stmt = $pdo->query("
        SELECT 
            r.id,
            r.first_name,
            r.middle_name,
            r.last_name,
            CONCAT(r.first_name, ' ', IFNULL(r.middle_name, ''), ' ', r.last_name) AS full_name,
            TIMESTAMPDIFF(YEAR, r.date_of_birth, CURDATE()) AS age_years,
            TIMESTAMPDIFF(MONTH, r.date_of_birth, CURDATE()) AS age_months,
            r.purok,
            r.immunization_status,
            r.parent_id,
            CONCAT(p.first_name, ' ', IFNULL(p.middle_name, ''), ' ', p.last_name) AS parent_name
        FROM residents r
        LEFT JOIN residents p ON r.parent_id = p.id
        WHERE TIMESTAMPDIFF(YEAR, r.date_of_birth, CURDATE()) <= 5
          AND (r.immunization_status IS NULL OR r.immunization_status = 'None')
        ORDER BY r.first_name
    ");
    $children = $stmt->fetchAll();

    // Format
    $formatted = array_map(function($c) {
        $ageYears = (int) $c['age_years'];
        $ageMonths = (int) $c['age_months'];

        if ($ageYears > 0) {
            $ageDisplay = $ageYears . ' yr' . ($ageYears > 1 ? 's' : '');
        } else if ($ageMonths > 0) {
            $ageDisplay = $ageMonths . ' mos';
        } else {
            $ageDisplay = '0 mos';
        }

        return [
            'id' => (int) $c['id'],
            'full_name' => $c['full_name'],
            'age_display' => $ageDisplay,
            'age_years' => $ageYears,
            'age_months' => $ageMonths,
            'purok' => $c['purok'] ?: '—',
            'parent_name' => $c['parent_name'] ?: null,
            'immunization_status' => $c['immunization_status'] ?: 'None'
        ];
    }, $children);

    echo json_encode(['success' => true, 'children' => $formatted]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage(), 'children' => []]);
}
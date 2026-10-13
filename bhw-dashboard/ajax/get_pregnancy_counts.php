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

try {
    $counts = [
        'Pregnant' => 0,
        'Delivered' => 0,
        'Not Pregnant' => 0
    ];

    $stmt = $pdo->query("
        SELECT pregnancy_status, COUNT(*) AS cnt
        FROM residents
        WHERE sex = 'Female'
        GROUP BY pregnancy_status
    ");
    $rows = $stmt->fetchAll();

    foreach ($rows as $row) {
        $status = $row['pregnancy_status'] ?? 'Not Pregnant';
        if ($status === '' || $status === null) {
            $status = 'Not Pregnant';
        }
        if (isset($counts[$status])) {
            $counts[$status] = (int) $row['cnt'];
        } else {
            $counts['Not Pregnant'] += (int) $row['cnt'];
        }
    }

    echo json_encode([
        'success' => true,
        'counts' => $counts
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
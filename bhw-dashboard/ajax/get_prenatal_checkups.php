<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'bhw') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized', 'checkups' => []]);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed', 'checkups' => []]);
    exit();
}

$prenatalId = $_GET['prenatal_id'] ?? 0;

if (!$prenatalId) {
    echo json_encode(['success' => false, 'message' => 'Prenatal ID required', 'checkups' => []]);
    exit();
}

try {
    $stmt = $pdo->prepare("
        SELECT 
            id,
            prenatal_id,
            checkup_date,
            blood_pressure,
            weight,
            heart_pulse,
            body_temperature,
            respiratory_rate,
            milestone_notes,
            next_checkup,
            created_at
        FROM prenatal_checkups
        WHERE prenatal_id = ?
        ORDER BY checkup_date DESC, id DESC
    ");
    $stmt->execute([$prenatalId]);
    $checkups = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'checkups' => $checkups
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'checkups' => []
    ]);
}
?>
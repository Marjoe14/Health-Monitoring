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

$childId = (int) ($_POST['child_id'] ?? 0);

if (!$childId) {
    echo json_encode(['success' => false, 'message' => 'Child ID required']);
    exit();
}

try {
    // Verify child exists
    $stmt = $pdo->prepare("SELECT first_name, last_name FROM residents WHERE id = ?");
    $stmt->execute([$childId]);
    $child = $stmt->fetch();

    if (!$child) {
        echo json_encode(['success' => false, 'message' => 'Child not found']);
        exit();
    }

    $childName = $child['first_name'] . ' ' . $child['last_name'];

    // Update resident — mark immunization completed
    $updateStmt = $pdo->prepare("
        UPDATE residents 
        SET immunization_status = 'Completed',
            immunization_completed_at = NOW()
        WHERE id = ?
    ");
    $updateStmt->execute([$childId]);

    logActivity(
        $pdo,
        $_SESSION['user_id'],
        'immunization_finished',
        'Marked ' . $childName . ' as finished with immunization series',
        $childId,
        'resident'
    );

    echo json_encode([
        'success' => true,
        'message' => $childName . ' has been marked as finished with all immunizations.'
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
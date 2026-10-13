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

if (!$id) {
    echo json_encode(['success' => false, 'message' => 'Prenatal ID required']);
    exit();
}

try {
    $pdo->beginTransaction();

    $nameStmt = $pdo->prepare("
        SELECT r.id AS resident_id, r.first_name, r.last_name 
        FROM prenatal_records p
        JOIN residents r ON p.resident_id = r.id
        WHERE p.id = ?
    ");
    $nameStmt->execute([$id]);
    $res = $nameStmt->fetch();
    $residentName = $res ? ($res['first_name'] . ' ' . $res['last_name']) : 'Unknown';
    $residentId = $res['resident_id'] ?? null;

    $stmt = $pdo->prepare("
        UPDATE prenatal_records 
        SET status = 'Active', delivery_date = NULL
        WHERE id = ?
    ");
    $result = $stmt->execute([$id]);

    if ($result && $stmt->rowCount() > 0) {
        // ✅ AUTO-UPDATE: set pregnancy_status = 'Pregnant'
        if ($residentId) {
            $updateStmt = $pdo->prepare("UPDATE residents SET pregnancy_status = 'Pregnant' WHERE id = ?");
            $updateStmt->execute([$residentId]);
        }

        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'reactivate_prenatal',
            'Reactivated prenatal record for ' . $residentName,
            $id,
            'prenatal_record'
        );

        $pdo->commit();

        echo json_encode([
            'success' => true, 
            'message' => 'Prenatal record reactivated successfully!'
        ]);
    } else {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Record not found or already active']);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
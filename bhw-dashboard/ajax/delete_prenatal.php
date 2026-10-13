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

    // Get resident info BEFORE deleting
    $nameStmt = $pdo->prepare("
        SELECT r.id AS resident_id, r.first_name, r.last_name, p.status AS prenatal_status
        FROM prenatal_records p
        JOIN residents r ON p.resident_id = r.id
        WHERE p.id = ?
    ");
    $nameStmt->execute([$id]);
    $res = $nameStmt->fetch();
    $residentName = $res ? ($res['first_name'] . ' ' . $res['last_name']) : 'Unknown';
    $residentId = $res['resident_id'] ?? null;
    $wasActive = $res && $res['prenatal_status'] === 'Active';

    $stmt = $pdo->prepare("DELETE FROM prenatal_records WHERE id = ?");
    $result = $stmt->execute([$id]);

    if ($result && $stmt->rowCount() > 0) {
        // ✅ AUTO-UPDATE: if the deleted record was Active, set pregnancy_status back to 'Not Pregnant'
        // but only if she has no other Active prenatal records
        if ($residentId && $wasActive) {
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM prenatal_records WHERE resident_id = ? AND status = 'Active'");
            $checkStmt->execute([$residentId]);
            $activeCount = (int)$checkStmt->fetchColumn();

            if ($activeCount === 0) {
                // Check if she has any delivered records
                $delivStmt = $pdo->prepare("SELECT COUNT(*) FROM prenatal_records WHERE resident_id = ? AND status = 'Delivered'");
                $delivStmt->execute([$residentId]);
                $delivCount = (int)$delivStmt->fetchColumn();

                $newStatus = $delivCount > 0 ? 'Delivered' : 'Not Pregnant';
                $updateStmt = $pdo->prepare("UPDATE residents SET pregnancy_status = ? WHERE id = ?");
                $updateStmt->execute([$newStatus, $residentId]);
            }
        }

        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'delete_prenatal',
            'Deleted prenatal record for ' . $residentName,
            $id,
            'prenatal_record'
        );

        $pdo->commit();

        echo json_encode([
            'success' => true, 
            'message' => 'Prenatal record deleted successfully!'
        ]);
    } else {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Record not found']);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
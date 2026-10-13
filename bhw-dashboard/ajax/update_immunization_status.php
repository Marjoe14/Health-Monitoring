<?php
session_start();
header('Content-Type: application/json');

date_default_timezone_set('Asia/Manila');

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

$userId = $_SESSION['user_id'];

try {
    // ============================================================
    // 1. Auto-mark Completed → Overdue when next_dose_date passed
    // ============================================================
    $overdueStmt = $pdo->prepare("
        UPDATE immunization_records 
        SET status = 'Overdue'
        WHERE status = 'Completed'
          AND next_dose_date IS NOT NULL
          AND next_dose_date < CURDATE()
    ");
    $overdueStmt->execute();
    $overdueCount = $overdueStmt->rowCount();

    // ============================================================
    // 2. Update residents.immunization_status based on their records
    //    - 'Active'    → has at least one non-Completed-series record (has next_dose pending)
    //    - 'Completed' → all records either Completed with no pending next dose OR Overdue is resolved
    //    - 'None'      → no records at all
    // ============================================================
    $resStmt = $pdo->query("SELECT id FROM residents WHERE sex IS NOT NULL");
    $allResidents = $resStmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($allResidents as $rid) {
        // Count total and pending records
        $cntStmt = $pdo->prepare("
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN next_dose_date IS NOT NULL AND status != 'Completed' THEN 1 ELSE 0 END) AS pending
            FROM immunization_records
            WHERE resident_id = ?
        ");
        $cntStmt->execute([$rid]);
        $counts = $cntStmt->fetch();

        $total = (int) $counts['total'];
        $pending = (int) $counts['pending'];

        if ($total === 0) {
            // No records
            $updStmt = $pdo->prepare("UPDATE residents SET immunization_status = 'None' WHERE id = ?");
            $updStmt->execute([$rid]);
        } else if ($pending > 0) {
            // Has unfinished doses
            $updStmt = $pdo->prepare("UPDATE residents SET immunization_status = 'Active', immunization_completed_at = NULL WHERE id = ?");
            $updStmt->execute([$rid]);
        } else {
            // All done — but only mark as Completed if not already
            $updStmt = $pdo->prepare("
                UPDATE residents 
                SET immunization_status = 'Completed',
                    immunization_completed_at = COALESCE(immunization_completed_at, NOW())
                WHERE id = ? AND immunization_status != 'Completed'
            ");
            $updStmt->execute([$rid]);
        }
    }

    // ============================================================
    // 3. Create BHW notifications for overdue (no duplicates per record)
    // ============================================================
    $odStmt = $pdo->query("
        SELECT 
            i.id,
            i.vaccine,
            i.dose,
            i.next_dose_date,
            CONCAT(r.first_name, ' ', r.last_name) AS child_name
        FROM immunization_records i
        JOIN residents r ON i.resident_id = r.id
        WHERE i.status = 'Overdue'
    ");
    $overdue = $odStmt->fetchAll();

    $notifCreated = 0;
    foreach ($overdue as $o) {
        // Check if notification already exists (by title)
        $title = '⚠️ Overdue: ' . $o['vaccine'] . ' for ' . $o['child_name'];
        $checkStmt = $pdo->prepare("
            SELECT id FROM bhw_notifications 
            WHERE user_id = ? AND title = ? 
              AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ");
        $checkStmt->execute([$userId, $title]);

        if (!$checkStmt->fetch()) {
            $msg = $o['child_name'] . ' is overdue for ' . $o['vaccine'] . ' (' . $o['dose'] . '). Scheduled: ' . $o['next_dose_date'];
            $insStmt = $pdo->prepare("
                INSERT INTO bhw_notifications 
                (user_id, type, title, message, link, created_at)
                VALUES (?, 'general', ?, ?, '../bhw-dashboard/#immunization', NOW())
            ");
            $insStmt->execute([$userId, $title, $msg]);
            $notifCreated++;
        }
    }

    echo json_encode([
        'success' => true,
        'overdue_updated' => $overdueCount,
        'notifications_created' => $notifCreated
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
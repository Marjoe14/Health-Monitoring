<?php
session_start();
header('Content-Type: application/json');

// ============================================================
// SET TIMEZONE TO PHILIPPINES
// ============================================================
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

$appointmentId = $_POST['appointment_id'] ?? 0;
$decision = $_POST['decision'] ?? '';
$notes = $_POST['notes'] ?? '';
$bhwUserId = $_SESSION['user_id'];

if (!$appointmentId || !$decision) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

if (!in_array($decision, ['approve', 'reject'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid decision']);
    exit();
}

try {
    $pdo->beginTransaction();

    // ============================================================
    // VERIFY APPOINTMENT EXISTS WITH PENDING CANCELLATION
    // ============================================================
    $stmt = $pdo->prepare("
        SELECT 
            a.id, 
            a.resident_id, 
            a.appointment_date,
            a.appointment_time,
            a.cancellation_reason,
            r.first_name,
            r.last_name,
            r.user_id AS resident_user_id,
            r.mobile_number
        FROM appointments a
        JOIN residents r ON a.resident_id = r.id
        WHERE a.id = ? AND a.cancellation_status = 'pending'
    ");
    $stmt->execute([$appointmentId]);
    $appointment = $stmt->fetch();

    if (!$appointment) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Appointment not found or no pending request']);
        exit();
    }

    $residentName = $appointment['first_name'] . ' ' . $appointment['last_name'];
    $residentUserId = $appointment['resident_user_id'];
    $residentId = $appointment['resident_id'];

    // ============================================================
    // CURRENT TIMESTAMP (Philippine Time)
    // ============================================================
    $decisionAtDisplay = date('M d, Y \a\t h:i A');

    // ============================================================
    // PROCESS DECISION
    // ============================================================
    if ($decision === 'approve') {
        $stmt = $pdo->prepare("
            UPDATE appointments 
            SET status = 'Cancelled',
                cancellation_status = 'approved',
                cancellation_approved_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$appointmentId]);

        $message = 'Cancellation approved. Appointment has been cancelled.';
        $notifTitle = '✅ Cancellation Approved';
        $notifMessage = 'Your cancellation request for the appointment on ' 
            . $appointment['appointment_date'] . ' has been APPROVED.'
            . ($notes ? ' Reason: ' . $notes : '')
            . ' (Decided on: ' . $decisionAtDisplay . ')';

        $bhwNotifTitle = '✅ Cancellation Approved';
        $bhwNotifMessage = 'You approved the cancellation request of ' . $residentName 
            . ' for the appointment on ' . $appointment['appointment_date'] . '.'
            . ' (Decided on: ' . $decisionAtDisplay . ')';

        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'approve_cancellation',
            'Approved cancellation for ' . $residentName . ' (Appointment: ' . $appointment['appointment_date'] . ')',
            $appointmentId,
            'appointment'
        );
    } else {
        $stmt = $pdo->prepare("
            UPDATE appointments 
            SET cancellation_status = 'rejected',
                cancellation_requested = 0
            WHERE id = ?
        ");
        $stmt->execute([$appointmentId]);

        $message = 'Cancellation rejected. Appointment remains scheduled.';
        $notifTitle = '❌ Cancellation Rejected';
        $notifMessage = 'Your cancellation request for the appointment on ' 
            . $appointment['appointment_date'] . ' has been REJECTED.'
            . ($notes ? ' Reason: ' . $notes : '')
            . ' (Decided on: ' . $decisionAtDisplay . ')';

        $bhwNotifTitle = '❌ Cancellation Rejected';
        $bhwNotifMessage = 'You rejected the cancellation request of ' . $residentName 
            . ' for the appointment on ' . $appointment['appointment_date'] . '.'
            . ' (Decided on: ' . $decisionAtDisplay . ')';

        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'reject_cancellation',
            'Rejected cancellation for ' . $residentName . ' (Appointment: ' . $appointment['appointment_date'] . ')',
            $appointmentId,
            'appointment'
        );
    }

    // ============================================================
    // NOTIFICATION FOR THE RESIDENT
    // ============================================================
    if ($residentUserId) {
        $notifStmt = $pdo->prepare("
            INSERT INTO notifications 
            (user_id, resident_id, type, title, message, link, created_at)
            VALUES (?, ?, 'appointment', ?, ?, '../resident-dashboard/#appointments', NOW())
        ");
        $notifStmt->execute([
            $residentUserId,
            $residentId,
            $notifTitle,
            $notifMessage
        ]);
    }

    // ============================================================
    // NOTIFICATION FOR THE BHW
    // ============================================================
    $bhwNotifStmt = $pdo->prepare("
        INSERT INTO bhw_notifications 
        (user_id, type, title, message, link, created_at)
        VALUES (?, 'approved', ?, ?, '../bhw-dashboard/#appointments', NOW())
    ");
    $bhwNotifStmt->execute([
        $bhwUserId,
        $bhwNotifTitle,
        $bhwNotifMessage
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => $message,
        'decision' => $decision,
        'decided_at' => $decisionAtDisplay
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
<?php
session_start();
header('Content-Type: application/json');

date_default_timezone_set('Asia/Manila');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'bhw') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/sms_config.php';
require_once __DIR__ . '/../../config/activity_log.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$residentId  = $_POST['resident_id'] ?? 0;
$date        = $_POST['date'] ?? '';
$time        = $_POST['time'] ?? '';
$type        = $_POST['type'] ?? 'General Check-up';
$location    = $_POST['location'] ?? 'Barangay Health Center';
$notes       = $_POST['notes'] ?? '';
$scheduledBy = $_SESSION['user_id'];

$status = 'Upcoming';

if (!$residentId || !$date || !$time || !$type) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
    exit();
}

// ============================================================
// ✅ Validate appointment date — must be tomorrow or later
// ============================================================
if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m)) {
    echo json_encode(['success' => false, 'message' => 'Invalid date format.']);
    exit();
}

$apptYear  = (int) $m[1];
$apptMonth = (int) $m[2];
$apptDay   = (int) $m[3];

if (!checkdate($apptMonth, $apptDay, $apptYear)) {
    echo json_encode(['success' => false, 'message' => 'Invalid appointment date.']);
    exit();
}

$todayYear  = (int) date('Y');
$todayMonth = (int) date('n');
$todayDay   = (int) date('j');

$apptTimestamp  = mktime(0, 0, 0, $apptMonth, $apptDay, $apptYear);
$todayTimestamp = mktime(0, 0, 0, $todayMonth, $todayDay, $todayYear);

if ($apptTimestamp <= $todayTimestamp) {
    echo json_encode(['success' => false, 'message' => 'Appointment must be tomorrow or later.']);
    exit();
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        INSERT INTO appointments 
        (resident_id, appointment_date, appointment_time, type, location, status, notes, scheduled_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $result = $stmt->execute([
        $residentId,
        $date,
        $time,
        $type,
        $location,
        $status,
        $notes,
        $scheduledBy
    ]);

    if (!$result) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Failed to schedule appointment']);
        exit();
    }

    $appointmentId = $pdo->lastInsertId();

    $stmt = $pdo->prepare("
        SELECT 
            r.id,
            r.first_name,
            r.last_name,
            r.mobile_number,
            r.user_id,
            r.parent_id,
            p.mobile_number AS parent_mobile,
            u.id AS has_account
        FROM residents r
        LEFT JOIN residents p ON r.parent_id = p.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
    ");
    $stmt->execute([$residentId]);
    $resident = $stmt->fetch();

    if (!$resident) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Resident not found']);
        exit();
    }

    $residentName = $resident['first_name'] . ' ' . $resident['last_name'];
    $hasAccount   = !empty($resident['has_account']);
    $mobileNumber = $resident['mobile_number'] ?? $resident['parent_mobile'] ?? null;

    logActivity(
        $pdo,
        $_SESSION['user_id'],
        'add_appointment',
        'Scheduled ' . $type . ' appointment for ' . $residentName . ' on ' . $date . ' at ' . $time,
        $appointmentId,
        'appointment'
    );

    $scheduledAtDisplay = date('M d, Y \a\t h:i A');

    $smsSent = false;
    if ($mobileNumber) {
        $smsMessage = getAppointmentSMSMessage($residentName, $date, $time, $type, $location);
        $smsResult  = sendSemaphoreSMS($mobileNumber, $smsMessage);
        $smsSent    = $smsResult['success'];
    }

    $notificationSent = false;
    if ($hasAccount) {
        $residentNotifTitle = '📅 Appointment Scheduled';
        $residentNotifMessage = 'Your ' . $type . ' appointment on ' . $date 
            . ' at ' . $time . ' has been scheduled.'
            . ' (Scheduled on: ' . $scheduledAtDisplay . ')';
        $residentNotifLink = '../resident-dashboard/#appointments';

        $stmt = $pdo->prepare("
            INSERT INTO notifications 
            (user_id, resident_id, type, title, message, link, created_at)
            VALUES (?, ?, 'appointment', ?, ?, ?, NOW())
        ");
        $notificationSent = $stmt->execute([
            $resident['user_id'],
            $residentId,
            $residentNotifTitle,
            $residentNotifMessage,
            $residentNotifLink
        ]);
    }

    $bhwNotifTitle = '📅 Appointment Scheduled';
    $bhwNotifMessage = 'You scheduled a ' . $type . ' appointment for ' 
        . $residentName . ' on ' . $date . ' at ' . $time 
        . '. (Scheduled on: ' . $scheduledAtDisplay . ')';
    $bhwNotifLink = '../bhw-dashboard/#appointments';

    $bhwNotifStmt = $pdo->prepare("
        INSERT INTO bhw_notifications 
        (user_id, type, title, message, link, created_at)
        VALUES (?, 'appointment', ?, ?, ?, NOW())
    ");
    $bhwNotifStmt->execute([
        $scheduledBy,
        $bhwNotifTitle,
        $bhwNotifMessage,
        $bhwNotifLink
    ]);

    $pdo->commit();

    echo json_encode([
        'success'           => true,
        'id'                => $appointmentId,
        'message'           => 'Appointment scheduled successfully',
        'status'            => $status,
        'scheduled_at'      => $scheduledAtDisplay,
        'sms_sent'          => $smsSent,
        'notification_sent' => $notificationSent,
        'has_account'       => $hasAccount,
        'mobile_number'     => $mobileNumber ? '***' . substr($mobileNumber, -4) : null
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
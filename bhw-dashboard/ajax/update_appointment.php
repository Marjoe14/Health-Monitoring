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

$id = $_POST['id'] ?? 0;
$residentId = $_POST['resident_id'] ?? 0;
$date = $_POST['date'] ?? '';
$time = $_POST['time'] ?? '';
$type = $_POST['type'] ?? '';
$location = $_POST['location'] ?? 'Barangay Health Center';
$status = $_POST['status'] ?? 'Upcoming';
$notes = $_POST['notes'] ?? '';

if (!$id || !$residentId || !$date || !$time || !$type) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
    exit();
}

// ✅ Validate appointment date (only if status is Upcoming)
if ($status === 'Upcoming') {
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
}

try {
    $pdo->beginTransaction();

    $oldStmt = $pdo->prepare("SELECT * FROM appointments WHERE id = ?");
    $oldStmt->execute([$id]);
    $oldAppointment = $oldStmt->fetch();

    $stmt = $pdo->prepare("
        UPDATE appointments 
        SET resident_id = ?, appointment_date = ?, appointment_time = ?, 
            type = ?, location = ?, status = ?, notes = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $result = $stmt->execute([
        $residentId,
        $date,
        $time,
        $type,
        $location,
        $status,
        $notes,
        $id
    ]);

    if (!$result || $stmt->rowCount() == 0) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'No changes made or appointment not found']);
        exit();
    }

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

    if ($resident) {
        $residentName = $resident['first_name'] . ' ' . $resident['last_name'];
        $hasAccount = !empty($resident['has_account']);
        $mobileNumber = $resident['mobile_number'] ?? $resident['parent_mobile'] ?? null;

        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'update_appointment',
            'Updated appointment for ' . $residentName . ' on ' . $date . ' at ' . $time . ' (' . $type . ')',
            $id,
            'appointment'
        );

        if ($status !== $oldAppointment['status'] || $date !== $oldAppointment['appointment_date']) {
            if ($mobileNumber) {
                $smsMessage = getAppointmentSMSMessage($residentName, $date, $time, $type, $location);
                if ($status === 'Completed') {
                    $smsMessage = "✅ Appointment Completed\n\nDear " . $residentName . ",\n\nYour " . $type . " appointment on " . $date . " at " . $time . " has been marked as COMPLETED.\n\nThank you for visiting Barangay Garsika Health Center!";
                } elseif ($status === 'Cancelled') {
                    $smsMessage = "❌ Appointment Cancelled\n\nDear " . $residentName . ",\n\nYour " . $type . " appointment on " . $date . " at " . $time . " has been CANCELLED.\n\nPlease contact the Barangay Health Center for rescheduling.";
                }
                sendSemaphoreSMS($mobileNumber, $smsMessage);
            }
        }

        if ($hasAccount) {
            $notifData = createAppointmentNotification(
                $residentId,
                $residentName,
                $date,
                $time,
                $type,
                $status
            );

            $stmt = $pdo->prepare("
                INSERT INTO notifications 
                (user_id, resident_id, type, title, message, link, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $resident['user_id'],
                $residentId,
                $notifData['type'],
                $notifData['title'],
                $notifData['message'],
                $notifData['link']
            ]);
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true, 
        'message' => 'Appointment updated successfully'
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
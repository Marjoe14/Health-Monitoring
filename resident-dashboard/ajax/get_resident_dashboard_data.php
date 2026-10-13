<?php
// ========================================
// GET RESIDENT DASHBOARD DATA
// ✅ Accurate counts for: upcoming appointments, unread notifications, immunizations due, last BMI
// ========================================

session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'resident') {
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
    // Get resident
    $stmt = $pdo->prepare("SELECT id, first_name, last_name FROM residents WHERE user_id = ?");
    $stmt->execute([$userId]);
    $resident = $stmt->fetch();

    if (!$resident) {
        echo json_encode(['success' => false, 'message' => 'Resident not found']);
        exit();
    }

    $residentId = $resident['id'];

    // ============================================================
    // ✅ UPCOMING APPOINTMENTS COUNT (excludes cancelled/completed/past)
    // ============================================================
    $upcomingStmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM appointments 
        WHERE resident_id = ? 
          AND status = 'Upcoming'
          AND appointment_date >= CURDATE()
    ");
    $upcomingStmt->execute([$residentId]);
    $upcomingCount = (int) $upcomingStmt->fetchColumn();

    // ============================================================
    // ✅ UPCOMING APPOINTMENTS LIST (next 5, sorted by date/time)
    // ============================================================
    $apptStmt = $pdo->prepare("
        SELECT 
            id,
            appointment_date,
            appointment_time,
            type,
            location,
            status
        FROM appointments 
        WHERE resident_id = ? 
          AND status = 'Upcoming'
          AND appointment_date >= CURDATE()
        ORDER BY appointment_date ASC, appointment_time ASC
        LIMIT 5
    ");
    $apptStmt->execute([$residentId]);
    $appointments = $apptStmt->fetchAll();

    // ============================================================
    // ✅ UNREAD NOTIFICATIONS COUNT
    // ============================================================
    $notifStmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM notifications 
        WHERE user_id = ? AND is_read = 0
    ");
    $notifStmt->execute([$userId]);
    $unreadNotifications = (int) $notifStmt->fetchColumn();

    // ============================================================
    // ✅ IMMUNIZATIONS DUE (resident + their children)
    // ============================================================
    $familyStmt = $pdo->prepare("SELECT id FROM residents WHERE parent_id = ?");
    $familyStmt->execute([$residentId]);
    $familyIds = $familyStmt->fetchAll(PDO::FETCH_COLUMN);
    $allIds = array_merge([$residentId], $familyIds);

    if (!empty($allIds)) {
        $placeholders = implode(',', array_fill(0, count($allIds), '?'));
        $immStmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM immunization_records 
            WHERE resident_id IN ($placeholders) 
              AND status IN ('Upcoming', 'Overdue')
        ");
        $immStmt->execute($allIds);
        $immunizationsDue = (int) $immStmt->fetchColumn();
    } else {
        $immunizationsDue = 0;
    }

    // ============================================================
    // ✅ LAST BMI (resident's most recent BMI)
    // ============================================================
    $bmiStmt = $pdo->prepare("
        SELECT bmi, category, recorded_at 
        FROM bmi_records 
        WHERE resident_id = ? 
        ORDER BY recorded_at DESC 
        LIMIT 1
    ");
    $bmiStmt->execute([$residentId]);
    $lastBmiRecord = $bmiStmt->fetch();

    $lastBmi = '—';
    if ($lastBmiRecord) {
        $lastBmi = $lastBmiRecord['bmi'];
    }

    // ============================================================
    // RESPONSE
    // ============================================================
    echo json_encode([
        'success' => true,
        'resident_id' => (int) $residentId,
        'resident_name' => $resident['first_name'] . ' ' . $resident['last_name'],
        'upcoming_appointments' => $upcomingCount,
        'unread_notifications' => $unreadNotifications,
        'immunizations_due' => $immunizationsDue,
        'last_bmi' => $lastBmi,
        'appointments' => $appointments
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
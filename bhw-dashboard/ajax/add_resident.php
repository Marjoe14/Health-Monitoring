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

$firstName = $_POST['first_name'] ?? '';
$middleName = $_POST['middle_name'] ?? '';
$lastName = $_POST['last_name'] ?? '';
$dateOfBirth = $_POST['dob'] ?? '';
$sex = $_POST['sex'] ?? '';
$purok = $_POST['purok'] ?? '';
$address = $_POST['address'] ?? '';
$mobile = $_POST['mobile'] ?? '';
$household = $_POST['household'] ?? '';
$emergencyContact = $_POST['emergency_contact'] ?? '';
$emergencyNumber = $_POST['emergency_number'] ?? '';
$medicalHistory = $_POST['medical_history'] ?? '';

try {
    $stmt = $pdo->prepare("
        INSERT INTO residents 
        (first_name, middle_name, last_name, date_of_birth, sex, purok, address, mobile_number, household, emergency_contact, emergency_number, medical_history, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW())
    ");
    $result = $stmt->execute([
        $firstName, $middleName, $lastName, $dateOfBirth, $sex, $purok,
        $address, $mobile, $household, $emergencyContact, $emergencyNumber,
        $medicalHistory
    ]);

    if ($result) {
        $residentId = $pdo->lastInsertId();

        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'add_resident',
            'Added new adult resident: ' . $firstName . ' ' . $lastName,
            $residentId,
            'resident'
        );

        echo json_encode(['success' => true, 'id' => $residentId, 'message' => 'Resident added successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add resident']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
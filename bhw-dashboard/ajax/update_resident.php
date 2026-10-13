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

$createAccount = $_POST['create_account'] ?? '0';
$accountUsername = trim($_POST['account_username'] ?? '');
$accountPassword = $_POST['account_password'] ?? '';

if (!$id) {
    echo json_encode(['success' => false, 'message' => 'Resident ID required']);
    exit();
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        UPDATE residents 
        SET first_name = ?, middle_name = ?, last_name = ?, date_of_birth = ?, sex = ?, 
            purok = ?, address = ?, mobile_number = ?, household = ?, 
            emergency_contact = ?, emergency_number = ?, medical_history = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $firstName, $middleName, $lastName, $dateOfBirth, $sex, $purok,
        $address, $mobile, $household, $emergencyContact, $emergencyNumber,
        $medicalHistory, $id
    ]);

    $message = 'Resident updated successfully';

    // LOG ACTIVITY
    logActivity(
        $pdo,
        $_SESSION['user_id'],
        'update_resident',
        'Updated resident info: ' . $firstName . ' ' . $lastName,
        $id,
        'resident'
    );

    // Handle account creation
    if ($createAccount === '1' && $accountUsername && $accountPassword) {
        $checkStmt = $pdo->prepare("SELECT user_id FROM residents WHERE id = ?");
        $checkStmt->execute([$id]);
        $existingUser = $checkStmt->fetch();

        if ($existingUser && $existingUser['user_id']) {
            $message = 'Resident updated. (Already has an account)';
        } else {
            $userCheck = $pdo->prepare("SELECT id FROM users WHERE username = ?");
            $userCheck->execute([$accountUsername]);
            if ($userCheck->fetch()) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'Username already taken. Please choose another.']);
                exit();
            }

            $hashedPassword = password_hash($accountPassword, PASSWORD_DEFAULT);

            $userStmt = $pdo->prepare("
                INSERT INTO users (username, password, role, status, created_at)
                VALUES (?, ?, 'resident', 'active', NOW())
            ");
            $userStmt->execute([$accountUsername, $hashedPassword]);
            $newUserId = $pdo->lastInsertId();

            $linkStmt = $pdo->prepare("UPDATE residents SET user_id = ? WHERE id = ?");
            $linkStmt->execute([$newUserId, $id]);

            $message = 'Resident updated and account created successfully';

            // LOG ACCOUNT CREATION
            logActivity(
                $pdo,
                $_SESSION['user_id'],
                'create_account',
                'Created account for resident: ' . $firstName . ' ' . $lastName . ' (username: ' . $accountUsername . ')',
                $id,
                'resident'
            );
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => $message
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
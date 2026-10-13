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

$id = (int)($_POST['id'] ?? 0);
$name = trim($_POST['name'] ?? '');
$description = trim($_POST['description'] ?? '');
$dosesRequired = (int)($_POST['doses_required'] ?? 1);

if (!$id || empty($name)) {
    echo json_encode(['success' => false, 'message' => 'Vaccine ID and name are required']);
    exit();
}

try {
    // Check for duplicate name (excluding current)
    $check = $pdo->prepare("SELECT id FROM vaccines WHERE name = ? AND id != ?");
    $check->execute([$name, $id]);
    if ($check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Vaccine "' . $name . '" already exists']);
        exit();
    }

    // Get old vaccine name for logging
    $oldStmt = $pdo->prepare("SELECT name, doses_required FROM vaccines WHERE id = ?");
    $oldStmt->execute([$id]);
    $oldVaccine = $oldStmt->fetch();

    if (!$oldVaccine) {
        echo json_encode(['success' => false, 'message' => 'Vaccine not found']);
        exit();
    }

    $oldName = $oldVaccine['name'];
    $oldDoses = $oldVaccine['doses_required'];

    // Update vaccine
    $stmt = $pdo->prepare("UPDATE vaccines SET name = ?, description = ?, doses_required = ?, updated_at = NOW() WHERE id = ?");
    $result = $stmt->execute([$name, $description, $dosesRequired, $id]);

    if ($result) {
        // Build change description
        $changes = [];
        if ($oldName !== $name) {
            $changes[] = 'name: "' . $oldName . '" → "' . $name . '"';
        }
        if ((int)$oldDoses !== $dosesRequired) {
            $changes[] = 'doses: ' . $oldDoses . ' → ' . $dosesRequired;
        }
        $changeText = !empty($changes) ? ' (' . implode(', ', $changes) . ')' : '';

        // LOG ACTIVITY
        logActivity(
            $pdo,
            $_SESSION['user_id'],
            'update_vaccine',
            'Updated vaccine: ' . $name . $changeText,
            $id,
            'vaccine'
        );

        echo json_encode(['success' => true, 'message' => 'Vaccine updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update vaccine']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
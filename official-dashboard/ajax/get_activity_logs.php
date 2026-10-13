<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'official') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized', 'logs' => [], 'stats' => []]);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

$pdo = getDBConnection();
if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed', 'logs' => [], 'stats' => []]);
    exit();
}

try {
    // Filters
    $bhwId     = isset($_GET['bhw_id']) && $_GET['bhw_id'] !== '' ? (int)$_GET['bhw_id'] : null;
    $action    = isset($_GET['action']) && $_GET['action'] !== '' ? $_GET['action'] : null;
    $dateFrom  = isset($_GET['date_from']) && $_GET['date_from'] !== '' ? $_GET['date_from'] : null;
    $dateTo    = isset($_GET['date_to']) && $_GET['date_to'] !== '' ? $_GET['date_to'] : null;
    $search    = isset($_GET['search']) && $_GET['search'] !== '' ? trim($_GET['search']) : null;
    $limit     = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    if ($limit > 500) $limit = 500;

    $sql = "
        SELECT 
            al.id,
            al.user_id,
            al.user_role,
            al.user_name,
            al.action_type,
            al.description,
            al.target_id,
            al.target_type,
            al.created_at
        FROM activity_logs al
        WHERE al.user_role = 'bhw'
    ";
    $params = [];

    if ($bhwId) {
        $sql .= " AND al.user_id = ?";
        $params[] = $bhwId;
    }

    if ($action) {
        $sql .= " AND al.action_type = ?";
        $params[] = $action;
    }

    if ($dateFrom) {
        $sql .= " AND DATE(al.created_at) >= ?";
        $params[] = $dateFrom;
    }

    if ($dateTo) {
        $sql .= " AND DATE(al.created_at) <= ?";
        $params[] = $dateTo;
    }

    if ($search) {
        $sql .= " AND (al.description LIKE ? OR al.user_name LIKE ?)";
        $searchLike = '%' . $search . '%';
        $params[] = $searchLike;
        $params[] = $searchLike;
    }

    $sql .= " ORDER BY al.created_at DESC LIMIT " . $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll();

    // Format logs
    $formattedLogs = array_map(function($log) {
        return [
            'id' => (int)$log['id'],
            'user_id' => (int)$log['user_id'],
            'user_name' => $log['user_name'] ?: 'Unknown',
            'action_type' => $log['action_type'] ?: 'general',
            'description' => $log['description'] ?: '',
            'target_id' => $log['target_id'] ? (int)$log['target_id'] : null,
            'target_type' => $log['target_type'] ?: null,
            'created_at' => $log['created_at'],
            'time_ago' => timeAgo($log['created_at'])
        ];
    }, $logs);

    // Get list of all BHWs
    $bhwStmt = $pdo->query("
        SELECT 
            b.id,
            b.user_id,
            CONCAT(b.first_name, ' ', IFNULL(b.middle_name, ''), ' ', b.last_name) AS full_name,
            u.username
        FROM bhw b
        JOIN users u ON b.user_id = u.id
        ORDER BY b.first_name
    ");
    $bhwList = $bhwStmt->fetchAll();

    // Get distinct action types
    $actionStmt = $pdo->query("
        SELECT DISTINCT action_type 
        FROM activity_logs 
        WHERE user_role = 'bhw'
        ORDER BY action_type
    ");
    $actionTypes = $actionStmt->fetchAll(PDO::FETCH_COLUMN);

    // Stats
    $todayStmt = $pdo->query("
        SELECT COUNT(*) 
        FROM activity_logs 
        WHERE user_role = 'bhw' AND DATE(created_at) = CURDATE()
    ");
    $todayCount = (int)$todayStmt->fetchColumn();

    $weekStmt = $pdo->query("
        SELECT COUNT(*) 
        FROM activity_logs 
        WHERE user_role = 'bhw' 
          AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $weekCount = (int)$weekStmt->fetchColumn();

    $monthStmt = $pdo->query("
        SELECT COUNT(*) 
        FROM activity_logs 
        WHERE user_role = 'bhw' 
          AND YEAR(created_at) = YEAR(CURDATE()) 
          AND MONTH(created_at) = MONTH(CURDATE())
    ");
    $monthCount = (int)$monthStmt->fetchColumn();

    // Per-BHW stats (today)
    $perBhwStmt = $pdo->query("
        SELECT 
            al.user_id,
            al.user_name,
            COUNT(*) AS today_count
        FROM activity_logs al
        WHERE al.user_role = 'bhw' AND DATE(al.created_at) = CURDATE()
        GROUP BY al.user_id, al.user_name
        ORDER BY today_count DESC
    ");
    $perBhwToday = $perBhwStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'logs' => $formattedLogs,
        'bhw_list' => $bhwList,
        'action_types' => $actionTypes,
        'stats' => [
            'today' => $todayCount,
            'this_week' => $weekCount,
            'this_month' => $monthCount,
            'per_bhw_today' => $perBhwToday
        ]
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'logs' => [],
        'stats' => []
    ]);
}

// ============================================================
// Helper: time ago
// ============================================================
function timeAgo($dateString) {
    if (!$dateString) return '—';
    try {
        $past = new DateTime($dateString);
        $now = new DateTime();
        $diff = $now->diff($past);
        
        if ($diff->y > 0) return $diff->y . 'y ago';
        if ($diff->m > 0) return $diff->m . 'mo ago';
        if ($diff->d > 0) return $diff->d . 'd ago';
        if ($diff->h > 0) return $diff->h . 'h ago';
        if ($diff->i > 0) return $diff->i . 'm ago';
        return 'Just now';
    } catch (Exception $e) {
        return '—';
    }
}
?>
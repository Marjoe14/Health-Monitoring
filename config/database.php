<?php
// ========================================
// DATABASE CONFIGURATION - LOCALHOST
// ========================================

// Local MySQL settings (XAMPP/WAMP defaults)
$host     = 'tokaido.proxy.rlwy.net';
$port     = '48077';
$database = 'barangay_health';
$user     = 'root';
$password = 'cTzVzSrvNjXQsKBLmeWYigoTMVTOTqvp';   // XAMPP default = empty password

define('DB_HOST', $host);
define('DB_PORT', $port);
define('DB_NAME', $database);
define('DB_USER', $user);
define('DB_PASS', $password);

function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO(
            $dsn,
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        return null;
    }
}
?>

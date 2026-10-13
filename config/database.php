<?php
// ========================================
// DATABASE CONFIGURATION
// ========================================

// Load .env file if it exists
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if (!getenv($key)) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

$database = getenv('MYSQLDATABASE') ?: 'barangay_health';

$databaseUrl = getenv('DATABASE_URL');

if ($databaseUrl) {
    $parsed   = parse_url($databaseUrl);
    $host     = $parsed['host'] ?? getenv('MYSQLHOST')     ?: 'localhost';
    $port     = $parsed['port'] ?? getenv('MYSQLPORT')     ?: '3306';
    $user     = $parsed['user'] ?? getenv('MYSQLUSER')     ?: 'root';
    $password = $parsed['pass'] ?? getenv('MYSQLPASSWORD') ?: '';
} else {
    $host     = getenv('MYSQLHOST')     ?: 'localhost';
    $port     = getenv('MYSQLPORT')     ?: '3306';
    $user     = getenv('MYSQLUSER')     ?: 'root';
    $password = getenv('MYSQLPASSWORD') ?: '';
}

define('DB_HOST', $host);
define('DB_PORT', $port);
define('DB_NAME', $database);
define('DB_USER', $user);
define('DB_PASS', $password);

function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false
        ]);
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        return null;
    }
}

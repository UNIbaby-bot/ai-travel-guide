<?php
/**
 * 資料庫連線設定
 *
 * $USE_MYSQL = true　→ 連到 MySQL（跟你在 phpMyAdmin 操作的是同一個資料庫，
 *              phpMyAdmin 改的資料，網站會直接反映出來）
 * $USE_MYSQL = false → 連回 SQLite（database/travel.sqlite，開箱即用、不用另外裝 MySQL，
 *              評量老師在他電腦上跑的時候最不容易出狀況）
 *
 * 兩種模式的 API 程式碼完全不用改，只有這個檔案、這一個開關的差別。
 */
$USE_MYSQL = true;

// 啟動 session（管理後台登入狀態用），要放在任何輸出之前
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function getPDO(): PDO
{
    global $USE_MYSQL;

    if ($USE_MYSQL) {
        return getMysqlPDO();
    }
    return getSqlitePDO();
}

function getMysqlPDO(): PDO
{
    // 跟 phpMyAdmin 裡看到的伺服器/資料庫名稱要一致
    $host   = '127.0.0.1';
    $port   = '3306';
    $dbName = 'tribewalk_1';
    $user   = 'root';
    $pass   = '';                     // XAMPP 預設密碼是空的，如果你的 MySQL 有設密碼，填在這裡

    $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    ensureDefaultAdmin($pdo);

    return $pdo;
}

function getSqlitePDO(): PDO
{
    $dbFile = __DIR__ . '/../../database/travel.sqlite';

    // 若資料庫檔案不存在，自動用 schema.sql 建立並灌入種子資料
    $needInit = !file_exists($dbFile);

    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON');

    if ($needInit) {
        $sql = file_get_contents(__DIR__ . '/../../database/schema.sql');
        $pdo->exec($sql);
    }

    ensureDefaultAdmin($pdo);

    return $pdo;
}

/**
 * 第一次啟動時，若還沒有任何管理員帳號，自動建立一組預設帳密
 * 帳號：admin　密碼：admin123　【正式使用前務必登入後改密碼】
 */
function ensureDefaultAdmin(PDO $pdo): void
{
    $count = (int)$pdo->query('SELECT COUNT(*) AS c FROM admins')->fetch()['c'];
    if ($count === 0) {
        $stmt = $pdo->prepare('INSERT INTO admins (username, password_hash) VALUES (:u, :p)');
        $stmt->execute([
            'u' => 'admin',
            'p' => password_hash('admin123', PASSWORD_DEFAULT),
        ]);
    }
}

/**
 * 統一的 JSON 回應格式
 * 成功: { "success": true, "data": ... , "message": "..." }
 * 失敗: { "success": false, "message": "錯誤原因" }
 */
function jsonResponse($data, int $status = 200, string $message = 'ok')
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => $status >= 200 && $status < 300,
        'message' => $message,
        'data'    => $data,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * 檢查是否已登入管理後台，未登入就直接回傳 401 並中止
 * 在需要保護的 API（新增／修改／刪除）開頭呼叫這個函式即可
 */
function requireAdmin(): void
{
    if (empty($_SESSION['admin_id'])) {
        jsonResponse(null, 401, '請先登入管理後台');
    }
}

/**
 * 檢查是否已登入會員（一般訪客帳號，跟管理員是分開的 session key）
 * 回傳目前登入的 member_id，方便呼叫端直接使用
 */
function requireMember(): int
{
    if (empty($_SESSION['member_id'])) {
        jsonResponse(null, 401, '請先登入會員');
    }
    return (int)$_SESSION['member_id'];
}

// 允許前端跨網域呼叫（若前端與後端改跑不同網址/port 才需要；
// 本專案建議前後端用同一個 php -S 一起啟動，屬於同一來源，可省略這段也沒關係）
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

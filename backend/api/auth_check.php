<?php
/**
 * GET /api/auth_check.php -> 檢查目前瀏覽器 session 是否已登入管理後台
 */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(null, 405, '不支援的方法');
}

if (!empty($_SESSION['admin_id'])) {
    jsonResponse(['loggedIn' => true, 'username' => $_SESSION['admin_name']], 200, 'ok');
} else {
    jsonResponse(['loggedIn' => false], 200, 'ok');
}

<?php
/**
 * GET /api/member_check.php -> 檢查目前瀏覽器是否已登入會員
 */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(null, 405, '不支援的方法');
}

if (!empty($_SESSION['member_id'])) {
    jsonResponse([
        'loggedIn' => true,
        'id'       => $_SESSION['member_id'],
        'username' => $_SESSION['member_name'],
    ], 200, 'ok');
} else {
    jsonResponse(['loggedIn' => false], 200, 'ok');
}

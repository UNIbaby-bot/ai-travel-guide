<?php
/**
 * POST /api/auth_logout.php -> 清除登入狀態
 */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(null, 405, '不支援的方法');
}

$_SESSION = [];
session_destroy();

jsonResponse(null, 200, '已登出');

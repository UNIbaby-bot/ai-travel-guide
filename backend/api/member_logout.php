<?php
/**
 * POST /api/member_logout.php
 * 只清除會員的登入狀態，不影響管理員(admin)的登入狀態
 */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(null, 405, '不支援的方法');
}

unset($_SESSION['member_id'], $_SESSION['member_name']);

jsonResponse(null, 200, '已登出');

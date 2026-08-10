<?php
/**
 * POST /api/auth_login.php
 * 輸入: { "username": "admin", "password": "admin123" }
 * 成功後會在 session 記錄 admin_id，之後的請求瀏覽器會自動帶著 session cookie
 */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(null, 405, '不支援的方法');
}

$input    = json_decode(file_get_contents('php://input'), true) ?? [];
$username = trim($input['username'] ?? '');
$password = (string)($input['password'] ?? '');

if ($username === '' || $password === '') {
    jsonResponse(null, 400, '請輸入帳號與密碼');
}

$pdo = getPDO();
$stmt = $pdo->prepare('SELECT * FROM admins WHERE username = :u');
$stmt->execute(['u' => $username]);
$admin = $stmt->fetch();

if (!$admin || !password_verify($password, $admin['password_hash'])) {
    jsonResponse(null, 401, '帳號或密碼錯誤');
}

// 登入成功，重新產生 session id 避免 session fixation
session_regenerate_id(true);
$_SESSION['admin_id']  = $admin['id'];
$_SESSION['admin_name'] = $admin['username'];

jsonResponse(['username' => $admin['username']], 200, '登入成功');

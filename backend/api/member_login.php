<?php
/**
 * POST /api/member_login.php
 * 輸入: { "username_or_email": "...", "password": "..." }
 */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(null, 405, '不支援的方法');
}

$input    = json_decode(file_get_contents('php://input'), true) ?? [];
$account  = trim($input['username_or_email'] ?? '');
$password = (string)($input['password'] ?? '');

if ($account === '' || $password === '') {
    jsonResponse(null, 400, '請輸入帳號與密碼');
}

$pdo  = getPDO();
$stmt = $pdo->prepare('SELECT * FROM members WHERE username = :a OR email = :a');
$stmt->execute(['a' => $account]);
$member = $stmt->fetch();

if (!$member || !password_verify($password, $member['password_hash'])) {
    jsonResponse(null, 401, '帳號或密碼錯誤');
}

session_regenerate_id(true);
$_SESSION['member_id']   = $member['id'];
$_SESSION['member_name'] = $member['username'];

jsonResponse([
    'id'       => $member['id'],
    'username' => $member['username'],
    'email'    => $member['email'],
], 200, '登入成功');

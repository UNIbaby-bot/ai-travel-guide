<?php
/**
 * POST /api/member_register.php
 * 輸入: { "username": "...", "email": "...", "password": "..." }
 */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(null, 405, '不支援的方法');
}

$input    = json_decode(file_get_contents('php://input'), true) ?? [];
$username = trim($input['username'] ?? '');
$email    = trim($input['email'] ?? '');
$password = (string)($input['password'] ?? '');

if ($username === '' || $email === '' || $password === '') {
    jsonResponse(null, 400, '請填寫暱稱、Email 與密碼');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(null, 400, 'Email 格式不正確');
}
if (strlen($password) < 6) {
    jsonResponse(null, 400, '密碼長度至少需要 6 個字元');
}

$pdo = getPDO();

$check = $pdo->prepare('SELECT id FROM members WHERE username = :u OR email = :e');
$check->execute(['u' => $username, 'e' => $email]);
if ($check->fetch()) {
    jsonResponse(null, 409, '這個暱稱或 Email 已經被註冊過了');
}

$stmt = $pdo->prepare(
    'INSERT INTO members (username, email, password_hash) VALUES (:u, :e, :p)'
);
$stmt->execute([
    'u' => $username,
    'e' => $email,
    'p' => password_hash($password, PASSWORD_DEFAULT),
]);

$memberId = (int)$pdo->lastInsertId();

// 註冊完直接幫你登入
session_regenerate_id(true);
$_SESSION['member_id']   = $memberId;
$_SESSION['member_name'] = $username;

jsonResponse(['id' => $memberId, 'username' => $username], 201, '註冊成功');

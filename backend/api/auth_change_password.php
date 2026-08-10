<?php
/**
 * POST /api/auth_change_password.php
 * 輸入: { "old_password": "...", "new_password": "..." }
 * 需要先登入（session 內有 admin_id）才能使用
 */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(null, 405, '不支援的方法');
}

requireAdmin();

$input       = json_decode(file_get_contents('php://input'), true) ?? [];
$oldPassword = (string)($input['old_password'] ?? '');
$newPassword = (string)($input['new_password'] ?? '');

if ($oldPassword === '' || $newPassword === '') {
    jsonResponse(null, 400, '請輸入目前密碼與新密碼');
}
if (strlen($newPassword) < 6) {
    jsonResponse(null, 400, '新密碼長度至少需要 6 個字元');
}

$pdo = getPDO();
$stmt = $pdo->prepare('SELECT * FROM admins WHERE id = :id');
$stmt->execute(['id' => $_SESSION['admin_id']]);
$admin = $stmt->fetch();

if (!$admin || !password_verify($oldPassword, $admin['password_hash'])) {
    jsonResponse(null, 401, '目前密碼不正確');
}

$update = $pdo->prepare('UPDATE admins SET password_hash = :p WHERE id = :id');
$update->execute([
    'p'  => password_hash($newPassword, PASSWORD_DEFAULT),
    'id' => $_SESSION['admin_id'],
]);

jsonResponse(null, 200, '密碼修改成功');

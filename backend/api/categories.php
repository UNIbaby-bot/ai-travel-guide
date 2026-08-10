<?php
/**
 * GET /api/categories.php -> 回傳所有分類（供前端篩選下拉選單使用）
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getPDO();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(null, 405, '不支援的方法');
}

$rows = $pdo->query('SELECT id, name FROM categories ORDER BY id')->fetchAll();
jsonResponse($rows, 200, '查詢成功');

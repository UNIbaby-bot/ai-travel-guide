<?php
/**
 * GET /api/dashboard/statistics -> 回傳各城市景點數量 + 各分類景點比例（供圖表使用）
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getPDO();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(null, 405, '不支援的方法');
}

$byCity = $pdo->query(
    'SELECT city, COUNT(*) AS count FROM attractions GROUP BY city ORDER BY count DESC'
)->fetchAll();

$byCategory = $pdo->query(
    'SELECT c.name AS category, COUNT(*) AS count
     FROM attractions a JOIN categories c ON c.id = a.category_id
     GROUP BY c.name ORDER BY count DESC'
)->fetchAll();

jsonResponse([
    'byCity'     => $byCity,
    'byCategory' => $byCategory,
], 200, '查詢成功');

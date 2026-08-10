<?php
/**
 * 管理員專用揪團管理 API（跟 trip_groups.php 不同：這裡不限發起人本人，
 * 只要是登入的管理員就能管理所有揪團，用於後台稽核/處理糾紛用）
 *
 * GET    /api/admin_trip_groups.php            -> 查詢所有揪團（不限狀態）
 * PUT    /api/admin_trip_groups.php?id=1       -> 管理員強制修改狀態
 * DELETE /api/admin_trip_groups.php?id=1       -> 管理員刪除揪團
 */

require_once __DIR__ . '/../config/db.php';

requireAdmin();

$pdo    = getPDO();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'PUT':
        handlePut($pdo);
        break;
    case 'DELETE':
        handleDelete($pdo);
        break;
    default:
        jsonResponse(null, 405, '不支援的方法');
}

function handleGet(PDO $pdo)
{
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $total = (int)$pdo->query('SELECT COUNT(*) AS c FROM trip_groups')->fetch()['c'];

    $stmt = $pdo->prepare(
        'SELECT g.*, m.username AS organizer_name
         FROM trip_groups g JOIN members m ON m.id = g.organizer_id
         ORDER BY g.created_at DESC LIMIT :limit OFFSET :offset'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();

    foreach ($items as &$g) {
        $countStmt = $pdo->prepare(
            "SELECT COUNT(*) AS c FROM trip_group_members WHERE trip_group_id = :id AND status = 'approved'"
        );
        $countStmt->execute(['id' => $g['id']]);
        $g['approved_count'] = (int)$countStmt->fetch()['c'];
        $g['is_departed'] = strtotime($g['departure_date']) < strtotime(date('Y-m-d'));
    }
    unset($g);

    jsonResponse([
        'items' => $items, 'total' => $total, 'page' => $page,
        'limit' => $limit, 'totalPages' => (int)ceil($total / $limit),
    ], 200, $items ? '查詢成功' : '目前沒有任何揪團');
}

function handlePut(PDO $pdo)
{
    if (empty($_GET['id'])) {
        jsonResponse(null, 400, '缺少揪團 id');
    }
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $allowedStatus = ['open', 'full', 'closed', 'completed', 'cancelled'];
    $status = $input['status'] ?? null;
    if (!in_array($status, $allowedStatus, true)) {
        jsonResponse(null, 400, '狀態值不正確');
    }

    $stmt = $pdo->prepare('UPDATE trip_groups SET status = :status WHERE id = :id');
    $stmt->execute(['status' => $status, 'id' => $_GET['id']]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(null, 404, '查無此揪團');
    }
    jsonResponse(null, 200, '狀態已更新');
}

function handleDelete(PDO $pdo)
{
    if (empty($_GET['id'])) {
        jsonResponse(null, 400, '缺少揪團 id');
    }
    $pdo->prepare('DELETE FROM companion_ratings WHERE trip_group_id = :id')->execute(['id' => $_GET['id']]);
    $pdo->prepare('DELETE FROM trip_group_messages WHERE trip_group_id = :id')->execute(['id' => $_GET['id']]);
    $pdo->prepare('DELETE FROM trip_group_members WHERE trip_group_id = :id')->execute(['id' => $_GET['id']]);
    $stmt = $pdo->prepare('DELETE FROM trip_groups WHERE id = :id');
    $stmt->execute(['id' => $_GET['id']]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(null, 404, '查無此揪團');
    }
    jsonResponse(null, 200, '揪團已刪除');
}

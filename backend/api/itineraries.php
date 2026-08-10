<?php
/**
 * 完整遊程 API
 * GET    /api/itineraries.php               -> 查詢列表（支援 q, region, page, limit）
 * GET    /api/itineraries.php?id=1          -> 查詢單筆
 * POST   /api/itineraries.php               -> 新增
 * PUT    /api/itineraries.php?id=1          -> 修改
 * DELETE /api/itineraries.php?id=1          -> 刪除
 */

require_once __DIR__ . '/../config/db.php';

$pdo    = getPDO();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo);
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
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM itineraries WHERE id = :id');
        $stmt->execute(['id' => $_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(null, 404, '查無此遊程資料');
        }
        jsonResponse($row, 200, '查詢成功');
    }

    $q      = trim($_GET['q'] ?? '');
    $region = trim($_GET['region'] ?? '');
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = max(1, min(50, (int)($_GET['limit'] ?? 9)));
    $offset = ($page - 1) * $limit;

    $where  = [];
    $params = [];
    if ($q !== '') {
        $where[] = '(name LIKE :q OR route_text LIKE :q)';
        $params['q'] = "%{$q}%";
    }
    if ($region !== '') {
        $where[] = 'region = :region';
        $params['region'] = $region;
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) AS total FROM itineraries {$whereSql}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];

    $stmt = $pdo->prepare(
        "SELECT * FROM itineraries {$whereSql} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $key => $val) {
        $stmt->bindValue(":{$key}", $val);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    jsonResponse([
        'items'      => $rows,
        'total'      => $total,
        'page'       => $page,
        'limit'      => $limit,
        'totalPages' => (int)ceil($total / $limit),
    ], 200, $rows ? '查詢成功' : '查無資料');
}

function handlePost(PDO $pdo)
{
    requireAdmin();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $error = validateItinerary($input);
    if ($error) {
        jsonResponse(null, 400, $error);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO itineraries (name, region, route_text) VALUES (:name, :region, :route_text)'
    );
    $stmt->execute([
        'name'       => $input['name'],
        'region'     => $input['region'],
        'route_text' => $input['route_text'],
    ]);

    jsonResponse(['id' => $pdo->lastInsertId()], 201, '新增成功');
}

function handlePut(PDO $pdo)
{
    requireAdmin();
    if (empty($_GET['id'])) {
        jsonResponse(null, 400, '缺少遊程 id');
    }
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $error = validateItinerary($input);
    if ($error) {
        jsonResponse(null, 400, $error);
    }

    $stmt = $pdo->prepare(
        'UPDATE itineraries SET name = :name, region = :region, route_text = :route_text WHERE id = :id'
    );
    $stmt->execute([
        'name'       => $input['name'],
        'region'     => $input['region'],
        'route_text' => $input['route_text'],
        'id'         => $_GET['id'],
    ]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(null, 404, '查無此遊程，無法修改');
    }
    jsonResponse(null, 200, '修改成功');
}

function handleDelete(PDO $pdo)
{
    requireAdmin();
    if (empty($_GET['id'])) {
        jsonResponse(null, 400, '缺少遊程 id');
    }
    $stmt = $pdo->prepare('DELETE FROM itineraries WHERE id = :id');
    $stmt->execute(['id' => $_GET['id']]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(null, 404, '查無此遊程，無法刪除');
    }
    jsonResponse(null, 200, '刪除成功');
}

function validateItinerary(array $input): ?string
{
    $checks = ['name' => '遊程名稱', 'region' => '區域', 'route_text' => '遊程路線'];
    foreach ($checks as $field => $label) {
        if (empty(trim((string)($input[$field] ?? '')))) {
            return "「{$label}」不得為空白";
        }
    }
    return null;
}

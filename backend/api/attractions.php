<?php
/**
 * 景點資料 API
 * GET    /api/attractions.php              -> 查詢列表（支援 q, city, category_id, sort, page, limit）
 *          sort 可用值：featured（預設，有真實圖片優先）、name、city、category_id、created_at
 * GET    /api/attractions.php?id=1         -> 查詢單筆
 * POST   /api/attractions.php              -> 新增
 * PUT    /api/attractions.php?id=1         -> 修改
 * DELETE /api/attractions.php?id=1         -> 刪除
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
    // 查單筆
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare(
            'SELECT a.*, c.name AS category_name
             FROM attractions a
             JOIN categories c ON c.id = a.category_id
             WHERE a.id = :id'
        );
        $stmt->execute(['id' => $_GET['id']]);
        $row = $stmt->fetch();

        if (!$row) {
            jsonResponse(null, 404, '查無此景點資料');
        }
        jsonResponse($row, 200, '查詢成功');
    }

    // 查列表：關鍵字搜尋 + 城市/分類篩選 + 排序 + 分頁
    $q         = trim($_GET['q'] ?? '');
    $city      = trim($_GET['city'] ?? '');
    $categoryId = trim($_GET['category_id'] ?? '');
    $sort      = $_GET['sort'] ?? 'featured';
    $order     = strtoupper($_GET['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
    $page      = max(1, (int)($_GET['page'] ?? 1));
    $limit     = max(1, min(50, (int)($_GET['limit'] ?? 6)));
    $offset    = ($page - 1) * $limit;

    // featured：預設排序，讓已放真實圖片的景點排在前面（佔位圖 placehold.co 排後面），
    // 同一組內再依建立時間新到舊排序；使用者手動切換排序時仍可用下面 4 種一般排序
    $allowedSort = ['name', 'city', 'category_id', 'created_at', 'featured'];
    if (!in_array($sort, $allowedSort, true)) {
        $sort = 'featured';
    }

    $where  = [];
    $params = [];

    if ($q !== '') {
        $where[] = '(a.name LIKE :q OR a.description LIKE :q)';
        $params['q'] = "%{$q}%";
    }
    if ($city !== '') {
        $where[] = 'a.city LIKE :city';
        $params['city'] = $city . '%';
    }
    if ($categoryId !== '') {
        $where[] = 'a.category_id = :category_id';
        $params['category_id'] = $categoryId;
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    // 總筆數（分頁用）
    $countStmt = $pdo->prepare("SELECT COUNT(*) AS total FROM attractions a {$whereSql}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];

    // featured 是特殊排序（有圖優先），其他 4 種是一般欄位排序
    if ($sort === 'featured') {
        $orderBySql = "CASE WHEN a.image_url <> '' AND a.image_url NOT LIKE 'https://placehold.co%' THEN 0 ELSE 1 END ASC, a.created_at DESC";
    } else {
        $orderBySql = "a.{$sort} {$order}";
    }

    $sql = "SELECT a.*, c.name AS category_name
            FROM attractions a
            JOIN categories c ON c.id = a.category_id
            {$whereSql}
            ORDER BY {$orderBySql}
            LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);
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

    $error = validateAttraction($input);
    if ($error) {
        jsonResponse(null, 400, $error);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO attractions (name, city, category_id, image_url, description)
         VALUES (:name, :city, :category_id, :image_url, :description)'
    );
    $stmt->execute([
        'name'        => $input['name'],
        'city'        => $input['city'],
        'category_id' => $input['category_id'],
        'image_url'   => $input['image_url'] ?? '',
        'description' => $input['description'] ?? '',
    ]);

    jsonResponse(['id' => $pdo->lastInsertId()], 201, '新增成功');
}

function handlePut(PDO $pdo)
{
    requireAdmin();
    if (empty($_GET['id'])) {
        jsonResponse(null, 400, '缺少景點 id');
    }
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $error = validateAttraction($input);
    if ($error) {
        jsonResponse(null, 400, $error);
    }

    $stmt = $pdo->prepare(
        'UPDATE attractions
         SET name = :name, city = :city, category_id = :category_id,
             image_url = :image_url, description = :description
         WHERE id = :id'
    );
    $stmt->execute([
        'name'        => $input['name'],
        'city'        => $input['city'],
        'category_id' => $input['category_id'],
        'image_url'   => $input['image_url'] ?? '',
        'description' => $input['description'] ?? '',
        'id'          => $_GET['id'],
    ]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(null, 404, '查無此景點，無法修改');
    }
    jsonResponse(null, 200, '修改成功');
}

function handleDelete(PDO $pdo)
{
    requireAdmin();
    if (empty($_GET['id'])) {
        jsonResponse(null, 400, '缺少景點 id');
    }
    $stmt = $pdo->prepare('DELETE FROM attractions WHERE id = :id');
    $stmt->execute(['id' => $_GET['id']]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(null, 404, '查無此景點，無法刪除');
    }
    jsonResponse(null, 200, '刪除成功');
}

/**
 * 欄位檢查：對應 A3
 * 至少檢查景點名稱、城市、分類、圖片網址或介紹文字其中 3 項不得為空白
 */
function validateAttraction(array $input): ?string
{
    $checks = [
        'name'        => '景點名稱',
        'city'        => '城市或地區',
        'category_id' => '分類',
    ];
    foreach ($checks as $field => $label) {
        if (empty(trim((string)($input[$field] ?? '')))) {
            return "「{$label}」不得為空白";
        }
    }
    // 圖片網址或介紹文字至少擇一
    if (empty(trim($input['image_url'] ?? '')) && empty(trim($input['description'] ?? ''))) {
        return '圖片網址與介紹文字不得同時為空白';
    }
    return null;
}

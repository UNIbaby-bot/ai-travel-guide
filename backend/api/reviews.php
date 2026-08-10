<?php
/**
 * 景點評論 API
 * GET    /api/reviews.php?attraction_id=1        -> 查詢某景點的評論列表 + 平均分數
 * GET    /api/reviews.php?id=1                   -> 查詢單筆評論（含照片/影片）
 * POST   /api/reviews.php                        -> 新增評論（需登入會員）
 * PUT    /api/reviews.php?id=1                   -> 修改自己的評論
 * DELETE /api/reviews.php?id=1                   -> 刪除自己的評論
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
        $stmt = $pdo->prepare(
            'SELECT r.*, m.username FROM reviews r
             JOIN members m ON m.id = r.member_id
             WHERE r.id = :id'
        );
        $stmt->execute(['id' => $_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(null, 404, '查無此評論');
        }
        $mediaStmt = $pdo->prepare('SELECT id, media_type, url FROM review_media WHERE review_id = :id');
        $mediaStmt->execute(['id' => $_GET['id']]);
        $row['media'] = $mediaStmt->fetchAll();
        jsonResponse($row, 200, '查詢成功');
    }

    if (empty($_GET['attraction_id'])) {
        jsonResponse(null, 400, '缺少 attraction_id');
    }
    $attractionId = $_GET['attraction_id'];
    $page  = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(50, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $countStmt = $pdo->prepare('SELECT COUNT(*) AS total FROM reviews WHERE attraction_id = :aid');
    $countStmt->execute(['aid' => $attractionId]);
    $total = (int)$countStmt->fetch()['total'];

    $stmt = $pdo->prepare(
        'SELECT r.*, m.username FROM reviews r
         JOIN members m ON m.id = r.member_id
         WHERE r.attraction_id = :aid
         ORDER BY r.created_at DESC
         LIMIT :limit OFFSET :offset'
    );
    $stmt->bindValue(':aid', $attractionId);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();

    // 每筆評論附上照片/影片
    foreach ($items as &$item) {
        $mediaStmt = $pdo->prepare('SELECT id, media_type, url FROM review_media WHERE review_id = :id');
        $mediaStmt->execute(['id' => $item['id']]);
        $item['media'] = $mediaStmt->fetchAll();
    }
    unset($item);

    $avgStmt = $pdo->prepare(
        'SELECT
            COUNT(*) AS count,
            AVG(rating_scenery) AS avg_scenery,
            AVG(rating_culture) AS avg_culture,
            AVG(rating_access) AS avg_access,
            AVG(rating_value) AS avg_value,
            AVG(rating_overall) AS avg_overall
         FROM reviews WHERE attraction_id = :aid'
    );
    $avgStmt->execute(['aid' => $attractionId]);
    $avg = $avgStmt->fetch();
    foreach (['avg_scenery', 'avg_culture', 'avg_access', 'avg_value', 'avg_overall'] as $k) {
        $avg[$k] = $avg[$k] !== null ? round((float)$avg[$k], 1) : null;
    }

    jsonResponse([
        'items'      => $items,
        'total'      => $total,
        'page'       => $page,
        'limit'      => $limit,
        'totalPages' => (int)ceil($total / $limit),
        'summary'    => $avg,
    ], 200, $items ? '查詢成功' : '尚無評論');
}

function handlePost(PDO $pdo)
{
    $memberId = requireMember();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    if (empty($input['attraction_id'])) {
        jsonResponse(null, 400, '缺少 attraction_id');
    }
    $error = validateReview($input);
    if ($error) {
        jsonResponse(null, 400, $error);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO reviews
            (member_id, attraction_id, rating_scenery, rating_culture, rating_access, rating_value, rating_overall, title, content)
         VALUES
            (:member_id, :attraction_id, :rs, :rc, :ra, :rv, :ro, :title, :content)'
    );
    $stmt->execute([
        'member_id'     => $memberId,
        'attraction_id' => $input['attraction_id'],
        'rs'            => $input['rating_scenery'],
        'rc'            => $input['rating_culture'],
        'ra'            => $input['rating_access'],
        'rv'            => $input['rating_value'],
        'ro'            => $input['rating_overall'],
        'title'         => trim($input['title'] ?? ''),
        'content'       => trim($input['content']),
    ]);

    $reviewId = (int)$pdo->lastInsertId();

    // 若有附上照片/影片網址，一併寫入 review_media
    if (!empty($input['media']) && is_array($input['media'])) {
        $mediaStmt = $pdo->prepare(
            'INSERT INTO review_media (review_id, media_type, url) VALUES (:rid, :type, :url)'
        );
        foreach ($input['media'] as $m) {
            if (empty($m['url'])) continue;
            $mediaStmt->execute([
                'rid'  => $reviewId,
                'type' => ($m['media_type'] ?? 'image') === 'video' ? 'video' : 'image',
                'url'  => $m['url'],
            ]);
        }
    }

    jsonResponse(['id' => $reviewId], 201, '評論新增成功');
}

function handlePut(PDO $pdo)
{
    $memberId = requireMember();
    if (empty($_GET['id'])) {
        jsonResponse(null, 400, '缺少評論 id');
    }
    $owner = getReviewOwner($pdo, $_GET['id']);
    if ($owner === null) {
        jsonResponse(null, 404, '查無此評論');
    }
    if ($owner !== $memberId) {
        jsonResponse(null, 403, '只能修改自己的評論');
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $error = validateReview($input);
    if ($error) {
        jsonResponse(null, 400, $error);
    }

    $stmt = $pdo->prepare(
        'UPDATE reviews SET
            rating_scenery = :rs, rating_culture = :rc, rating_access = :ra,
            rating_value = :rv, rating_overall = :ro, title = :title, content = :content
         WHERE id = :id'
    );
    $stmt->execute([
        'rs' => $input['rating_scenery'], 'rc' => $input['rating_culture'],
        'ra' => $input['rating_access'], 'rv' => $input['rating_value'],
        'ro' => $input['rating_overall'], 'title' => trim($input['title'] ?? ''),
        'content' => trim($input['content']), 'id' => $_GET['id'],
    ]);

    jsonResponse(null, 200, '評論修改成功');
}

function handleDelete(PDO $pdo)
{
    $memberId = requireMember();
    if (empty($_GET['id'])) {
        jsonResponse(null, 400, '缺少評論 id');
    }
    $owner = getReviewOwner($pdo, $_GET['id']);
    if ($owner === null) {
        jsonResponse(null, 404, '查無此評論');
    }
    if ($owner !== $memberId) {
        jsonResponse(null, 403, '只能刪除自己的評論');
    }

    $pdo->prepare('DELETE FROM review_media WHERE review_id = :id')->execute(['id' => $_GET['id']]);
    $pdo->prepare('DELETE FROM reviews WHERE id = :id')->execute(['id' => $_GET['id']]);

    jsonResponse(null, 200, '評論刪除成功');
}

function getReviewOwner(PDO $pdo, $id): ?int
{
    $stmt = $pdo->prepare('SELECT member_id FROM reviews WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? (int)$row['member_id'] : null;
}

function validateReview(array $input): ?string
{
    $ratingFields = [
        'rating_scenery' => '景觀環境',
        'rating_culture' => '文化真實性／導覽品質',
        'rating_access'  => '交通與可及性',
        'rating_value'   => '性價比',
        'rating_overall' => '整體推薦度',
    ];
    foreach ($ratingFields as $field => $label) {
        $val = $input[$field] ?? null;
        if (!is_numeric($val) || $val < 1 || $val > 5) {
            return "「{$label}」評分必須是 1 到 5 之間的整數";
        }
    }
    if (empty(trim($input['content'] ?? ''))) {
        return '評論內容不得為空白';
    }
    return null;
}

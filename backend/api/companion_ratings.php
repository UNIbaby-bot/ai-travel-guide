<?php
/**
 * 旅伴互評 API
 * POST /api/companion_ratings.php                  -> 新增互評
 * GET  /api/companion_ratings.php?member_id=1      -> 查詢某會員收到的評價 + 平均分數
 * GET  /api/companion_ratings.php?trip_group_id=1  -> 查詢某揪團內已完成的互評
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
    default:
        jsonResponse(null, 405, '不支援的方法');
}

function handleGet(PDO $pdo)
{
    if (!empty($_GET['member_id'])) {
        $memberId = $_GET['member_id'];

        $avgStmt = $pdo->prepare(
            'SELECT
                COUNT(*) AS count,
                AVG(rating_punctual) AS avg_punctual,
                AVG(rating_communication) AS avg_communication,
                AVG(rating_respect) AS avg_respect,
                AVG(rating_overall) AS avg_overall
             FROM companion_ratings WHERE ratee_id = :id'
        );
        $avgStmt->execute(['id' => $memberId]);
        $summary = $avgStmt->fetch();
        foreach (['avg_punctual', 'avg_communication', 'avg_respect', 'avg_overall'] as $k) {
            $summary[$k] = $summary[$k] !== null ? round((float)$summary[$k], 1) : null;
        }

        $listStmt = $pdo->prepare(
            'SELECT cr.*, m.username AS rater_name
             FROM companion_ratings cr JOIN members m ON m.id = cr.rater_id
             WHERE cr.ratee_id = :id ORDER BY cr.created_at DESC'
        );
        $listStmt->execute(['id' => $memberId]);

        jsonResponse(['summary' => $summary, 'items' => $listStmt->fetchAll()], 200, '查詢成功');
    }

    if (!empty($_GET['trip_group_id'])) {
        $stmt = $pdo->prepare(
            'SELECT cr.*, ru.username AS rater_name, ree.username AS ratee_name
             FROM companion_ratings cr
             JOIN members ru ON ru.id = cr.rater_id
             JOIN members ree ON ree.id = cr.ratee_id
             WHERE cr.trip_group_id = :gid ORDER BY cr.created_at DESC'
        );
        $stmt->execute(['gid' => $_GET['trip_group_id']]);
        jsonResponse(['items' => $stmt->fetchAll()], 200, '查詢成功');
    }

    jsonResponse(null, 400, '請提供 member_id 或 trip_group_id');
}

function handlePost(PDO $pdo)
{
    $raterId = requireMember();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $groupId = $input['trip_group_id'] ?? null;
    $rateeId = $input['ratee_id'] ?? null;
    if (empty($groupId) || empty($rateeId)) {
        jsonResponse(null, 400, '缺少 trip_group_id 或 ratee_id');
    }
    if ((int)$rateeId === $raterId) {
        jsonResponse(null, 400, '不能評價自己');
    }

    $ratingFields = [
        'rating_punctual'      => '準時可靠',
        'rating_communication' => '溝通互動',
        'rating_respect'       => '尊重與禮貌',
        'rating_overall'       => '整體體驗',
    ];
    foreach ($ratingFields as $field => $label) {
        $val = $input[$field] ?? null;
        if (!is_numeric($val) || $val < 1 || $val > 5) {
            jsonResponse(null, 400, "「{$label}」評分必須是 1 到 5 之間的整數");
        }
    }

    $groupStmt = $pdo->prepare('SELECT * FROM trip_groups WHERE id = :id');
    $groupStmt->execute(['id' => $groupId]);
    $group = $groupStmt->fetch();
    if (!$group) {
        jsonResponse(null, 404, '查無此揪團');
    }
    if (strtotime($group['departure_date']) >= strtotime(date('Y-m-d'))) {
        jsonResponse(null, 400, '出發日期還沒到，行程結束後才能互評旅伴');
    }

    // 檢查雙方都是這個揪團「已核准」的成員
    $checkStmt = $pdo->prepare(
        "SELECT member_id FROM trip_group_members
         WHERE trip_group_id = :gid AND member_id IN (:rater, :ratee) AND status = 'approved'"
    );
    $checkStmt->execute(['gid' => $groupId, 'rater' => $raterId, 'ratee' => $rateeId]);
    $approvedIds = array_column($checkStmt->fetchAll(), 'member_id');
    if (!in_array($raterId, $approvedIds) || !in_array((int)$rateeId, array_map('intval', $approvedIds))) {
        jsonResponse(null, 403, '只有同團且都已核准的旅伴才能互相評價');
    }

    $existStmt = $pdo->prepare(
        'SELECT id FROM companion_ratings WHERE trip_group_id = :gid AND rater_id = :rater AND ratee_id = :ratee'
    );
    $existStmt->execute(['gid' => $groupId, 'rater' => $raterId, 'ratee' => $rateeId]);
    if ($existStmt->fetch()) {
        jsonResponse(null, 409, '你已經評價過這位旅伴了');
    }

    $stmt = $pdo->prepare(
        'INSERT INTO companion_ratings
            (trip_group_id, rater_id, ratee_id, rating_punctual, rating_communication, rating_respect, rating_overall, comment)
         VALUES
            (:gid, :rater, :ratee, :rp, :rc, :rr, :ro, :comment)'
    );
    $stmt->execute([
        'gid' => $groupId, 'rater' => $raterId, 'ratee' => $rateeId,
        'rp' => $input['rating_punctual'], 'rc' => $input['rating_communication'],
        'rr' => $input['rating_respect'], 'ro' => $input['rating_overall'],
        'comment' => trim($input['comment'] ?? ''),
    ]);

    jsonResponse(['id' => $pdo->lastInsertId()], 201, '評價送出成功');
}

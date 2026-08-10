<?php
/**
 * 揪團 API
 * GET    /api/trip_groups.php                 -> 查詢列表（支援 status, attraction_id, itinerary_id, page, limit）
 * GET    /api/trip_groups.php?id=1            -> 查詢單一揪團詳細（含成員名單）
 * POST   /api/trip_groups.php                 -> 發起揪團（需登入會員，會自動把自己加入為核准成員）
 * PUT    /api/trip_groups.php?id=1            -> 修改揪團（限發起人）
 * DELETE /api/trip_groups.php?id=1            -> 取消／刪除揪團（限發起人）
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

function attachGroupExtras(PDO $pdo, array $group): array
{
    $countStmt = $pdo->prepare(
        "SELECT COUNT(*) AS c FROM trip_group_members WHERE trip_group_id = :id AND status = 'approved'"
    );
    $countStmt->execute(['id' => $group['id']]);
    $group['approved_count'] = (int)$countStmt->fetch()['c'];
    $group['is_departed'] = strtotime($group['departure_date']) < strtotime(date('Y-m-d'));
    return $group;
}

function handleGet(PDO $pdo)
{
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare(
            'SELECT g.*, m.username AS organizer_name, a.image_url AS cover_image_url
             FROM trip_groups g
             JOIN members m ON m.id = g.organizer_id
             LEFT JOIN attractions a ON a.id = g.attraction_id
             WHERE g.id = :id'
        );
        $stmt->execute(['id' => $_GET['id']]);
        $group = $stmt->fetch();
        if (!$group) {
            jsonResponse(null, 404, '查無此揪團');
        }
        $group = attachGroupExtras($pdo, $group);

        $membersStmt = $pdo->prepare(
            'SELECT tgm.id, tgm.member_id, tgm.status, tgm.joined_at, tgm.application_message, mem.username
             FROM trip_group_members tgm JOIN members mem ON mem.id = tgm.member_id
             WHERE tgm.trip_group_id = :id ORDER BY tgm.joined_at ASC'
        );
        $membersStmt->execute(['id' => $_GET['id']]);
        $group['members'] = $membersStmt->fetchAll();

        // 聯繫方式屬於敏感資訊，只有發起人或已核准成員看得到
        $myId = !empty($_SESSION['member_id']) ? (int)$_SESSION['member_id'] : null;
        $isOrganizer = $myId && (int)$group['organizer_id'] === $myId;
        $isApprovedMember = $myId && in_array($myId, array_map(
            fn($m) => (int)$m['member_id'],
            array_filter($group['members'], fn($m) => $m['status'] === 'approved')
        ), true);
        if (!$isOrganizer && !$isApprovedMember) {
            $group['contact_info'] = null;
        }
        // 申請訊息只有發起人自己看得到（申請者的自我介紹屬於個人資訊）
        if (!$isOrganizer) {
            foreach ($group['members'] as &$m) {
                $m['application_message'] = null;
            }
            unset($m);
        }

        jsonResponse($group, 200, '查詢成功');
    }

    $status       = trim($_GET['status'] ?? 'open');
    $attractionId = trim($_GET['attraction_id'] ?? '');
    $itineraryId  = trim($_GET['itinerary_id'] ?? '');
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = max(1, min(50, (int)($_GET['limit'] ?? 9)));
    $offset = ($page - 1) * $limit;

    $where  = [];
    $params = [];
    if ($status !== '' && $status !== 'all') {
        $where[] = 'g.status = :status';
        $params['status'] = $status;
    }
    if ($attractionId !== '') {
        $where[] = 'g.attraction_id = :aid';
        $params['aid'] = $attractionId;
    }
    if ($itineraryId !== '') {
        $where[] = 'g.itinerary_id = :iid';
        $params['iid'] = $itineraryId;
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) AS total FROM trip_groups g {$whereSql}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];

    $stmt = $pdo->prepare(
        "SELECT g.*, m.username AS organizer_name, a.image_url AS cover_image_url
         FROM trip_groups g
         JOIN members m ON m.id = g.organizer_id
         LEFT JOIN attractions a ON a.id = g.attraction_id
         {$whereSql}
         ORDER BY g.departure_date ASC LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $k => $v) {
        $stmt->bindValue(":{$k}", $v);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = array_map(fn($g) => attachGroupExtras($pdo, $g), $stmt->fetchAll());

    jsonResponse([
        'items' => $items, 'total' => $total, 'page' => $page,
        'limit' => $limit, 'totalPages' => (int)ceil($total / $limit),
    ], 200, $items ? '查詢成功' : '目前沒有符合條件的揪團');
}

function handlePost(PDO $pdo)
{
    $memberId = requireMember();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $error = validateGroup($input);
    if ($error) {
        jsonResponse(null, 400, $error);
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO trip_groups (organizer_id, attraction_id, itinerary_id, title, description, contact_info, departure_date, review_deadline, max_members)
             VALUES (:organizer_id, :attraction_id, :itinerary_id, :title, :description, :contact_info, :departure_date, :review_deadline, :max_members)'
        );
        $stmt->execute([
            'organizer_id'    => $memberId,
            'attraction_id'   => $input['attraction_id'] ?? null,
            'itinerary_id'    => $input['itinerary_id'] ?? null,
            'title'           => trim($input['title']),
            'description'     => trim($input['description'] ?? ''),
            'contact_info'    => trim($input['contact_info'] ?? ''),
            'departure_date'  => $input['departure_date'],
            'review_deadline' => !empty($input['review_deadline']) ? $input['review_deadline'] : null,
            'max_members'     => (int)$input['max_members'],
        ]);
        $groupId = (int)$pdo->lastInsertId();

        // 發起人自動成為第一位「已核准」成員
        $pdo->prepare(
            "INSERT INTO trip_group_members (trip_group_id, member_id, status) VALUES (:gid, :mid, 'approved')"
        )->execute(['gid' => $groupId, 'mid' => $memberId]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(null, 500, '建立揪團失敗：' . $e->getMessage() . '（提示：如果訊息提到欄位不存在，通常是本機 database/travel.sqlite 是舊版本，刪掉該檔案後重新啟動 php -S 即可重建）');
    }

    jsonResponse(['id' => $groupId], 201, '揪團發起成功');
}

function handlePut(PDO $pdo)
{
    $memberId = requireMember();
    if (empty($_GET['id'])) {
        jsonResponse(null, 400, '缺少揪團 id');
    }
    $group = getGroup($pdo, $_GET['id']);
    if (!$group) {
        jsonResponse(null, 404, '查無此揪團');
    }
    if ((int)$group['organizer_id'] !== $memberId) {
        jsonResponse(null, 403, '只有發起人可以修改這個揪團');
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $allowedStatus = ['open', 'full', 'closed', 'completed', 'cancelled'];
    $status = $input['status'] ?? $group['status'];
    if (!in_array($status, $allowedStatus, true)) {
        jsonResponse(null, 400, '狀態值不正確');
    }

    $stmt = $pdo->prepare(
        'UPDATE trip_groups SET title = :title, description = :description, contact_info = :contact_info,
            review_deadline = :review_deadline, max_members = :max_members, status = :status WHERE id = :id'
    );
    $stmt->execute([
        'title'           => trim($input['title'] ?? $group['title']),
        'description'     => trim($input['description'] ?? $group['description']),
        'contact_info'    => trim($input['contact_info'] ?? $group['contact_info']),
        'review_deadline' => array_key_exists('review_deadline', $input) ? ($input['review_deadline'] ?: null) : $group['review_deadline'],
        'max_members'     => (int)($input['max_members'] ?? $group['max_members']),
        'status'          => $status,
        'id'              => $_GET['id'],
    ]);

    jsonResponse(null, 200, '揪團修改成功');
}

function handleDelete(PDO $pdo)
{
    $memberId = requireMember();
    if (empty($_GET['id'])) {
        jsonResponse(null, 400, '缺少揪團 id');
    }
    $group = getGroup($pdo, $_GET['id']);
    if (!$group) {
        jsonResponse(null, 404, '查無此揪團');
    }
    if ((int)$group['organizer_id'] !== $memberId) {
        jsonResponse(null, 403, '只有發起人可以刪除這個揪團');
    }

    $pdo->prepare('DELETE FROM companion_ratings WHERE trip_group_id = :id')->execute(['id' => $_GET['id']]);
    $pdo->prepare('DELETE FROM trip_group_messages WHERE trip_group_id = :id')->execute(['id' => $_GET['id']]);
    $pdo->prepare('DELETE FROM trip_group_members WHERE trip_group_id = :id')->execute(['id' => $_GET['id']]);
    $pdo->prepare('DELETE FROM trip_groups WHERE id = :id')->execute(['id' => $_GET['id']]);

    jsonResponse(null, 200, '揪團已刪除');
}

function getGroup(PDO $pdo, $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM trip_groups WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function validateGroup(array $input): ?string
{
    if (empty(trim($input['title'] ?? ''))) {
        return '請輸入揪團標題';
    }
    if (empty($input['departure_date']) || !strtotime($input['departure_date'])) {
        return '請輸入正確的出發日期';
    }
    if (strtotime($input['departure_date']) < strtotime(date('Y-m-d'))) {
        return '出發日期不能是過去的日期';
    }
    if (empty($input['max_members']) || (int)$input['max_members'] < 1) {
        return '人數上限至少要 1 人';
    }
    if (!empty($input['review_deadline'])) {
        if (!strtotime($input['review_deadline'])) {
            return '審核截止日格式不正確';
        }
        if (strtotime($input['review_deadline']) > strtotime($input['departure_date'])) {
            return '審核截止日不能晚於出發日期';
        }
    }
    return null;
}

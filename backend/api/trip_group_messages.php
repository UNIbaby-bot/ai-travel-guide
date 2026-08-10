<?php
/**
 * 揪團留言板 API（開放給所有登入會員查看/留言，不限已核准成員）
 * 用意：讓還沒申請、或申請中的會員也能先跟發起人互動、問問題，
 * 是申請流程之外的另一種溝通管道；真正私密的聯繫方式（Discord/Line）
 * 仍然只有已核准成員才看得到（見 trip_groups.php 的 contact_info）。
 *
 * GET  /api/trip_group_messages.php?trip_group_id=1 -> 查詢留言列表
 * POST /api/trip_group_messages.php                 -> 新增留言 { trip_group_id, content }
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

/**
 * 只確認揪團真的存在即可，不限制身份（任何登入會員都能看留言/留言）
 */
function requireGroupExists(PDO $pdo, $groupId): void
{
    $stmt = $pdo->prepare('SELECT id FROM trip_groups WHERE id = :id');
    $stmt->execute(['id' => $groupId]);
    if (!$stmt->fetch()) {
        jsonResponse(null, 404, '查無此揪團');
    }
}

function handleGet(PDO $pdo)
{
    requireMember();
    $groupId = $_GET['trip_group_id'] ?? null;
    if (empty($groupId)) {
        jsonResponse(null, 400, '缺少 trip_group_id');
    }
    requireGroupExists($pdo, $groupId);

    $stmt = $pdo->prepare(
        'SELECT tgm.*, m.username
         FROM trip_group_messages tgm JOIN members m ON m.id = tgm.member_id
         WHERE tgm.trip_group_id = :gid ORDER BY tgm.created_at ASC'
    );
    $stmt->execute(['gid' => $groupId]);
    jsonResponse(['items' => $stmt->fetchAll()], 200, '查詢成功');
}

function handlePost(PDO $pdo)
{
    $memberId = requireMember();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $groupId   = $input['trip_group_id'] ?? null;
    $content   = trim($input['content'] ?? '');
    $replyToId = $input['reply_to_id'] ?? null;

    if (empty($groupId)) {
        jsonResponse(null, 400, '缺少 trip_group_id');
    }
    if ($content === '') {
        jsonResponse(null, 400, '留言內容不得為空白');
    }
    requireGroupExists($pdo, $groupId);

    if (!empty($replyToId)) {
        $checkStmt = $pdo->prepare(
            'SELECT id FROM trip_group_messages WHERE id = :id AND trip_group_id = :gid'
        );
        $checkStmt->execute(['id' => $replyToId, 'gid' => $groupId]);
        if (!$checkStmt->fetch()) {
            jsonResponse(null, 400, '要回覆的留言不存在');
        }
    } else {
        $replyToId = null;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO trip_group_messages (trip_group_id, member_id, content, reply_to_id) VALUES (:gid, :mid, :content, :reply_to_id)'
    );
    $stmt->execute(['gid' => $groupId, 'mid' => $memberId, 'content' => $content, 'reply_to_id' => $replyToId]);

    jsonResponse(['id' => $pdo->lastInsertId()], 201, '留言已送出');
}

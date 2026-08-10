<?php
/**
 * 揪團成員 API
 * POST   /api/trip_group_members.php                    -> 申請加入揪團 { trip_group_id }
 * PUT    /api/trip_group_members.php?id=1&action=approve -> 團主核准申請
 * PUT    /api/trip_group_members.php?id=1&action=reject  -> 團主拒絕申請
 * DELETE /api/trip_group_members.php?id=1               -> 退出揪團（本人）
 */

require_once __DIR__ . '/../config/db.php';

$pdo    = getPDO();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        handleJoin($pdo);
        break;
    case 'PUT':
        handleDecision($pdo);
        break;
    case 'DELETE':
        handleLeave($pdo);
        break;
    default:
        jsonResponse(null, 405, '不支援的方法');
}

function handleJoin(PDO $pdo)
{
    $memberId = requireMember();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $groupId = $input['trip_group_id'] ?? null;
    $message = trim($input['message'] ?? '');
    if (empty($groupId)) {
        jsonResponse(null, 400, '缺少 trip_group_id');
    }
    if ($message === '') {
        jsonResponse(null, 400, '請簡單自我介紹，並說明想加入的原因，方便團主審核');
    }

    $groupStmt = $pdo->prepare('SELECT * FROM trip_groups WHERE id = :id');
    $groupStmt->execute(['id' => $groupId]);
    $group = $groupStmt->fetch();
    if (!$group) {
        jsonResponse(null, 404, '查無此揪團');
    }
    if ($group['status'] !== 'open') {
        jsonResponse(null, 400, '這個揪團目前不開放申請加入');
    }
    if ((int)$group['organizer_id'] === $memberId) {
        jsonResponse(null, 400, '你是這個揪團的發起人，不需要再申請加入');
    }

    $existStmt = $pdo->prepare(
        'SELECT id FROM trip_group_members WHERE trip_group_id = :gid AND member_id = :mid'
    );
    $existStmt->execute(['gid' => $groupId, 'mid' => $memberId]);
    if ($existStmt->fetch()) {
        jsonResponse(null, 409, '你已經申請過這個揪團了');
    }

    $countStmt = $pdo->prepare(
        "SELECT COUNT(*) AS c FROM trip_group_members WHERE trip_group_id = :gid AND status = 'approved'"
    );
    $countStmt->execute(['gid' => $groupId]);
    if ((int)$countStmt->fetch()['c'] >= (int)$group['max_members']) {
        jsonResponse(null, 400, '這個揪團的名額已經滿了');
    }

    $pdo->prepare(
        "INSERT INTO trip_group_members (trip_group_id, member_id, status, application_message) VALUES (:gid, :mid, 'pending', :msg)"
    )->execute(['gid' => $groupId, 'mid' => $memberId, 'msg' => $message]);

    jsonResponse(null, 201, '已送出申請，等待團主核准');
}

function handleDecision(PDO $pdo)
{
    $memberId = requireMember();
    $id     = $_GET['id'] ?? null;
    $action = $_GET['action'] ?? '';
    if (empty($id) || !in_array($action, ['approve', 'reject'], true)) {
        jsonResponse(null, 400, '缺少必要參數');
    }

    $stmt = $pdo->prepare(
        'SELECT tgm.*, g.organizer_id, g.max_members
         FROM trip_group_members tgm JOIN trip_groups g ON g.id = tgm.trip_group_id
         WHERE tgm.id = :id'
    );
    $stmt->execute(['id' => $id]);
    $membership = $stmt->fetch();
    if (!$membership) {
        jsonResponse(null, 404, '查無此申請紀錄');
    }
    if ((int)$membership['organizer_id'] !== $memberId) {
        jsonResponse(null, 403, '只有團主可以核准或拒絕申請');
    }

    if ($action === 'approve') {
        $countStmt = $pdo->prepare(
            "SELECT COUNT(*) AS c FROM trip_group_members WHERE trip_group_id = :gid AND status = 'approved'"
        );
        $countStmt->execute(['gid' => $membership['trip_group_id']]);
        if ((int)$countStmt->fetch()['c'] >= (int)$membership['max_members']) {
            jsonResponse(null, 400, '名額已滿，無法再核准');
        }
    }

    $newStatus = $action === 'approve' ? 'approved' : 'rejected';
    $pdo->prepare('UPDATE trip_group_members SET status = :s WHERE id = :id')
        ->execute(['s' => $newStatus, 'id' => $id]);

    jsonResponse(null, 200, $action === 'approve' ? '已核准加入' : '已拒絕申請');
}

function handleLeave(PDO $pdo)
{
    $memberId = requireMember();
    $id = $_GET['id'] ?? null;
    if (empty($id)) {
        jsonResponse(null, 400, '缺少 id');
    }

    $stmt = $pdo->prepare(
        'SELECT tgm.*, g.organizer_id FROM trip_group_members tgm
         JOIN trip_groups g ON g.id = tgm.trip_group_id WHERE tgm.id = :id'
    );
    $stmt->execute(['id' => $id]);
    $membership = $stmt->fetch();
    if (!$membership) {
        jsonResponse(null, 404, '查無此紀錄');
    }
    if ((int)$membership['member_id'] !== $memberId) {
        jsonResponse(null, 403, '只能退出自己申請的揪團');
    }
    if ((int)$membership['organizer_id'] === $memberId) {
        jsonResponse(null, 400, '發起人不能直接退出，請改用刪除揪團功能');
    }

    $pdo->prepare('DELETE FROM trip_group_members WHERE id = :id')->execute(['id' => $id]);
    jsonResponse(null, 200, '已退出揪團');
}

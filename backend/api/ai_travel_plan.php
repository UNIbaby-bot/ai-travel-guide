<?php
/**
 * POST /api/ai/travel-plan
 * 輸入: { "city": "南投", "category_name": "自然景觀", "attraction_name": "日月潭" }
 * 輸出: 一段「一日遊建議」文字
 *
 * 目前先用簡單規則組出示範文字，讓前端功能可以先跑起來。
 * 若要串接「真的」生成式 AI（ChatGPT / Claude / Gemini API），
 * 把下面 generateFallbackPlan() 換成呼叫對應 API 的程式碼即可，
 * 例如用 curl 呼叫 https://api.anthropic.com/v1/messages
 * （這部分需要你自己的 API 金鑰，不要把金鑰寫死在前端）。
 */

require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(null, 405, '不支援的方法');
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$city        = trim($input['city'] ?? '');
$category    = trim($input['category_name'] ?? '');
$attraction  = trim($input['attraction_name'] ?? '');

if ($attraction === '' || $city === '') {
    jsonResponse(null, 400, '請提供景點名稱與城市');
}

$plan = generateFallbackPlan($attraction, $city, $category);

jsonResponse(['plan' => $plan], 200, 'AI 建議產生成功');

function generateFallbackPlan(string $attraction, string $city, string $category): string
{
    $templates = [
        "上午抵達{$city}，先到{$attraction}走走，感受{$category}文化的生活氣息；中午在附近品嚐在地部落風味餐；下午安排一段部落導覽或工藝體驗，傍晚再找個能看夕陽或雲海的地方，收尾這趟{$city}輕旅行。",
        "建議一早出發前往{$attraction}，事先預約當地族人導覽，避免自行闖入不開放的區域；中午品嚐{$city}在地食材料理；下午安排一段悠閒的部落散步行程，體驗當地生活步調。",
    ];
    $text = $templates[array_rand($templates)];
    return str_replace(['{attraction}'], [$attraction], $text);
}

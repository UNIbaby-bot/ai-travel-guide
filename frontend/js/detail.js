const params = new URLSearchParams(location.search);
const id = params.get('id');
const el = document.getElementById('detail');

async function load() {
  if (!id) { el.innerHTML = '<p>缺少景點 id 參數。</p>'; return; }
  try {
    const item = await Api.getAttraction(id);
    const img = item.image_url || 'https://placehold.co/1024x576?text=No+Image';
    el.innerHTML = `
      <a href="attractions.html">← 返回列表</a>
      <img src="${escapeHtml(img)}" alt="${escapeHtml(item.name)}" style="border-radius:14px;margin:16px 0;max-height:360px;object-fit:cover;width:100%;">
      ${categoryTagHtml(item.category_name)}
      <h1>${escapeHtml(item.name)}</h1>
      <div class="meta">📍 ${escapeHtml(item.city)}</div>
      <p>${escapeHtml(item.description || '（尚無介紹文字）')}</p>
      <button id="ai-plan-btn" class="btn btn-primary">✨ 幫我生成一日遊建議</button>
      <div class="ai-box" id="ai-plan-box" style="display:none;">
        <h3>AI 一日遊建議</h3>
        <p id="ai-plan-text"></p>
      </div>

      <div class="cta-box">
        <h3>🌿 想找人一起去這個部落嗎？</h3>
        <p>發起一個揪團，讓其他有興趣的會員一起加入這趟輕旅行。</p>
        <a class="btn btn-primary" href="groups.html?prefill_title=${encodeURIComponent(item.name + '輕旅行')}&prefill_attraction_id=${item.id}">✨ 幫這個景點揪團</a>
      </div>
    `;
    document.getElementById('ai-plan-btn').addEventListener('click', () => loadAiPlan(item));
  } catch (err) {
    el.innerHTML = `<p class="field-error">載入失敗：${escapeHtml(err.message)}</p>`;
  }
}

async function loadAiPlan(item) {
  const box = document.getElementById('ai-plan-box');
  const text = document.getElementById('ai-plan-text');
  box.style.display = 'block';
  text.textContent = '生成中...';
  try {
    const data = await Api.getAiTravelPlan({
      city: item.city, category_name: item.category_name, attraction_name: item.name,
    });
    text.textContent = data.plan;
  } catch (err) {
    text.textContent = '生成失敗：' + err.message;
  }
}

load();

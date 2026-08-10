const params = new URLSearchParams(location.search);
const id = params.get('id');
const heroEl = document.getElementById('itinerary-hero');
const el = document.getElementById('detail');
const highlightEl = document.getElementById('highlight-section');

function dayCount(routeText) {
  const matches = routeText.match(/第[一二三四五六七八九十]+天/g);
  return matches ? matches.length : 1;
}

function renderHero(item) {
  heroEl.innerHTML = `
    <section class="itin-hero">
      <div class="itin-hero-inner">
        <a href="itineraries.html" class="back-link">← 返回遊程列表</a>
        <h1>${escapeHtml(item.name)}</h1>
        <div class="itin-badge-row">
          <span class="itin-badge">📍 ${escapeHtml(item.region)}</span>
          <span class="itin-badge">🗓️ 約 ${dayCount(item.route_text)} 天行程</span>
        </div>
      </div>
    </section>`;
}

function renderDayTimeline(routeText) {
  const dayPattern = /(第[一二三四五六七八九十]+天[：:])/g;
  const parts = routeText.split(dayPattern).filter(Boolean);

  let html = '<div class="day-timeline">';
  if (parts.length === 1) {
    const stops = parts[0].split('→').map((s) => s.trim()).filter(Boolean);
    html += `<div class="day-step"><h3>🚐 行程路線</h3><ul>${stops.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>`;
  } else {
    for (let i = 0; i < parts.length; i += 2) {
      const dayLabel = parts[i].replace(/[：:]/g, '');
      const content = (parts[i + 1] || '').trim();
      const stops = content.split(/→|\n/).map((s) => s.trim()).filter(Boolean);
      html += `
        <div class="day-step">
          <h3>🚐 ${escapeHtml(dayLabel)}</h3>
          <ul>${stops.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
        </div>`;
    }
  }
  html += '</div>';
  return html;
}

async function renderHighlights(routeText) {
  try {
    const all = await Api.getAttractions({ limit: 50 });
    const matched = all.items.filter((a) => routeText.includes(a.name));
    if (!matched.length) {
      highlightEl.innerHTML = '';
      return;
    }
    highlightEl.innerHTML = `
      <h2 class="slash-title"><span class="slash">\</span> 行程亮點部落 <span class="slash">/</span></h2>
      <p style="color:var(--color-ink-soft);margin-top:-8px;">這個行程裡有幾個部落，我們也收錄在景點資料庫，點進去可以看更多介紹跟會員評論。</p>
      <div class="highlight-gallery">
        ${matched.map((a) => `
          <a href="detail.html?id=${a.id}" class="highlight-card">
            <img src="${escapeHtml(a.image_url || 'https://placehold.co/300x200?text=Tribe')}" alt="${escapeHtml(a.name)}">
            <div class="name">${escapeHtml(a.name)}</div>
          </a>`).join('')}
      </div>`;
  } catch (err) {
    highlightEl.innerHTML = '';
  }
}

async function load() {
  if (!id) { el.innerHTML = '<p>缺少遊程 id 參數。</p>'; return; }
  try {
    const item = await Api.getItinerary(id);
    renderHero(item);
    el.innerHTML = `
      ${renderDayTimeline(item.route_text)}
      <div class="cta-box">
        <h3>🌿 想跟其他旅人一起走這個行程嗎？</h3>
        <p>發起一個揪團，讓其他有興趣的會員一起加入這趟部落輕旅行。</p>
        <a class="btn btn-primary" href="groups.html?prefill_title=${encodeURIComponent(item.name)}&prefill_itinerary_id=${item.id}">✨ 幫這個行程揪團</a>
      </div>
    `;
    renderHighlights(item.route_text);
  } catch (err) {
    el.innerHTML = `<p class="field-error">載入失敗：${escapeHtml(err.message)}</p>`;
  }
}

load();

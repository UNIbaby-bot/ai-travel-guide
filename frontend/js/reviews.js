const reviewParams = new URLSearchParams(location.search);
const reviewAttractionId = reviewParams.get('id');
const reviewsSection = document.getElementById('reviews-section');

const RATING_LABELS = {
  rating_scenery: '景觀環境',
  rating_culture: '文化真實性／導覽品質',
  rating_access: '交通與可及性',
  rating_value: '性價比',
  rating_overall: '整體推薦度',
};

function starOptions(selected = 3) {
  return [1, 2, 3, 4, 5].map((n) =>
    `<option value="${n}" ${n === selected ? 'selected' : ''}>${'★'.repeat(n)}${'☆'.repeat(5 - n)}</option>`
  ).join('');
}

function ratingFormFields() {
  return Object.entries(RATING_LABELS).map(([key, label]) => `
    <div class="form-row">
      <label for="rf-${key}">${label}</label>
      <select id="rf-${key}">${starOptions(4)}</select>
    </div>
  `).join('');
}

function summaryTemplate(summary) {
  if (!summary || !summary.count) {
    return '<p style="color:#7a8790;">目前還沒有人評論，當第一個分享體驗的人吧！</p>';
  }
  return `
    <div class="form-panel">
      <h3>會員評價（共 ${summary.count} 則）</h3>
      <div class="grid" style="grid-template-columns:repeat(5,1fr);gap:8px;">
        ${Object.entries(RATING_LABELS).map(([key, label]) => {
          const avgKey = 'avg_' + key.replace('rating_', '');
          const avg = summary[avgKey];
          const rounded = avg ? Math.round(avg) : 0;
          const stars = avg ? '★'.repeat(rounded) + '☆'.repeat(5 - rounded) : '';
          return `<div style="text-align:center;">
            <div style="font-size:1.05rem;color:var(--color-ink-soft);margin-bottom:4px;">${label}</div>
            <div style="font-size:1.3rem;color:var(--color-gold);letter-spacing:2px;">${stars || '-'}</div>
            <div style="font-size:1.5rem;font-weight:700;color:var(--color-ink);">${avg ?? '-'}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function reviewCardTemplate(r) {
  const mediaHtml = (r.media || []).map((m) => m.media_type === 'video'
    ? `<div style="font-size:0.85rem;">🎬 <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener">影片連結</a></div>`
    : `<img src="${escapeHtml(m.url)}" alt="評論照片" style="max-width:160px;border-radius:8px;margin-top:6px;">`
  ).join('');

  return `
    <div class="form-panel">
      <div style="display:flex;justify-content:space-between;">
        <strong>${escapeHtml(r.username)}</strong>
        <span style="color:#7a8790;font-size:0.85rem;">${escapeHtml(r.created_at)}</span>
      </div>
      ${r.title ? `<h4 style="margin:6px 0;">${escapeHtml(r.title)}</h4>` : ''}
      <div style="font-size:0.85rem;color:#d9a441;margin:4px 0;">
        整體推薦 ${'★'.repeat(r.rating_overall)}${'☆'.repeat(5 - r.rating_overall)}
      </div>
      <p class="preserve-lines">${escapeHtml(r.content)}</p>
      ${mediaHtml}
    </div>`;
}

async function loadReviews() {
  try {
    const data = await Api.getReviews(reviewAttractionId, { limit: 20 });
    const auth = await Api.memberCheck();

    reviewsSection.innerHTML = `
      <h2 class="slash-title"><span class="slash">\</span> 景點評論 <span class="slash">/</span></h2>
      ${summaryTemplate(data.summary)}
      <div id="review-form-slot"></div>
      <div id="review-list">${data.items.map(reviewCardTemplate).join('') || ''}</div>
    `;

    const formSlot = document.getElementById('review-form-slot');
    if (auth.loggedIn) {
      formSlot.innerHTML = `
        <div class="form-panel">
          <h3>留下你的評論</h3>
          <div id="review-form-alert"></div>
          <form id="review-form">
            <div class="form-grid">${ratingFormFields()}</div>
            <div class="form-row">
              <label for="rf-title">標題（選填）</label>
              <input type="text" id="rf-title">
            </div>
            <div class="form-row">
              <label for="rf-content">評論內容</label>
              <textarea id="rf-content"></textarea>
            </div>
            <div class="form-row">
              <label for="rf-media-url">照片／影片網址（選填，可先貼圖床或 YouTube 連結）</label>
              <input type="text" id="rf-media-url" placeholder="https://...">
            </div>
            <button type="submit" class="btn btn-primary">送出評論</button>
          </form>
        </div>`;

      document.getElementById('review-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('review-form-alert');
        const payload = { attraction_id: reviewAttractionId };
        Object.keys(RATING_LABELS).forEach((key) => {
          payload[key] = Number(document.getElementById(`rf-${key}`).value);
        });
        payload.title = document.getElementById('rf-title').value.trim();
        payload.content = document.getElementById('rf-content').value.trim();
        const mediaUrl = document.getElementById('rf-media-url').value.trim();
        if (mediaUrl) {
          const isVideo = /youtube|youtu\.be|\.mp4/.test(mediaUrl);
          payload.media = [{ media_type: isVideo ? 'video' : 'image', url: mediaUrl }];
        }

        try {
          await Api.createReview(payload);
          loadReviews();
        } catch (err) {
          alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      });
    } else {
      formSlot.innerHTML = `<p><a href="member-login.html">登入會員</a>後即可留下評論。</p>`;
    }
  } catch (err) {
    reviewsSection.innerHTML = `<p class="field-error">評論載入失敗：${escapeHtml(err.message)}</p>`;
  }
}

if (reviewAttractionId) loadReviews();

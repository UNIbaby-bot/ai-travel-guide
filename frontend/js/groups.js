let groupState = { status: 'open', page: 1, limit: 12 };

const groupEls = {
  status: document.getElementById('f-status'),
  list: document.getElementById('list'),
  pagination: document.getElementById('pagination'),
  createSlot: document.getElementById('create-group-slot'),
};

const GROUP_FALLBACK_IMAGES = [
  'images/hero/banner-forest-bridge.jpg',
  'images/hero/banner-sunrise-clouds.jpg',
  'images/hero/banner-sunset-village.jpg',
];
function groupCoverImage(g) {
  return g.cover_image_url || GROUP_FALLBACK_IMAGES[g.id % GROUP_FALLBACK_IMAGES.length];
}

function groupCardTemplate(g) {
  const max = g.max_members || 1;
  const percent = Math.min(100, Math.round((g.approved_count / max) * 100));
  const isAlmostFull = percent >= 80;
  const countLabel = g.is_departed ? '已出發' : `目前 ${g.approved_count} 人｜${g.max_members} 人成團`;
  return `
    <div class="group-row-card">
      <div class="group-row-img"><img src="${escapeHtml(groupCoverImage(g))}" alt="${escapeHtml(g.title)}"></div>
      <div class="group-row-body">
        <div class="group-row-top">
          <h3>${escapeHtml(g.title)}</h3>
          <span class="tag">${escapeHtml(groupStatusLabel(g.status))}</span>
        </div>
        <div class="group-row-meta">🗓️ 出發日期｜${escapeHtml(g.departure_date)}</div>
        <div class="group-row-meta">👤 發起人：${escapeHtml(g.organizer_name)}${g.review_deadline ? `　｜　📋 審核截止：${escapeHtml(g.review_deadline)}` : ''}</div>
        <p class="desc preserve-lines" style="margin:2px 0;">${escapeHtml(g.description || '')}</p>
        <div class="group-progress-wrap">
          <div class="group-progress-track"><div class="group-progress-fill ${isAlmostFull ? 'is-almost-full' : ''}" style="width:${percent}%;"></div></div>
          <span class="group-progress-percent">${percent}%</span>
        </div>
        <div class="group-row-meta">${countLabel}</div>
      </div>
      <div class="group-row-side">
        <a class="btn btn-outline btn-sm" href="group-detail.html?id=${g.id}">查看詳情</a>
      </div>
    </div>`;
}

async function loadGroups() {
  groupEls.list.innerHTML = '<p>載入中...</p>';
  try {
    const data = await Api.getTripGroups({ status: groupState.status, page: groupState.page, limit: groupState.limit });
    if (!data.items.length) {
      groupEls.list.innerHTML = '<p>目前沒有符合條件的揪團。</p>';
      groupEls.pagination.innerHTML = '';
      return;
    }
    groupEls.list.innerHTML = data.items.map(groupCardTemplate).join('');
    renderGroupPagination(data.page, data.totalPages);
  } catch (err) {
    groupEls.list.innerHTML = `<p class="field-error">載入失敗：${escapeHtml(err.message)}</p>`;
  }
}

function renderGroupPagination(page, totalPages) {
  if (totalPages <= 1) { groupEls.pagination.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button data-page="${i}" class="${i === page ? 'active' : ''}">${i}</button>`;
  }
  groupEls.pagination.innerHTML = html;
  groupEls.pagination.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => { groupState.page = Number(btn.dataset.page); loadGroups(); });
  });
}

groupEls.status.addEventListener('change', () => {
  groupState.status = groupEls.status.value;
  groupState.page = 1;
  loadGroups();
});

async function renderCreateForm() {
  const urlParams = new URLSearchParams(location.search);
  const prefillTitle = urlParams.get('prefill_title') || '';
  const prefillItineraryId = urlParams.get('prefill_itinerary_id') || '';
  const prefillAttractionId = urlParams.get('prefill_attraction_id') || '';

  try {
    const auth = await Api.memberCheck();
    if (!auth.loggedIn) {
      groupEls.createSlot.innerHTML = `<p><a href="member-login.html">登入會員</a>後即可發起揪團。</p>`;
      return;
    }
    groupEls.createSlot.innerHTML = `
      <button id="btn-toggle-create" class="btn btn-gold" style="margin-bottom:16px;">✨ 發起新的揪團</button>
      <div class="form-panel" id="create-form-panel" style="display:${prefillTitle ? 'block' : 'none'};">
        <h3>發起揪團</h3>
        <div id="create-group-alert"></div>
        <form id="create-group-form">
          <div class="form-row">
            <label for="cg-title">揪團標題</label>
            <input type="text" id="cg-title" placeholder="例：司馬庫斯兩天一夜輕旅行" value="${escapeHtml(prefillTitle)}">
          </div>
          <div class="form-grid">
            <div class="form-row">
              <label for="cg-date">出發日期</label>
              <input type="date" id="cg-date">
            </div>
            <div class="form-row">
              <label for="cg-max">人數上限</label>
              <input type="number" id="cg-max" min="1" value="4">
            </div>
          </div>
          <div class="form-row">
            <label for="cg-deadline">預計審核截止日（選填，讓申請的旅伴知道大概什麼時候會有結果）</label>
            <input type="date" id="cg-deadline">
          </div>
          <div class="form-row">
            <label for="cg-desc">說明</label>
            <textarea id="cg-desc" placeholder="行程安排、集合地點、想找什麼樣的旅伴..."></textarea>
          </div>
          <div class="form-row">
            <label for="cg-contact">聯繫方式（選填，例如 Discord/Line ID，只有核准後的團員看得到）</label>
            <input type="text" id="cg-contact" placeholder="例：Discord - tribewalk#1234">
          </div>
          <button type="submit" class="btn btn-primary">送出</button>
        </form>
      </div>
    `;
    document.getElementById('btn-toggle-create').addEventListener('click', () => {
      const panel = document.getElementById('create-form-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('create-group-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('create-group-alert');
      const payload = {
        title: document.getElementById('cg-title').value.trim(),
        departure_date: document.getElementById('cg-date').value,
        review_deadline: document.getElementById('cg-deadline').value,
        max_members: Number(document.getElementById('cg-max').value),
        description: document.getElementById('cg-desc').value.trim(),
        contact_info: document.getElementById('cg-contact').value.trim(),
      };
      if (prefillItineraryId) payload.itinerary_id = Number(prefillItineraryId);
      if (prefillAttractionId) payload.attraction_id = Number(prefillAttractionId);
      try {
        const result = await Api.createTripGroup(payload);
        location.href = `group-detail.html?id=${result.id}`;
      } catch (err) {
        alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      }
    });
  } catch (err) {
    // 靜默失敗
  }
}

function bindCtaButton() {
  const ctaBtn = document.getElementById('btn-cta-create-group');
  if (!ctaBtn) return;
  ctaBtn.addEventListener('click', () => {
    groupEls.createSlot.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const toggleBtn = document.getElementById('btn-toggle-create');
    if (toggleBtn) {
      const panel = document.getElementById('create-form-panel');
      if (panel && panel.style.display === 'none') toggleBtn.click();
    }
  });
}

renderCreateForm();
loadGroups();
bindCtaButton();

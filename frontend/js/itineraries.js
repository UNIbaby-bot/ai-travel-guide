let state = { q: '', region: '', limit: 12, page: 1 };

const els = {
  q: document.getElementById('f-q'),
  region: document.getElementById('f-region'),
  list: document.getElementById('list'),
  pagination: document.getElementById('pagination'),
};

function dayCount(routeText) {
  const matches = routeText.match(/第[一二三四五六七八九十]+天/g);
  return matches ? matches.length : 1;
}

function cardTemplate(item) {
  const preview = item.route_text.split(/\n|→/)[0];
  return `
    <div class="card">
      <div class="card-body">
        <span class="tag">${escapeHtml(item.region)}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <div class="meta">🗓️ 約 ${dayCount(item.route_text)} 天行程</div>
        <p class="desc">${escapeHtml(preview)}...</p>
        <div class="card-actions">
          <a class="btn btn-outline btn-sm" href="itinerary-detail.html?id=${item.id}">查看完整路線</a>
        </div>
      </div>
    </div>`;
}

async function loadList() {
  els.list.innerHTML = '<p>載入中...</p>';
  try {
    const data = await Api.getItineraries({
      q: state.q, region: state.region, limit: state.limit, page: state.page,
    });
    if (!data.items.length) {
      els.list.innerHTML = '<p>查無符合條件的遊程資料。</p>';
      els.pagination.innerHTML = '';
      return;
    }
    els.list.innerHTML = data.items.map(cardTemplate).join('');
    renderPagination(data.page, data.totalPages);
  } catch (err) {
    els.list.innerHTML = `<p class="field-error">載入失敗：${escapeHtml(err.message)}</p>`;
  }
}

function renderPagination(page, totalPages) {
  if (totalPages <= 1) { els.pagination.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button data-page="${i}" class="${i === page ? 'active' : ''}">${i}</button>`;
  }
  els.pagination.innerHTML = html;
  els.pagination.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => { state.page = Number(btn.dataset.page); loadList(); });
  });
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

els.q.addEventListener('input', debounce(() => { state.q = els.q.value; state.page = 1; loadList(); }, 400));
els.region.addEventListener('change', () => { state.region = els.region.value; state.page = 1; loadList(); });

loadList();

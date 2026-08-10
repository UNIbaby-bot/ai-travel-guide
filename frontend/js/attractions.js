let state = { q: '', city: '', category_id: '', sort: 'featured', order: 'DESC', limit: 6, page: 1 };

const els = {
  q: document.getElementById('f-q'),
  city: document.getElementById('f-city'),
  category: document.getElementById('f-category'),
  sort: document.getElementById('f-sort'),
  limit: document.getElementById('f-limit'),
  list: document.getElementById('list'),
  pagination: document.getElementById('pagination'),
};

function cardTemplate(item) {
  const img = item.image_url || 'https://placehold.co/1024x576?text=No+Image';
  return `
    <a class="card" href="detail.html?id=${item.id}">
      <div class="card-img-wrap"><img src="${escapeHtml(img)}" alt="${escapeHtml(item.name)}"></div>
      <div class="card-body">
        ${categoryTagHtml(item.category_name)}
        <h3>${escapeHtml(item.name)}</h3>
        <div class="meta">📍 ${escapeHtml(item.city)}</div>
        <p class="desc">${escapeHtml(item.description || '')}</p>
        <div class="card-actions">
          <span class="btn btn-outline btn-sm">查看詳細</span>
        </div>
      </div>
    </a>`;
}

async function loadFilters() {
  try {
    const categories = await Api.getCategories();
    els.category.innerHTML += categories
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    // 城市清單先抓一次全部資料，篩選出「縣市」層級（例如「宜蘭縣」而不是「宜蘭縣大同鄉」），
    // 避免選單被一長串鄉鎮塞滿；實際篩選時後端會用前綴比對，選了縣市會連底下鄉鎮的景點一起篩出來
    const all = await Api.getAttractions({ limit: 50 });
    const counties = [...new Set(
      all.items.map((a) => (a.city.match(/^(.+?[縣市])/) || [null, a.city])[1])
    )].sort();
    els.city.innerHTML += counties.map((c) => `<option value="${c}">${escapeHtml(c)}</option>`).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadList() {
  els.list.innerHTML = '<p>載入中...</p>';
  try {
    const data = await Api.getAttractions({
      q: state.q, city: state.city, category_id: state.category_id,
      sort: state.sort, order: state.order, limit: state.limit, page: state.page,
    });
    if (!data.items.length) {
      els.list.innerHTML = '<p>查無符合條件的景點資料。</p>';
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
    btn.addEventListener('click', () => {
      state.page = Number(btn.dataset.page);
      loadList();
    });
  });
}

els.q.addEventListener('input', debounce(() => { state.q = els.q.value; state.page = 1; loadList(); }, 400));
els.city.addEventListener('change', () => { state.city = els.city.value; state.page = 1; loadList(); });
els.category.addEventListener('change', () => { state.category_id = els.category.value; state.page = 1; loadList(); });
els.sort.addEventListener('change', () => {
  const [sort, order] = els.sort.value.split('-');
  state.sort = sort; state.order = order; state.page = 1; loadList();
});
els.limit.addEventListener('change', () => { state.limit = Number(els.limit.value); state.page = 1; loadList(); });

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

loadFilters();
loadList();

// 首頁輪播固定使用這 3 張 AI 生成的通用 Banner 素材（不對應特定真實部落），
// 每張圖搭配專屬文案，輪播切換時文字也會一起換
const HERO_SLIDES = [
  {
    image: 'images/hero/banner-sunrise-clouds.jpg',
    title: '當國旅愈來愈冷清，<br>部落其實一直都在',
    lead: '很多人熟悉東京的巷弄、首爾的夜市，卻沒有真正走進過台灣的部落。走部落收錄各族群的輕旅行景點與完整遊程，還能揪伴同行——用一趟 2～3 天的旅程，重新認識這座島嶼，也認識一群願意一起深入探索的旅伴。',
  },
  {
    image: 'images/hero/banner-forest-bridge.jpg',
    title: '走進森林，<br>遇見不一樣的台灣',
    lead: '穿過吊橋、走進山林，台灣的部落藏著都市裡感受不到的芬多精與寧靜。這片你可能還沒走進去的土地，正等著你親自體驗。',
  },
  {
    image: 'images/hero/banner-sunset-village.jpg',
    title: '一趟輕旅行，<br>認識部落也認識彼此',
    lead: '走部落不只是找景點，也讓你揪到一起深入探索的旅伴。行程結束後，還能為彼此留下真實的旅伴評價，讓下一次揪團更安心。',
  },
];

function loadHeroSlideshow() {
  const slidesEl = document.getElementById('hero-slides');
  const dotsEl = document.getElementById('hero-dots');
  const titleEl = document.getElementById('hero-title');
  const leadEl = document.getElementById('hero-lead');
  if (!slidesEl) return;

  slidesEl.innerHTML = HERO_SLIDES.map((s, i) =>
    `<div class="hero-slide${i === 0 ? ' active' : ''}" style="background-image:url('${s.image}')"></div>`
  ).join('');
  dotsEl.innerHTML = HERO_SLIDES.map((_, i) =>
    `<button data-slide="${i}" class="${i === 0 ? 'active' : ''}" aria-label="第 ${i + 1} 張"></button>`
  ).join('');

  let current = 0;
  const slideEls = slidesEl.querySelectorAll('.hero-slide');
  const dotEls = dotsEl.querySelectorAll('button');

  function goTo(index) {
    slideEls[current].classList.remove('active');
    dotEls[current].classList.remove('active');
    current = index;
    slideEls[current].classList.add('active');
    dotEls[current].classList.add('active');

    if (titleEl) titleEl.style.opacity = '0';
    if (leadEl) leadEl.style.opacity = '0';
    setTimeout(() => {
      if (titleEl) { titleEl.innerHTML = HERO_SLIDES[current].title; titleEl.style.opacity = '1'; }
      if (leadEl) { leadEl.textContent = HERO_SLIDES[current].lead; leadEl.style.opacity = '1'; }
    }, 300);
  }

  dotEls.forEach((btn) => btn.addEventListener('click', () => goTo(Number(btn.dataset.slide))));
  setInterval(() => goTo((current + 1) % HERO_SLIDES.length), 9000);
}

async function loadFeatured() {
  const el = document.getElementById('featured');
  try {
    // 抓一批資料回來後，篩掉還是灰色佔位圖（placehold.co）的部落，
    // 優先展示已經有真實照片／AI 生成封面圖的部落
    const data = await Api.getAttractions({ limit: 50 });
    const withRealImage = data.items.filter(
      (a) => a.image_url && !a.image_url.includes('placehold.co')
    );
    const featured = (withRealImage.length ? withRealImage : data.items).slice(0, 4);

    if (!featured.length) {
      el.innerHTML = '<p>目前尚無景點資料，請至管理後台新增。</p>';
      return;
    }
    el.innerHTML = featured.map(cardTemplate).join('');
  } catch (err) {
    el.innerHTML = `<p class="field-error">載入失敗：${escapeHtml(err.message)}</p>`;
  }
}

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

async function loadAiTip() {
  const el = document.getElementById('ai-tip');
  try {
    const data = await Api.getAttractions({ limit: 1, sort: 'created_at', order: 'DESC' });
    const first = data.items[0];
    if (!first) { el.textContent = '新增第一個景點後，這裡會顯示 AI 建議。'; return; }
    const plan = await Api.getAiTravelPlan({
      city: first.city, category_name: first.category_name, attraction_name: first.name,
    });
    el.textContent = plan.plan;
  } catch (err) {
    el.textContent = 'AI 建議暫時無法取得：' + err.message;
  }
}

loadHeroSlideshow();
loadFeatured();
loadAiTip();

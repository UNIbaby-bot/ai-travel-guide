// 標示目前頁面在導覽列上的 active 狀態
document.addEventListener('DOMContentLoaded', () => {
  const current = document.body.dataset.page;
  document.querySelectorAll('.navbar .nav-col-left > a, .navbar .brand-center, .navbar .nav-account a').forEach((a) => {
    if (a.dataset.page === current) a.classList.add('active');
  });

  // 手機版漢堡選單開關
  const toggleBtn = document.getElementById('nav-toggle-btn');
  const navCenter = document.getElementById('nav-center');
  if (toggleBtn && navCenter) {
    toggleBtn.addEventListener('click', () => {
      navCenter.classList.toggle('open');
    });
    // 點了任一連結後自動收合選單
    navCenter.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => navCenter.classList.remove('open'));
    });
  }
});

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// 揪團狀態中文標籤（前端顯示統一用這份對照表，不要直接顯示英文狀態值）
const GROUP_STATUS_LABELS = {
  open: '開放申請中',
  full: '已額滿',
  closed: '已關閉',
  completed: '已完成',
  cancelled: '已取消',
};
function groupStatusLabel(status) {
  return GROUP_STATUS_LABELS[status] || status;
}

// 族群分類圖示對照表（AI 生成的圓形徽章圖示）
const CATEGORY_ICONS = {
  '泰雅族': 'images/categories/tayal.png',
  '布農族': 'images/categories/bunun.png',
  '排灣族': 'images/categories/paiwan.png',
  '鄒族': 'images/categories/tsou.png',
  '阿美族': 'images/categories/amis.png',
  '魯凱族': 'images/categories/rukai.png',
  '賽德克族': 'images/categories/seediq.png',
  '太魯閣族': 'images/categories/truku.png',
  '噶瑪蘭族': 'images/categories/kavalan.png',
};
// 產生帶圖示的分類標籤 HTML，找不到對應圖示時就顯示純文字標籤
function categoryTagHtml(categoryName) {
  const icon = CATEGORY_ICONS[categoryName];
  const label = escapeHtml(categoryName || '');
  if (!icon) return `<span class="tag">${label}</span>`;
  return `<span class="tag tag-icon"><img src="${icon}" alt="${label}">${label}</span>`;
}

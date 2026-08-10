const form = document.getElementById('attraction-form');
const alertBox = document.getElementById('form-alert');
let categoriesCache = [];

function showAlert(type, msg) {
  alertBox.innerHTML = `<div class="alert alert-${type}">${escapeHtml(msg)}</div>`;
  setTimeout(() => { alertBox.innerHTML = ''; }, 4000);
}

function clearFieldErrors() {
  ['name', 'city', 'category'].forEach((f) => {
    document.getElementById(`err-${f}`).textContent = '';
  });
}

// 前端欄位檢查（對應 A3；後端也會再檢查一次）
function validateForm() {
  clearFieldErrors();
  let ok = true;
  const name = document.getElementById('f-name').value.trim();
  const city = document.getElementById('f-city').value.trim();
  const category = document.getElementById('f-category').value;

  if (!name) { document.getElementById('err-name').textContent = '請輸入景點名稱'; ok = false; }
  if (!city) { document.getElementById('err-city').textContent = '請輸入城市或地區'; ok = false; }
  if (!category) { document.getElementById('err-category').textContent = '請選擇分類'; ok = false; }
  return ok;
}

async function loadCategoryOptions() {
  categoriesCache = await Api.getCategories();
  const select = document.getElementById('f-category');
  select.innerHTML = '<option value="">請選擇</option>' +
    categoriesCache.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

async function loadTable() {
  const tbody = document.getElementById('table-body');
  try {
    const data = await Api.getAttractions({ limit: 50, sort: 'created_at', order: 'DESC' });
    if (!data.items.length) {
      tbody.innerHTML = '<tr><td colspan="5">尚無資料</td></tr>';
      return;
    }
    tbody.innerHTML = data.items.map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.city)}</td>
        <td>${escapeHtml(item.category_name)}</td>
        <td>${escapeHtml(item.created_at)}</td>
        <td>
          <button class="btn btn-outline btn-sm" data-edit="${item.id}">編輯</button>
          <button class="btn btn-danger btn-sm" data-delete="${item.id}">刪除</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => startEdit(btn.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', () => removeItem(btn.dataset.delete)));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="field-error">載入失敗：${escapeHtml(err.message)}</td></tr>`;
  }
}

async function startEdit(id) {
  try {
    const item = await Api.getAttraction(id);
    document.getElementById('f-id').value = item.id;
    document.getElementById('f-name').value = item.name;
    document.getElementById('f-city').value = item.city;
    document.getElementById('f-category').value = item.category_id;
    document.getElementById('f-image').value = item.image_url || '';
    document.getElementById('f-desc').value = item.description || '';
    document.getElementById('form-title').textContent = '編輯景點';
    document.getElementById('btn-cancel').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    showAlert('error', '讀取失敗：' + err.message);
  }
}

async function removeItem(id) {
  if (!confirm('確定要刪除這筆景點資料嗎？')) return;
  try {
    await Api.deleteAttraction(id);
    showAlert('success', '刪除成功');
    loadTable();
    loadCharts();
  } catch (err) {
    showAlert('error', '刪除失敗：' + err.message);
  }
}

document.getElementById('btn-cancel').addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  document.getElementById('f-id').value = '';
  document.getElementById('form-title').textContent = '新增景點';
  document.getElementById('btn-cancel').style.display = 'none';
  clearFieldErrors();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    name: document.getElementById('f-name').value.trim(),
    city: document.getElementById('f-city').value.trim(),
    category_id: document.getElementById('f-category').value,
    image_url: document.getElementById('f-image').value.trim(),
    description: document.getElementById('f-desc').value.trim(),
  };
  const id = document.getElementById('f-id').value;

  try {
    if (id) {
      await Api.updateAttraction(id, payload);
      showAlert('success', '修改成功');
    } else {
      await Api.createAttraction(payload);
      showAlert('success', '新增成功');
    }
    resetForm();
    loadTable();
    loadCharts();
  } catch (err) {
    showAlert('error', err.message);
  }
});

let cityChart, categoryChart;
async function loadCharts() {
  try {
    const stats = await Api.getStatistics();

    const cityCtx = document.getElementById('chart-city');
    if (cityChart) cityChart.destroy();
    cityChart = new Chart(cityCtx, {
      type: 'bar',
      data: {
        labels: stats.byCity.map((r) => r.city),
        datasets: [{ label: '各城市景點數量', data: stats.byCity.map((r) => r.count), backgroundColor: '#1f6f62' }],
      },
      options: { responsive: true, plugins: { title: { display: true, text: '各城市景點數量' } } },
    });

    const catCtx = document.getElementById('chart-category');
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(catCtx, {
      type: 'pie',
      data: {
        labels: stats.byCategory.map((r) => r.category),
        datasets: [{ data: stats.byCategory.map((r) => r.count),
          backgroundColor: ['#1f6f62', '#d9a441', '#c1573f', '#7a8790', '#a9c4bb'] }],
      },
      options: { responsive: true, plugins: { title: { display: true, text: '各族群景點比例' } } },
    });
  } catch (err) {
    console.error('圖表載入失敗', err);
  }
}

(async function init() {
  await loadCategoryOptions();
  loadTable();
  loadCharts();
})();

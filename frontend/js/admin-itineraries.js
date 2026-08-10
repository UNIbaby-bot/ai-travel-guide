const itinForm = document.getElementById('itinerary-form');
const itinAlertBox = document.getElementById('itin-form-alert');

function showItinAlert(type, msg) {
  itinAlertBox.innerHTML = `<div class="alert alert-${type}">${escapeHtml(msg)}</div>`;
  setTimeout(() => { itinAlertBox.innerHTML = ''; }, 4000);
}

function clearItinFieldErrors() {
  ['name', 'region', 'route'].forEach((f) => {
    document.getElementById(`itin-err-${f}`).textContent = '';
  });
}

function validateItinForm() {
  clearItinFieldErrors();
  let ok = true;
  const name = document.getElementById('itin-name').value.trim();
  const region = document.getElementById('itin-region').value;
  const route = document.getElementById('itin-route').value.trim();

  if (!name) { document.getElementById('itin-err-name').textContent = '請輸入遊程名稱'; ok = false; }
  if (!region) { document.getElementById('itin-err-region').textContent = '請選擇區域'; ok = false; }
  if (!route) { document.getElementById('itin-err-route').textContent = '請輸入遊程路線'; ok = false; }
  return ok;
}

async function loadItinTable() {
  const tbody = document.getElementById('itin-table-body');
  try {
    const data = await Api.getItineraries({ limit: 50 });
    if (!data.items.length) {
      tbody.innerHTML = '<tr><td colspan="4">尚無資料</td></tr>';
      return;
    }
    tbody.innerHTML = data.items.map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.region)}</td>
        <td>${escapeHtml(item.created_at)}</td>
        <td>
          <button class="btn btn-outline btn-sm" data-itin-edit="${item.id}">編輯</button>
          <button class="btn btn-danger btn-sm" data-itin-delete="${item.id}">刪除</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-itin-edit]').forEach((btn) =>
      btn.addEventListener('click', () => startItinEdit(btn.dataset.itinEdit)));
    tbody.querySelectorAll('[data-itin-delete]').forEach((btn) =>
      btn.addEventListener('click', () => removeItinerary(btn.dataset.itinDelete)));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="field-error">載入失敗：${escapeHtml(err.message)}</td></tr>`;
  }
}

async function startItinEdit(id) {
  try {
    const item = await Api.getItinerary(id);
    document.getElementById('itin-id').value = item.id;
    document.getElementById('itin-name').value = item.name;
    document.getElementById('itin-region').value = item.region;
    document.getElementById('itin-route').value = item.route_text;
    document.getElementById('itin-form-title').textContent = '編輯遊程';
    document.getElementById('itin-btn-cancel').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    showItinAlert('error', '讀取失敗：' + err.message);
  }
}

async function removeItinerary(id) {
  if (!confirm('確定要刪除這筆遊程資料嗎？')) return;
  try {
    await Api.deleteItinerary(id);
    showItinAlert('success', '刪除成功');
    loadItinTable();
  } catch (err) {
    showItinAlert('error', '刪除失敗：' + err.message);
  }
}

document.getElementById('itin-btn-cancel').addEventListener('click', resetItinForm);

function resetItinForm() {
  itinForm.reset();
  document.getElementById('itin-id').value = '';
  document.getElementById('itin-form-title').textContent = '新增遊程';
  document.getElementById('itin-btn-cancel').style.display = 'none';
  clearItinFieldErrors();
}

itinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateItinForm()) return;

  const payload = {
    name: document.getElementById('itin-name').value.trim(),
    region: document.getElementById('itin-region').value,
    route_text: document.getElementById('itin-route').value.trim(),
  };
  const id = document.getElementById('itin-id').value;

  try {
    if (id) {
      await Api.updateItinerary(id, payload);
      showItinAlert('success', '修改成功');
    } else {
      await Api.createItinerary(payload);
      showItinAlert('success', '新增成功');
    }
    resetItinForm();
    loadItinTable();
  } catch (err) {
    showItinAlert('error', err.message);
  }
});

loadItinTable();

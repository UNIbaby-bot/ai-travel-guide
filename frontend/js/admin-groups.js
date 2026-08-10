async function loadAdminGroups() {
  const tbody = document.getElementById('admin-groups-table-body');
  try {
    const data = await Api.adminGetTripGroups({ limit: 50 });
    if (!data.items.length) {
      tbody.innerHTML = '<tr><td colspan="6">目前沒有任何揪團</td></tr>';
      return;
    }
    tbody.innerHTML = data.items.map((g) => `
      <tr>
        <td>${escapeHtml(g.title)}</td>
        <td>${escapeHtml(g.organizer_name)}</td>
        <td>${escapeHtml(g.departure_date)}</td>
        <td>${g.approved_count} / ${g.max_members}</td>
        <td>
          <select data-status-select="${g.id}">
            ${['open', 'full', 'closed', 'completed', 'cancelled'].map((s) =>
              `<option value="${s}" ${s === g.status ? 'selected' : ''}>${groupStatusLabel(s)}</option>`).join('')}
          </select>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" data-save-status="${g.id}">更新狀態</button>
          <button class="btn btn-danger btn-sm" data-delete-group="${g.id}">刪除</button>
          <a class="btn btn-outline btn-sm" href="group-detail.html?id=${g.id}" target="_blank">查看</a>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-save-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.saveStatus;
        const status = tbody.querySelector(`[data-status-select="${id}"]`).value;
        try {
          await Api.adminUpdateTripGroupStatus(id, status);
          loadAdminGroups();
        } catch (err) {
          alert(err.message);
        }
      });
    });
    tbody.querySelectorAll('[data-delete-group]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('確定要刪除這個揪團嗎？這個動作無法復原。')) return;
        try {
          await Api.adminDeleteTripGroup(btn.dataset.deleteGroup);
          loadAdminGroups();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="field-error">載入失敗：${escapeHtml(err.message)}</td></tr>`;
  }
}

loadAdminGroups();

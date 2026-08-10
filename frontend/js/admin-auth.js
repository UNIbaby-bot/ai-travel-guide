// 這裡的檢查只是「前端體驗用」的守門：沒登入就導去登入頁，避免使用者看到空白畫面。
// 真正的安全防護是後端 attractions.php / itineraries.php 裡的 requireAdmin()，
// 就算有人跳過前端直接呼叫 API，後端還是會擋下來，所以資料本身是安全的。
(async function guardAdminPage() {
  try {
    const data = await Api.checkAuth();
    if (!data.loggedIn) {
      location.href = 'login.html';
      return;
    }
    document.getElementById('admin-whoami').textContent = `已登入：${data.username}`;
  } catch (err) {
    location.href = 'login.html';
  }
})();

document.getElementById('btn-logout').addEventListener('click', async () => {
  try {
    await Api.logout();
  } finally {
    location.href = 'login.html';
  }
});

document.getElementById('btn-change-password').addEventListener('click', () => {
  const panel = document.getElementById('change-password-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const oldPassword = document.getElementById('cp-old').value;
  const newPassword = document.getElementById('cp-new').value;
  const alertBox = document.getElementById('password-alert');

  try {
    await Api.changePassword(oldPassword, newPassword);
    alertBox.innerHTML = '<div class="alert alert-success">密碼修改成功</div>';
    document.getElementById('change-password-form').reset();
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
});

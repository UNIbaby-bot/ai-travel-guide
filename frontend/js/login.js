const form = document.getElementById('login-form');
const alertBox = document.getElementById('login-alert');

// 如果已經登入了，直接導去管理後台
(async function checkAlreadyLoggedIn() {
  try {
    const data = await Api.checkAuth();
    if (data.loggedIn) location.href = 'admin.html';
  } catch (err) {
    // 檢查失敗就留在登入頁，不用特別處理
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    await Api.login(username, password);
    location.href = 'admin.html';
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
});

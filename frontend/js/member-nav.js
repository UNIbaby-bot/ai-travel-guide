// 在導覽列的 #member-nav-slot 顯示會員登入狀態
(async function renderMemberNav() {
  const slot = document.getElementById('member-nav-slot');
  if (!slot) return;

  // 先顯示預設的登入/註冊連結，確認登入狀態後再視情況替換，
  // 避免 API 一時連不上時整塊空白看不到任何東西
  slot.innerHTML = `
    <a href="member-login.html">會員登入</a>
    <a href="member-register.html">加入我們</a>`;

  try {
    const data = await Api.memberCheck();
    if (data.loggedIn) {
      slot.innerHTML = `
        <span class="account-pill">🌿 ${escapeHtml(data.username)}
          <a href="#" id="member-logout-link">登出</a>
        </span>`;
      document.getElementById('member-logout-link').addEventListener('click', async (e) => {
        e.preventDefault();
        await Api.memberLogout();
        location.reload();
      });
    }
  } catch (err) {
    // 保留預設的登入/註冊連結即可，不影響頁面其他功能
  }
})();

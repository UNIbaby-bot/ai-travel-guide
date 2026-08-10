// ============================================
// 共用 API 設定
// 本專案建議前端與後端用同一個 php -S 指令一起啟動（見 SETUP.md），
// 此時前端頁面網址是 http://localhost:8000/frontend/xxx.html，
// 後端 API 網址是 http://localhost:8000/backend/api/xxx.php，
// 兩者同一個 host+port，屬於同一來源，瀏覽器才會正常帶上登入用的 session cookie。
// 所以這裡用「相對路徑」呼叫，不寫死 host。
// ============================================
const API_BASE = '/backend';

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin', // 讓瀏覽器帶上登入用的 session cookie
    ...options,
  });
  const json = await res.json().catch(() => null);

  if (!json) {
    throw new Error('伺服器回應格式錯誤');
  }
  if (!json.success) {
    const err = new Error(json.message || '請求失敗');
    err.status = res.status;
    throw err;
  }
  return json.data;
}

const Api = {
  getAttractions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/attractions.php?${qs}`);
  },
  getAttraction: (id) => apiRequest(`/api/attractions.php?id=${id}`),
  createAttraction: (payload) =>
    apiRequest('/api/attractions.php', { method: 'POST', body: JSON.stringify(payload) }),
  updateAttraction: (id, payload) =>
    apiRequest(`/api/attractions.php?id=${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAttraction: (id) =>
    apiRequest(`/api/attractions.php?id=${id}`, { method: 'DELETE' }),
  getCategories: () => apiRequest('/api/categories.php'),
  getStatistics: () => apiRequest('/api/dashboard_statistics.php'),
  getAiTravelPlan: (payload) =>
    apiRequest('/api/ai_travel_plan.php', { method: 'POST', body: JSON.stringify(payload) }),

  getItineraries: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/itineraries.php?${qs}`);
  },
  getItinerary: (id) => apiRequest(`/api/itineraries.php?id=${id}`),
  createItinerary: (payload) =>
    apiRequest('/api/itineraries.php', { method: 'POST', body: JSON.stringify(payload) }),
  updateItinerary: (id, payload) =>
    apiRequest(`/api/itineraries.php?id=${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteItinerary: (id) =>
    apiRequest(`/api/itineraries.php?id=${id}`, { method: 'DELETE' }),

  login: (username, password) =>
    apiRequest('/api/auth_login.php', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => apiRequest('/api/auth_logout.php', { method: 'POST' }),
  checkAuth: () => apiRequest('/api/auth_check.php'),
  changePassword: (oldPassword, newPassword) =>
    apiRequest('/api/auth_change_password.php', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    }),

  // 會員
  memberRegister: (username, email, password) =>
    apiRequest('/api/member_register.php', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  memberLogin: (usernameOrEmail, password) =>
    apiRequest('/api/member_login.php', { method: 'POST', body: JSON.stringify({ username_or_email: usernameOrEmail, password }) }),
  memberLogout: () => apiRequest('/api/member_logout.php', { method: 'POST' }),
  memberCheck: () => apiRequest('/api/member_check.php'),

  // 景點評論
  getReviews: (attractionId, params = {}) => {
    const qs = new URLSearchParams({ attraction_id: attractionId, ...params }).toString();
    return apiRequest(`/api/reviews.php?${qs}`);
  },
  createReview: (payload) => apiRequest('/api/reviews.php', { method: 'POST', body: JSON.stringify(payload) }),
  updateReview: (id, payload) => apiRequest(`/api/reviews.php?id=${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteReview: (id) => apiRequest(`/api/reviews.php?id=${id}`, { method: 'DELETE' }),

  // 揪團
  getTripGroups: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/trip_groups.php?${qs}`);
  },
  getTripGroup: (id) => apiRequest(`/api/trip_groups.php?id=${id}`),
  createTripGroup: (payload) => apiRequest('/api/trip_groups.php', { method: 'POST', body: JSON.stringify(payload) }),
  updateTripGroup: (id, payload) => apiRequest(`/api/trip_groups.php?id=${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTripGroup: (id) => apiRequest(`/api/trip_groups.php?id=${id}`, { method: 'DELETE' }),

  joinTripGroup: (tripGroupId, message) =>
    apiRequest('/api/trip_group_members.php', { method: 'POST', body: JSON.stringify({ trip_group_id: tripGroupId, message }) }),
  decideTripGroupMember: (membershipId, action) =>
    apiRequest(`/api/trip_group_members.php?id=${membershipId}&action=${action}`, { method: 'PUT' }),
  leaveTripGroup: (membershipId) =>
    apiRequest(`/api/trip_group_members.php?id=${membershipId}`, { method: 'DELETE' }),

  // 旅伴互評
  getCompanionRatingsByMember: (memberId) => apiRequest(`/api/companion_ratings.php?member_id=${memberId}`),
  getCompanionRatingsByGroup: (groupId) => apiRequest(`/api/companion_ratings.php?trip_group_id=${groupId}`),
  rateCompanion: (payload) => apiRequest('/api/companion_ratings.php', { method: 'POST', body: JSON.stringify(payload) }),

  // 揪團留言板
  getTripGroupMessages: (groupId) => apiRequest(`/api/trip_group_messages.php?trip_group_id=${groupId}`),
  postTripGroupMessage: (groupId, content, replyToId) =>
    apiRequest('/api/trip_group_messages.php', { method: 'POST', body: JSON.stringify({ trip_group_id: groupId, content, reply_to_id: replyToId }) }),

  // 管理員：揪團管理（不限發起人本人）
  adminGetTripGroups: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin_trip_groups.php?${qs}`);
  },
  adminUpdateTripGroupStatus: (id, status) =>
    apiRequest(`/api/admin_trip_groups.php?id=${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  adminDeleteTripGroup: (id) =>
    apiRequest(`/api/admin_trip_groups.php?id=${id}`, { method: 'DELETE' }),
};

const gParams = new URLSearchParams(location.search);
const groupId = gParams.get('id');
const el = document.getElementById('group-detail');

function ratingStars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

async function load() {
  if (!groupId) { el.innerHTML = '<p>缺少揪團 id。</p>'; return; }

  try {
    const [group, auth] = await Promise.all([Api.getTripGroup(groupId), Api.memberCheck()]);
    const myId = auth.loggedIn ? auth.id : null;
    const isOrganizer = myId === group.organizer_id;
    const myMembership = group.members.find((m) => m.member_id === myId);

    const approvedMembers = group.members.filter((m) => m.status === 'approved');
    const pendingMembers = group.members.filter((m) => m.status === 'pending');

    let actionHtml = '';
    if (!auth.loggedIn) {
      actionHtml = `<p><a href="member-login.html">登入會員</a>後即可申請加入。</p>`;
    } else if (isOrganizer) {
      actionHtml = `
        <div class="form-panel">
          <h3>發起人管理</h3>
          <label for="status-select">揪團狀態</label>
          <select id="status-select" style="margin:8px 0;padding:8px;border-radius:8px;border:1px solid #d8cdb8;">
            ${['open', 'full', 'closed', 'completed', 'cancelled'].map((s) =>
              `<option value="${s}" ${s === group.status ? 'selected' : ''}>${groupStatusLabel(s)}</option>`).join('')}
          </select>
          <button id="btn-update-status" class="btn btn-outline btn-sm">更新狀態</button>
          ${group.review_deadline ? `<p style="color:var(--color-ink-soft);margin-top:10px;">📋 你設定的審核截止日：${escapeHtml(group.review_deadline)}</p>` : ''}
          ${pendingMembers.length ? `
            <h4 style="margin-top:16px;">待核准申請（${pendingMembers.length}）</h4>
            ${pendingMembers.map((m) => `
              <div style="border-top:1px dashed var(--color-line);padding:12px 0;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong>${escapeHtml(m.username)}</strong>
                  <span>
                    <button class="btn btn-primary btn-sm" data-approve="${m.id}">核准</button>
                    <button class="btn btn-danger btn-sm" data-reject="${m.id}">拒絕</button>
                  </span>
                </div>
                <p class="preserve-lines" style="margin:6px 0 0;color:var(--color-ink-soft);">${escapeHtml(m.application_message || '（沒有留下自我介紹）')}</p>
              </div>`).join('')}
          ` : '<p style="color:#7a8790;">目前沒有待核准的申請。</p>'}
        </div>`;
    } else if (myMembership && myMembership.status === 'approved') {
      actionHtml = `<button id="btn-leave" class="btn btn-outline">退出揪團</button>`;
    } else if (myMembership && myMembership.status === 'pending') {
      actionHtml = `<p>你已經申請加入，等待團主核准中${group.review_deadline ? `（團主預計 ${escapeHtml(group.review_deadline)} 前會完成審核）` : ''}。</p>`;
    } else if (myMembership && myMembership.status === 'rejected') {
      actionHtml = `<p style="color:#7a8790;">你的申請未被核准。</p>`;
    } else if (group.status === 'open' && !group.is_departed) {
      actionHtml = `
        <div class="form-panel">
          <h3>申請加入這個揪團</h3>
          <p style="color:var(--color-ink-soft);margin-top:-6px;">簡單自我介紹、說明想加入的原因，以及你對這趟旅行的想法，讓團主更容易判斷是否合適。</p>
          ${group.review_deadline ? `<p style="color:var(--color-ink-soft);">📋 團主預計審核截止日：${escapeHtml(group.review_deadline)}</p>` : ''}
          <div id="join-form-alert"></div>
          <form id="join-form">
            <div class="form-row">
              <label for="join-message">自我介紹／加入原因／對這趟旅行的想法</label>
              <textarea id="join-message" placeholder="例如：我是OO，平常喜歡爬山健行，這次想找年紀相仿的旅伴一起深入部落，希望能..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary">送出申請</button>
          </form>
        </div>`;
    } else {
      actionHtml = `<p style="color:#7a8790;">目前不開放申請加入。</p>`;
    }

    el.innerHTML = `
      <a href="groups.html">← 返回揪團列表</a>
      <span class="tag" style="margin-top:16px;">${escapeHtml(groupStatusLabel(group.status))}</span>
      <h1>${escapeHtml(group.title)}</h1>
      <div class="meta">🗓️ 出發日：${escapeHtml(group.departure_date)}　｜　👤 發起人：${escapeHtml(group.organizer_name)}</div>
      ${group.review_deadline ? `<div class="meta">📋 預計審核截止日：${escapeHtml(group.review_deadline)}</div>` : ''}
      <div class="meta">👥 人數：${group.approved_count} / ${group.max_members}</div>
      <p class="preserve-lines">${escapeHtml(group.description || '')}</p>
      ${group.contact_info ? `
        <div class="ai-box">
          <h3>📇 聯繫方式</h3>
          <p>${escapeHtml(group.contact_info)}</p>
        </div>` : ''}

      <div class="form-panel">
        <h3>已核准成員</h3>
        ${approvedMembers.map((m) => `<div>👤 ${escapeHtml(m.username)}</div>`).join('') || '<p>尚無成員</p>'}
      </div>

      <div id="action-slot">${actionHtml}</div>
      <div id="rating-slot"></div>
      <div id="message-slot"></div>
    `;

    document.getElementById('join-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = document.getElementById('join-message').value.trim();
      const alertBox = document.getElementById('join-form-alert');
      try {
        await Api.joinTripGroup(groupId, message);
        load();
      } catch (err) {
        alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      }
    });
    document.getElementById('btn-leave')?.addEventListener('click', async () => {
      if (!confirm('確定要退出這個揪團嗎？')) return;
      try { await Api.leaveTripGroup(myMembership.id); load(); }
      catch (err) { alert(err.message); }
    });
    document.getElementById('btn-update-status')?.addEventListener('click', async () => {
      const status = document.getElementById('status-select').value;
      try { await Api.updateTripGroup(groupId, { status }); load(); }
      catch (err) { alert(err.message); }
    });
    el.querySelectorAll('[data-approve]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        try { await Api.decideTripGroupMember(btn.dataset.approve, 'approve'); load(); }
        catch (err) { alert(err.message); }
      }));
    el.querySelectorAll('[data-reject]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        try { await Api.decideTripGroupMember(btn.dataset.reject, 'reject'); load(); }
        catch (err) { alert(err.message); }
      }));

    // 行程結束後（出發日已過）且自己是已核准成員，開放旅伴互評
    if (group.is_departed && myMembership && myMembership.status === 'approved') {
      await renderCompanionRating(group, myId, approvedMembers);
    }

    // 發起人跟已核准成員可以看到並使用留言板
    // 留言板開放給所有登入會員（不限已核准成員），讓還沒申請/申請中的人也能先跟發起人互動
    if (auth.loggedIn) {
      await renderMessageBoard(group);
    }
  } catch (err) {
    el.innerHTML = `<p class="field-error">載入失敗：${escapeHtml(err.message)}</p>`;
  }
}

async function renderMessageBoard(group) {
  const slot = document.getElementById('message-slot');
  slot.innerHTML = `
    <div class="form-panel">
      <h3>💬 揪團留言板</h3>
      <div id="message-list"><p>載入中...</p></div>
      <form id="message-form" style="margin-top:14px;">
        <div class="form-row">
          <label for="message-input">留言（所有登入會員都能看到，公開討論區）</label>
          <textarea id="message-input" placeholder="跟團員討論集合時間、需要準備的東西..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-sm">送出留言</button>
      </form>
    </div>
  `;

  function messageBlock(m, isReply) {
    const isOrganizerMsg = m.member_id === group.organizer_id;
    return `
      <div class="message-item" style="border-bottom:1px dashed var(--color-line);padding:10px 0;${isReply ? 'margin-left:32px;border-left:3px solid var(--color-primary-light);padding-left:14px;' : ''}">
        <div>
          <strong>${escapeHtml(m.username)}</strong>
          ${isOrganizerMsg ? '<span class="tag" style="margin-left:6px;">🌿 團主</span>' : ''}
          <span style="color:#7a8790;font-size:0.85rem;margin-left:8px;">${escapeHtml(m.created_at)}</span>
        </div>
        <p class="preserve-lines" style="margin:4px 0 0;">${escapeHtml(m.content)}</p>
        ${!isReply ? `
          <button class="btn btn-outline btn-sm" data-reply-toggle="${m.id}" style="margin-top:6px;">回覆</button>
          <div class="reply-form-wrap" data-reply-wrap="${m.id}" style="display:none;margin-top:8px;">
            <textarea data-reply-input="${m.id}" placeholder="回覆 ${escapeHtml(m.username)}..." style="width:100%;min-height:60px;padding:8px 12px;border:2px solid var(--color-line);border-radius:10px;font-family:var(--font-body);"></textarea>
            <button class="btn btn-primary btn-sm" data-reply-submit="${m.id}" style="margin-top:6px;">送出回覆</button>
          </div>` : ''}
      </div>`;
  }

  async function loadMessages() {
    const listEl = document.getElementById('message-list');
    try {
      const data = await Api.getTripGroupMessages(group.id);
      if (!data.items.length) {
        listEl.innerHTML = '<p style="color:#7a8790;">還沒有人留言，開始第一則討論吧！</p>';
        return;
      }
      const topLevel = data.items.filter((m) => !m.reply_to_id);
      const repliesByParent = {};
      data.items.filter((m) => m.reply_to_id).forEach((m) => {
        (repliesByParent[m.reply_to_id] = repliesByParent[m.reply_to_id] || []).push(m);
      });

      listEl.innerHTML = topLevel.map((m) =>
        messageBlock(m, false) + (repliesByParent[m.id] || []).map((r) => messageBlock(r, true)).join('')
      ).join('');

      listEl.querySelectorAll('[data-reply-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const wrap = listEl.querySelector(`[data-reply-wrap="${btn.dataset.replyToggle}"]`);
          wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
        });
      });
      listEl.querySelectorAll('[data-reply-submit]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const parentId = btn.dataset.replySubmit;
          const textarea = listEl.querySelector(`[data-reply-input="${parentId}"]`);
          const content = textarea.value.trim();
          if (!content) return;
          try {
            await Api.postTripGroupMessage(group.id, content, Number(parentId));
            loadMessages();
          } catch (err) {
            alert(err.message);
          }
        });
      });
    } catch (err) {
      listEl.innerHTML = `<p class="field-error">載入失敗：${escapeHtml(err.message)}</p>`;
    }
  }

  document.getElementById('message-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content) return;
    try {
      await Api.postTripGroupMessage(group.id, content);
      input.value = '';
      loadMessages();
    } catch (err) {
      alert(err.message);
    }
  });

  loadMessages();
}

async function renderCompanionRating(group, myId, approvedMembers) {
  const ratingSlot = document.getElementById('rating-slot');
  const existing = await Api.getCompanionRatingsByGroup(group.id);
  const ratedPairs = new Set(existing.items.filter((r) => r.rater_id === myId).map((r) => r.ratee_id));

  const others = approvedMembers.filter((m) => m.member_id !== myId);
  if (!others.length) {
    ratingSlot.innerHTML = '<p style="color:#7a8790;">這團沒有其他旅伴可以評價。</p>';
    return;
  }

  ratingSlot.innerHTML = `
    <div class="form-panel">
      <h3>旅伴互評（行程已結束）</h3>
      ${others.map((m) => {
        if (ratedPairs.has(m.member_id)) {
          return `<p>✅ 你已經評價過 ${escapeHtml(m.username)}</p>`;
        }
        return `
          <div style="border-top:1px dashed #d8cdb8;padding-top:12px;margin-top:12px;">
            <h4>評價旅伴：${escapeHtml(m.username)}</h4>
            <form class="companion-rate-form" data-ratee="${m.member_id}">
              <div class="form-grid">
                <div class="form-row"><label>準時可靠</label>
                  <select class="cr-punctual">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===4?'selected':''}>${ratingStars(n)}</option>`).join('')}</select>
                </div>
                <div class="form-row"><label>溝通互動</label>
                  <select class="cr-communication">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===4?'selected':''}>${ratingStars(n)}</option>`).join('')}</select>
                </div>
                <div class="form-row"><label>尊重與禮貌</label>
                  <select class="cr-respect">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===4?'selected':''}>${ratingStars(n)}</option>`).join('')}</select>
                </div>
                <div class="form-row"><label>整體體驗</label>
                  <select class="cr-overall">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===4?'selected':''}>${ratingStars(n)}</option>`).join('')}</select>
                </div>
              </div>
              <div class="form-row"><label>留言（選填）</label><textarea class="cr-comment"></textarea></div>
              <button type="submit" class="btn btn-primary btn-sm">送出評價</button>
            </form>
          </div>`;
      }).join('')}
    </div>
  `;

  document.querySelectorAll('.companion-rate-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        trip_group_id: group.id,
        ratee_id: Number(form.dataset.ratee),
        rating_punctual: Number(form.querySelector('.cr-punctual').value),
        rating_communication: Number(form.querySelector('.cr-communication').value),
        rating_respect: Number(form.querySelector('.cr-respect').value),
        rating_overall: Number(form.querySelector('.cr-overall').value),
        comment: form.querySelector('.cr-comment').value.trim(),
      };
      try {
        await Api.rateCompanion(payload);
        load();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

load();

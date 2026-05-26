/* ═══════════════════════════════════════
   ひなたカレンダー — ナビゲーション共通
   nav.js（アカウント対応版）
═══════════════════════════════════════ */

/* ── ドロワーHTML注入 ── */
function injectNav(activePage) {
  const pages = [
    { href: 'index.html',    icon: '🏮', label: 'トップ' },
    { href: 'calendar.html', icon: '📅', label: '日向坂46（カレンダー）' },
    { href: 'members.html',  icon: '🌻', label: '推しメン一覧' },
    { href: 'events.html',   icon: '☀️',  label: '行事帳' },
    { href: 'gallery.html',  icon: '📷', label: 'フォトギャラリー' },
    // { href: 'train.html',    icon: '🚃', label: '電車検索' }, // 一時非表示
    { href: 'venue.html',    icon: '🏟️', label: 'ライブ会場一覧' },
    { href: 'schedule.html',  icon: '📋', label: 'スケジュール進捗' },
    { href: 'chat.html',      icon: '💬', label: 'チャット' },
    { href: 'flower.html',   icon: '💐', label: '祝花申し込み' },
    { href: 'poster.html',   icon: '🎨', label: 'ポスター案' },
    { href: 'guide.html',    icon: '📖', label: '使い方ガイド' },
    { href: 'feedback.html', icon: '💬', label: 'ご意見・ご要望' },
    { href: 'profile.html',  icon: '👤', label: 'アカウント設定' },
  ];

  // 管理者のみ管理者ページを追加
  if (typeof isAdmin === 'function' && isAdmin()) {
    pages.push({ href: 'admin.html', icon: '🔐', label: '管理者ページ' });
  }

  const navItems = pages.map(p => {
    const isActive = p.href === activePage;
    // スケジュールのタスクバッジはJS側で後から付与
    const badgeId = p.href === 'schedule.html' ? ' id="schedNavItem"' : '';
    return `<a class="drawer-nav-item${isActive ? ' active' : ''}" href="${p.href}"${badgeId}>
      <span class="drawer-nav-icon">${p.icon}</span>${p.label}<span class="task-badge" id="schedNavBadge" style="display:none;margin-left:auto;background:#e05050;color:white;border-radius:20px;font-size:10px;padding:2px 8px;font-weight:700;font-family:'M PLUS Rounded 1c',sans-serif">タスク未完</span>
    </a>`;
  }).join('<div class="drawer-nav-divider"></div>');

  // ログインユーザー情報
  const user = (typeof getUser === 'function') ? getUser() : null;
  const userSection = user
    ? `<div class="drawer-user-section">
        <div class="drawer-user-avatar">${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.nickname}">` : '🌸'}</div>
        <div class="drawer-user-info">
          <div class="drawer-user-name">${user.nickname}</div>
          <div class="drawer-user-sub">${user.email || 'おひさまファン'}</div>
        </div>
      </div>`
    : `<a class="drawer-user-section drawer-user-login" href="profile.html">
        <div class="drawer-user-avatar" style="font-size:22px">👤</div>
        <div class="drawer-user-info">
          <div class="drawer-user-name">ゲスト</div>
          <div class="drawer-user-sub" style="color:var(--sky)">タップしてアカウント設定 →</div>
        </div>
      </a>`;

  document.body.insertAdjacentHTML('beforeend', `
    <!-- DRAWER -->
    <div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer(event)">
      <nav class="drawer" id="drawer">
        <div class="drawer-header">
          <div class="drawer-logo">日向坂46</div>
          <div class="drawer-logo-sub">☀ ひなたカレンダー ☀</div>
          <button class="drawer-close" onclick="closeDrawerDirect()">✕</button>
        </div>
        <a href="index.html" class="drawer-nav-item" style="background:rgba(21,101,160,0.08);border-bottom:1.5px solid var(--hina-2);font-weight:800">
          <span class="drawer-nav-icon">🏠</span>メインページへ戻る
        </a>
        ${userSection}
        <div class="drawer-nav">${navItems}</div>
        <div class="drawer-footer">☀ 日向坂46 · hinatazaka calendar ☀</div>
      </nav>
    </div>

    <!-- NOTIF PANEL -->
    <div class="notif-panel" id="notifPanel">
      <div class="notif-panel-header">☀ お知らせ</div>
      <div id="notifList"></div>
    </div>

    <!-- BDAY POPUP -->
    <div class="bday-popup" id="bdayPopup">
      <div class="bday-card">
        <div class="bday-avatar" id="bdayAvatar"></div>
        <div class="bday-title" id="bdayTitle"></div>
        <div class="bday-sub"   id="bdaySub"></div>
        <button class="bday-close" onclick="document.getElementById('bdayPopup').classList.remove('open')">☀ おめでとう ☀</button>
      </div>
    </div>
  `);

  // ユーザーセクションスタイルを動的に追加
  if (!document.getElementById('nav-user-style')) {
    const style = document.createElement('style');
    style.id = 'nav-user-style';
    style.textContent = `
      .drawer-user-section {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 24px; border-bottom: 1.5px solid var(--hina-2);
        background: rgba(240,248,255,0.6);
        text-decoration: none; color: var(--sumi);
      }
      .drawer-user-login { cursor: pointer; transition: background 0.15s; }
      .drawer-user-login:hover { background: var(--hina-1); }
      .drawer-user-avatar {
        width: 42px; height: 42px; border-radius: 50%;
        background: var(--hina-1); border: 2px solid var(--hina-2);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; overflow: hidden; flex-shrink: 0;
      }
      .drawer-user-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
      .drawer-user-name { font-family:'M PLUS Rounded 1c',sans-serif; font-size:14px; font-weight:700; color:var(--sumi); }
      .drawer-user-sub  { font-family:'Noto Serif JP',serif; font-size:10px; color:var(--sumi-light); margin-top:2px; }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('click', e => {
    const panel = document.getElementById('notifPanel');
    if (panel && panel.classList.contains('open')
        && !panel.contains(e.target)
        && !e.target.closest('.notif-btn')) {
      panel.classList.remove('open');
    }
  });

  updateNotifBtn();
}

/* ── Drawer open/close ── */
function openDrawer() {
  document.getElementById('drawerOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer(e) {
  if (e && e.target !== document.getElementById('drawerOverlay')) return;
  closeDrawerDirect();
}
function closeDrawerDirect() {
  document.getElementById('drawerOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Notification panel ── */
function toggleNotif() {
  const panel = document.getElementById('notifPanel');
  const open  = panel.classList.toggle('open');
  if (open) {
    const notes = buildNotifications();
    document.getElementById('notifList').innerHTML = notes.length
      ? notes.map(n => `
          <div class="notif-item">
            <div class="notif-item-icon">${n.icon}</div>
            <div>
              <div class="notif-item-title">${n.title}</div>
              <div class="notif-item-sub">${n.sub}</div>
            </div>
          </div>`).join('')
      : `<div style="padding:16px;font-family:'Noto Serif JP',serif;font-size:12px;color:var(--sumi-light);text-align:center">お知らせはありません ☀</div>`;
  }
}

/* ── Shared header HTML ── */
function headerHTML(title, subtitle) {
  // ヘッダー右側：ログイン状態によってアバターかベルを表示
  const user = (typeof getUser === 'function') ? getUser() : null;
  const avatarBtn = user
    ? `<a href="profile.html" class="header-avatar-btn" title="${user.nickname}">
        ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.nickname}">` : '🌸'}
      </a>`
    : `<a href="profile.html" class="header-avatar-btn header-avatar-guest" title="アカウント設定">
        <span style="font-size:16px">👤</span>
      </a>`;

  // スタイルを動的追加
  if (!document.getElementById('header-avatar-style')) {
    const style = document.createElement('style');
    style.id = 'header-avatar-style';
    style.textContent = `
      .header-avatar-btn {
        width:40px; height:40px; border-radius:50%;
        background: rgba(255,255,255,0.88); border: 1.5px solid var(--hina-2);
        display:flex; align-items:center; justify-content:center;
        overflow:hidden; cursor:pointer; text-decoration:none;
        box-shadow: var(--shadow-hina); transition: transform 0.15s;
        flex-shrink:0;
      }
      .header-avatar-btn:active { transform: scale(0.9); }
      .header-avatar-btn img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
      .header-avatar-guest { font-size:18px; }
    `;
    document.head.appendChild(style);
  }

  return `
    <header class="app-header">
      <button class="hamburger-btn" onclick="openDrawer()" aria-label="メニューを開く">
        <span></span><span></span><span></span>
      </button>
      <a href="index.html" class="header-logo">
        <div class="header-logo-main">${title || '日向坂46'}</div>
        <div class="header-logo-sub">${subtitle || '☀ ひなたカレンダー ☀'}</div>
      </a>
      <div class="header-right">
        <button class="notif-btn" onclick="toggleNotif()" aria-label="お知らせ">
          🔔<div class="notif-dot" id="notifDot"></div>
        </button>
        ${avatarBtn}
      </div>
    </header>`;
}

/* ── タスク未完バッジチェック ── */
async function checkMyPendingTasks() {
  if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return;
  if (typeof apiFetch !== 'function') return;
  try {
    var myId = (typeof getUser === 'function') ? getUser().id : null;
    if (!myId) return;
    var schedules = await apiFetch('/api/schedules');
    if (!schedules) return;

    // 自分が担当で in_progress のステップを収集
    var pendingSteps = [];
    schedules.forEach(function(s) {
      if (s.status === 'completed') return;
      (s.steps || []).forEach(function(st) {
        if (st.status === 'in_progress' && st.assignee_id === myId) {
          pendingSteps.push({ scheduleTitle: s.title, stepTitle: st.title, dueDate: st.due_date });
        }
      });
    });
    var hasPending = pendingSteps.length > 0;

    // ① ドロワーのバッジ
    var badge = document.getElementById('schedNavBadge');
    if (badge) badge.style.display = hasPending ? 'inline-block' : 'none';

    // ② トップページのメニューカード強化
    updateScheduleCardBadge(hasPending, pendingSteps);

    // ③ トップページのお知らせバナー
    updateTaskNoticeBanner(hasPending, pendingSteps);

  } catch {}
}

function updateScheduleCardBadge(hasPending, pendingSteps) {
  var cards = document.querySelectorAll('a[href="schedule.html"]');
  cards.forEach(function(card) {
    // 既存バッジ削除
    var existing = card.querySelector('.schedule-task-badge');
    if (existing) existing.remove();

    if (!hasPending) return;

    // カード自体を強調
    card.style.borderColor = 'rgba(220,60,60,0.45)';
    card.style.background  = 'linear-gradient(135deg,rgba(255,240,240,0.9),rgba(255,255,255,0.85))';

    // バッジ追加
    var b = document.createElement('span');
    b.className = 'schedule-task-badge';
    b.textContent = pendingSteps.length + '件';
    b.style.cssText = 'position:absolute;top:8px;right:8px;background:#e05050;color:white;border-radius:10px;font-size:9px;padding:2px 8px;font-weight:800;font-family:\'M PLUS Rounded 1c\',sans-serif;z-index:1;animation:taskPulse 1.8s ease-in-out infinite;';
    card.style.position = 'relative';
    card.appendChild(b);

    // アイコンのアニメーション
    var icon = card.querySelector('.quick-card-icon, .list-menu-item-icon');
    if (icon && !icon.dataset.original) {
      icon.dataset.original = icon.textContent;
      icon.textContent = '📋';
    }

    // リスト用：ラベルにコメント追加
    var label = card.querySelector('.list-menu-item-label');
    if (label && !label.dataset.original) {
      label.dataset.original = label.textContent;
      label.innerHTML = 'スケジュール進捗 <span style="font-size:10px;color:#e05050;font-weight:700">● ' + pendingSteps.length + '件のタスク</span>';
    }
  });

  // 通常に戻す（hasPendingがfalseの場合）
  if (!hasPending) {
    cards.forEach(function(card) {
      card.style.borderColor = '';
      card.style.background  = '';
      var icon = card.querySelector('.quick-card-icon, .list-menu-item-icon');
      if (icon && icon.dataset.original) {
        icon.textContent = icon.dataset.original;
        delete icon.dataset.original;
      }
      var label = card.querySelector('.list-menu-item-label');
      if (label && label.dataset.original) {
        label.textContent = label.dataset.original;
        delete label.dataset.original;
      }
    });
  }
}

function updateTaskNoticeBanner(hasPending, pendingSteps) {
  // トップページ専用（index.htmlにのみ挿入）
  var grid = document.getElementById('menuGrid') || document.getElementById('menuList');
  if (!grid) return; // トップページでなければスキップ

  var bannerId = 'taskNoticeBanner';
  var existing = document.getElementById(bannerId);

  if (!hasPending) {
    if (existing) existing.remove();
    return;
  }

  if (existing) {
    // 更新
    existing.querySelector('.task-notice-text').textContent =
      '📋 ' + pendingSteps.length + '件のタスクが割り当てられています';
    return;
  }

  // 新規作成
  var banner = document.createElement('a');
  banner.id        = bannerId;
  banner.href      = 'schedule.html';
  banner.className = '';
  banner.style.cssText = [
    'display:flex','align-items:center','gap:12px',
    'padding:14px 18px','border-radius:18px',
    'background:linear-gradient(135deg,rgba(220,60,60,0.10),rgba(255,255,255,0.88))',
    'border:2px solid rgba(220,60,60,0.35)',
    'text-decoration:none','cursor:pointer',
    'touch-action:manipulation',
    'box-shadow:0 4px 20px rgba(220,60,60,0.12)',
    'margin-bottom:14px',
    'animation:taskBannerIn 0.4s cubic-bezier(.34,1.56,.64,1) both',
    'position:relative','overflow:hidden',
  ].join(';');

  banner.innerHTML = [
    '<div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(to bottom,#e05050,#c03030);border-radius:18px 0 0 18px"></div>',
    '<div style="font-size:32px;flex-shrink:0">📋</div>',
    '<div style="flex:1;min-width:0">',
      '<div class="task-notice-text" style="font-family:serif;font-size:14px;font-weight:800;color:#c03030;margin-bottom:2px">',
        '📋 ' + pendingSteps.length + '件のタスクが割り当てられています',
      '</div>',
      '<div style="font-family:sans-serif;font-size:11px;color:var(--sumi-light)">',
        'スケジュール進捗を確認して完了ボタンを押してください',
      '</div>',
    '</div>',
    '<div style="font-size:18px;color:#c03030;flex-shrink:0">›</div>',
  ].join('');

  // activeBannersの直後に挿入
  var activeBanners = document.getElementById('activeBanners');
  if (activeBanners && activeBanners.parentNode) {
    activeBanners.parentNode.insertBefore(banner, activeBanners.nextSibling);
  } else if (grid && grid.parentNode) {
    grid.parentNode.insertBefore(banner, grid);
  }

  // タッチ対応
  banner.addEventListener('touchend', function(e) { e.preventDefault(); location.href='schedule.html'; }, { passive: false });
}

// CSSアニメーション注入（一度だけ）
(function injectTaskBadgeCSS() {
  if (document.getElementById('taskBadgeStyle')) return;
  var s = document.createElement('style');
  s.id = 'taskBadgeStyle';
  s.textContent = [
    '@keyframes taskPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.75;transform:scale(1.08)}}',
    '@keyframes taskBannerIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}',
  ].join('');
  document.head.appendChild(s);
})();

// injectNav後に自動実行
setTimeout(checkMyPendingTasks, 500);
2026/05/26 20:12:05

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
    { href: 'train.html',    icon: '🚃', label: '電車検索' },
    { href: 'venue.html',    icon: '🏟️', label: 'ライブ会場一覧' },
    { href: 'flower.html',   icon: '💐', label: '祝花申し込み' },
    { href: 'poster.html',   icon: '🎨', label: 'ポスター案' },
    { href: 'profile.html',  icon: '👤', label: 'アカウント設定' },
  ];

  const navItems = pages.map(p => {
    const isActive = p.href === activePage;
    return `<a class="drawer-nav-item${isActive ? ' active' : ''}" href="${p.href}">
      <span class="drawer-nav-icon">${p.icon}</span>${p.label}
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

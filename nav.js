/* ═══════════════════════════════════════
   ひなたカレンダー — ナビゲーション共通
   nav.js
═══════════════════════════════════════ */

/* ── ドロワーHTML注入 ── */
function injectNav(activePage) {
  const pages = [
    { href: 'index.html',         icon: '🏮', label: 'トップ' },
    { href: 'calendar.html',      icon: '📅', label: '日向坂46（カレンダー）' },
    { href: 'members.html',       icon: '🌻', label: '推しメン一覧' },
    { href: 'events.html',        icon: '☀️',  label: '行事帳' },
    { href: 'gallery.html',       icon: '📷', label: 'フォトギャラリー' },
    { href: 'train.html',         icon: '🚃', label: '電車検索' },
  ];

  const navItems = pages.map(p => {
    const isActive = p.href === activePage;
    return `<a class="drawer-nav-item${isActive ? ' active' : ''}" href="${p.href}">
      <span class="drawer-nav-icon">${p.icon}</span>${p.label}
    </a>`;
  }).join('<div class="drawer-nav-divider"></div>');

  document.body.insertAdjacentHTML('beforeend', `
    <!-- DRAWER -->
    <div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer(event)">
      <nav class="drawer" id="drawer">
        <div class="drawer-header">
          <div class="drawer-logo">日向坂46</div>
          <div class="drawer-logo-sub">☀ ひなたカレンダー ☀</div>
          <button class="drawer-close" onclick="closeDrawerDirect()">✕</button>
        </div>
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

  // Close notif/drawer when clicking outside
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
      </div>
    </header>`;
}

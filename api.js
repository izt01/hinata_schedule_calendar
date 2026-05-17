/* ═══════════════════════════════════════
   ひなたカレンダー — APIクライアント
   api.js
   ★ ここにRailwayのAPIサーバーURLを設定 ★
═══════════════════════════════════════ */

// ─────────────────────────────────────────
// 🔧 設定：RailwayにデプロイしたAPIサーバーのURL
//    例: 'https://hinata-api.up.railway.app'
// -----------------------------------------
const API_BASE = 'https://hinataschedulecalendar-production.up.railway.app';
// -----------------------------------------

// ── トークン管理 ──────────────────────────
function getToken()       { return localStorage.getItem('hinata_token'); }
function setToken(t)      { localStorage.setItem('hinata_token', t); }
function removeToken()    { localStorage.removeItem('hinata_token'); localStorage.removeItem('hinata_user'); }
function getUser()        { try { return JSON.parse(localStorage.getItem('hinata_user') || 'null'); } catch { return null; } }
function setUser(u)       { localStorage.setItem('hinata_user', JSON.stringify(u)); }
function isLoggedIn()     { return !!getToken(); }

// ── 共通fetchラッパー ─────────────────────
async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (res.status === 401) {
    removeToken();
    // ログインが必要な場合はprofile.htmlへ
    if (!window.location.pathname.includes('profile')) {
      alert('ログインが必要です。プロフィール設定画面に移動します。');
      window.location.href = 'profile.html';
    }
    return null;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `エラー: ${res.status}`);
  }
  return res.json();
}

// ══════════════════════════════════════════
//  ユーザー API
// ══════════════════════════════════════════
const UserAPI = {
  // 新規登録（パスワード必須）
  async register(nickname, email, password, avatarUrl, avatarType) {
    const data = await apiFetch('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ nickname, email, password, avatar_url: avatarUrl, avatar_type: avatarType }),
    });
    if (data) { setToken(data.token); setUser(data.user); }
    return data;
  },

  // ログイン（ニックネーム or メール + パスワード）
  async login(identifier, password) {
    const data = await apiFetch('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (data) { setToken(data.token); setUser(data.user); }
    return data;
  },

  // プロフィール更新（パスワード変更オプション付き）
  async update(nickname, email, avatarUrl, avatarType, currentPassword, newPassword) {
    const body = { nickname, email, avatar_url: avatarUrl, avatar_type: avatarType };
    if (currentPassword) body.current_password = currentPassword;
    if (newPassword)     body.new_password     = newPassword;
    const data = await apiFetch('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (data) { setToken(data.token); setUser(data.user); }
    return data;
  },

  // 自分のプロフィール取得
  async me() {
    return apiFetch('/api/users/me');
  },

  // 全ユーザー一覧
  async list() {
    return apiFetch('/api/users');
  },
};

// ══════════════════════════════════════════
//  イベント API（localStorage フォールバック付き）
// ══════════════════════════════════════════
const EventAPI = {
  // 一覧取得
  async list() {
    if (!isLoggedIn()) return loadLocalEvents();
    try {
      return await apiFetch('/api/events') || [];
    } catch {
      return loadLocalEvents();
    }
  },

  // 追加
  async add(event) {
    if (!isLoggedIn()) {
      // 未ログイン時はlocal保存
      const events = loadLocalEvents();
      const e = { ...event, id: 'local_' + Date.now() };
      events.push(e);
      saveLocalEvents(events);
      return e;
    }
    try {
      return await apiFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify(event),
      });
    } catch (err) {
      alert('イベント保存エラー: ' + err.message);
      return null;
    }
  },

  // 削除
  async delete(id) {
    if (String(id).startsWith('local_')) {
      const events = loadLocalEvents().filter(e => String(e.id) !== String(id));
      saveLocalEvents(events);
      return;
    }
    if (!isLoggedIn()) return;
    await apiFetch('/api/events/' + id, { method: 'DELETE' });
  },

  // 更新
  async update(id, event) {
    if (!isLoggedIn()) return;
    return apiFetch('/api/events/' + id, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
  },
};

// ══════════════════════════════════════════
//  写真 API（IndexedDB フォールバック付き）
// ══════════════════════════════════════════
const PhotoAPI = {
  // 一覧取得
  async list() {
    if (!isLoggedIn()) return getAllPhotos(); // db.js の関数
    try {
      return await apiFetch('/api/photos') || [];
    } catch {
      return getAllPhotos();
    }
  },

  // 追加
  async add(photo) {
    if (!isLoggedIn()) {
      return savePhoto({ ...photo, id: Date.now() });
    }
    try {
      const result = await apiFetch('/api/photos', {
        method: 'POST',
        body: JSON.stringify({
          member_id:       photo.memberId,
          member_name:     photo.memberName,
          caption:         photo.caption,
          image_data:      photo.dataUrl,
          visibility:      photo.visibility || 'private',
          target_user_ids: photo.targetUserIds || [],
        }),
      });
      // APIレスポンスをフロントエンド形式に変換
      return result ? {
        id:         result.id,
        memberId:   result.member_id,
        memberName: result.member_name,
        caption:    result.caption,
        dataUrl:    result.image_data,
        visibility: result.visibility,
        createdAt:  new Date(result.created_at).getTime(),
        ownerNickname: result.owner_nickname,
        ownerAvatar:   result.owner_avatar,
        isOwn:      result.user_id === getUser()?.id,
      } : null;
    } catch (err) {
      alert('写真保存エラー: ' + err.message);
      return null;
    }
  },

  // 削除
  async delete(id) {
    if (typeof id === 'number') {
      return deletePhoto(id); // IndexedDB
    }
    if (!isLoggedIn()) return;
    await apiFetch('/api/photos/' + id, { method: 'DELETE' });
  },
};

// ══════════════════════════════════════════
//  localStorage ヘルパー（未ログイン時用）
// ══════════════════════════════════════════
function loadLocalEvents() {
  try { return JSON.parse(localStorage.getItem('hinata_events') || '[]'); } catch { return []; }
}
function saveLocalEvents(arr) {
  localStorage.setItem('hinata_events', JSON.stringify(arr));
}

// 既存コードとの互換性（data.jsのloadEvents/saveEventsを上書き）
function loadEvents() { return loadLocalEvents(); }
function saveEvents(a){ saveLocalEvents(a); }

// ── APIレスポンスをフロントエンド用に変換 ──
function normalizeEvent(e) {
  return {
    id:         e.id,
    name:       e.name,
    date:       e.date?.split?.('T')[0] || e.date,
    time:       e.time?.slice?.(0,5) || e.time || '',
    note:       e.note || '',
    emoji:      e.emoji || '🎪',
    visibility: e.visibility || 'private',
    targetUserIds: e.target_user_ids || [],
    ownerNickname: e.owner_nickname,
    ownerAvatar:   e.owner_avatar,
    isOwn:         e.user_id === getUser()?.id,
  };
}
function normalizePhoto(p) {
  return {
    id:         p.id,
    memberId:   p.member_id,
    memberName: p.member_name,
    caption:    p.caption,
    dataUrl:    p.image_data,
    createdAt:  new Date(p.created_at).getTime(),
    visibility: p.visibility || 'private',
    targetUserIds: p.target_user_ids || [],
    ownerNickname: p.owner_nickname,
    ownerAvatar:   p.owner_avatar,
    isOwn:         p.user_id === getUser()?.id,
  };
}

// ── 共有バッジHTML ────────────────────────
function visibilityBadge(vis, isOwn) {
  if (!isLoggedIn()) return '';
  const map = {
    private:  { label: '🔒 自分だけ',  cls: 'vis-private'  },
    public:   { label: '🌐 全体公開',  cls: 'vis-public'   },
    specific: { label: '👥 特定共有',  cls: 'vis-specific' },
  };
  const v = map[vis] || map.private;
  const owner = isOwn ? '' : ' <span class="vis-other">他ユーザー</span>';
  return `<span class="vis-badge ${v.cls}">${v.label}${owner}</span>`;
}

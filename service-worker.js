/* ═══════════════════════════════════════
   櫻坂46 推し活カレンダー — Service Worker
   service-worker.js
═══════════════════════════════════════ */

const CACHE_NAME = 'oshikatu-v1';
const CACHE_FILES = [
  './',
  './index.html',
  './calendar.html',
  './members.html',
  './member-detail.html',
  './events.html',
  './gallery.html',
  './db.js',
  './style.css',
  './data.js',
  './nav.js',
  './sakura.js',
  './notify.js',
  './manifest.json',
];

// ── インストール ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── アクティベート（古いキャッシュ削除）──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── フェッチ（キャッシュ優先）──
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── スケジュール済み通知の管理 ──
// { tag: timeoutId } の形でメモリ管理
const scheduledTimers = {};

// ── メインスレッドからのメッセージ受信 ──
self.addEventListener('message', e => {
  const { type, tag } = e.data || {};

  // 通知をスケジュール
  if (type === 'SCHEDULE_NOTIF') {
    const { title, body, fireAt } = e.data;
    const delay = fireAt - Date.now();
    if (delay <= 0) return;

    // 既存タイマーがあればクリア
    if (scheduledTimers[tag]) clearTimeout(scheduledTimers[tag]);

    scheduledTimers[tag] = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon:    './icons/icon-sakura.jpg',
        badge:   './icons/icon-sakura.jpg',
        tag,
        vibrate: [200, 100, 200],
        data:    { url: './events.html' },
      });
      delete scheduledTimers[tag];
    }, delay);
  }

  // 通知をキャンセル
  if (type === 'CANCEL_NOTIF') {
    if (scheduledTimers[tag]) {
      clearTimeout(scheduledTimers[tag]);
      delete scheduledTimers[tag];
    }
    // 表示済みの通知も閉じる
    self.registration.getNotifications({ tag })
      .then(notifs => notifs.forEach(n => n.close()));
  }

  // 全スケジュール済みタグ一覧を返す（デバッグ用）
  if (type === 'GET_SCHEDULED') {
    e.source.postMessage({ type: 'SCHEDULED_LIST', tags: Object.keys(scheduledTimers) });
  }
});

// ── 通知クリック：対応ページを開く ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});

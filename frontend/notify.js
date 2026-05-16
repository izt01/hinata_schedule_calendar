/* ═══════════════════════════════════════
   櫻坂46 推し活カレンダー — 通知管理
   notify.js
═══════════════════════════════════════ */

// ── Service Worker 登録 ──
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('./service-worker.js');
  } catch (e) {
    console.warn('SW登録失敗:', e);
    return null;
  }
}

// ── 通知許可リクエスト ──
async function requestNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── 単一通知をスケジュール ──
async function scheduleNotif({ title, body, tag, fireAt }) {
  if (fireAt <= Date.now()) return; // 過去はスキップ
  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return;
  reg.active.postMessage({ type: 'SCHEDULE_NOTIF', title, body, tag, fireAt });
}

// ── 通知キャンセル ──
async function cancelNotif(tag) {
  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return;
  reg.active.postMessage({ type: 'CANCEL_NOTIF', tag });
}

// ── イベント通知スケジュール（1日前・10時間前・1時間前）──
// 通知時刻はイベント当日の 10:00 基準
async function scheduleEventNotifs(event) {
  if (Notification.permission !== 'granted') return;
  // 時間が設定されていればその時刻、なければ10:00を基準にする
  const timeStr = event.time ? event.time + ':00' : '10:00:00';
  const base = new Date(event.date + 'T' + timeStr).getTime();
  const id   = event.id;

  await scheduleNotif({
    title:  `🌸 明日「${event.name}」`,
    body:   '明日開催です！お忘れなく ✿',
    tag:    `ev-${id}-1day`,
    fireAt: base - 86400000,   // 1日前
  });
  await scheduleNotif({
    title:  `🌸 「${event.name}」まであと10時間`,
    body:   'そろそろ準備を始めましょう ✿',
    tag:    `ev-${id}-10h`,
    fireAt: base - 36000000,   // 10時間前
  });
  await scheduleNotif({
    title:  `🌸 「${event.name}」まであと1時間！`,
    body:   '準備はいいですか？ ✿',
    tag:    `ev-${id}-1h`,
    fireAt: base - 3600000,    // 1時間前
  });
}

// ── イベント通知キャンセル ──
async function cancelEventNotifs(eventId) {
  await cancelNotif(`ev-${eventId}-1day`);
  await cancelNotif(`ev-${eventId}-10h`);
  await cancelNotif(`ev-${eventId}-1h`);
}

// ── 誕生日通知スケジュール（1日前・当日）──
async function scheduleBirthdayNotifs(member) {
  if (Notification.permission !== 'granted') return;
  const today = new Date(); today.setHours(0,0,0,0);
  const [mm, dd] = member.birthday.split('-').map(Number);
  let bday = new Date(today.getFullYear(), mm - 1, dd, 10, 0, 0);
  if (bday.getTime() < Date.now()) bday.setFullYear(today.getFullYear() + 1);

  await scheduleNotif({
    title:  `🎂 明日は${member.name}の誕生日！`,
    body:   'お祝いの準備を忘れずに🌸',
    tag:    `bday-${member.id}-1day`,
    fireAt: bday.getTime() - 86400000,
  });
  await scheduleNotif({
    title:  `🌸 今日は${member.name}の誕生日！`,
    body:   'おめでとうございます🎉',
    tag:    `bday-${member.id}-0day`,
    fireAt: bday.getTime(),
  });
}

// ── 通知ボタンの状態を更新 ──
function updateNotifBtn() {
  const btn = document.getElementById('notifToggleBtn');
  if (!btn) return;
  const perm = Notification.permission;
  if (!('Notification' in window)) {
    btn.textContent = '🔕 非対応ブラウザ';
    btn.disabled = true;
    return;
  }
  if (perm === 'granted') {
    btn.textContent = '🔔 通知ON';
    btn.classList.add('notif-on');
    btn.onclick = null;
    btn.disabled = true;
  } else if (perm === 'denied') {
    btn.textContent = '🔕 通知ブロック中';
    btn.classList.remove('notif-on');
    btn.disabled = true;
    btn.title = 'ブラウザの設定から通知を許可してください';
  } else {
    btn.textContent = '🔔 通知を許可する';
    btn.classList.remove('notif-on');
    btn.disabled = false;
    btn.onclick = onNotifBtnClick;
  }
}

async function onNotifBtnClick() {
  const granted = await requestNotifPermission();
  updateNotifBtn();
  if (!granted) return;

  // 既存イベントと誕生日を全スケジュール
  loadEvents().forEach(e => scheduleEventNotifs(e));
  if (typeof ACTIVE_MEMBERS !== 'undefined') {
    ACTIVE_MEMBERS.forEach(m => scheduleBirthdayNotifs(m));
  }
}

// ── 初期化（各ページのロード時に呼ぶ）──
async function initNotifications() {
  await registerSW();
  updateNotifBtn();
}

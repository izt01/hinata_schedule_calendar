/* ═══════════════════════════════════════
   ひなたカレンダー — 通知モジュール
   notifier.js
   Gmail（nodemailer）+ Webプッシュ（web-push）
═══════════════════════════════════════ */
const webpush    = require('web-push');
const nodemailer = require('nodemailer');

// ── VAPID設定 ──────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ── Gmail（nodemailer）初期化 ────────────
let transporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
  console.log('[Mail] Gmail送信者:', process.env.GMAIL_USER);
} else {
  console.log('[Mail] GMAIL_USER/GMAIL_PASS未設定 - メール送信スキップ');
}

// ━━━ メール送信 ━━━━━━━━━━━━━━━━━━━━━━━━
async function sendMail({ to, subject, html }) {
  if (!transporter) { console.log('[Mail] スキップ（未設定）:', subject); return false; }
  if (!to) return false;
  try {
    await transporter.sendMail({
      from: '"ひなたカレンダー" <' + process.env.GMAIL_USER + '>',
      to:      to,
      subject: subject,
      html:    html,
    });
    console.log('[Mail] 送信成功:', subject, '->', to);
    return true;
  } catch (err) {
    console.error('[Mail] 送信エラー:', err.message);
    return false;
  }
}

// ━━━ プッシュ通知送信 ━━━━━━━━━━━━━━━━━━
async function sendPush(subscription, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return false;
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) return 'expired';
    console.error('[Push] 送信エラー:', err.message);
    return false;
  }
}

// ━━━ メールテンプレート ━━━━━━━━━━━━━━━━
function mailWrap(color, icon, title, body, extra = '') {
  return `<div style="font-family:'Noto Sans JP',sans-serif;max-width:480px;margin:0 auto;padding:0">
    <div style="background:${color};padding:20px 24px;border-radius:16px 16px 0 0">
      <h2 style="color:white;font-size:18px;margin:0">${icon} ${title}</h2>
    </div>
    <div style="background:#f8f8ff;padding:24px;border-radius:0 0 16px 16px;border:1.5px solid #e0e8ff;border-top:none">
      ${body}
      ${extra}
      <p style="font-size:11px;color:#aaa;margin-top:24px;border-top:1px solid #eee;padding-top:12px">
        日向坂46 ひなたカレンダー
      </p>
    </div>
  </div>`;
}

function stepCard(title, dueDate, borderColor = '#c8e0f4', labelColor = '#e05050') {
  const due = dueDate
    ? `<div style="font-size:13px;color:${labelColor};margin-top:8px">📅 期限：${new Date(dueDate + 'T00:00:00').toLocaleDateString('ja-JP')}</div>`
    : '';
  return `<div style="background:white;border-radius:12px;padding:16px;margin:16px 0;border:1.5px solid ${borderColor}">
    <div style="font-size:11px;color:#888;margin-bottom:4px">STEP</div>
    <div style="font-size:16px;font-weight:bold;color:#1a2a3a">${title}</div>
    ${due}
  </div>`;
}

// ━━━ タスク割当通知 ━━━━━━━━━━━━━━━━━━━━
async function notifyAssignment({ pool, userId, scheduleTitle, stepTitle, dueDate }) {
  const userRes = await pool.query('SELECT email, nickname FROM users WHERE id=$1', [userId]);
  if (!userRes.rows[0]) return;
  const { email, nickname } = userRes.rows[0];

  const subject = `【ひなたカレンダー】📋 タスクが割り当てられました`;
  const html = mailWrap(
    '#1565a0', '📋', 'タスクが割り当てられました',
    `<p style="color:#333;font-size:14px;line-height:1.8"><b>${nickname}</b> さん、<br>
     スケジュール「<b>${scheduleTitle}</b>」で新しいタスクが割り当てられました。</p>`,
    stepCard(stepTitle, dueDate) +
    `<p style="font-size:12px;color:#888">アプリを開いて「タスク完了」ボタンを押すと次の担当者に進みます。</p>`
  );

  await sendMail({ to: email, subject, html });

  // プッシュ通知
  const subs = await pool.query('SELECT * FROM push_subscriptions WHERE user_id=$1', [userId]);
  for (const sub of subs.rows) {
    const r = await sendPush(sub, { title: '📋 タスクが割り当てられました', body: `「${stepTitle}」を担当してください`, url: '/schedule.html' });
    if (r === 'expired') await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [sub.id]);
  }
}

// ━━━ 期限リマインダー（cronで定期実行）━━━
async function sendDueReminders(pool) {
  const jstOffset = 9 * 60 * 60 * 1000;
  const nowJST   = new Date(Date.now() + jstOffset);
  const nowHour  = nowJST.getUTCHours(); // JSTの現在時刻（0〜23）

  // 通知設定を取得
  let settings = { same_day_hour: 8, prev_day_hour: 20 };
  try {
    const sr = await pool.query("SELECT * FROM notif_settings WHERE id='00000000-0000-0000-0000-000000000002'");
    if (sr.rows[0]) settings = sr.rows[0];
  } catch {}

  const todayStr    = nowJST.toISOString().split('T')[0];
  const tomorrow    = new Date(nowJST); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`[Reminder] 実行: ${todayStr} ${nowHour}時 (設定: 当日${settings.same_day_hour}時 / 前日${settings.prev_day_hour}時)`);

  // どの通知を送るか判定
  const targets = [];
  if (nowHour === settings.same_day_hour)  targets.push({ dueStr: todayStr,    isToday: true });
  if (nowHour === settings.prev_day_hour)  targets.push({ dueStr: tomorrowStr, isToday: false });

  if (!targets.length) {
    console.log('[Reminder] 送信時刻でないためスキップ');
    return;
  }

  for (const { dueStr, isToday } of targets) {
    const res = await pool.query(`
      SELECT ss.id as step_id, ss.title as step_title, ss.due_date, ss.assignee_id,
             sc.title as schedule_title, u.email, u.nickname
      FROM schedule_steps ss
      JOIN schedules sc ON ss.schedule_id = sc.id
      JOIN users u ON ss.assignee_id = u.id
      WHERE ss.status = 'in_progress'
        AND ss.due_date = $1
        AND ss.assignee_id IS NOT NULL
    `, [dueStr]);

    console.log(`[Reminder] ${isToday ? '当日' : '前日'} 対象: ${res.rows.length}件`);

    for (const row of res.rows) {
      const logKey = `due:${row.step_id}:${dueStr}:${isToday ? 'today' : 'prev'}`;
      const already = await pool.query('SELECT id FROM notif_sent_log WHERE target=$1', [logKey]);
      if (already.rows.length) continue;

      const label   = isToday ? '今日が期限です！' : '明日が期限です';
      const color   = isToday ? '#c03030' : '#b07000';
      const subject = `【ひなたカレンダー】⏰ タスクの期限：${label}`;
      const html = mailWrap(
        isToday ? '#c03030' : '#b07000', '⏰',
        `タスクの期限${isToday ? 'は今日' : 'は明日'}です`,
        `<p style="color:#333;font-size:14px;line-height:1.8"><b>${row.nickname}</b> さん、<br>
         スケジュール「<b>${row.schedule_title}</b>」のタスクの期限が近づいています。</p>`,
        stepCard(row.step_title, row.due_date, isToday ? '#f0c0c0' : '#f0d890', color) +
        `<p style="font-size:12px;color:#888">タスク完了後はアプリで「タスク完了」を押してください。</p>`
      );

      await sendMail({ to: row.email, subject, html });

      const subs = await pool.query('SELECT * FROM push_subscriptions WHERE user_id=$1', [row.assignee_id]);
      for (const sub of subs.rows) {
        const r = await sendPush(sub, {
          title: `⏰ タスク期限${isToday ? '（今日）' : '（明日）'}`,
          body: `「${row.step_title}」の期限${isToday ? 'は今日' : 'は明日'}です`,
          url: '/schedule.html',
        });
        if (r === 'expired') await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [sub.id]);
      }

      await pool.query('INSERT INTO notif_sent_log (target) VALUES ($1) ON CONFLICT DO NOTHING', [logKey]);
      console.log('[Reminder] 送信:', row.nickname, '-', row.step_title);
    }
  }
  console.log('[Reminder] 完了');
}

// ━━━ ポスター投稿通知（管理者へ）━━━━━━━
async function notifyPosterToAdmin({ pool, posterNickname, campaignTitle, caption }) {
  try {
    // 管理者全員のメールを取得
    const admins = await pool.query('SELECT email, nickname FROM users WHERE is_admin = true AND email IS NOT NULL');
    if (!admins.rows.length) return;

    const subject = `【ひなたカレンダー】🎨 新しいポスターが投稿されました`;
    const html = mailWrap(
      '#6040c0', '🎨', '新しいポスターが投稿されました',
      `<p style="color:#333;font-size:14px;line-height:1.8">
        募集「<b>${campaignTitle || 'ポスター案'}</b>」に<br>
        <b>${posterNickname || '匿名'}</b> さんが新しいポスターを投稿しました。
      </p>`,
      (caption ? `<div style="background:white;border-radius:12px;padding:14px;margin:12px 0;border:1.5px solid #d0c0f0;font-size:13px;color:#333">${caption}</div>` : '') +
      `<a href="${process.env.FRONTEND_URL || 'https://izt01.github.io/hinata_schedule_calendar'}/poster.html"
         style="display:inline-block;padding:10px 20px;background:#6040c0;color:white;border-radius:12px;text-decoration:none;font-size:13px;font-weight:bold;margin-top:8px">
        ポスターを確認する →
      </a>`
    );

    for (const admin of admins.rows) {
      await sendMail({ to: admin.email, subject, html });
    }
    console.log('[Notify] ポスター投稿通知 →', admins.rows.length, '人の管理者');
  } catch (err) {
    console.error('[Notify] ポスター通知エラー:', err.message);
  }
}

module.exports = { sendMail, sendPush, notifyAssignment, sendDueReminders, notifyPosterToAdmin };

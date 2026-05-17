/* ═══════════════════════════════════════
   ひなたカレンダー — 通知モジュール
   notifier.js
   メール（Resend）+ Webプッシュ（web-push）
═══════════════════════════════════════ */
const webpush = require('web-push');

// ── VAPID設定 ────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ── Resend初期化 ─────────────────────────
let resendClient = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
}

// ━━━ メール送信 ━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendMail({ to, subject, html }) {
  if (!resendClient) {
    console.log('[Mail] RESEND_API_KEY未設定のためスキップ:', subject, '->', to);
    return false;
  }
  if (!to) return false;
  try {
    const { error } = await resendClient.emails.send({
      from:    process.env.MAIL_FROM || 'onboarding@resend.dev',
      to:      [to],
      subject,
      html,
    });
    if (error) { console.error('[Mail] 送信エラー:', error); return false; }
    console.log('[Mail] 送信成功:', subject, '->', to);
    return true;
  } catch (err) {
    console.error('[Mail] 例外:', err.message);
    return false;
  }
}

// ━━━ プッシュ通知送信 ━━━━━━━━━━━━━━━━━━━
async function sendPush(subscription, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.log('[Push] VAPID未設定のためスキップ');
    return false;
  }
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // 購読が無効になっている → DBから削除
      return 'expired';
    }
    console.error('[Push] 送信エラー:', err.message);
    return false;
  }
}

// ━━━ タスク割当通知 ━━━━━━━━━━━━━━━━━━━━
async function notifyAssignment({ pool, userId, scheduleTitle, stepTitle, dueDate }) {
  // ユーザー情報取得
  const userRes = await pool.query('SELECT email, nickname FROM users WHERE id=$1', [userId]);
  if (!userRes.rows[0]) return;
  const { email, nickname } = userRes.rows[0];

  const dueLine = dueDate ? `<br>期限：${new Date(dueDate + 'T00:00:00').toLocaleDateString('ja-JP')}` : '';
  const subject = `【日向坂カレンダー】タスクが割り当てられました`;
  const html = `
    <div style="font-family:'Noto Sans JP',sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8f6ff;border-radius:16px">
      <h2 style="color:#1565a0;font-size:20px;margin-bottom:8px">📋 タスクが割り当てられました</h2>
      <p style="color:#333;font-size:14px;line-height:1.8">
        <b>${nickname}</b> さん、<br>
        スケジュール「<b>${scheduleTitle}</b>」で<br>
        新しいタスクが割り当てられました。
      </p>
      <div style="background:white;border-radius:12px;padding:16px;margin:16px 0;border:1.5px solid #c8e0f4">
        <div style="font-size:13px;color:#666;margin-bottom:4px">STEP</div>
        <div style="font-size:16px;font-weight:bold;color:#1a2a3a">${stepTitle}</div>
        ${dueLine ? `<div style="font-size:13px;color:#e05050;margin-top:8px">${dueLine}</div>` : ''}
      </div>
      <p style="font-size:12px;color:#888">アプリを開いて「タスク完了」ボタンを押すと次の担当者に進みます。</p>
    </div>`;

  // メール送信
  await sendMail({ to: email, subject, html });

  // プッシュ通知送信
  const subs = await pool.query('SELECT * FROM push_subscriptions WHERE user_id=$1', [userId]);
  for (const sub of subs.rows) {
    const result = await sendPush(sub, {
      title: '📋 タスクが割り当てられました',
      body:  `「${stepTitle}」を担当してください`,
      url:   '/schedule.html',
    });
    if (result === 'expired') {
      await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [sub.id]);
    }
  }
}

// ━━━ 期限リマインダー（cronで毎日実行）━━━
async function sendDueReminders(pool) {
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log('[Reminder] 期限チェック開始:', todayStr);

  // 期限が今日または明日のin_progressステップを取得
  const res = await pool.query(`
    SELECT
      ss.id as step_id, ss.title as step_title, ss.due_date, ss.assignee_id,
      sc.title as schedule_title,
      u.email, u.nickname
    FROM schedule_steps ss
    JOIN schedules sc ON ss.schedule_id = sc.id
    JOIN users u ON ss.assignee_id = u.id
    WHERE ss.status = 'in_progress'
      AND ss.due_date IN ($1, $2)
      AND ss.assignee_id IS NOT NULL
  `, [todayStr, tomorrowStr]);

  console.log('[Reminder] 対象ステップ数:', res.rows.length);

  for (const row of res.rows) {
    const logKey = `due:${row.step_id}:${row.due_date}`;

    // 二重送信チェック
    const already = await pool.query('SELECT id FROM notif_sent_log WHERE target=$1', [logKey]);
    if (already.rows.length) continue;

    const isToday = row.due_date === todayStr;
    const label   = isToday ? '今日が期限です！' : '明日が期限です';
    const subject = `【日向坂カレンダー】タスクの期限：${label}`;
    const html = `
      <div style="font-family:'Noto Sans JP',sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff8f0;border-radius:16px">
        <h2 style="color:${isToday ? '#c03030' : '#b07000'};font-size:20px;margin-bottom:8px">
          ⏰ タスクの期限${isToday ? 'は今日' : 'は明日'}です
        </h2>
        <p style="color:#333;font-size:14px;line-height:1.8">
          <b>${row.nickname}</b> さん、<br>
          スケジュール「<b>${row.schedule_title}</b>」の<br>
          タスクの期限が近づいています。
        </p>
        <div style="background:white;border-radius:12px;padding:16px;margin:16px 0;border:1.5px solid ${isToday ? '#f0c0c0' : '#f0d890'}">
          <div style="font-size:13px;color:#666;margin-bottom:4px">STEP</div>
          <div style="font-size:16px;font-weight:bold;color:#1a2a3a">${row.step_title}</div>
          <div style="font-size:13px;color:${isToday ? '#c03030' : '#b07000'};margin-top:8px">
            期限：${new Date(row.due_date + 'T00:00:00').toLocaleDateString('ja-JP')} (${isToday ? '今日' : '明日'})
          </div>
        </div>
        <p style="font-size:12px;color:#888">タスク完了後はアプリで「タスク完了」を押してください。</p>
      </div>`;

    // メール送信
    await sendMail({ to: row.email, subject, html });

    // プッシュ通知
    const subs = await pool.query('SELECT * FROM push_subscriptions WHERE user_id=$1', [row.assignee_id]);
    for (const sub of subs.rows) {
      const result = await sendPush(sub, {
        title: `⏰ タスク期限${isToday ? '（今日）' : '（明日）'}`,
        body:  `「${row.step_title}」の期限${isToday ? 'は今日' : 'は明日'}です`,
        url:   '/schedule.html',
      });
      if (result === 'expired') {
        await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [sub.id]);
      }
    }

    // 送信済みフラグ
    await pool.query('INSERT INTO notif_sent_log (target) VALUES ($1) ON CONFLICT DO NOTHING', [logKey]);
    console.log('[Reminder] 送信:', row.nickname, '-', row.step_title);
  }
  console.log('[Reminder] 期限チェック完了');
}

module.exports = { sendMail, sendPush, notifyAssignment, sendDueReminders };

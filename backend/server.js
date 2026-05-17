/* ═══════════════════════════════════════
   ひなたカレンダー — APIサーバー
   server.js（パスワード認証対応版）
═══════════════════════════════════════ */
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const { Pool }  = require('pg');
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET   = process.env.JWT_SECRET || 'hinata_secret';
const SALT_ROUNDS  = 10;

// ── DB接続 ──────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── ミドルウェア ──────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8080',
    /\.railway\.app$/,
    /localhost/,
    /github\.io$/,
  ],
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));

// ── JWT認証ミドルウェア ───────────────────
function authRequired(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '認証が必要です' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'トークンが無効です。再ログインしてください。' });
  }
}

// ── ヘルスチェック ────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', version: '2.0.0' });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// ══════════════════════════════════════════
//  USERS — ユーザー管理（パスワード認証）
// ══════════════════════════════════════════

// ── 新規登録 ──────────────────────────────
app.post('/api/users/register', async (req, res) => {
  const { nickname, email, password, avatar_url, avatar_type } = req.body;

  if (!nickname?.trim())  return res.status(400).json({ error: 'ニックネームを入力してください' });
  if (!password || password.length < 4) return res.status(400).json({ error: 'パスワードは4文字以上で入力してください' });

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO users (id, nickname, email, password_hash, avatar_url, avatar_type)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, nickname, email, avatar_url, avatar_type, created_at`,
      [id, nickname.trim(), email?.trim() || null, passwordHash, avatar_url || null, avatar_type || 'member']
    );
    const user  = result.rows[0];
    const token = jwt.sign({ userId: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '365d' });
    res.json({ user, token });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'このメールアドレスは既に使われています' });
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ── ログイン（ニックネーム or メール + パスワード）──
app.post('/api/users/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier?.trim()) return res.status(400).json({ error: 'ニックネームまたはメールアドレスを入力してください' });
  if (!password)           return res.status(400).json({ error: 'パスワードを入力してください' });

  try {
    // ニックネーム完全一致 or メールアドレスで検索
    const result = await pool.query(
      `SELECT id, nickname, email, password_hash, avatar_url, avatar_type
       FROM users
       WHERE nickname = $1 OR (email IS NOT NULL AND email = $1)
       LIMIT 5`,
      [identifier.trim()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'ニックネームまたはメールアドレスが見つかりません' });
    }

    // パスワード照合（複数ヒットした場合は全部試す）
    let matchedUser = null;
    for (const row of result.rows) {
      if (!row.password_hash) continue;
      const ok = await bcrypt.compare(password, row.password_hash);
      if (ok) { matchedUser = row; break; }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: 'パスワードが正しくありません' });
    }

    const { password_hash, ...user } = matchedUser;
    const token = jwt.sign({ userId: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '365d' });
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ── プロフィール更新 ──────────────────────
app.put('/api/users/me', authRequired, async (req, res) => {
  const { nickname, email, avatar_url, avatar_type, current_password, new_password } = req.body;

  try {
    // パスワード変更が要求された場合
    if (new_password) {
      if (!current_password) return res.status(400).json({ error: '現在のパスワードを入力してください' });
      if (new_password.length < 4) return res.status(400).json({ error: '新しいパスワードは4文字以上にしてください' });

      const cur = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.userId]);
      const ok  = cur.rows[0]?.password_hash
        ? await bcrypt.compare(current_password, cur.rows[0].password_hash)
        : false;
      if (!ok) return res.status(401).json({ error: '現在のパスワードが正しくありません' });

      const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
      const result  = await pool.query(
        `UPDATE users SET nickname=$1, email=$2, avatar_url=$3, avatar_type=$4, password_hash=$5, updated_at=NOW()
         WHERE id=$6 RETURNING id, nickname, email, avatar_url, avatar_type`,
        [nickname?.trim(), email?.trim() || null, avatar_url || null, avatar_type || 'member', newHash, req.user.userId]
      );
      const user  = result.rows[0];
      const token = jwt.sign({ userId: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '365d' });
      return res.json({ user, token, message: 'パスワードを変更しました' });
    }

    // パスワード変更なし
    const result = await pool.query(
      `UPDATE users SET nickname=$1, email=$2, avatar_url=$3, avatar_type=$4, updated_at=NOW()
       WHERE id=$5 RETURNING id, nickname, email, avatar_url, avatar_type`,
      [nickname?.trim(), email?.trim() || null, avatar_url || null, avatar_type || 'member', req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'ユーザーが見つかりません' });
    const user  = result.rows[0];
    const token = jwt.sign({ userId: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '365d' });
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ── 自分のプロフィール取得 ─────────────────
app.get('/api/users/me', authRequired, async (req, res) => {
  const result = await pool.query(
    'SELECT id, nickname, email, avatar_url, avatar_type, created_at FROM users WHERE id=$1',
    [req.user.userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  res.json(result.rows[0]);
});

// ── 全ユーザー一覧（共有先選択用）─────────
app.get('/api/users', authRequired, async (req, res) => {
  const result = await pool.query(
    'SELECT id, nickname, avatar_url, avatar_type FROM users ORDER BY nickname'
  );
  res.json(result.rows);
});

// ══════════════════════════════════════════
//  EVENTS — イベント管理
// ══════════════════════════════════════════
app.get('/api/events', authRequired, async (req, res) => {
  const uid = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT e.*, u.nickname as owner_nickname, u.avatar_url as owner_avatar
       FROM events e JOIN users u ON e.user_id = u.id
       WHERE e.user_id=$1 OR e.visibility='public'
         OR (e.visibility='specific' AND $1=ANY(e.target_user_ids))
       ORDER BY e.date ASC, e.time ASC NULLS LAST`,
      [uid]
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

app.post('/api/events', authRequired, async (req, res) => {
  const { name, date, time, note, emoji, visibility, target_user_ids } = req.body;
  if (!name || !date) return res.status(400).json({ error: '名前と日付は必須です' });
  const vis     = ['private','public','specific'].includes(visibility) ? visibility : 'private';
  const targets = vis === 'specific' ? (target_user_ids || []) : [];
  try {
    const result = await pool.query(
      `INSERT INTO events (user_id,name,date,time,note,emoji,visibility,target_user_ids)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.userId, name, date, time||null, note||'', emoji||'🎪', vis, targets]
    );
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

app.delete('/api/events/:id', authRequired, async (req, res) => {
  const r = await pool.query('DELETE FROM events WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.userId]);
  if (!r.rows[0]) return res.status(404).json({ error: 'イベントが見つかりません' });
  res.json({ ok: true });
});

app.put('/api/events/:id', authRequired, async (req, res) => {
  const { name, date, time, note, emoji, visibility, target_user_ids } = req.body;
  const vis     = ['private','public','specific'].includes(visibility) ? visibility : 'private';
  const targets = vis === 'specific' ? (target_user_ids || []) : [];
  try {
    const r = await pool.query(
      `UPDATE events SET name=$1,date=$2,time=$3,note=$4,emoji=$5,visibility=$6,target_user_ids=$7,updated_at=NOW()
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [name, date, time||null, note||'', emoji||'🎪', vis, targets, req.params.id, req.user.userId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'イベントが見つかりません' });
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

// ══════════════════════════════════════════
//  PHOTOS — 写真管理
// ══════════════════════════════════════════
app.get('/api/photos', authRequired, async (req, res) => {
  const uid = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT p.id,p.user_id,p.member_id,p.member_name,p.caption,p.image_data,
              p.visibility,p.target_user_ids,p.created_at,
              u.nickname as owner_nickname, u.avatar_url as owner_avatar
       FROM photos p JOIN users u ON p.user_id=u.id
       WHERE p.user_id=$1 OR p.visibility='public'
         OR (p.visibility='specific' AND $1=ANY(p.target_user_ids))
       ORDER BY p.created_at DESC`,
      [uid]
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

app.post('/api/photos', authRequired, async (req, res) => {
  const { member_id, member_name, caption, image_data, visibility, target_user_ids } = req.body;
  if (!image_data) return res.status(400).json({ error: '画像データが必要です' });
  const vis     = ['private','public','specific'].includes(visibility) ? visibility : 'private';
  const targets = vis === 'specific' ? (target_user_ids || []) : [];
  try {
    const r = await pool.query(
      `INSERT INTO photos (user_id,member_id,member_name,caption,image_data,visibility,target_user_ids)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.userId, member_id||null, member_name||null, caption||'', image_data, vis, targets]
    );
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

app.delete('/api/photos/:id', authRequired, async (req, res) => {
  const r = await pool.query('DELETE FROM photos WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.userId]);
  if (!r.rows[0]) return res.status(404).json({ error: '写真が見つかりません' });
  res.json({ ok: true });
});

// ══════════════════════════════════════════
//  FLOWERS — 祝花申し込み
// ══════════════════════════════════════════
app.get('/api/flowers', async (req, res) => {
  const { member_id } = req.query;
  try {
    const where  = member_id ? 'WHERE f.member_id=$1' : '';
    const params = member_id ? [member_id] : [];
    const r = await pool.query(
      `SELECT f.id, f.user_id, f.member_id, f.member_name, f.amount, f.message,
              f.status, f.created_at,
              u.nickname as owner_nickname, u.avatar_url as owner_avatar
       FROM flowers f LEFT JOIN users u ON f.user_id=u.id
       ${where} ORDER BY f.created_at DESC`, params
    );
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

app.post('/api/flowers', async (req, res) => {
  const { member_id, member_name, amount, message } = req.body;
  if (!member_id || !amount || amount <= 0) return res.status(400).json({ error: 'メンバーと金額は必須です' });
  const token = req.headers['authorization']?.replace('Bearer ', '');
  let userId = null;
  if (token) { try { userId = jwt.verify(token, JWT_SECRET).userId; } catch {} }
  try {
    const r = await pool.query(
      `INSERT INTO flowers (user_id,member_id,member_name,amount,message,status)
       VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
      [userId, member_id, member_name, amount, message||'']
    );
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

app.put('/api/flowers/:id/complete', authRequired, async (req, res) => {
  const r = await pool.query(
    `UPDATE flowers SET status='completed' WHERE id=$1 AND user_id=$2 RETURNING *`,
    [req.params.id, req.user.userId]
  );
  if (!r.rows[0]) return res.status(404).json({ error: '申し込みが見つかりません' });
  res.json(r.rows[0]);
});

// 祝花取り消し（pending のみ・自分のもののみ）
app.delete('/api/flowers/:id', authRequired, async (req, res) => {
  const r = await pool.query(
    `DELETE FROM flowers WHERE id=$1 AND user_id=$2 AND status='pending' RETURNING id`,
    [req.params.id, req.user.userId]
  );
  if (!r.rows[0]) return res.status(404).json({ error: '取り消しできません（振込完了済みか、自分の申し込みではありません）' });
  res.json({ ok: true });
});

// ══════════════════════════════════════════
//  POSTERS — ポスター案
// ══════════════════════════════════════════
app.get('/api/posters', async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  let userId = null;
  if (token) { try { userId = jwt.verify(token, JWT_SECRET).userId; } catch {} }
  const uid = userId || '00000000-0000-0000-0000-000000000000';
  try {
    const r = await pool.query(
      `SELECT p.*,
        CASE WHEN p.is_anonymous THEN NULL ELSE u.nickname END as owner_nickname,
        CASE WHEN p.is_anonymous THEN NULL ELSE u.avatar_url END as owner_avatar,
        (SELECT COUNT(*) FROM poster_likes WHERE poster_id=p.id)::int as likes_count,
        EXISTS(SELECT 1 FROM poster_likes WHERE poster_id=p.id AND user_id=$1) as is_liked,
        p.user_id=$1 as is_own
       FROM posters p LEFT JOIN users u ON p.user_id=u.id
       ORDER BY p.created_at DESC`,
      [uid]
    );
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

app.post('/api/posters', authRequired, async (req, res) => {
  const { image_data, caption, is_anonymous, nickname } = req.body;
  if (!image_data) return res.status(400).json({ error: '画像が必要です' });
  try {
    const r = await pool.query(
      `INSERT INTO posters (user_id,image_data,caption,is_anonymous,nickname)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.userId, image_data, caption||'', !!is_anonymous, is_anonymous ? null : (nickname||null)]
    );
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

app.delete('/api/posters/:id', authRequired, async (req, res) => {
  const r = await pool.query('DELETE FROM posters WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.userId]);
  if (!r.rows[0]) return res.status(404).json({ error: '見つかりません' });
  res.json({ ok: true });
});

app.post('/api/posters/:id/like', authRequired, async (req, res) => {
  const uid = req.user.userId;
  try {
    const ex = await pool.query('SELECT id FROM poster_likes WHERE poster_id=$1 AND user_id=$2', [req.params.id, uid]);
    if (ex.rows.length) {
      await pool.query('DELETE FROM poster_likes WHERE poster_id=$1 AND user_id=$2', [req.params.id, uid]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO poster_likes (poster_id,user_id) VALUES ($1,$2)', [req.params.id, uid]);
      res.json({ liked: true });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

app.get('/api/posters/:id/comments', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*,
        CASE WHEN c.is_anonymous THEN '匿名' ELSE COALESCE(c.nickname,u.nickname,'不明') END as display_name,
        CASE WHEN c.is_anonymous THEN NULL ELSE u.avatar_url END as owner_avatar
       FROM poster_comments c LEFT JOIN users u ON c.user_id=u.id
       WHERE c.poster_id=$1 ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

app.post('/api/posters/:id/comments', authRequired, async (req, res) => {
  const { body, is_anonymous, nickname } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'コメントを入力してください' });
  try {
    const r = await pool.query(
      `INSERT INTO poster_comments (poster_id,user_id,body,is_anonymous,nickname)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, req.user.userId, body.trim(), !!is_anonymous, is_anonymous ? null : (nickname||null)]
    );
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

// ══════════════════════════════════════════
//  SCHEDULES — スケジュール進捗管理
// ══════════════════════════════════════════

// スケジュール一覧（ステップ込み）
app.get('/api/schedules', authRequired, async (req, res) => {
  try {
    const scheds = await pool.query(
      `SELECT s.*, u.nickname as creator_nickname, u.avatar_url as creator_avatar
       FROM schedules s
       LEFT JOIN users u ON s.created_by = u.id
       ORDER BY s.created_at DESC`
    );
    // 各スケジュールのステップを取得
    for (const s of scheds.rows) {
      const steps = await pool.query(
        `SELECT ss.*, u.nickname as assignee_nickname, u.avatar_url as assignee_avatar
         FROM schedule_steps ss
         LEFT JOIN users u ON ss.assignee_id = u.id
         WHERE ss.schedule_id = $1
         ORDER BY ss.step_order ASC`,
        [s.id]
      );
      s.steps = steps.rows;
    }
    res.json(scheds.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'サーバーエラー' }); }
});

// スケジュール作成（ステップ一括）
app.post('/api/schedules', authRequired, async (req, res) => {
  const { title, description, due_date, steps } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'タイトルは必須です' });
  if (!steps?.length) return res.status(400).json({ error: 'ステップを1つ以上追加してください' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sched = await client.query(
      `INSERT INTO schedules (title, description, due_date, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [title.trim(), description || '', due_date || null, req.user.userId]
    );
    const schedId = sched.rows[0].id;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const status = i === 0 ? 'in_progress' : 'waiting';
      await client.query(
        `INSERT INTO schedule_steps (schedule_id, step_order, title, assignee_id, due_date, status)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [schedId, i + 1, step.title.trim(), step.assignee_id || null, step.due_date || null, status]
      );
    }

    await client.query('COMMIT');

    // 作成したスケジュールをステップ込みで返す
    const result = await pool.query(
      `SELECT s.*, u.nickname as creator_nickname FROM schedules s
       LEFT JOIN users u ON s.created_by=u.id WHERE s.id=$1`,
      [schedId]
    );
    const stepRows = await pool.query(
      `SELECT ss.*, u.nickname as assignee_nickname, u.avatar_url as assignee_avatar
       FROM schedule_steps ss LEFT JOIN users u ON ss.assignee_id=u.id
       WHERE ss.schedule_id=$1 ORDER BY ss.step_order`,
      [schedId]
    );
    result.rows[0].steps = stepRows.rows;
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err); res.status(500).json({ error: 'サーバーエラー' });
  } finally { client.release(); }
});

// ステップを「完了」にする → 次のステップを自動で in_progress に
app.put('/api/schedules/:schedId/steps/:stepId/complete', authRequired, async (req, res) => {
  const { schedId, stepId } = req.params;
  const uid = req.user.userId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 対象ステップ取得
    const stepRes = await client.query(
      'SELECT * FROM schedule_steps WHERE id=$1 AND schedule_id=$2',
      [stepId, schedId]
    );
    if (!stepRes.rows[0]) return res.status(404).json({ error: 'ステップが見つかりません' });
    const step = stepRes.rows[0];

    if (step.status !== 'in_progress') {
      return res.status(400).json({ error: 'このステップはまだ進行中ではありません' });
    }
    // 担当者チェック（担当者が設定されている場合は本人のみ）
    if (step.assignee_id && step.assignee_id !== uid) {
      return res.status(403).json({ error: '担当者以外は完了にできません' });
    }

    // このステップを完了に
    await client.query(
      `UPDATE schedule_steps SET status='completed', completed_at=NOW()
       WHERE id=$1`,
      [stepId]
    );

    // 次のステップを in_progress に
    const nextStep = await client.query(
      `SELECT * FROM schedule_steps
       WHERE schedule_id=$1 AND step_order > $2
       ORDER BY step_order ASC LIMIT 1`,
      [schedId, step.step_order]
    );

    if (nextStep.rows.length) {
      await client.query(
        `UPDATE schedule_steps SET status='in_progress' WHERE id=$1`,
        [nextStep.rows[0].id]
      );
    } else {
      // 全ステップ完了 → スケジュール全体を完了に
      await client.query(
        `UPDATE schedules SET status='completed', updated_at=NOW() WHERE id=$1`,
        [schedId]
      );
    }

    await client.query('COMMIT');

    // 最新状態を返す
    const updated = await pool.query(
      `SELECT ss.*, u.nickname as assignee_nickname, u.avatar_url as assignee_avatar
       FROM schedule_steps ss LEFT JOIN users u ON ss.assignee_id=u.id
       WHERE ss.schedule_id=$1 ORDER BY ss.step_order`,
      [schedId]
    );
    const sched = await pool.query('SELECT * FROM schedules WHERE id=$1', [schedId]);
    res.json({ schedule: sched.rows[0], steps: updated.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err); res.status(500).json({ error: 'サーバーエラー' });
  } finally { client.release(); }
});

// スケジュール削除（作成者のみ）
app.delete('/api/schedules/:id', authRequired, async (req, res) => {
  const r = await pool.query(
    'DELETE FROM schedules WHERE id=$1 AND created_by=$2 RETURNING id',
    [req.params.id, req.user.userId]
  );
  if (!r.rows[0]) return res.status(404).json({ error: '見つかりません（作成者のみ削除できます）' });
  res.json({ ok: true });
});

// ── サーバー起動 ──────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌸 ひなたカレンダー API サーバー起動`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   DB: ${process.env.DATABASE_URL ? '✅ 接続済み' : '❌ DATABASE_URL未設定'}\n`);
});

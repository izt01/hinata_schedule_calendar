/* ═══════════════════════════════════════
   ひなたカレンダー — APIサーバー
   server.js
═══════════════════════════════════════ */
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const { Pool } = require('pg');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'hinata_secret';

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
  ],
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));  // Base64画像対応

// ── JWT認証ミドルウェア ───────────────────
function authRequired(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: '認証が必要です' });
  const token = authHeader.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'トークンが無効です' });
  }
}

// ── ヘルスチェック ────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', version: '1.0.0' });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// ══════════════════════════════════════════
//  USERS — ユーザー管理
// ══════════════════════════════════════════

// ユーザー登録 / 更新（ニックネームベース。メールなしでもOK）
app.post('/api/users/register', async (req, res) => {
  const { nickname, email, avatar_url, avatar_type } = req.body;
  if (!nickname || nickname.trim().length < 1) {
    return res.status(400).json({ error: 'ニックネームを入力してください' });
  }
  try {
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO users (id, nickname, email, avatar_url, avatar_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nickname, email, avatar_url, avatar_type, created_at`,
      [id, nickname.trim(), email?.trim() || null, avatar_url || null, avatar_type || 'member']
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '365d' });
    res.json({ user, token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'このメールアドレスは既に使われています' });
    }
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// プロフィール更新
app.put('/api/users/me', authRequired, async (req, res) => {
  const { nickname, email, avatar_url, avatar_type } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET nickname=$1, email=$2, avatar_url=$3, avatar_type=$4, updated_at=NOW()
       WHERE id=$5 RETURNING id, nickname, email, avatar_url, avatar_type`,
      [nickname?.trim(), email?.trim() || null, avatar_url || null, avatar_type || 'member', req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'ユーザーが見つかりません' });
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '365d' });
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 自分のプロフィール取得
app.get('/api/users/me', authRequired, async (req, res) => {
  const result = await pool.query(
    'SELECT id, nickname, email, avatar_url, avatar_type, created_at FROM users WHERE id=$1',
    [req.user.userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  res.json(result.rows[0]);
});

// 全ユーザー一覧（共有先選択用）
app.get('/api/users', authRequired, async (req, res) => {
  const result = await pool.query(
    'SELECT id, nickname, avatar_url, avatar_type FROM users ORDER BY nickname',
  );
  res.json(result.rows);
});

// ══════════════════════════════════════════
//  EVENTS — イベント管理
// ══════════════════════════════════════════

// イベント一覧取得（自分＋公開＋自分宛て共有）
app.get('/api/events', authRequired, async (req, res) => {
  const uid = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT e.*, u.nickname as owner_nickname, u.avatar_url as owner_avatar
       FROM events e
       JOIN users u ON e.user_id = u.id
       WHERE
         e.user_id = $1
         OR e.visibility = 'public'
         OR (e.visibility = 'specific' AND $1 = ANY(e.target_user_ids))
       ORDER BY e.date ASC, e.time ASC NULLS LAST`,
      [uid]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// イベント追加
app.post('/api/events', authRequired, async (req, res) => {
  const { name, date, time, note, emoji, visibility, target_user_ids } = req.body;
  if (!name || !date) return res.status(400).json({ error: '名前と日付は必須です' });

  const validVisibility = ['private', 'public', 'specific'];
  const vis = validVisibility.includes(visibility) ? visibility : 'private';
  const targets = vis === 'specific' ? (target_user_ids || []) : [];

  try {
    const result = await pool.query(
      `INSERT INTO events (user_id, name, date, time, note, emoji, visibility, target_user_ids)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [req.user.userId, name, date, time || null, note || '', emoji || '🎪', vis, targets]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// イベント削除（自分のもののみ）
app.delete('/api/events/:id', authRequired, async (req, res) => {
  const result = await pool.query(
    'DELETE FROM events WHERE id=$1 AND user_id=$2 RETURNING id',
    [req.params.id, req.user.userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'イベントが見つかりません' });
  res.json({ ok: true });
});

// イベント更新
app.put('/api/events/:id', authRequired, async (req, res) => {
  const { name, date, time, note, emoji, visibility, target_user_ids } = req.body;
  const vis = ['private','public','specific'].includes(visibility) ? visibility : 'private';
  const targets = vis === 'specific' ? (target_user_ids || []) : [];
  try {
    const result = await pool.query(
      `UPDATE events SET name=$1,date=$2,time=$3,note=$4,emoji=$5,visibility=$6,target_user_ids=$7,updated_at=NOW()
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [name, date, time||null, note||'', emoji||'🎪', vis, targets, req.params.id, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'イベントが見つかりません' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ══════════════════════════════════════════
//  PHOTOS — 写真管理
// ══════════════════════════════════════════

// 写真一覧取得（自分＋公開＋自分宛て共有）
app.get('/api/photos', authRequired, async (req, res) => {
  const uid = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT p.id, p.user_id, p.member_id, p.member_name, p.caption,
              p.image_data, p.visibility, p.target_user_ids, p.created_at,
              u.nickname as owner_nickname, u.avatar_url as owner_avatar
       FROM photos p
       JOIN users u ON p.user_id = u.id
       WHERE
         p.user_id = $1
         OR p.visibility = 'public'
         OR (p.visibility = 'specific' AND $1 = ANY(p.target_user_ids))
       ORDER BY p.created_at DESC`,
      [uid]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 写真追加
app.post('/api/photos', authRequired, async (req, res) => {
  const { member_id, member_name, caption, image_data, visibility, target_user_ids } = req.body;
  if (!image_data) return res.status(400).json({ error: '画像データが必要です' });

  const vis = ['private','public','specific'].includes(visibility) ? visibility : 'private';
  const targets = vis === 'specific' ? (target_user_ids || []) : [];
  try {
    const result = await pool.query(
      `INSERT INTO photos (user_id, member_id, member_name, caption, image_data, visibility, target_user_ids)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.userId, member_id||null, member_name||null, caption||'', image_data, vis, targets]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 写真削除（自分のもののみ）
app.delete('/api/photos/:id', authRequired, async (req, res) => {
  const result = await pool.query(
    'DELETE FROM photos WHERE id=$1 AND user_id=$2 RETURNING id',
    [req.params.id, req.user.userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: '写真が見つかりません' });
  res.json({ ok: true });
});

// ══════════════════════════════════════════
//  FLOWERS — 祝花申し込み
// ══════════════════════════════════════════

// 祝花一覧（メンバー別）
app.get('/api/flowers', async (req, res) => {
  const { member_id } = req.query;
  try {
    const where = member_id ? 'WHERE f.member_id=$1' : '';
    const params = member_id ? [member_id] : [];
    const result = await pool.query(
      `SELECT f.*, u.nickname as owner_nickname, u.avatar_url as owner_avatar
       FROM flowers f
       LEFT JOIN users u ON f.user_id = u.id
       ${where}
       ORDER BY f.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 祝花申し込み（ログイン不要）
app.post('/api/flowers', async (req, res) => {
  const { member_id, member_name, amount, message } = req.body;
  if (!member_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'メンバーと金額は必須です' });
  }
  const token = req.headers['authorization']?.replace('Bearer ', '');
  let userId = null;
  if (token) {
    try { userId = jwt.verify(token, JWT_SECRET).userId; } catch {}
  }
  try {
    const result = await pool.query(
      `INSERT INTO flowers (user_id, member_id, member_name, amount, message, status)
       VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
      [userId, member_id, member_name, amount, message || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 祝花ステータス更新（完了）
app.put('/api/flowers/:id/complete', authRequired, async (req, res) => {
  const result = await pool.query(
    `UPDATE flowers SET status='completed' WHERE id=$1 AND user_id=$2 RETURNING *`,
    [req.params.id, req.user.userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: '申し込みが見つかりません' });
  res.json(result.rows[0]);
});

// ══════════════════════════════════════════
//  POSTERS — ポスター案
// ══════════════════════════════════════════

// ポスター一覧
app.get('/api/posters', async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  let userId = null;
  if (token) { try { userId = jwt.verify(token, JWT_SECRET).userId; } catch {} }
  try {
    const result = await pool.query(
      `SELECT p.*,
        CASE WHEN p.is_anonymous THEN NULL ELSE u.nickname END as owner_nickname,
        CASE WHEN p.is_anonymous THEN NULL ELSE u.avatar_url END as owner_avatar,
        (SELECT COUNT(*) FROM poster_likes WHERE poster_id=p.id) as likes_count,
        ${userId ? `(SELECT COUNT(*) FROM poster_likes WHERE poster_id=p.id AND user_id='${userId}') > 0` : 'false'} as is_liked,
        p.user_id = '${userId || '00000000-0000-0000-0000-000000000000'}' as is_own
       FROM posters p
       LEFT JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ポスター投稿
app.post('/api/posters', authRequired, async (req, res) => {
  const { image_data, caption, is_anonymous, nickname } = req.body;
  if (!image_data) return res.status(400).json({ error: '画像が必要です' });
  try {
    const displayNick = is_anonymous ? null : (nickname || null);
    const result = await pool.query(
      `INSERT INTO posters (user_id, image_data, caption, is_anonymous, nickname)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.userId, image_data, caption || '', !!is_anonymous, displayNick]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ポスター削除（自分のみ）
app.delete('/api/posters/:id', authRequired, async (req, res) => {
  const result = await pool.query(
    'DELETE FROM posters WHERE id=$1 AND user_id=$2 RETURNING id',
    [req.params.id, req.user.userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: '見つかりません' });
  res.json({ ok: true });
});

// いいね トグル
app.post('/api/posters/:id/like', authRequired, async (req, res) => {
  const { id } = req.params;
  const uid = req.user.userId;
  try {
    const existing = await pool.query(
      'SELECT id FROM poster_likes WHERE poster_id=$1 AND user_id=$2', [id, uid]
    );
    if (existing.rows.length) {
      await pool.query('DELETE FROM poster_likes WHERE poster_id=$1 AND user_id=$2', [id, uid]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO poster_likes (poster_id, user_id) VALUES ($1,$2)', [id, uid]);
      res.json({ liked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// コメント一覧
app.get('/api/posters/:id/comments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
        CASE WHEN c.is_anonymous THEN '匿名' ELSE COALESCE(c.nickname, u.nickname, '不明') END as display_name,
        CASE WHEN c.is_anonymous THEN NULL ELSE u.avatar_url END as owner_avatar
       FROM poster_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.poster_id=$1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// コメント投稿
app.post('/api/posters/:id/comments', authRequired, async (req, res) => {
  const { body, is_anonymous, nickname } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'コメントを入力してください' });
  try {
    const result = await pool.query(
      `INSERT INTO poster_comments (poster_id, user_id, body, is_anonymous, nickname)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, req.user.userId, body.trim(), !!is_anonymous, is_anonymous ? null : (nickname || null)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// ── サーバー起動 ──────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌸 ひなたカレンダー API サーバー起動`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   DB: ${process.env.DATABASE_URL ? '✅ 接続済み' : '❌ DATABASE_URL未設定'}\n`);
});

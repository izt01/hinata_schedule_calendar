/* ═══════════════════════════════════════
   ひなたカレンダー — DBマイグレーション
   migrate.js
   実行: node migrate.js
═══════════════════════════════════════ */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🌸 マイグレーション開始...');

    await client.query(`
      -- ユーザーテーブル
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nickname    VARCHAR(50)  NOT NULL,
        email       VARCHAR(255) UNIQUE,
        avatar_url  TEXT,
        avatar_type VARCHAR(20)  DEFAULT 'member', -- 'member' | 'upload'
        created_at  TIMESTAMPTZ  DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  DEFAULT NOW()
      );

      -- イベントテーブル
      CREATE TABLE IF NOT EXISTS events (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
        name            VARCHAR(200) NOT NULL,
        date            DATE         NOT NULL,
        time            TIME,
        note            TEXT,
        emoji           VARCHAR(10)  DEFAULT '🎪',
        visibility      VARCHAR(20)  DEFAULT 'private', -- 'private' | 'public' | 'specific'
        target_user_ids UUID[]       DEFAULT '{}',
        created_at      TIMESTAMPTZ  DEFAULT NOW(),
        updated_at      TIMESTAMPTZ  DEFAULT NOW()
      );

      -- 写真テーブル
      CREATE TABLE IF NOT EXISTS photos (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
        member_id       VARCHAR(50),
        member_name     VARCHAR(100),
        caption         TEXT,
        image_data      TEXT,        -- Base64 or URL
        visibility      VARCHAR(20)  DEFAULT 'private', -- 'private' | 'public' | 'specific'
        target_user_ids UUID[]       DEFAULT '{}',
        created_at      TIMESTAMPTZ  DEFAULT NOW()
      );

      -- 祝花申し込みテーブル
      CREATE TABLE IF NOT EXISTS flowers (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
        member_id   VARCHAR(50)  NOT NULL,
        member_name VARCHAR(100) NOT NULL,
        amount      INTEGER      NOT NULL,
        message     TEXT,
        status      VARCHAR(20)  DEFAULT 'pending', -- 'pending' | 'completed'
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      );

      -- ポスター案テーブル
      CREATE TABLE IF NOT EXISTS posters (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
        image_data  TEXT         NOT NULL,
        caption     TEXT,
        is_anonymous BOOLEAN     DEFAULT false,
        nickname    VARCHAR(50),
        likes_count INTEGER      DEFAULT 0,
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      );

      -- ポスターいいねテーブル
      CREATE TABLE IF NOT EXISTS poster_likes (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        poster_id  UUID REFERENCES posters(id) ON DELETE CASCADE,
        user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(poster_id, user_id)
      );

      -- ポスターコメントテーブル
      CREATE TABLE IF NOT EXISTS poster_comments (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        poster_id   UUID REFERENCES posters(id) ON DELETE CASCADE,
        user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
        is_anonymous BOOLEAN    DEFAULT false,
        nickname    VARCHAR(50),
        body        TEXT        NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- インデックス
      CREATE INDEX IF NOT EXISTS idx_events_user_id      ON events(user_id);
      CREATE INDEX IF NOT EXISTS idx_events_date         ON events(date);
      CREATE INDEX IF NOT EXISTS idx_events_visibility   ON events(visibility);
      CREATE INDEX IF NOT EXISTS idx_photos_user_id      ON photos(user_id);
      CREATE INDEX IF NOT EXISTS idx_photos_visibility   ON photos(visibility);
      CREATE INDEX IF NOT EXISTS idx_photos_member_id    ON photos(member_id);
      CREATE INDEX IF NOT EXISTS idx_flowers_member_id   ON flowers(member_id);
      CREATE INDEX IF NOT EXISTS idx_posters_created_at  ON posters(created_at);
      CREATE INDEX IF NOT EXISTS idx_poster_likes_poster ON poster_likes(poster_id);
      CREATE INDEX IF NOT EXISTS idx_poster_comments     ON poster_comments(poster_id);
    `);

    console.log('✅ マイグレーション完了！');
    console.log('  - users テーブル');
    console.log('  - events テーブル');
    console.log('  - photos テーブル');
    console.log('  - flowers テーブル（祝花）');
    console.log('  - posters テーブル（ポスター案）');
    console.log('  - poster_likes テーブル');
    console.log('  - poster_comments テーブル');
  } catch (err) {
    console.error('❌ マイグレーションエラー:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

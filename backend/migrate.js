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

      -- インデックス
      CREATE INDEX IF NOT EXISTS idx_events_user_id    ON events(user_id);
      CREATE INDEX IF NOT EXISTS idx_events_date       ON events(date);
      CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);
      CREATE INDEX IF NOT EXISTS idx_photos_user_id    ON photos(user_id);
      CREATE INDEX IF NOT EXISTS idx_photos_visibility ON photos(visibility);
      CREATE INDEX IF NOT EXISTS idx_photos_member_id  ON photos(member_id);
    `);

    console.log('✅ マイグレーション完了！');
    console.log('  - users テーブル');
    console.log('  - events テーブル');
    console.log('  - photos テーブル');
  } catch (err) {
    console.error('❌ マイグレーションエラー:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

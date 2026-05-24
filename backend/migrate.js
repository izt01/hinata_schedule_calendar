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
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nickname      VARCHAR(50)  NOT NULL,
        email         VARCHAR(255) UNIQUE,
        password_hash TEXT         NOT NULL DEFAULT '',
        avatar_url    TEXT,
        avatar_type   VARCHAR(20)  DEFAULT 'member',
        is_admin      BOOLEAN      DEFAULT false,
        created_at    TIMESTAMPTZ  DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  DEFAULT NOW()
      );

      -- 既存テーブルへのカラム追加（既にある場合はスキップ）
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

      -- 祝花公開設定テーブル
      CREATE TABLE IF NOT EXISTS flower_settings (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        is_open    BOOLEAN     DEFAULT false,
        open_from  DATE,
        open_to    DATE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      -- デフォルト設定を1行だけ挿入
      INSERT INTO flower_settings (id, is_open)
        VALUES ('00000000-0000-0000-0000-000000000001', false)
        ON CONFLICT (id) DO NOTHING;

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
        campaign_id UUID,
        image_data  TEXT         NOT NULL,
        caption     TEXT,
        is_anonymous BOOLEAN     DEFAULT false,
        nickname    VARCHAR(50),
        likes_count INTEGER      DEFAULT 0,
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      );

      -- ポスター募集キャンペーンテーブル（管理者が作成）
      CREATE TABLE IF NOT EXISTS poster_campaigns (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title       VARCHAR(200) NOT NULL,
        member_name VARCHAR(100),
        open_from   DATE NOT NULL,
        open_to     DATE NOT NULL,
        created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- 既存テーブルへのカラム追加
      ALTER TABLE posters ADD COLUMN IF NOT EXISTS campaign_id UUID;
      CREATE INDEX IF NOT EXISTS idx_posters_campaign ON posters(campaign_id);
      ALTER TABLE poster_campaigns ADD COLUMN IF NOT EXISTS manual_open BOOLEAN DEFAULT false;

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

      -- スケジュール進捗テーブル
      CREATE TABLE IF NOT EXISTS schedules (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title       VARCHAR(200) NOT NULL,
        description TEXT,
        due_date    DATE,
        created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
        status      VARCHAR(20) DEFAULT 'in_progress',
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      -- スケジュールのステップ（工程）テーブル
      CREATE TABLE IF NOT EXISTS schedule_steps (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id  UUID REFERENCES schedules(id) ON DELETE CASCADE,
        step_order   INTEGER NOT NULL,
        title        VARCHAR(200) NOT NULL,
        assignee_id  UUID REFERENCES users(id) ON DELETE SET NULL,
        due_date     DATE,
        status       VARCHAR(20) DEFAULT 'waiting',
        completed_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );

      -- 既存テーブルへのカラム追加（既にある場合はスキップ）
      ALTER TABLE schedules       ADD COLUMN IF NOT EXISTS due_date DATE;
      ALTER TABLE schedule_steps  ADD COLUMN IF NOT EXISTS due_date DATE;

      -- プッシュ通知購読テーブル
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
        endpoint   TEXT NOT NULL,
        p256dh     TEXT NOT NULL,
        auth       TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, endpoint)
      );
      CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

      -- スケジュール通知済みフラグ（二重送信防止）
      CREATE TABLE IF NOT EXISTS notif_sent_log (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target     VARCHAR(200) NOT NULL,
        sent_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(target)
      );

      -- 通知設定テーブル（管理者が設定）
      CREATE TABLE IF NOT EXISTS notif_settings (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        -- 当日リマインダーの送信時刻（JST 0〜23時）
        same_day_hour  INTEGER DEFAULT 8,
        -- 前日リマインダーの送信時刻（JST 0〜23時）
        prev_day_hour  INTEGER DEFAULT 20,
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      );
      INSERT INTO notif_settings (id, same_day_hour, prev_day_hour)
        VALUES ('00000000-0000-0000-0000-000000000002', 8, 20)
        ON CONFLICT (id) DO NOTHING;

      -- フィードバックテーブル
      CREATE TABLE IF NOT EXISTS feedbacks (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
        nickname   VARCHAR(50),
        category   VARCHAR(30) NOT NULL, -- 'idea' | 'bug' | 'request' | 'other'
        body       TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at);
      CREATE INDEX IF NOT EXISTS idx_schedules_created_by    ON schedules(created_by);

      -- インデックス（既存）
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
    console.log('  - schedules テーブル（スケジュール進捗）');
    console.log('  - schedule_steps テーブル');
  } catch (err) {
    console.error('❌ マイグレーションエラー:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

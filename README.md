# 🌸 ひなたカレンダー — 改良版セットアップガイド

## 構成

```
hinata_updated/
├── backend/          ← Node.js/Express APIサーバー（Railway にデプロイ）
│   ├── server.js     ← メインAPIサーバー
│   ├── migrate.js    ← DBテーブル作成スクリプト
│   ├── package.json
│   ├── railway.toml  ← Railway設定
│   └── .env.example  ← 環境変数テンプレート
│
└── frontend/         ← フロントエンド（既存ホスティングまたはRailwayに同梱）
    ├── index.html    ← トップページ（Xタイムライン追加）
    ├── events.html   ← 行事帳（共有機能追加）
    ├── gallery.html  ← ギャラリー（共有機能追加）
    ├── profile.html  ← 新規：アカウント設定ページ
    ├── api.js        ← 新規：APIクライアント
    ├── nav.js        ← 更新：ユーザー情報表示追加
    └── ...（その他のファイルは変更なし）
```

---

## セットアップ手順

### ① Railway でバックエンドをデプロイ

1. **Railwayにログイン** → https://railway.app
2. **新しいプロジェクトを作成** → "Deploy from GitHub repo" または "Empty Project"
3. **PostgreSQL を追加**
   - "Add a service" → "Database" → "Add PostgreSQL"
4. **バックエンドサービスを追加**
   - "Add a service" → "GitHub Repo" → `backend/` フォルダを指定
   - または `backend/` をそのままRailwayにドラッグ＆ドロップ
5. **環境変数を設定**（Railway ダッシュボード → Variables）
   ```
   DATABASE_URL   = （PostgreSQLサービスのURLをRailwayが自動生成）
   JWT_SECRET     = （任意の長い文字列　例: hinata_secret_2025_xxxxx）
   FRONTEND_URL   = （フロントエンドのURL　例: https://hinata.up.railway.app）
   ```
   ※ `DATABASE_URL` は PostgreSQL サービスの "Connect" から自動でコピーできます

### ② DBマイグレーション（テーブル作成）

Railway の "Deploy" タブで、一度だけ以下を実行：
```bash
# Railway のターミナル（またはローカルから）
node migrate.js
```

または Railway ダッシュボードの「Service」→「Settings」→「Deploy Command」に
```
node migrate.js && node server.js
```
を設定することで、デプロイ時に自動実行されます。

### ③ フロントエンドの api.js を修正

`frontend/api.js` の先頭にある：
```javascript
const API_BASE = 'https://YOUR-RAILWAY-API-URL.railway.app';
```

を、Railway でデプロイした APIサーバーのURL に変更します。

例:
```javascript
const API_BASE = 'https://hinata-calendar-api.up.railway.app';
```

### ④ フロントエンドをデプロイ

**方法A: Railwayに同梱（推奨）**
- `server.js` に静的ファイルの配信を追加
- または Railway で別サービスとして `frontend/` をホスト

**方法B: GitHub Pages**
- `frontend/` をGitHubリポジトリの `docs/` または専用ブランチに置く
- Settings → Pages → Deploy from branch

**方法C: Netlify / Vercel**
- `frontend/` フォルダをそのままドラッグ＆ドロップ

---

## 新機能の使い方

### アカウント設定
- 右上の 👤 アイコン → **アカウント設定** ページへ
- ニックネーム（必須）、メール（任意）を入力して「保存」
- アイコン：日向坂46のメンバーから選択 or 写真をアップロード

### イベント共有
- 行事帳の **＋** ボタン → モーダル上部のタブで選択
  - 🔒 **プライベート**：自分だけ
  - 🌐 **全体公開**：アプリの全ユーザーが見られる
  - 👥 **特定共有**：選んだユーザーだけ

### 写真共有
- ギャラリーの **＋** ボタン → 同様に共有設定

### X（Twitter）タイムライン
- トップページ下部に **@hinatazaka46** の最新ツイートが自動表示
- Twitterの公式ウィジェットを使用（無料・APIキー不要）

---

## APIエンドポイント一覧

| メソッド | エンドポイント          | 説明                  |
|----------|------------------------|-----------------------|
| GET      | /api/health            | サーバー疎通確認      |
| POST     | /api/users/register    | ユーザー登録          |
| PUT      | /api/users/me          | プロフィール更新      |
| GET      | /api/users/me          | 自分のプロフィール    |
| GET      | /api/users             | 全ユーザー一覧        |
| GET      | /api/events            | イベント一覧          |
| POST     | /api/events            | イベント追加          |
| PUT      | /api/events/:id        | イベント更新          |
| DELETE   | /api/events/:id        | イベント削除          |
| GET      | /api/photos            | 写真一覧              |
| POST     | /api/photos            | 写真追加              |
| DELETE   | /api/photos/:id        | 写真削除              |

---

## ご注意

- **未ログイン時**: イベントはlocalStorage、写真はIndexedDBに保存（従来通り）
- **ログイン後**: すべてのデータがRailway PostgreSQLに保存・同期されます
- 画像データはBase64でDBに直接保存しているため、大量の写真がある場合はStorageサービス（Cloudinary等）への移行を検討してください

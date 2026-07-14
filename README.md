# パークガレージ太田 — 公式ウェブサイト

パルクール施設「パークガレージ太田」（群馬県太田市）の公式ウェブサイトです。

## 技術スタック

| 項目 | 技術 |
|---|---|
| フレームワーク | [Astro](https://astro.build/) |
| スタイリング | [Tailwind CSS v4](https://tailwindcss.com/) |
| 言語 | TypeScript |
| CMS | [microCMS](https://microcms.io/) |
| ホスティング | [Cloudflare Pages](https://pages.cloudflare.com/) |
| フォーム | [Web3Forms](https://web3forms.com/) |

## ページ構成

| パス | ページ |
|---|---|
| `/` | ホーム |
| `/menu` | メニュー・料金 |
| `/events` | イベント・お知らせ |
| `/events/[slug]` | イベント詳細 |
| `/booking` | 予約 |
| `/links` | 各種リンク |
| `/access` | アクセス・お問い合わせ |

## 開発環境のセットアップ

### 1. 前提条件

- Node.js v22 以上
- npm

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、各 API キーを設定します。

```bash
cp .env.example .env
```

| 変数名 | 説明 | 取得先 |
|---|---|---|
| `MICROCMS_SERVICE_DOMAIN` | microCMS サービスドメイン | [microCMS 管理画面](https://app.microcms.io/) |
| `MICROCMS_API_KEY` | microCMS API キー | microCMS 管理画面 > API キー |
| `WEB3FORMS_ACCESS_KEY` | Web3Forms アクセスキー | [Web3Forms](https://web3forms.com/) |
| `GOOGLE_CALENDAR_EMBED_URL` | Google Calendar 埋め込み URL | Google カレンダー設定 |
| `GOOGLE_MAPS_EMBED_URL` | Google Maps 埋め込み URL | Google Maps > 共有 |

### 3. 依存パッケージのインストール

```bash
npm install
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:4321` を開きます。

### 5. ビルド

```bash
npm run build
```

## microCMS のセットアップ

microCMS で以下の API を作成してください。

### `events`（リスト形式）

| フィールド ID | 表示名 | 種別 |
|---|---|---|
| `title` | タイトル | テキストフィールド |
| `content` | 本文 | リッチエディタ |
| `category` | カテゴリ | セレクトフィールド（お知らせ / イベント / 教室 / その他） |
| `eyecatch` | アイキャッチ | 画像 |
| `excerpt` | 抜粋 | テキストフィールド（任意） |

## Cloudflare Pages へのデプロイ

### GitHub 経由（推奨）

1. リポジトリを GitHub にプッシュ
2. [Cloudflare Pages ダッシュボード](https://dash.cloudflare.com/) でプロジェクトを作成
3. GitHub リポジトリを連携
4. ビルド設定:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: （空欄）
5. 環境変数を Settings > Environment variables で設定

### 環境変数（Cloudflare Pages ダッシュボードで設定）

- `MICROCMS_SERVICE_DOMAIN`
- `MICROCMS_API_KEY`
- `WEB3FORMS_ACCESS_KEY`

## Web3Forms の設定

1. [Web3Forms](https://web3forms.com/) でアカウント作成
2. メールアドレスを登録してアクセスキーを取得
3. `booking.astro` と `access.astro` の `YOUR_WEB3FORMS_ACCESS_KEY` を実際のキーに置き換える
4. または `.env` の `WEB3FORMS_ACCESS_KEY` に設定（要対応）

## Google Calendar の埋め込み

1. Google カレンダーで使用するカレンダーを選択
2. 設定 > カレンダーの統合 > 「このカレンダーを埋め込む」の URL をコピー
3. `src/pages/index.astro` と `src/pages/booking.astro` のプレースホルダーを `<iframe>` に置き換え

## ライセンス

Copyright © 2026 株式会社ヨジノボリ（YOJINOBORI）All rights reserved.

# lilbittools

Cloudflare Pages (Astro) で構築された、自作の小型ツールを公開・管理するためのプロジェクトです。

## コンセプト

「ちょっとした便利」を形にして、すぐに公開・共有できる環境。

- **スピード**: Astro + Cloudflare Pages による高速なビルドとデプロイ
- **シンプル**: 外部APIへの依存を最小限に抑え、必要なツールを `src/pages/` に追加するだけ
- **スケーラブル**: Cloudflare のインフラを活用した高い可用性

## 技術スタック

| 項目 | 技術 |
|---|---|
| フレームワーク | [Astro](https://astro.build/) |
| アダプター | [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) |
| スタイリング | [Tailwind CSS v4](https://tailwindcss.com/) |
| デプロイ | [Cloudflare Pages](https://pages.cloudflare.com/) |
| バージョン管理 | GitHub (sukesukefantasy/lilbittools) |

## 開発環境のセットアップ

### 1. 前提条件

- Node.js v22 以上
- npm

### 2. インストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

### 4. ビルドとデプロイ

```bash
# ビルド
npm run build

# 手動デプロイ (wrangler)
npm run deploy
```

※ GitHub にプッシュすると、Cloudflare Pages により自動的にデプロイされます。

## ツールの追加方法

`src/pages/` ディレクトリ配下に新しい `.astro` ファイル（または `.ts`, `.js`）を作成するだけで、自動的にルーティングが設定されます。

例: `src/pages/my-tool.astro` を作成すると、`/my-tool` でアクセス可能になります。

## ライセンス

© 2026 sukesukefantasy

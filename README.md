# issue-press

# issue-press アーキテクチャ & 実装計画

GitHub Issues を一次情報源としたブログシステム

## コンセプト

- GitHub リポジトリの **Issue 1つ = ブログ記事 1つ**
- Issue の本文（Markdown）がそのまま記事コンテンツになる
- ラベル → カテゴリ / タグ
- Issue 番号 → 記事の永続 URL（`/posts/42`）

## 技術スタック

| 役割 | 技術 |
|------|------|
| ランタイム / ホスティング | Deno Deploy |
| データソース | GitHub Issues API (REST or GraphQL) |
| キャッシュ | Upstash Redis |
| Markdown レンダリング | deno-gfm or marked |

## アーキテクチャ

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ GET /posts/:id
     ▼
┌──────────────┐
│  Deno Deploy │
└────┬─────────┘
     │
     ▼
┌──────────────┐
│Upstash Redis │
│  cache check │
└────┬────┬────┘
     │    │
   HIT   MISS
     │    │
     │    ▼
     │  ┌────────────────┐
     │  │ GitHub REST API │
     │  │ GET /repos/:owner/:repo/issues/:id │
     │  └───────┬────────┘
     │          │
     │          ▼
     │    ┌───────────┐
     │    │ cache SET  │
     │    │ (TTL: 5m)  │
     │    └───────┬───┘
     │            │
     ▼            ▼
┌──────────────────────┐
│  Markdown → HTML     │
│  テンプレート適用      │
└──────────┬───────────┘
           │
           ▼
┌──────────────┐
│   Response   │
│   (HTML)     │
└──────────────┘
```

## エンドポイント設計

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/` | 記事一覧（Issue リスト） |
| GET | `/posts/:id` | 個別記事（Issue 本文） |
| GET | `/tags/:label` | ラベル別記事一覧 |
| GET | `/feed` | RSS / Atom フィード |

## データフロー詳細

### キャッシュ HIT

```
Request → Deno → Upstash GET → データあり → HTML レンダリング → Response
```

### キャッシュ MISS

```
Request → Deno → Upstash GET → データなし → GitHub API fetch → Upstash SET (TTL) → HTML レンダリング → Response
```

## キャッシュ戦略

- **キー設計**: `post:{issue_number}` / `list:{page}:{label}`
- **TTL**: 5分（調整可能）
- **Webhook 連携（将来）**: Issue 更新時に該当キャッシュを invalidate

## 実装計画

### Phase 1: MVP（最小動作）

- [ ] Deno プロジェクト初期化
- [ ] GitHub Issues API からの fetch 処理
- [ ] Markdown → HTML 変換
- [ ] 最低限のテンプレート（記事ページ）
- [ ] Deno Deploy へデプロイ

### Phase 2: キャッシュ導入

- [ ] Upstash Redis 接続
- [ ] cache HIT / MISS のフロー実装
- [ ] TTL 設定

### Phase 3: ブログ機能拡充

- [ ] 記事一覧ページ（ページネーション）
- [ ] ラベルによるタグフィルタ
- [ ] RSS フィード生成
- [ ] OGP メタタグ（SNS シェア対応）

### Phase 4: 運用改善

- [ ] GitHub Webhook による cache invalidation
- [ ] レートリミット対策（GitHub API: 5000 req/h）
- [ ] エラーハンドリング（API 障害時は stale cache を返す）
- [ ] アクセス解析（簡易）

## ディレクトリ構成（想定）

```
issue-press/
├── deno.json
├── main.ts            # エントリポイント / ルーティング
├── lib/
│   ├── github.ts      # GitHub API クライアント
│   ├── cache.ts       # Upstash Redis ラッパー
│   ├── markdown.ts    # Markdown → HTML 変換
│   └── feed.ts        # RSS 生成
├── templates/
│   ├── layout.ts      # 共通レイアウト
│   ├── post.ts        # 記事ページ
│   └── list.ts        # 一覧ページ
├── static/
│   └── style.css
└── README.md
```

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token |
| `GITHUB_OWNER` | リポジトリオーナー |
| `GITHUB_REPO` | リポジトリ名 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token |
| `CACHE_TTL` | キャッシュ有効期間（秒）デフォルト 300 |

## メモ

- GitHub Issues API は認証なしだと 60 req/h、トークンありで 5,000 req/h
- Upstash Redis は無料枠で 10,000 commands/day — MVP には十分
- Deno Deploy は無料枠で 1M requests/month
- Issue の `state: open` のみを記事として扱う（close = 非公開 / 下書き運用が可能）

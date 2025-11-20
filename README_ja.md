# GitHub PR Data to BigQuery

この GitHub Action は、プルリクエストのメタデータ（コメントやレビューを含む）を抽出し、Google BigQuery テーブルにストリーミングします。PR がクローズされたときに実行されるように設計されています。

## 機能

-   **PR メタデータ**: タイトル、作成者、ブランチ、タイムスタンプ、コミット数などを取得します。
-   **コメント & レビュー**: Issue コメント、レビューコメント、プルリクエストレビュー（承認など）を取得します。
-   **重複排除**: 再試行時に重複行が発生しないように、一意の `insertId` を生成します。
-   **最新データ**: GitHub API から最新の PR 状態を取得し、正確性（最終的なコミット数など）を保証します。

## 使用方法

ワークフローファイル（例: `.github/workflows/bq-export.yml`）にこのアクションを追加してください。

```yaml
name: Export PR Data to BigQuery
on:
  pull_request:
    types: [closed]

jobs:
  export:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      id-token: write # Google Auth に必要
    steps:
      - uses: actions/checkout@v4

      # Google Cloud 認証
      - id: 'auth'
        uses: 'google-github-actions/auth@v2'
        with:
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider'
          service_account: 'my-service-account@my-project.iam.gserviceaccount.com'
          token_format: 'access_token'

      # Export Action の実行
      - uses: ./ # または your-repo/github-prstat-to-bigquery@v1
        with:
          project_id: 'my-gcp-project-id'
          dataset_id: 'github_medops_ehr'
          access_token: ${{ steps.auth.outputs.access_token }}
          # オプション入力（デフォルト値を表示）
          # table_id: 'github_pr_info'
          # comments_table_id: 'github_pr_comments'
          # github_token: ${{ secrets.GITHUB_TOKEN }}
```

## 入力 (Inputs)

| 入力 | 説明 | 必須 | デフォルト |
| :--- | :--- | :--- | :--- |
| `project_id` | GCP プロジェクト ID。 | **はい** | - |
| `dataset_id` | BigQuery データセット ID。 | **はい** | - |
| `access_token` | GCP アクセストークン (OAuth2)。 | **はい** | - |
| `table_id` | PR 情報用の BigQuery テーブル ID。 | いいえ | `github_pr_info` |
| `comments_table_id` | コメント用の BigQuery テーブル ID。 | いいえ | `github_pr_comments` |
| `github_token` | API リクエスト用の GitHub トークン。 | いいえ | `${{ github.token }}` |
| `pr_number` | PR 番号（手動実行用）。 | いいえ | - |

## BigQuery スキーマ

このアクションは、BigQuery データセットに以下の2つのテーブルが存在することを想定しています。

### `github_pr_info`

| フィールド | 型 | 説明 |
| :--- | :--- | :--- |
| `repository` | STRING | `owner/repo` |
| `pr_number` | INTEGER | PR 番号 |
| `branch_name` | STRING | Head ブランチ名 |
| `author` | STRING | PR 作成者 |
| `created_at` | TIMESTAMP | PR 作成日時 |
| `latest_commit` | STRING | Head コミットの SHA |
| `commit_count` | INTEGER | コミット数 |
| `inserted_at` | TIMESTAMP | 挿入日時 |

### `github_pr_comments`

| フィールド | 型 | 説明 |
| :--- | :--- | :--- |
| `repository` | STRING | `owner/repo` |
| `pr_number` | INTEGER | PR 番号 |
| `comment_id` | INTEGER | GitHub コメント/レビュー ID |
| `comment_type` | STRING | `issue_comment`, `review_comment`, または `review` |
| `comment_author` | STRING | コメント作成者 |
| `comment_time` | TIMESTAMP | コメント作成日時 |
| `inserted_at` | TIMESTAMP | 挿入日時 |

## 開発

### ビルド

```bash
npm install
npm run build
```

### テスト

```bash
npm test
```

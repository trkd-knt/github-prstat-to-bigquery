# GitHub PR Data to BigQuery

This GitHub Action extracts Pull Request metadata (including comments and reviews) and streams it to Google BigQuery tables. It is designed to run when a PR is closed.

## Features

-   **PR Metadata**: Captures title, author, branch, timestamps, commit counts, etc.
-   **Comments & Reviews**: Fetches Issue Comments, Review Comments, and Pull Request Reviews (approvals).
-   **Deduplication**: Generates unique `insertId`s to prevent duplicate rows during retries.
-   **Fresh Data**: Fetches the latest PR state from the GitHub API to ensure accuracy (e.g., final commit count).

## Setup

Before using this action, you need to create the BigQuery dataset and tables. A setup script is provided for convenience.

1.  Ensure you have the `bq` command-line tool installed and authenticated (part of Google Cloud SDK).
2.  Run the setup script:

```bash
# Make the script executable
chmod +x setup/create_bq_tables.sh

# Run the script
./setup/create_bq_tables.sh -p YOUR_PROJECT_ID -d github_pr_data
```

## Usage

Add this action to your workflow file (e.g., `.github/workflows/bq-export.yml`).

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
      id-token: write # Required for Google Auth
    steps:
      - uses: actions/checkout@v4

      # Authenticate with Google Cloud
      - id: 'auth'
        uses: 'google-github-actions/auth@v2'
        with:
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider'
          service_account: 'my-service-account@my-project.iam.gserviceaccount.com'
          token_format: 'access_token'

      # Run the Export Action
      - uses: ./ # Or your-repo/github-prstat-to-bigquery@v1
        with:
          project_id: 'my-gcp-project-id'
          dataset_id: 'github_pr_data'
          access_token: ${{ steps.auth.outputs.access_token }}
          # Optional inputs (defaults shown)
          # table_id: 'github_pr_info'
          # comments_table_id: 'github_pr_comments'
          # github_token: ${{ secrets.GITHUB_TOKEN }}
          # pr_number: 123 # Optional: For manual execution
```

## Inputs

| Input | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `project_id` | GCP Project ID. | **Yes** | - |
| `dataset_id` | BigQuery Dataset ID. | **Yes** | - |
| `access_token` | GCP Access Token (OAuth2). | **Yes** | - |
| `table_id` | BigQuery Table ID for PR Info. | No | `github_pr_info` |
| `comments_table_id` | BigQuery Table ID for Comments. | No | `github_pr_comments` |
| `github_token` | GitHub Token for API requests. | No | `${{ github.token }}` |
| `pr_number` | PR Number (for manual execution). | No | - |

## BigQuery Schema

This action expects two tables to exist in your BigQuery dataset.

### `github_pr_info`

| Field | Type | Description |
| :--- | :--- | :--- |
| `repository` | STRING | `owner/repo` |
| `pr_number` | INTEGER | PR Number |
| `branch_name` | STRING | Head branch name |
| `author` | STRING | PR Author |
| `created_at` | TIMESTAMP | PR creation time |
| `latest_commit` | STRING | SHA of the head commit |
| `commit_count` | INTEGER | Number of commits |
| `inserted_at` | TIMESTAMP | Time of insertion |

### `github_pr_comments`

| Field | Type | Description |
| :--- | :--- | :--- |
| `repository` | STRING | `owner/repo` |
| `pr_number` | INTEGER | PR Number |
| `comment_id` | INTEGER | GitHub Comment/Review ID |
| `comment_type` | STRING | `issue_comment`, `review_comment`, or `review` |
| `comment_author` | STRING | Comment Author |
| `comment_time` | TIMESTAMP | Comment creation time |
| `inserted_at` | TIMESTAMP | Time of insertion |

## Development

### Build

```bash
npm install
npm run build
```

### Test

```bash
npm test
```

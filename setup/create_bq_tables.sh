#!/bin/bash
set -e

# Default values
PROJECT_ID=""
DATASET_ID="github_pr_data"
LOCATION="asia-northeast1"

# Usage function
usage() {
  echo "Usage: $0 -p PROJECT_ID [-d DATASET_ID] [-l LOCATION]"
  echo "  -p PROJECT_ID   : Google Cloud Project ID (Required)"
  echo "  -d DATASET_ID   : BigQuery Dataset ID (Default: github_pr_data)"
  echo "  -l LOCATION     : BigQuery Dataset Location (Default: asia-northeast1)"
  exit 1
}

# Parse arguments
while getopts "p:d:l:" opt; do
  case $opt in
    p) PROJECT_ID="$OPTARG" ;;
    d) DATASET_ID="$OPTARG" ;;
    l) LOCATION="$OPTARG" ;;
    *) usage ;;
  esac
done

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID is required."
  usage
fi

echo "=== Setting up BigQuery Resources ==="
echo "Project: $PROJECT_ID"
echo "Dataset: $DATASET_ID"
echo "Location: $LOCATION"

# Create Dataset if it doesn't exist
if bq show --project_id="$PROJECT_ID" "$DATASET_ID" >/dev/null 2>&1; then
  echo "Dataset '$DATASET_ID' already exists. Skipping creation."
else
  echo "Creating dataset '$DATASET_ID'..."
  bq --project_id="$PROJECT_ID" mk --dataset --location="$LOCATION" --description "Dataset for GitHub PR metrics" "$DATASET_ID"
fi

# Create github_pr_info table
TABLE_PR_INFO="${DATASET_ID}.github_pr_info"
if bq show --project_id="$PROJECT_ID" "$TABLE_PR_INFO" >/dev/null 2>&1; then
  echo "Table '$TABLE_PR_INFO' already exists. Updating schema..."
  bq --project_id="$PROJECT_ID" update "$TABLE_PR_INFO" ./setup/schema_pr_info.json
else
  echo "Creating table '$TABLE_PR_INFO'..."
  bq --project_id="$PROJECT_ID" mk --table \
    --time_partitioning_type=DAY \
    --time_partitioning_field=inserted_at \
    --clustering_fields=repository,pr_number \
    "$TABLE_PR_INFO" \
    ./setup/schema_pr_info.json
fi

# Create github_pr_comments table
TABLE_PR_COMMENTS="${DATASET_ID}.github_pr_comments"
if bq show --project_id="$PROJECT_ID" "$TABLE_PR_COMMENTS" >/dev/null 2>&1; then
  echo "Table '$TABLE_PR_COMMENTS' already exists. Updating schema..."
  bq --project_id="$PROJECT_ID" update "$TABLE_PR_COMMENTS" ./setup/schema_pr_comments.json
else
  echo "Creating table '$TABLE_PR_COMMENTS'..."
  bq --project_id="$PROJECT_ID" mk --table \
    --time_partitioning_type=DAY \
    --time_partitioning_field=inserted_at \
    --clustering_fields=repository,pr_number \
    "$TABLE_PR_COMMENTS" \
    ./setup/schema_pr_comments.json
fi

echo "=== Setup Complete ==="

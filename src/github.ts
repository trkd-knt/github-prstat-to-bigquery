import * as github from '@actions/github';
import { Context } from '@actions/github/lib/context';

export interface PRInfo {
  repository: string;
  pr_number: number;
  branch_name: string | null;
  author: string | null;
  created_at: string | null;
  latest_commit: string | null;
  commit_count: number | null;
}

export interface PRComment {
  repository: string;
  pr_number: number;
  comment_id: number;
  comment_type: 'issue_comment' | 'review_comment' | 'review';
  comment_author: string | null;
  comment_time: string | null;
}

export async function getPRInfo(token: string, context: Context, prNumberOverride?: number): Promise<PRInfo> {
  const prNumber = prNumberOverride || context.payload.pull_request?.number;
  if (!prNumber) {
    throw new Error('No pull_request number found. This action must be triggered by a pull_request event or provided with a pr_number input.');
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = context.repo;

  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  return {
    repository: `${owner}/${repo}`,
    pr_number: pr.number,
    branch_name: pr.head.ref || null,
    author: pr.user.login || null,
    created_at: pr.created_at || null,
    latest_commit: pr.head.sha || null,
    commit_count: pr.commits || null,
  };
}

export async function getPRComments(token: string, context: Context, prNumberOverride?: number): Promise<PRComment[]> {
  const octokit = github.getOctokit(token);
  const { owner, repo } = context.repo;
  const prNumber = prNumberOverride || context.payload.pull_request?.number;

  if (!prNumber) {
    throw new Error('No pull_request number found.');
  }

  const comments: PRComment[] = [];

  // 1. Issue Comments
  const issueComments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
  });

  for (const comment of issueComments) {
    comments.push({
      repository: `${owner}/${repo}`,
      pr_number: prNumber,
      comment_id: comment.id,
      comment_type: 'issue_comment',
      comment_author: comment.user?.login || null,
      comment_time: comment.created_at,
    });
  }

  // 2. Review Comments
  const reviewComments = await octokit.paginate(octokit.rest.pulls.listReviewComments, {
    owner,
    repo,
    pull_number: prNumber,
  });

  for (const comment of reviewComments) {
    comments.push({
      repository: `${owner}/${repo}`,
      pr_number: prNumber,
      comment_id: comment.id,
      comment_type: 'review_comment',
      comment_author: comment.user?.login || null,
      comment_time: comment.created_at,
    });
  }

  // 3. Reviews (Approvals, etc.)
  const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
    owner,
    repo,
    pull_number: prNumber,
  });

  for (const review of reviews) {
    comments.push({
      repository: `${owner}/${repo}`,
      pr_number: prNumber,
      comment_id: review.id,
      comment_type: 'review',
      comment_author: review.user?.login || null,
      comment_time: review.submitted_at || null,
    });
  }

  return comments;
}

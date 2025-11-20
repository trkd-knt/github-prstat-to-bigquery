import * as core from '@actions/core';
import * as github from '@actions/github';
import { BigQueryClient } from './bigquery';
import { getPRInfo, getPRComments } from './github';

async function run() {
  try {
    const projectId = core.getInput('project_id', { required: true });
    const datasetId = core.getInput('dataset_id', { required: true });
    const tableId = core.getInput('table_id', { required: true });
    const commentsTableId = core.getInput('comments_table_id', { required: true });
    const accessToken = core.getInput('access_token', { required: true });
    const githubToken = core.getInput('github_token') || process.env.GITHUB_TOKEN || '';

    const bqClient = new BigQueryClient(projectId, datasetId, tableId, commentsTableId, accessToken);

    // 1. Get PR Info
    core.info('Fetching PR Info...');
    // We need githubToken to fetch fresh PR info
    if (!githubToken) {
      throw new Error('github_token is required to fetch PR details.');
    }
    const prInfo = await getPRInfo(githubToken, github.context);
    const now = new Date();
    const insertedAt = now.toISOString();

    // Legacy insertId format: repository + "_pr_" + pr_number + "_" + now
    // We use ISO string for 'now' to be unique per execution time
    const prInsertId = `${prInfo.repository}_pr_${prInfo.pr_number}_${insertedAt}`;

    const prRow = {
      insertId: prInsertId,
      json: {
        ...prInfo,
        inserted_at: insertedAt,
      }
    };

    core.info(`Inserting PR Info for PR #${prInfo.pr_number}...`);
    await bqClient.insertPRInfo(prRow);
    core.info('PR Info inserted successfully.');

    // 2. Get PR Comments
    core.info('Fetching PR Comments and Reviews...');
    const comments = await getPRComments(githubToken, github.context);

    if (comments.length > 0) {
      const commentRows = comments.map(c => ({
        insertId: `${c.repository}_comment_${c.comment_id}_${insertedAt}`,
        json: {
          ...c,
          inserted_at: insertedAt,
        }
      }));

      core.info(`Inserting ${commentRows.length} comments/reviews...`);
      await bqClient.insertPRComments(commentRows);
      core.info('PR Comments inserted successfully.');
    } else {
      core.info('No comments to insert.');
    }

  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();

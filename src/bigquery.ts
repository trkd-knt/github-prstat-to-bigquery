import { BigQuery } from '@google-cloud/bigquery';

export class BigQueryClient {
  private bq: BigQuery;
  private datasetId: string;
  private tableId: string;
  private commentsTableId: string;

  constructor(projectId: string, datasetId: string, tableId: string, commentsTableId: string, accessToken: string) {
    this.bq = new BigQuery({
      projectId,
      accessToken: accessToken,
    } as any);
    this.datasetId = datasetId;
    this.tableId = tableId;
    this.commentsTableId = commentsTableId;
  }

  async insertPRInfo(row: { insertId: string; json: any }) {
    await this.bq
      .dataset(this.datasetId)
      .table(this.tableId)
      .insert([row], { raw: true });
  }

  async insertPRComments(rows: { insertId: string; json: any }[]) {
    if (rows.length === 0) return;
    await this.bq
      .dataset(this.datasetId)
      .table(this.commentsTableId)
      .insert(rows, { raw: true });
  }
}

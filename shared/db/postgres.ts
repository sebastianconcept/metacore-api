import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { IPostgresClient, PostgresConfig, QueryParams } from './types';

class PostgresClient implements IPostgresClient {
  private readonly pool: Pool;

  constructor(config?: Partial<PostgresConfig>) {
    this.pool = new Pool({
      host: config?.host || process.env.POSTGRES_HOST,
      port: config?.port || Number(process.env.POSTGRES_PORT) || 5432,
      user: config?.user || process.env.POSTGRES_USER,
      password: config?.password || process.env.POSTGRES_PASSWORD,
      database: config?.database || process.env.POSTGRES_DB,
      max: config?.max || 20, // máximo de conexões no pool
      idleTimeoutMillis: config?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config?.connectionTimeoutMillis || 2000,
    });

    this.pool.on('error', (err: Error) => {
      console.error('Unexpected error in PostgreSQL client', err);
    });

    console.log('PostgreSQL client initialized');
  }

  async query<T extends QueryResultRow = any>(textOrParams: string | QueryParams, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    let text: string;
    let queryParams: any[];

    if (typeof textOrParams === 'string') {
      text = textOrParams;
      queryParams = params || [];
    } else {
      text = textOrParams.text;
      queryParams = textOrParams.params || [];
    }

    try {
      const res = await this.pool.query<T>(text, queryParams);
      const duration = Date.now() - start;
      console.log('Query executed', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Error executing query', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    const client = await this.pool.connect();
    const originalQuery = client.query;
    const originalRelease = client.release;

    // Define um método de consulta monitorado
    const timeoutId = setTimeout(() => {
      console.error('A client kept verifying for more than 5 seconds!');
      console.error(`Executed query: ${(client as any).lastQuery}`);
    }, 5000);

    // Usamos cast para any para evitar problemas de tipo
    const clientAny = client as any;
    clientAny.query = function () {
      clientAny.lastQuery = arguments;
      return originalQuery.apply(client, arguments as any);
    };

    clientAny.release = function () {
      clearTimeout(timeoutId);
      clientAny.query = originalQuery;
      clientAny.release = originalRelease;
      return originalRelease.apply(client);
    };

    return client;
  }

  async transaction<T = any>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log('PostgreSQL connection closed');
  }
}

export default PostgresClient;
import PostgresClient from './postgres';
import { IPostgresClient } from './types';

// Singleton instance of the Postgres client
let postgresClient: IPostgresClient | null = null;

/**
 * Get the PostgreSQL client instance
 * Creates a singleton instance if it doesn't exist yet
 */
export function getPostgresClient(): IPostgresClient {
  if (!postgresClient) {
    postgresClient = new PostgresClient();
  }
  return postgresClient;
}

/**
 * Close the PostgreSQL client connection
 * Useful for graceful shutdown or testing
 */
export async function closePostgresClient(): Promise<void> {
  if (postgresClient) {
    await postgresClient.close();
    postgresClient = null;
  }
}
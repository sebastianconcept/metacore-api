// user-service/src/repositories/userRepository.ts
import { IPostgresClient } from '../../../shared/db/types';
import { UserRole } from '../types';
import { logger } from '../utils/logger';

// Define the User entity interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role?: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  private readonly dbClient: IPostgresClient;

  constructor(dbClient: IPostgresClient) {
    this.dbClient = dbClient;
  }

  /**
   * Initialize the repository - creates tables if they don't exist
   */
  async initialize(): Promise<void> {
    try {
      // Check if users table exists
      const tableCheck = await this.dbClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'users'
        );
      `);

      const tableExists = tableCheck.rows[0]?.exists || false;

      if (!tableExists) {
        logger.info('Creating users table...');

        // Create users table
        await this.dbClient.query(`
          CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Create index on email for faster lookups
        await this.dbClient.query(`
          CREATE INDEX idx_users_email ON users(email);
        `);

        logger.info('Users table created successfully');
      } else {
        logger.info('Users table already exists');
      }
    } catch (error) {
      logger.error('Error initializing user repository:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const result = await this.dbClient.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.dbClient.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const result = await this.dbClient.query(
        `INSERT INTO users (email, first_name, last_name, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [user.email, user.firstName, user.lastName, user.passwordHash, user.role || UserRole.USER]
      );

      return this.mapToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    try {
      // Check if user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        return null;
      }

      // Prepare update fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (userData.email !== undefined) {
        updates.push(`email = $${paramIndex}`);
        values.push(userData.email);
        paramIndex++;
      }

      if (userData.firstName !== undefined) {
        updates.push(`first_name = $${paramIndex}`);
        values.push(userData.firstName);
        paramIndex++;
      }

      if (userData.lastName !== undefined) {
        updates.push(`last_name = $${paramIndex}`);
        values.push(userData.lastName);
        paramIndex++;
      }

      if (userData.passwordHash !== undefined) {
        updates.push(`password_hash = $${paramIndex}`);
        values.push(userData.passwordHash);
        paramIndex++;
      }

      if (userData.role !== undefined) {
        updates.push(`role = $${paramIndex}`);
        values.push(userData.role);
        paramIndex++;
      }

      // Add updated_at
      updates.push(`updated_at = NOW()`);

      // Add ID at the end of values array
      values.push(id);

      const result = await this.dbClient.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      return this.mapToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.dbClient.query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // Helper method to map database row to User entity
  private mapToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      passwordHash: row.password_hash,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
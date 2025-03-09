// user-service/src/repositories/userRepository.ts
import { IPostgresClient } from '../../../shared/db/types';
import { PaginatedResponse, User, UserQueryParams, UserRole } from '../types';
import { logger } from '../utils/logger';

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
            is_active BOOL DEFAULT TRUE,
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

  /**
  * Find all users with optional filtering and pagination
  * @param queryParams Query parameters for filtering and pagination
  * @returns Paginated response of users
  */
  async findAll(queryParams?: UserQueryParams): Promise<PaginatedResponse<User>> {
    try {
      const limit = queryParams?.limit || 100;
      const offset = queryParams?.offset || 0;

      // Start with the base query for users
      let queryText = 'SELECT * FROM users';
      const queryValues: any[] = [];
      let paramIndex = 1;

      // Build the WHERE clause based on query parameters
      const conditions: string[] = [];

      // Add role filter if provided
      if (queryParams?.role !== undefined) {
        conditions.push(`role = $${paramIndex}`);
        queryValues.push(queryParams.role);
        paramIndex++;
      }

      // Add active status filter if provided
      if (queryParams?.isActive !== undefined) {
        conditions.push(`is_active = $${paramIndex}`);
        queryValues.push(queryParams.isActive);
        paramIndex++;
      }

      // Add search filter if provided (searches email, first_name, and last_name)
      if (queryParams?.search) {
        conditions.push(`(
        email ILIKE $${paramIndex} OR 
        first_name ILIKE $${paramIndex} OR 
        last_name ILIKE $${paramIndex}
      )`);
        queryValues.push(`%${queryParams.search}%`);
        paramIndex++;
      }

      // Apply WHERE clause if we have conditions
      if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
      }

      // Create a copy of the query for counting total results
      const countQueryText = queryText.replace('SELECT *', 'SELECT COUNT(*)');

      // Add pagination to the main query
      queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryValues.push(limit, offset);

      // Execute both queries in parallel
      const [usersResult, countResult] = await Promise.all([
        this.dbClient.query(queryText, queryValues),
        this.dbClient.query(countQueryText, queryValues.slice(0, paramIndex - 1)) // Exclude limit and offset params
      ]);

      // Map database rows to User objects
      const users = usersResult.rows.map(row => this.mapToUser(row));
      const total = parseInt(countResult.rows[0].count, 10);

      return {
        items: users,
        total,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error finding users:', error);
      throw error;
    }
  }

  /**
   * Count users matching the criteria
   * @param criteria Optional filtering criteria
   * @returns Total count of matching users
   */
  async countAll(criteria?: Partial<User>): Promise<number> {
    try {
      // Start with the base query
      let queryText = 'SELECT COUNT(*) as total FROM users';
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add filtering criteria if provided
      if (criteria) {
        const conditions: string[] = [];

        if (criteria.email !== undefined) {
          conditions.push(`email ILIKE $${paramIndex}`);
          queryParams.push(`%${criteria.email}%`);
          paramIndex++;
        }

        if (criteria.firstName !== undefined) {
          conditions.push(`first_name ILIKE $${paramIndex}`);
          queryParams.push(`%${criteria.firstName}%`);
          paramIndex++;
        }

        if (criteria.lastName !== undefined) {
          conditions.push(`last_name ILIKE $${paramIndex}`);
          queryParams.push(`%${criteria.lastName}%`);
          paramIndex++;
        }

        if (criteria.role !== undefined) {
          conditions.push(`role = $${paramIndex}`);
          queryParams.push(criteria.role);
          paramIndex++;
        }

        if (criteria.isActive !== undefined) {
          conditions.push(`is_active = $${paramIndex}`);
          queryParams.push(criteria.isActive);
          paramIndex++;
        }

        if (conditions.length > 0) {
          queryText += ' WHERE ' + conditions.join(' AND ');
        }
      }

      // Execute the query
      const result = await this.dbClient.query(queryText, queryParams);

      return parseInt(result.rows[0].total, 10);
    } catch (error) {
      logger.error('Error counting users:', error);
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

      if (userData.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(userData.isActive);
        paramIndex++;
      }

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
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
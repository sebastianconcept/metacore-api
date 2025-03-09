import PostgresClient from '../../../shared/db/postgres';
import { User, CreateUserDTO, UpdateUserDTO } from '../types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export class UserRepository {
  private db: PostgresClient;
  private schemaName = 'public'; // or you can create a specific schema

  constructor(db: PostgresClient) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    // Create users table if it doesn't exist
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.schemaName}.users (
        id UUID PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query<User>(
      `SELECT * FROM ${this.schemaName}.users WHERE id = $1`,
      [id]
    );

    return result.rows.length > 0 ? this.mapToUser(result.rows[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db.query<User>(
      `SELECT * FROM ${this.schemaName}.users WHERE username = $1`,
      [username]
    );

    return result.rows.length > 0 ? this.mapToUser(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query<User>(
      `SELECT * FROM ${this.schemaName}.users WHERE email = $1`,
      [email]
    );

    return result.rows.length > 0 ? this.mapToUser(result.rows[0]) : null;
  }

  async findAll(limit = 100, offset = 0): Promise<User[]> {
    const result = await this.db.query<User>(
      `SELECT * FROM ${this.schemaName}.users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(row => this.mapToUser(row));
  }

  async create(userDto: CreateUserDTO): Promise<User> {
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(userDto.password, 10);

    const result = await this.db.query<User>(
      `INSERT INTO ${this.schemaName}.users 
       (id, username, email, password, first_name, last_name, role, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
       RETURNING *`,
      [
        id,
        userDto.username,
        userDto.email,
        hashedPassword,
        userDto.firstName,
        userDto.lastName,
        userDto.role || 'user'
      ]
    );

    return this.mapToUser(result.rows[0]);
  }

  async update(id: string, userDto: UpdateUserDTO): Promise<User | null> {
    // Build the SET part of the query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (userDto.email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(userDto.email);
      paramCount++;
    }

    if (userDto.firstName !== undefined) {
      updates.push(`first_name = $${paramCount}`);
      values.push(userDto.firstName);
      paramCount++;
    }

    if (userDto.lastName !== undefined) {
      updates.push(`last_name = $${paramCount}`);
      values.push(userDto.lastName);
      paramCount++;
    }

    if (userDto.role !== undefined) {
      updates.push(`role = $${paramCount}`);
      values.push(userDto.role);
      paramCount++;
    }

    if (userDto.isActive !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(userDto.isActive);
      paramCount++;
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);

    if (updates.length === 0) {
      // No updates to perform
      return this.findById(id);
    }

    // Add the id as the last parameter
    values.push(id);

    const result = await this.db.query<User>(
      `UPDATE ${this.schemaName}.users 
       SET ${updates.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapToUser(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM ${this.schemaName}.users WHERE id = $1`,
      [id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  // Helper method to map database row to User object
  private mapToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password: row.password,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
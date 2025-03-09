import {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  UserQueryParams,
  PaginatedResponse
} from './index';
import { QueryResult, QueryResultRow } from 'pg';

/**
 * Interface for the User Repository
 */
export interface IUserRepository {
  /**
   * Initialize the repository (create tables if needed)
   */
  initialize(): Promise<void>;

  /**
   * Execute a raw SQL query
   * @param text SQL query text
   * @param params Query parameters
   * @returns Query result
   */
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;

  /**
   * Find a user by ID
   * @param id User ID
   * @returns User or null if not found
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find a user by email
   * @param email Email address
   * @returns User or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find all users with optional filtering and pagination
   * @param queryParams Query parameters
   * @returns Paginated response of users
   */
  findAll(queryParams?: UserQueryParams): Promise<PaginatedResponse<User>>;

  /**
   * Create a new user
   * @param userDto User creation data
   * @returns Created user
   */
  create(userDto: CreateUserDTO): Promise<User>;

  /**
   * Update an existing user
   * @param id User ID
   * @param userDto Update data
   * @returns Updated user or null if not found
   */
  update(id: string, userDto: UpdateUserDTO): Promise<User | null>;

  /**
   * Update a user's password
   * @param id User ID
   * @param hashedPassword New hashed password
   * @returns Updated user or null if not found
   */
  updatePassword(id: string, hashedPassword: string): Promise<User | null>;

  /**
   * Delete a user
   * @param id User ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Interface for database connection options
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Interface for repository initialization options
 */
export interface RepositoryOptions {
  schemaName?: string;
  tableName?: string;
}
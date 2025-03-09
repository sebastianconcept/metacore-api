import {
  User,
  UserDTO,
  CreateUserDTO,
  UpdateUserDTO,
  LoginCredentials,
  AuthResponse,
  UserQueryParams,
  PaginatedResponse
} from './index';

/**
 * Interface for the User Service
 */
export interface IUserService {
  /**
   * Find a user by ID
   * @param id The user ID
   * @returns The user or null if not found
   */
  findById(id: string): Promise<UserDTO | null>;

  /**
   * Find a user by email
   * @param email The email
   * @returns The user or null if not found
   */
  findByEmail(email: string): Promise<UserDTO | null>;

  /**
   * Find all users with optional filtering and pagination
   * @param queryParams Query parameters for filtering and pagination
   * @returns Paginated response of users
   */
  findAll(queryParams?: UserQueryParams): Promise<PaginatedResponse<UserDTO>>;

  /**
   * Create a new user
   * @param userDto Data for creating a new user
   * @returns The created user
   */
  createUser(userDto: CreateUserDTO): Promise<UserDTO>;

  /**
   * Update an existing user
   * @param id User ID
   * @param userDto Data to update
   * @returns The updated user or null if not found
   */
  updateUser(id: string, userDto: UpdateUserDTO): Promise<UserDTO | null>;

  /**
   * Delete a user
   * @param id User ID
   * @returns True if deleted, false if not found
   */
  deleteUser(id: string): Promise<boolean>;

  /**
   * Login a user
   * @param credentials Login credentials
   * @returns Authentication response with user data and token
   */
  login(credentials: LoginCredentials): Promise<AuthResponse>;

  /**
   * Change a user's password
   * @param id User ID
   * @param currentPassword Current password
   * @param newPassword New password
   * @returns True if password was changed
   */
  changePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean>;
}

/**
 * Interface for the JWT configuration
 */
export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

/**
 * Interface for service initialization options
 */
export interface UserServiceOptions {
  jwtConfig?: JwtConfig;
}
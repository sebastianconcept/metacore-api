// Export all types from this directory
export * from './controllers';
export * from './middleware';
export * from './repositories';
export * from './services';

// Base types

// User-related interfaces
export interface User {
  id: string;
  email: string;
  passwordHash: string; // Hashed password
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MANAGER = 'manager'
}

// Data Transfer Objects (DTOs)
export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

export interface UpdateUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

// Authentication related interfaces
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserDTO;
  token: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Query related interfaces
export interface UserQueryParams {
  limit?: number;
  offset?: number;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

// Repository related interfaces
export interface UserRepositoryOptions {
  schemaName?: string;
}

// Event related interfaces
export interface UserCreatedEvent {
  userId: string;
  email: string;
  role: UserRole;
  timestamp: string;
}

export interface UserUpdatedEvent {
  userId: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  timestamp: string;
}

export interface UserDeletedEvent {
  userId: string;
  timestamp: string;
}

export interface UserLoginEvent {
  userId: string;
  email: string;
  timestamp: string;
}

export interface UserLoginFailedEvent {
  email: string;
  timestamp: string;
}

export interface UserPasswordChangedEvent {
  userId: string;
  timestamp: string;
}

// Error interfaces
export interface ApiError {
  status: number;
  message: string;
  details?: string | string[] | Record<string, any>;
}

// Response interfaces
export interface ApiResponse<T> {
  status: number;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
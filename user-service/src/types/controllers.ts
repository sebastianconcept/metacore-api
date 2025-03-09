import { Request, Response } from 'express';
import { UserRole } from './index';

/**
 * Interface for the User Controller
 */
export interface IUserController {
  /**
   * Get all users with optional pagination
   */
  getUsers(req: Request, res: Response): Promise<void>;

  /**
   * Get a user by ID
   */
  getUserById(req: Request, res: Response): Promise<void>;

  /**
   * Create a new user
   */
  createUser(req: Request, res: Response): Promise<void>;

  /**
   * Update an existing user
   */
  updateUser(req: Request, res: Response): Promise<void>;

  /**
   * Delete a user
   */
  deleteUser(req: Request, res: Response): Promise<void>;

  /**
   * Login a user
   */
  login(req: Request, res: Response): Promise<void>;

  /**
   * Change a user's password
   */
  changePassword(req: Request, res: Response): Promise<void>;
}

/**
 * Interface for request with user information
 * Extends Express.Request with user property
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: UserRole;
  };
}

/**
 * Interface for controller error handling
 */
export interface ErrorHandler {
  (error: Error, req: Request, res: Response): void;
}

/**
 * Interface for controller configuration options
 */
export interface ControllerOptions {
  enableLogging?: boolean;
  errorHandler?: ErrorHandler;
}
// user-service/src/middleware/role.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/userRepository';
import { logger } from '../utils/logger';
import { UserRole } from '../types';
import { getPostgresClient } from '../../../shared/db/client';

/**
 * Interface for user information stored in the request object
 */
export interface UserInfo {
  id: string;
  isActive: boolean;
  email: string;
  role: UserRole;
}

// Use Express's type declaration extension
declare global {
  namespace Express {
    interface Request {
      user?: UserInfo;
    }
  }
}

/**
 * Middleware to check if a user has the required role(s) to access a route
 */
export class RoleMiddleware {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Middleware to check if the user is authenticated
   */
  public authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the token from the Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as jwt.JwtPayload;

      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Get the user from the database
      const user = await this.userRepository.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Add the user to the request object
      req.user = {
        id: user.id,
        isActive: user.isActive,
        email: user.email,
        role: user.role || UserRole.USER // Default to USER if no role is set
      };

      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };

  /**
   * Middleware to check if the user has one of the required roles
   * @param roles Array of roles that are allowed to access the route
   */
  public hasRole = (roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check if user exists and authenticate middleware has been called
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if the user's role is in the allowed roles
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This action requires one of the following roles: ${roles.join(', ')}`
        });
      }

      next();
    };
  };

  /**
   * Middleware to check if user is an admin
   */
  public isAdmin = this.hasRole([UserRole.ADMIN]);

  /**
   * Middleware to check if user is a manager
   */
  public isManager = this.hasRole([UserRole.MANAGER]);

  /**
   * Middleware to check if user owns the resource or is an admin
   * @param userIdExtractor Function to extract the resource owner's user ID from the request
   */
  public isResourceOwnerOrAdmin = (userIdExtractor: (req: Request) => string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check if user exists and authenticate middleware has been called
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user was deactivated
      if (!req.user?.isActive) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get the resource owner's user ID
      const resourceOwnerId = userIdExtractor(req);

      // Check if the user is the resource owner or has admin/manager role
      if (
        req.user.id === resourceOwnerId ||
        req.user.role === UserRole.ADMIN ||
        req.user.role === UserRole.MANAGER
      ) {
        next();
      } else {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have permission to access this resource'
        });
      }
    };
  };
}

// Initialize UserRepository with the shared postgres client
const dbClient = getPostgresClient();
// Create a singleton instance of the middleware
const userRepository = new UserRepository(dbClient);
export const roleMiddleware = new RoleMiddleware(userRepository);
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

// Extend Express Request interface to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: UserRole;
      };
    }
  }
}

export class AuthMiddleware {
  private jwtSecret: string;

  constructor(jwtSecret: string = process.env.JWT_SECRET || 'default-secret-change-me') {
    this.jwtSecret = jwtSecret;
  }

  // Middleware to authenticate requests
  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({ status: 401, message: 'No token provided' });
        return;
      }

      const parts = authHeader.split(' ');

      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        res.status(401).json({ status: 401, message: 'Token error' });
        return;
      }

      const token = parts[1];

      const decoded = jwt.verify(token, this.jwtSecret) as {
        userId: string;
        username: string;
        role: UserRole;
      };

      // Attach user info to request object
      req.user = decoded;

      next();
    } catch (error) {
      res.status(401).json({
        status: 401,
        message: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Invalid token'
      });
    }
  };

  // Middleware to check user roles
  checkRole = (roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ status: 401, message: 'Authentication required' });
        return;
      }

      if (!roles.includes(req.user.role)) {
        res.status(403).json({
          status: 403,
          message: 'Access denied',
          details: 'Insufficient permissions'
        });
        return;
      }

      next();
    };
  };
}
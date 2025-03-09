import { Request, Response, NextFunction } from 'express';
import { createHttpLoggerMiddleware } from '../../../shared/utils/logger';
import { logger } from './logger';

/**
 * HTTP logger middleware that's compatible with Express types
 * Using a more aggressive approach to bypass TypeScript incompatibilities
 */
export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Use double casting to avoid TypeScript errors with mismatched Request types
    // First cast to unknown, then to the expected function type
    const loggerMiddleware = createHttpLoggerMiddleware(logger) as unknown as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => void;

    // Call the middleware
    loggerMiddleware(req, res, next);
  } catch (error) {
    // Log any errors but continue the request
    console.error('Error in HTTP logger middleware:', error);
    next();
  }
};

/**
 * Not found middleware - for handling 404 errors
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 404,
    message: 'Resource not found',
    path: req.originalUrl
  });
};
// user-service/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  status?: number;
  code?: string;
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Unhandled error:', err);

  // Set default status code to 500 if not specified
  const statusCode = err.status || 500;

  // Send error response
  res.status(statusCode).json({
    status: statusCode,
    message: statusCode === 500 ? 'Internal server error' : err.message,
    code: err.code,
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// Middleware to validate request using express-validator
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 400,
      message: 'Validation error',
      details: errors.array()
    });
    return;
  }

  next();
};
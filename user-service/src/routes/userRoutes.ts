import express from 'express';
import { UserController } from '../controllers/userController';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { UserRole } from '../types';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware';

export function setupUserRoutes(
  userController: UserController,
  authMiddleware: AuthMiddleware
): express.Router {
  const router = express.Router();

  // Public routes
  router.post(
    '/login',
    [
      body('username').notEmpty().withMessage('Username is required'),
      body('password').notEmpty().withMessage('Password is required'),
      validateRequest
    ],
    userController.login
  );

  router.post(
    '/register',
    [
      body('username')
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
      body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is not valid'),
      body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      body('firstName').notEmpty().withMessage('First name is required'),
      body('lastName').notEmpty().withMessage('Last name is required'),
      validateRequest
    ],
    userController.createUser
  );

  // Protected routes
  router.use(authMiddleware.authenticate);

  // User profile routes
  router.get('/me', (req, res) => {
    // Get the current user's profile using their ID from the JWT token
    if (req.user?.userId) {
      // Instead of creating a new request, modify the route params
      req.params = { id: req.user.userId };
      userController.getUserById(req, res);
    } else {
      res.status(401).json({
        status: 401,
        message: 'Authentication required'
      });
    }
  });

  router.post(
    '/change-password',
    [
      body('currentPassword').notEmpty().withMessage('Current password is required'),
      body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
      validateRequest
    ],
    userController.changePassword
  );

  // Admin only routes
  router.get(
    '/',
    authMiddleware.checkRole([UserRole.ADMIN]),
    userController.getUsers
  );

  router.get(
    '/:id',
    authMiddleware.checkRole([UserRole.ADMIN]),
    userController.getUserById
  );

  router.put(
    '/:id',
    authMiddleware.checkRole([UserRole.ADMIN]),
    [
      body('email').optional().isEmail().withMessage('Invalid email format'),
      body('firstName').optional(),
      body('lastName').optional(),
      body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role'),
      body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
      validateRequest
    ],
    userController.updateUser
  );

  router.delete(
    '/:id',
    authMiddleware.checkRole([UserRole.ADMIN]),
    userController.deleteUser
  );

  return router;
}
import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { CreateUserDTO, UpdateUserDTO, LoginCredentials } from '../types';

export class UserController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  // Get all users
  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const users = await this.userService.findAll(limit, offset);
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: 'Error retrieving users',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // Get user by ID
  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      const user = await this.userService.findById(id);

      if (!user) {
        res.status(404).json({ status: 404, message: 'User not found' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: 'Error retrieving user',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // Create a new user
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: CreateUserDTO = req.body;
      const newUser = await this.userService.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      if (error instanceof Error &&
        (error.message.includes('already exists') ||
          error.message.includes('validation'))) {
        res.status(400).json({
          status: 400,
          message: 'Invalid user data',
          details: error.message
        });
        return;
      }

      res.status(500).json({
        status: 500,
        message: 'Error creating user',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // Update a user
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      const userData: UpdateUserDTO = req.body;

      const updatedUser = await this.userService.updateUser(id, userData);

      if (!updatedUser) {
        res.status(404).json({ status: 404, message: 'User not found' });
        return;
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      if (error instanceof Error &&
        (error.message.includes('not found') ||
          error.message.includes('already exists'))) {
        res.status(400).json({
          status: 400,
          message: 'Invalid update data',
          details: error.message
        });
        return;
      }

      res.status(500).json({
        status: 500,
        message: 'Error updating user',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // Delete a user
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      const deleted = await this.userService.deleteUser(id);

      if (!deleted) {
        res.status(404).json({ status: 404, message: 'User not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          status: 404,
          message: 'User not found',
          details: error.message
        });
        return;
      }

      res.status(500).json({
        status: 500,
        message: 'Error deleting user',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // User login
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const credentials: LoginCredentials = req.body;
      const authResponse = await this.userService.login(credentials);
      res.status(200).json(authResponse);
    } catch (error) {
      // For security reasons, we don't want to be too specific about auth errors
      res.status(401).json({
        status: 401,
        message: 'Authentication failed',
        details: 'Invalid email or password'
      });
    }
  };

  // Change password
  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      // userId should come from the authenticated JWT token
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ status: 401, message: 'Authentication required' });
        return;
      }

      const success = await this.userService.changePassword(userId, currentPassword, newPassword);

      if (success) {
        res.status(200).json({ message: 'Password changed successfully' });
      } else {
        res.status(400).json({ status: 400, message: 'Failed to change password' });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('incorrect')) {
        res.status(400).json({
          status: 400,
          message: 'Password change failed',
          details: error.message
        });
        return;
      }

      res.status(500).json({
        status: 500,
        message: 'Error changing password',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };
}


// Error example that will be handled:

// if (!user) {
//   const error = new Error('User not found') as AppError;
//   error.status = 404;
//   error.code = 'USER_NOT_FOUND';
//   throw error;
// }
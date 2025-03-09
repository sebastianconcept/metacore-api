// user-service/tests/middleware/auth.middleware.test.ts
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AuthMiddleware } from '../../src/middleware/authMiddleware';
import { UserRole } from '../../src/types';

type MockRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: {
    id?: string;
    email?: string;
    role?: UserRole;
    userId?: string;
  };
};

const JWT_SECRET = 'default-secret-change-me';

// Initialize Middleware
const authMiddleware = new AuthMiddleware(JWT_SECRET);

// Mock jwt
jest.mock('jsonwebtoken');

describe('Authentication Middleware', () => {
  let mockRequest: MockRequest;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    mockRequest = {
      headers: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    nextFunction = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should pass when valid token is provided', () => {
      // Arrange
      const id = 'user-123';
      const token = 'valid-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      // Mock JWT verification to return valid decoded token
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id });

      // Act
      authMiddleware.authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(mockRequest.user).toEqual({ id });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject when no authorization header is provided', () => {
      // Act
      authMiddleware.authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('token')
      }));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject when authorization header format is invalid', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'InvalidFormat token-value'
      };

      // Act
      authMiddleware.authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Token error')
      }));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject when token is invalid', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      // Mock JWT verification to throw error
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      // Act
      authMiddleware.authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(jwt.verify).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication failed')
      }));
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('checkRole', () => {
    it('should pass when user has required role', () => {
      // Arrange
      const checkAdminRole = authMiddleware.checkRole([UserRole.ADMIN]);
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN
      };

      // Act
      checkAdminRole(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of the required roles', () => {
      // Arrange
      const checkMultiRole = authMiddleware.checkRole([UserRole.ADMIN, UserRole.MANAGER]);
      mockRequest.user = {
        id: 'user-123',
        email: 'manager@example.com',
        role: UserRole.MANAGER
      };

      // Act
      checkMultiRole(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject when user is not authenticated', () => {
      // Arrange
      const checkAdminRole = authMiddleware.checkRole([UserRole.ADMIN]);
      mockRequest.user = undefined;

      // Act
      checkAdminRole(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication required')
      }));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject when user role is missing', () => {
      // Arrange
      const checkAdminRole = authMiddleware.checkRole([UserRole.ADMIN]);
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com'
        // No role specified
      };

      // Act
      checkAdminRole(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Access denied'),
        details: expect.stringContaining('Insufficient permissions')
      }));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject when user has insufficient role', () => {
      // Arrange
      const checkAdminRole = authMiddleware.checkRole([UserRole.ADMIN]);
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER // Not admin
      };

      // Act
      checkAdminRole(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Access denied'),
        details: expect.stringContaining('Insufficient permissions')
      }));
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
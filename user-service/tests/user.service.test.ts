import { UserService } from '../src/services/userService';
import { UserRepository } from '../src/repositories/userRepository';
import KafkaProducer from '../../shared/kafka/producer';
import { CreateUserDTO, UpdateUserDTO, UserRole, User } from '../src/types';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../src/repositories/userRepository');
jest.mock('../../../shared/kafka/producer');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockKafkaProducer: jest.Mocked<KafkaProducer>;
  const jwtSecret = 'test-secret';
  const jwtExpiry = '1h';

  // Sample user data for tests
  const testUser: User = {
    id: '123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: 'hashed_password',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockUserRepository = new UserRepository(null) as jest.Mocked<UserRepository>;
    mockKafkaProducer = new KafkaProducer() as jest.Mocked<KafkaProducer>;

    // Setup default mock implementations
    (mockUserRepository.findById as jest.Mock).mockResolvedValue(testUser);
    (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (mockUserRepository.create as jest.Mock).mockImplementation(async (user) => ({
      ...user,
      id: '123',
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    (mockUserRepository.update as jest.Mock).mockImplementation(async (id, data) => ({
      ...testUser,
      ...data,
      updatedAt: new Date()
    }));

    // Mock bcrypt functions
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Mock JWT functions
    (jwt.sign as jest.Mock).mockReturnValue('mock.jwt.token');

    // Create UserService instance with mocked dependencies
    userService = new UserService(
      mockUserRepository,
      mockKafkaProducer,
      jwtSecret,
      jwtExpiry
    );
  });

  describe('findById', () => {
    it('should return user by ID without password hash', async () => {
      // Act
      const result = await userService.findById('123');

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(expect.objectContaining({
        id: testUser.id,
        email: testUser.email
      }));
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null if user not found', async () => {
      // Arrange
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await userService.findById('999');

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('999');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user by email without password hash', async () => {
      // Arrange
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(testUser);

      // Act
      const result = await userService.findByEmail('test@example.com');

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(expect.objectContaining({
        id: testUser.id,
        email: testUser.email
      }));
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null if user not found', async () => {
      // Act
      const result = await userService.findByEmail('nonexistent@example.com');

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      // Arrange
      const createUserDTO: CreateUserDTO = {
        email: 'new@example.com',
        passwordHash: 'hashed_password',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.USER,
        isActive: true
      };

      // Act
      const result = await userService.createUser(createUserDTO);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mockUserRepository.create).toHaveBeenCalledWith(createUserDTO);
      expect(mockKafkaProducer.sendMessage).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({
          id: '123',
          email: 'new@example.com'
        })
      );
      expect(result).toEqual(expect.objectContaining({
        id: '123',
        email: 'new@example.com'
      }));
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw an error if email already exists', async () => {
      // Arrange
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(testUser);
      const createUserDTO: CreateUserDTO = {
        email: 'test@example.com', // Existing email
        passwordHash: 'password',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.USER,
        isActive: true
      };

      // Act & Assert
      await expect(userService.createUser(createUserDTO)).rejects.toThrow('Email already exists');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', async () => {
      // Arrange
      const updateUserDTO: UpdateUserDTO = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      // Act
      const result = await userService.updateUser('123', updateUserDTO);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
      expect(mockUserRepository.update).toHaveBeenCalledWith('123', updateUserDTO);
      expect(mockKafkaProducer.sendMessage).toHaveBeenCalledWith(
        'user.updated',
        expect.objectContaining({
          userId: '123'
        })
      );
      expect(result).toEqual(expect.objectContaining({
        id: '123',
        firstName: 'Updated',
        lastName: 'Name'
      }));
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw an error if user not found', async () => {
      // Arrange
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);
      const updateUserDTO: UpdateUserDTO = {
        firstName: 'Updated'
      };

      // Act & Assert
      await expect(userService.updateUser('999', updateUserDTO)).rejects.toThrow('User not found');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).not.toHaveBeenCalled();
    });

    it('should check email uniqueness when updating email', async () => {
      // Arrange
      const existingUser = { ...testUser, id: '456', email: 'existing@example.com' };
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(existingUser);

      const updateUserDTO: UpdateUserDTO = {
        email: 'existing@example.com' // Email already in use by another user
      };

      // Act & Assert
      await expect(userService.updateUser('123', updateUserDTO)).rejects.toThrow('Email already exists');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete an existing user', async () => {
      // Arrange
      (mockUserRepository.delete as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await userService.deleteUser('123');

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
      expect(mockUserRepository.delete).toHaveBeenCalledWith('123');
      expect(mockKafkaProducer.sendMessage).toHaveBeenCalledWith(
        'user.deleted',
        expect.objectContaining({
          userId: '123'
        })
      );
      expect(result).toBe(true);
    });

    it('should throw an error if user not found', async () => {
      // Arrange
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(userService.deleteUser('999')).rejects.toThrow('User not found');
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).not.toHaveBeenCalled();
    });

    it('should return false if delete operation fails', async () => {
      // Arrange
      (mockUserRepository.delete as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await userService.deleteUser('123');

      // Assert
      expect(mockUserRepository.delete).toHaveBeenCalledWith('123');
      expect(result).toBe(false);
    });
  });

  describe('login', () => {
    it('should authenticate user and return token', async () => {
      // Arrange
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(testUser);

      // Act
      const result = await userService.login({ email: 'test@example.com', password: 'password123' });

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).toHaveBeenCalledWith(
        'user.login',
        expect.objectContaining({
          userId: '123',
          email: 'test@example.com'
        })
      );
      expect(result).toEqual(expect.objectContaining({
        token: 'mock.jwt.token',
        user: expect.objectContaining({
          id: '123',
          email: 'test@example.com'
        })
      }));
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw error for invalid credentials', async () => {
      // Arrange
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(testUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(userService.login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow('Invalid email or password');

      expect(mockKafkaProducer.sendMessage).toHaveBeenCalledWith(
        'user.login.failed',
        expect.objectContaining({
          email: 'test@example.com'
        })
      );
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw error for inactive user', async () => {
      // Arrange
      const inactiveUser = { ...testUser, isActive: false };
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(userService.login({ email: 'test@example.com', password: 'password123' }))
        .rejects.toThrow('User account is disabled');

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(userService.login({ email: 'nonexistent@example.com', password: 'password123' }))
        .rejects.toThrow('Invalid email or password');

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Arrange
      const userId = '123';
      const currentPassword = 'oldPassword';
      const newPassword = 'newPassword';
      const hashedNewPassword = 'hashed_new_password';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedNewPassword);

      // Act
      const result = await userService.changePassword(userId, currentPassword, newPassword);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, testUser.passwordHash);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).toHaveBeenCalledWith(
        'user.password.changed',
        expect.objectContaining({
          userId: '123'
        })
      );
      expect(result).toBe(true);
    });

    it('should throw error if current password is incorrect', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(userService.changePassword('123', 'wrongPassword', 'newPassword'))
        .rejects.toThrow('Current password is incorrect');

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      // Arrange
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(userService.changePassword('999', 'currentPassword', 'newPassword'))
        .rejects.toThrow('User not found');

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).not.toHaveBeenCalled();
    });
  });
});
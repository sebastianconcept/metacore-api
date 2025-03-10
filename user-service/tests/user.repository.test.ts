import { UserService } from '../src/services/userService';
import { UserRepository } from '../src/repositories/userRepository';
import KafkaProducer from '../../shared/kafka/producer';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { CreateUserDTO, User, UserDTO, UserRole } from '../src/types';
import { IPostgresClient } from '../../shared/db/types';

// Mock dependencies
jest.mock('../src/repositories/userRepository');
jest.mock('../../shared/kafka/producer');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockKafkaProducer: jest.Mocked<KafkaProducer>;
  let mockDbClient: jest.Mocked<IPostgresClient>;
  const jwtSecret = 'test-secret';
  const jwtExpiry = '1h';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

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

    // Create mock PostgreSQL client
    mockDbClient = {
      query: jest.fn(),
      getClient: jest.fn(),
      transaction: jest.fn(),
      close: jest.fn()
    } as jest.Mocked<IPostgresClient>;

    // Create mock instances
    mockUserRepository = new UserRepository(mockDbClient) as jest.Mocked<UserRepository>;
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

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        firstName: 'Test',
        lastName: 'User'
      } as CreateUserDTO;

      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const createdUser = {
        id: '123',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);
      mockKafkaProducer.sendMessage.mockResolvedValue();

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.passwordHash, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: hashedPassword
      });
      expect(mockKafkaProducer.sendMessage).toHaveBeenCalledWith(
        'user-events',
        {
          type: 'USER_CREATED',
          data: {
            id: createdUser.id,
            email: createdUser.email,
            firstName: createdUser.firstName,
            lastName: createdUser.lastName
          }
        }
      );
      expect(result).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName
      });
    });

    it('should throw an error if user already exists', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        passwordHash: 'password123',
        firstName: 'Existing',
        lastName: 'User'
      } as CreateUserDTO;

      const existingUser = {
        id: '456',
        email: userData.email,
        firstName: 'Existing',
        lastName: 'User',
        passwordHash: 'existing_hash',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow('User with this email already exists');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate a user with valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'user@example.com',
        password: 'correct_password'
      };

      const user = {
        id: '789',
        email: credentials.email,
        firstName: 'Auth',
        lastName: 'User',
        passwordHash: 'hashed_password',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as User;

      const token = 'jwt_token';

      mockUserRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(token);

      // Act
      const result = await userService.authenticateUser(credentials);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(credentials.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, user.passwordHash);
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).toHaveBeenCalledWith(
        'user-events',
        {
          type: 'USER_LOGGED_IN',
          data: { id: user.id }
        }
      );
      expect(result).toEqual({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    });

    it('should throw an error if user not found', async () => {
      // Arrange
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.authenticateUser(credentials)).rejects.toThrow('Invalid email or password');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(credentials.email);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).not.toHaveBeenCalled();
    });

    it('should throw an error if password is incorrect', async () => {
      // Arrange
      const credentials = {
        email: 'user@example.com',
        password: 'wrong_password'
      };

      const user = {
        id: '789',
        email: credentials.email,
        firstName: 'Auth',
        lastName: 'User',
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(userService.authenticateUser(credentials)).rejects.toThrow('Invalid email or password');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(credentials.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, user.passwordHash);
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      // Arrange
      const userId = '123';
      const user = {
        id: userId,
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(user);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    });

    it('should throw an error if user not found', async () => {
      // Arrange
      const userId = 'nonexistent';

      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUserById(userId)).rejects.toThrow('User not found');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // Arrange
      const userId = '123';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const existingUser = {
        id: userId,
        email: 'user@example.com',
        firstName: 'Original',
        lastName: 'User',
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedUser = {
        ...existingUser,
        ...updateData,
        updatedAt: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);
      mockKafkaProducer.sendMessage.mockResolvedValue();

      // Act
      const result = await userService.updateUser(userId, updateData);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(mockKafkaProducer.sendMessage).toHaveBeenCalledWith(
        'user-events',
        {
          type: 'USER_UPDATED',
          data: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName
          }
        }
      );
      expect(result).toEqual({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName
      });
    });

    it('should throw an error if user not found', async () => {
      // Arrange
      const userId = 'nonexistent';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.updateUser(userId, updateData)).rejects.toThrow('User not found');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(mockKafkaProducer.sendMessage).not.toHaveBeenCalled();
    });
  });
});
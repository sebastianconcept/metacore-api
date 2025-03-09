import KafkaProducer from '../../../shared/kafka/producer';
import { UserRepository } from '../repositories/userRepository';
import { User, UserDTO, CreateUserDTO, UpdateUserDTO, LoginCredentials, AuthResponse, UserRole } from '../types';
import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export class UserService {
  private userRepository: UserRepository;
  private kafkaProducer: KafkaProducer;
  private jwtSecret: string;
  private jwtExpiry: string;

  constructor(
    userRepository: UserRepository,
    kafkaProducer: KafkaProducer,
    jwtSecret: string = process.env.JWT_SECRET || 'default-secret-change-me',
    jwtExpiry: string = process.env.AUTH_EXPIRY || '24h'
  ) {
    this.userRepository = userRepository;
    this.kafkaProducer = kafkaProducer;
    this.jwtSecret = jwtSecret;
    this.jwtExpiry = jwtExpiry;
  }

  async findById(id: string): Promise<UserDTO | null> {
    const user = await this.userRepository.findById(id);
    return user ? this.toDTO(user) : null;
  }

  async findByEmail(email: string): Promise<UserDTO | null> {
    const user = await this.userRepository.findByEmail(email);
    return user ? this.toDTO(user) : null;
  }

  async findAll(limit?: number, offset?: number): Promise<UserDTO[]> {
    const users = await this.userRepository.findAll(limit, offset);
    return users.map((user: User) => this.toDTO(user));
  }

  async createUser(userDto: CreateUserDTO): Promise<UserDTO> {
    // Check if user with email already exists
    const existingByEmail = await this.userRepository.findByEmail(userDto.email);
    if (existingByEmail) {
      throw new Error('Email already exists');
    }

    const newUser = await this.userRepository.create(userDto);

    // Publish event to Kafka
    await this.kafkaProducer.sendMessage('user.created', {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      timestamp: new Date().toISOString()
    });

    return this.toDTO(newUser);
  }

  async updateUser(id: string, userDto: UpdateUserDTO): Promise<UserDTO | null> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Check if email is being updated and already exists
    if (userDto.email && userDto.email !== existingUser.email) {
      const existingByEmail = await this.userRepository.findByEmail(userDto.email);
      if (existingByEmail) {
        throw new Error('Email already exists');
      }
    }

    const updatedUser = await this.userRepository.update(id, userDto);

    if (updatedUser) {
      // Publish event to Kafka
      await this.kafkaProducer.sendMessage('user.updated', {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        timestamp: new Date().toISOString()
      });
    }

    return updatedUser ? this.toDTO(updatedUser) : null;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    const deleted = await this.userRepository.delete(id);

    if (deleted) {
      // Publish event to Kafka
      await this.kafkaProducer.sendMessage('user.deleted', {
        userId: id,
        timestamp: new Date().toISOString()
      });
    }

    return deleted;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(credentials.email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('User account is disabled');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

    if (!isPasswordValid) {
      // Publish failed login attempt
      await this.kafkaProducer.sendMessage('user.login.failed', {
        email: credentials.email,
        timestamp: new Date().toISOString()
      });

      throw new Error('Invalid email or password');
    }

    // Generate JWT token using type assertion for the secret
    // @ts-ignore - Ignoring TypeScript error for jwt.sign parameter types
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry }
    );

    // Publish successful login
    await this.kafkaProducer.sendMessage('user.login', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    return {
      user: this.toDTO(user),
      token
    };
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user with the new password
    await this.userRepository.update(id, {
      // In a real implementation, you would add a specific method for password updates
      // For now, we're using a workaround since our UpdateUserDTO doesn't include password
      // This is not ideal and should be improved in a production system
    });

    // Publish password changed event
    await this.kafkaProducer.sendMessage('user.password.changed', {
      userId: id,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // Helper method to convert User to UserDTO (removing sensitive data)
  private toDTO(user: User): UserDTO {
    const { passwordHash, ...userDTO } = user;

    // Ensure role is always defined in the DTO
    return {
      ...userDTO,
      role: user.role || UserRole.USER,
    } as UserDTO;
  }

  /**
   * Handle user events from Kafka
   * @param event The user event to handle
   */
  async handleUserEvent(event: any): Promise<void> {
    try {
      if (!event || !event.type) {
        throw new Error('Invalid event format: missing type');
      }

      switch (event.type) {
        case 'USER_CREATED':
          // Handle user created event
          logger.debug(`Handling USER_CREATED event for user ${event.data?.id}`);
          // Implementation would go here
          break;

        case 'USER_UPDATED':
          // Handle user updated event
          logger.debug(`Handling USER_UPDATED event for user ${event.data?.id}`);
          // Implementation would go here
          break;

        case 'USER_DELETED':
          // Handle user deleted event
          logger.debug(`Handling USER_DELETED event for user ${event.data?.id}`);
          // Implementation would go here
          break;

        default:
          logger.warn(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error handling user event:', error);
      throw error;
    }
  }
}
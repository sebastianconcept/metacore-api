// user-service/tests/integration/database.test.ts
import { Pool } from 'pg';
import { UserRepository } from '../../src/repositories/userRepository';
import * as bcrypt from 'bcrypt';
import PostgresClient from '../../../shared/db/postgres';

describe('Database Integration Tests', () => {
  let testPool: Pool;
  let userRepository: UserRepository;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test database connection
    const postgresConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'admin',
      password: process.env.POSTGRES_PASSWORD || 'adminpassword',
      database: process.env.POSTGRES_TEST_DB || 'microservices_test'
    };

    // Initialize repository with test pool
    const postgresClient = new PostgresClient(postgresConfig);
    testPool = (postgresClient as any).pool;
    userRepository = new UserRepository(postgresClient);

    // Clear test data
    await testPool.query('TRUNCATE users CASCADE');
  });

  afterAll(async () => {
    // Clear test data and close pool
    await testPool.query('TRUNCATE users CASCADE');
    await testPool.end();
  });

  describe('User CRUD Operations', () => {
    it('should create a new user in the database', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('testPassword', 10);
      const userData = {
        email: 'db-test@example.com',
        firstName: 'Database',
        lastName: 'Test',
        passwordHash: hashedPassword
      };

      // Act
      const result = await userRepository.create(userData);
      testUserId = result.id;

      // Assert
      expect(result).toHaveProperty('id');
      expect(result.email).toBe(userData.email);
      expect(result.firstName).toBe(userData.firstName);
      expect(result.lastName).toBe(userData.lastName);
      expect(result.passwordHash).toBe(hashedPassword);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should find a user by ID', async () => {
      // Act
      const result = await userRepository.findById(testUserId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(testUserId);
      expect(result?.email).toBe('db-test@example.com');
    });

    it('should find a user by email', async () => {
      // Act
      const result = await userRepository.findByEmail('db-test@example.com');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(testUserId);
      expect(result?.email).toBe('db-test@example.com');
    });

    it('should return null when finding non-existent user by ID', async () => {
      // Act
      const result = await userRepository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when finding non-existent user by email', async () => {
      // Act
      const result = await userRepository.findByEmail('non-existent@example.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should update user details', async () => {
      // Arrange
      const updateData = {
        firstName: 'Updated',
        lastName: 'User'
      };

      // Act
      const result = await userRepository.update(testUserId, updateData);

      // Assert
      expect(result?.firstName).toBe(updateData.firstName);
      expect(result?.lastName).toBe(updateData.lastName);
      expect(result?.email).toBe('db-test@example.com'); // Unchanged
      expect(result?.updatedAt).toBeInstanceOf(Date);

      // Verify persistence by fetching again
      const verifiedUser = await userRepository.findById(testUserId);
      expect(verifiedUser?.firstName).toBe(updateData.firstName);
      expect(verifiedUser?.lastName).toBe(updateData.lastName);
    });

    it('should throw error when updating non-existent user', async () => {
      // Arrange
      const updateData = {
        firstName: 'NonExistent'
      };

      // Act & Assert
      await expect(userRepository.update('non-existent-id', updateData))
        .rejects.toThrow('User not found');
    });

    it('should delete a user', async () => {
      // Act
      const result = await userRepository.delete(testUserId);

      // Assert
      expect(result).toBe(true);

      // Verify user is deleted
      const deletedUser = await userRepository.findById(testUserId);
      expect(deletedUser).toBeNull();
    });

    it('should return false when deleting non-existent user', async () => {
      // Act
      const result = await userRepository.delete('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Transaction Tests', () => {
    it('should handle transactions correctly', async () => {
      // This test demonstrates ability to handle transaction scenarios
      // Start a transaction
      const client = await testPool.connect();

      try {
        await client.query('BEGIN');

        // Create a user within the transaction
        const hashedPassword = await bcrypt.hash('transactionTest', 10);
        await client.query(
          'INSERT INTO users (email, first_name, last_name, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
          ['transaction@test.com', 'Transaction', 'Test', hashedPassword]
        );

        // Check if user exists before commit
        const beforeCommit = await client.query('SELECT * FROM users WHERE email = $1', ['transaction@test.com']);
        expect(beforeCommit.rows.length).toBe(1);

        // Rollback instead of commit
        await client.query('ROLLBACK');

        // User should not exist in the database after rollback
        const result = await userRepository.findByEmail('transaction@test.com');
        expect(result).toBeNull();
      } finally {
        client.release();
      }
    });
  });

  describe('Schema Constraints', () => {
    it('should enforce email uniqueness', async () => {
      // Arrange
      const userData1 = {
        email: 'unique@test.com',
        firstName: 'First',
        lastName: 'User',
        passwordHash: await bcrypt.hash('password1', 10)
      };

      const userData2 = {
        email: 'unique@test.com', // Same email
        firstName: 'Second',
        lastName: 'User',
        passwordHash: await bcrypt.hash('password2', 10)
      };

      // Act
      await userRepository.create(userData1);

      // Assert
      await expect(userRepository.create(userData2)).rejects.toThrow();

      // Clean up
      const createdUser = await userRepository.findByEmail('unique@test.com');
      if (createdUser) {
        await userRepository.delete(createdUser.id);
      }
    });

    it('should not allow null values for required fields', async () => {
      // Arrange
      const incompleteUserData = {
        email: 'incomplete@test.com',
        firstName: 'Incomplete',
        // Missing lastName
        passwordHash: await bcrypt.hash('password', 10)
      };

      // Act & Assert - Using direct query to test DB constraints
      try {
        await testPool.query(
          'INSERT INTO users (email, first_name, password_hash) VALUES ($1, $2, $3)',
          [incompleteUserData.email, incompleteUserData.firstName, incompleteUserData.passwordHash]
        );
        fail('Should have thrown error for missing required field');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
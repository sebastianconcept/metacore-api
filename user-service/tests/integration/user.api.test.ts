// user-service/tests/integration/user.api.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { Pool } from 'pg';
import { KafkaProducer } from '../../src/messaging/kafka.producer';
import * as jwt from 'jsonwebtoken';

// Mock Kafka producer
jest.mock('../../src/messaging/kafka.producer');

// Partial mock for JWT
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn()
}));

describe('User API Integration Tests', () => {
  let mockPool: Pool;
  let testUser: { id: string; email: string; };
  let authToken: string;

  beforeAll(async () => {
    // Initialize a test database connection
    mockPool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'admin',
      password: process.env.POSTGRES_PASSWORD || 'adminpassword',
      database: process.env.POSTGRES_TEST_DB || 'microservices_test'
    });

    // Clear test database before tests
    await mockPool.query('TRUNCATE users CASCADE');

    // Setup mocks for Kafka
    (KafkaProducer as jest.Mock).mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue(undefined)
    }));

    // Inject our test pool into the app (depends on your app structure)
    (app as any).userRepository.pool = mockPool;
  });

  afterAll(async () => {
    // Clean up after tests
    await mockPool.query('TRUNCATE users CASCADE');
    await mockPool.end();
  });

  describe('User Registration and Authentication', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@integration.com',
        password: 'securePassword123',
        firstName: 'Integration',
        lastName: 'Test'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', userData.email);
      expect(response.body).toHaveProperty('firstName', userData.firstName);
      expect(response.body).toHaveProperty('lastName', userData.lastName);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');

      // Save user details for later tests
      testUser = {
        id: response.body.id,
        email: response.body.email
      };
    });

    it('should not register a user with an existing email', async () => {
      const userData = {
        email: 'test@integration.com', // Same email as the previous test
        password: 'anotherPassword',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should authenticate a valid user', async () => {
      const credentials = {
        email: 'test@integration.com',
        password: 'securePassword123'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', testUser.id);
      expect(response.body.user).toHaveProperty('email', testUser.email);

      // Save token for later tests
      authToken = response.body.token;
    });

    it('should reject authentication with wrong password', async () => {
      const credentials = {
        email: 'test@integration.com',
        password: 'wrongPassword'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject authentication with non-existent email', async () => {
      const credentials = {
        email: 'nonexistent@integration.com',
        password: 'anyPassword'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('User Profile Management', () => {
    it('should get user profile with valid token', async () => {
      // Mock the JWT verification to simulate a valid token
      (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
        userId: testUser.id
      }));

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('email', testUser.email);
    });

    it('should update user profile with valid token', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Profile'
      };

      // Mock the JWT verification
      (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
        userId: testUser.id
      }));

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('firstName', updateData.firstName);
      expect(response.body).toHaveProperty('lastName', updateData.lastName);
    });

    it('should reject profile access without valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject profile update without valid token', async () => {
      const updateData = {
        firstName: 'Unauthorized',
        lastName: 'Update'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Password Management', () => {
    it('should change password with valid credentials', async () => {
      // Mock the JWT verification
      (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
        userId: testUser.id
      }));

      const passwordData = {
        currentPassword: 'securePassword123',
        newPassword: 'newSecurePassword456'
      };

      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successfully');
    });

    it('should authenticate with the new password', async () => {
      const credentials = {
        email: 'test@integration.com',
        password: 'newSecurePassword456'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', testUser.id);

      // Update token for future tests
      authToken = response.body.token;
    });

    it('should reject password change with incorrect current password', async () => {
      // Mock the JWT verification
      (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
        userId: testUser.id
      }));

      const passwordData = {
        currentPassword: 'wrongCurrentPassword',
        newPassword: 'anotherNewPassword'
      };

      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('User Roles and Permissions', () => {
    let adminToken: string;

    it('should set admin role for a user', async () => {
      // First create an admin user
      const adminUser = {
        email: 'admin@integration.com',
        password: 'adminPassword123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      };

      const createResponse = await request(app)
        .post('/api/users/register')
        .send(adminUser)
        .expect(201);

      // Login as admin to get token
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: adminUser.email,
          password: adminUser.password
        })
        .expect(200);

      adminToken = loginResponse.body.token;

      // Mock the JWT verification to simulate admin
      (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
        userId: createResponse.body.id,
        role: 'admin'
      }));

      // Set role for the regular user
      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'manager' })
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('role', 'manager');
    });

    it('should reject role change from non-admin users', async () => {
      // Mock the JWT verification to simulate regular user
      (jwt.verify as jest.Mock).mockImplementationOnce(() => ({
        userId: testUser.id,
        role: 'manager' // Not admin
      }));

      const response = await request(app)
        .put(`/api/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('permission');
    });
  });
});
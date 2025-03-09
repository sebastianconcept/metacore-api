// shared/tests/utils/logger.test.ts
import * as winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { createLogger, createHttpLoggerMiddleware, createMorganStream } from './logger';

// Define a mock logger type that includes Jest mock properties
interface MockLogger {
  info: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
  debug: jest.Mock;
  http: jest.Mock;
}

// Mock Winston
jest.mock('winston', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn()
  };

  return {
    format: {
      combine: jest.fn().mockReturnValue({}),
      timestamp: jest.fn().mockReturnValue({}),
      colorize: jest.fn().mockReturnValue({}),
      printf: jest.fn().mockReturnValue({}),
      json: jest.fn().mockReturnValue({}),
      errors: jest.fn().mockReturnValue({}),
      splat: jest.fn().mockReturnValue({})
    },
    createLogger: jest.fn().mockReturnValue(mockLogger),
    transports: {
      Console: jest.fn().mockImplementation(() => ({})),
      File: jest.fn().mockImplementation(() => ({}))
    }
  };
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
  });

  describe('createLogger', () => {
    it('should create a logger instance with the correct service name', () => {
      // Arrange
      const serviceName = 'test-service';

      // Act
      const logger = createLogger(serviceName) as unknown as MockLogger;

      // Assert
      expect(winston.createLogger).toHaveBeenCalled();
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultMeta: { service: serviceName }
        })
      );
      expect(logger).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(serviceName));
    });

    it('should use LOG_LEVEL from environment variables if set', () => {
      // Arrange
      process.env.LOG_LEVEL = 'warn';

      // Act
      createLogger('test-service');

      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn'
        })
      );
    });

    it('should use debug level in development environment', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;

      // Act
      createLogger('test-service');

      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug'
        })
      );
    });

    it('should use info level in production environment', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;

      // Act
      createLogger('test-service');

      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info'
        })
      );
    });

    it('should add file transports in production environment', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const serviceName = 'test-service';

      // Act
      createLogger(serviceName);

      // Assert
      expect(winston.transports.File).toHaveBeenCalledTimes(2);
      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: `logs/${serviceName}/error.log`,
          level: 'error'
        })
      );
      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: `logs/${serviceName}/combined.log`
        })
      );
    });
  });

  describe('createHttpLoggerMiddleware', () => {
    it('should create middleware that logs HTTP requests', () => {
      // Arrange
      const logger = createLogger('test-service') as unknown as MockLogger;
      const middleware = createHttpLoggerMiddleware(logger as unknown as winston.Logger);

      const req = {
        method: 'GET',
        originalUrl: '/api/users',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Test User Agent')
      } as unknown as Request;

      const res = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            // Immediately call the finish callback to simulate request completion
            callback();
          }
          return res;
        })
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(logger.http).toHaveBeenCalled();
      expect(logger.http.mock.calls[0][0]).toMatch(/GET \/api\/users 200/);
    });

    it('should handle missing user-agent in requests', () => {
      // Arrange
      const logger = createLogger('test-service') as unknown as MockLogger;
      const middleware = createHttpLoggerMiddleware(logger as unknown as winston.Logger);

      const req = {
        method: 'POST',
        originalUrl: '/api/users/login',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue(null) // No user agent
      } as unknown as Request;

      const res = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            callback();
          }
          return res;
        })
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      // Act
      middleware(req, res, next);

      // Assert
      expect(logger.http).toHaveBeenCalled();
      expect(logger.http.mock.calls[0][0]).toMatch(/Unknown/);
    });
  });

  describe('createMorganStream', () => {
    it('should create a stream that writes to the logger', () => {
      // Arrange
      const logger = createLogger('test-service') as unknown as MockLogger;
      const stream = createMorganStream(logger as unknown as winston.Logger);
      const testMessage = 'Test morgan log message';

      // Act
      stream.write(testMessage + '\n'); // Morgan adds newlines

      // Assert
      expect(logger.http).toHaveBeenCalledWith(testMessage);
    });
  });
});
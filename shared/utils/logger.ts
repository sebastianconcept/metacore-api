// shared/src/utils/logger.ts
import * as winston from 'winston';
// Import the transport classes directly
import TransportStream from 'winston-transport';
// Import Express types
import { Request, Response, NextFunction } from 'express';

/**
 * Configure log levels
 */
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Log level selection based on environment
 */
const getLogLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';

  // If log level is explicitly set in environment variables, use that
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }

  return isDevelopment ? 'debug' : 'info';
};

/**
 * Create and configure a logger for a specific service
 * @param serviceName The name of the service using the logger
 * @returns Configured Winston logger instance
 */
export const createLogger = (serviceName: string) => {
  // Define formatting for console output (with colors and timestamps)
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}${info.splat !== undefined ? `${info.splat}` : ''} ${info.stack || ''
        }`
    )
  );

  // Define formatting for file output (JSON format with timestamps)
  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}${info.splat !== undefined ? `${info.splat}` : ''} ${info.stack || ''
        }`
    ),
    winston.format.json()
  );

  // Create transport options
  const transports: TransportStream[] = [];

  // Always add console transport
  transports.push(
    new winston.transports.Console({
      format: consoleFormat
    })
  );

  // Add file transports in production
  if (process.env.NODE_ENV === 'production') {
    // Create error log file
    transports.push(
      new winston.transports.File({
        filename: `logs/${serviceName}/error.log`,
        level: 'error',
        format: fileFormat,
      })
    );

    // Create combined log file
    transports.push(
      new winston.transports.File({
        filename: `logs/${serviceName}/combined.log`,
        format: fileFormat
      })
    );
  }

  // Create the logger
  const logger = winston.createLogger({
    level: getLogLevel(),
    levels: logLevels,
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports
  });

  // Log startup message
  logger.info(`Logger initialized for service: ${serviceName} with level: ${getLogLevel()}`);

  return logger;
};

/**
 * Create HTTP request logging middleware
 * @param serviceLogger The logger instance to use
 * @returns Express middleware function for HTTP logging
 */
export const createHttpLoggerMiddleware = (serviceLogger: winston.Logger) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      serviceLogger.http(
        `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms | IP: ${req.ip} | User-Agent: ${req.get('user-agent') || 'Unknown'}`
      );
    });
    next();
  };
};

/**
 * Create a stream for Morgan HTTP logger (if used)
 * @param serviceLogger The logger instance to use
 * @returns Stream that can be used with Morgan
 */
export const createMorganStream = (serviceLogger: winston.Logger) => {
  return {
    write: (message: string) => {
      serviceLogger.http(message.trim());
    },
  };
};
// user-service/src/utils/logger.ts
import { createLogger, createHttpLoggerMiddleware, createMorganStream } from '../../../shared/utils/logger';

// Create a logger instance for the user service
export const logger = createLogger('user-service');

// Create HTTP logging middleware
export const httpLoggerMiddleware = createHttpLoggerMiddleware(logger);

// Create Morgan stream if needed
export const morganStream = createMorganStream(logger);

// Re-export createLogger for other needs within this service
export { createLogger };
// user-service/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { UserRepository } from './repositories/userRepository';
import { UserService } from './services/userService';
import { UserController } from './controllers/userController';
import { AuthMiddleware } from './middleware/authMiddleware';
import { setupUserRoutes } from './routes/userRoutes';
import KafkaProducer from '../../shared/kafka/producer';
import PostgresClient from '../../shared/db/postgres';
import { httpLogger, notFoundHandler } from './utils/middlewareHelpers';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];

// Initialize Express
const app = express();

// Basic Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(httpLogger);

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Database Connection
const db = new PostgresClient();

// Initialize repositories
const userRepository = new UserRepository(db);

// Initialize Kafka Producer
const kafkaProducer = new KafkaProducer({
  brokers: KAFKA_BROKERS,
  clientId: 'user-service-producer'
});

// Initialize Services
const userService = new UserService(userRepository, kafkaProducer, JWT_SECRET);

// Initialize Controllers
const userController = new UserController(userService);

// Initialize Middleware
const authMiddleware = new AuthMiddleware(JWT_SECRET);

// Setup Routes
const routes = setupUserRoutes(userController, authMiddleware);
app.use('/api/users', routes);

// Add 404 handler for undefined routes
app.use(notFoundHandler);

// Add error handling middleware
app.use(errorHandler);

// Export for testing and server initialization
export { app, userRepository, kafkaProducer, db };
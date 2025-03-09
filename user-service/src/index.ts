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

// Load environment variables
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    // Initialize Database Connection
    const db = new PostgresClient();

    // Initialize repositories
    const userRepository = new UserRepository(db);
    await userRepository.initialize();

    // Initialize Kafka Producer
    const kafkaProducer = new KafkaProducer({
      brokers: KAFKA_BROKERS,
      clientId: 'user-service-producer'
    });
    await kafkaProducer.connect();

    // Initialize Services
    const userService = new UserService(userRepository, kafkaProducer, JWT_SECRET);

    // Initialize Controllers
    const userController = new UserController(userService);

    // Initialize Middleware
    const authMiddleware = new AuthMiddleware(JWT_SECRET);

    // Setup Routes
    const routes = setupUserRoutes(userController, authMiddleware);
    app.use('/api/users', routes);

    // Add error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    // Start server
    app.listen(PORT, HOST, () => {
      console.log(`User Service running on http://${HOST}:${PORT}`);
    });

    // Setup graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received, closing connections...');
      await kafkaProducer.disconnect();
      await db.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
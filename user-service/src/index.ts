// user-service/src/index.ts
import { app, db, kafkaProducer, userRepository } from './app';
import { logger } from './utils/logger';

// Load environment variables
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    // Initialize the repository
    await userRepository.initialize();

    // Connect to Kafka
    await kafkaProducer.connect();

    // Start server
    app.listen(PORT, HOST, () => {
      logger.info(`User Service running on http://${HOST}:${PORT}`);
    });

    // Setup graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received, closing connections...');
      await kafkaProducer.disconnect();
      await db.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
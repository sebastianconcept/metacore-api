import { Kafka } from 'kafkajs';
import { createLogger } from '../shared/utils/logger';

// Initialize logger
const logger = createLogger('kafka-setup');

interface KafkaTopicConfig {
  topic: string;
  numPartitions: number;
  replicationFactor: number;
}

// List of topics grouped by domain
const topics: KafkaTopicConfig[] = [
  // Payment service topics
  { topic: 'payments.transaction.created', numPartitions: 3, replicationFactor: 1 },
  { topic: 'payments.transaction.updated', numPartitions: 3, replicationFactor: 1 },
  { topic: 'payments.transaction.completed', numPartitions: 3, replicationFactor: 1 },
  { topic: 'payments.transaction.failed', numPartitions: 3, replicationFactor: 1 },
  { topic: 'payments.refund.created', numPartitions: 3, replicationFactor: 1 },
  { topic: 'payments.refund.completed', numPartitions: 3, replicationFactor: 1 },

  // Sales service topics
  { topic: 'sales.order.created', numPartitions: 3, replicationFactor: 1 },
  { topic: 'sales.order.updated', numPartitions: 3, replicationFactor: 1 },
  { topic: 'sales.order.completed', numPartitions: 3, replicationFactor: 1 },
  { topic: 'sales.order.cancelled', numPartitions: 3, replicationFactor: 1 },
  { topic: 'sales.checkout.started', numPartitions: 3, replicationFactor: 1 },
  { topic: 'sales.checkout.completed', numPartitions: 3, replicationFactor: 1 },
  { topic: 'sales.promotion.applied', numPartitions: 3, replicationFactor: 1 },

  // Purchasing service topics
  { topic: 'purchasing.order.created', numPartitions: 3, replicationFactor: 1 },
  { topic: 'purchasing.order.updated', numPartitions: 3, replicationFactor: 1 },
  { topic: 'purchasing.order.completed', numPartitions: 3, replicationFactor: 1 },
  { topic: 'purchasing.goods.received', numPartitions: 3, replicationFactor: 1 },
  { topic: 'purchasing.supplier.updated', numPartitions: 3, replicationFactor: 1 },

  // Inventory service topics
  { topic: 'inventory.stock.updated', numPartitions: 3, replicationFactor: 1 },
  { topic: 'inventory.stock.low', numPartitions: 3, replicationFactor: 1 },
  { topic: 'inventory.transfer.created', numPartitions: 3, replicationFactor: 1 },
  { topic: 'inventory.transfer.completed', numPartitions: 3, replicationFactor: 1 },
  { topic: 'inventory.adjustment.created', numPartitions: 3, replicationFactor: 1 },

  // Customer service topics
  { topic: 'customer.profile.created', numPartitions: 3, replicationFactor: 1 },
  { topic: 'customer.profile.updated', numPartitions: 3, replicationFactor: 1 },
  { topic: 'customer.browsing.recorded', numPartitions: 3, replicationFactor: 1 },
  { topic: 'customer.preference.updated', numPartitions: 3, replicationFactor: 1 },
  { topic: 'customer.loyalty.points.added', numPartitions: 3, replicationFactor: 1 },
  { topic: 'customer.loyalty.reward.redeemed', numPartitions: 3, replicationFactor: 1 },

  // User service topics
  { topic: 'user.created', numPartitions: 3, replicationFactor: 1 },
  { topic: 'user.updated', numPartitions: 3, replicationFactor: 1 },
  { topic: 'user.deleted', numPartitions: 3, replicationFactor: 1 },
  { topic: 'user.login', numPartitions: 3, replicationFactor: 1 },
  { topic: 'user.login.failed', numPartitions: 3, replicationFactor: 1 },
  { topic: 'user.password.changed', numPartitions: 3, replicationFactor: 1 },
  { topic: 'user.password.reset.requested', numPartitions: 3, replicationFactor: 1 }
];

// Connect to Kafka
const kafka = new Kafka({
  clientId: 'kafka-setup',
  brokers: ['kafka:29092']
});

const admin = kafka.admin();

// Create topics
async function createTopics(): Promise<void> {
  try {
    logger.info('Connecting to Kafka...');
    await admin.connect();
    logger.info('Connected to Kafka');

    logger.info('Creating topics...');
    await admin.createTopics({
      topics,
      waitForLeaders: true,
    });

    logger.info('Topics created successfully');
  } catch (error) {
    logger.error('Error creating topics:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await admin.disconnect();
    logger.info('Disconnected from Kafka');
  }
}

// Run the async function
createTopics().catch(error => {
  logger.error('Failed to create Kafka topics:', error);
  process.exit(1);
});
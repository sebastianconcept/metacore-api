import { Kafka, Consumer, KafkaMessage } from 'kafkajs';
import {
  KafkaConsumerConfig,
  MessageHandler,
  MessageMetadata
} from './types';
import { createLogger } from '../utils/logger';

// Initialize logger
const logger = createLogger('kafka-consumer');

class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected: boolean = false;
  private eventHandlers = new Map<string, MessageHandler>();

  constructor(config?: Partial<KafkaConsumerConfig>) {
    const brokers = config?.brokers || process.env.KAFKA_BROKERS?.split(',') || [];
    const clientId = config?.clientId || `consumer-${process.env.SERVICE_NAME || 'generic'}`;
    const groupId = config?.groupId || `${process.env.SERVICE_NAME || 'generic'}-group`;

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 10
      }
    });

    this.consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1024 * 1024 * 2, // 2MB
      maxWaitTimeInMs: 1000
    });

    logger.info(`KafkaConsumer initialized with clientId: ${clientId}, groupId: ${groupId}`);
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.consumer.connect();
        this.isConnected = true;
        logger.info('Kafka consumer successfully connected');
      } catch (error) {
        logger.error('Error while connecting Kafka consumer', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.consumer.disconnect();
        this.isConnected = false;
        logger.info('Kafka consumer successfully disconnected');
      } catch (error) {
        logger.error('Error while disconnecting Kafka consumer', error);
        throw error;
      }
    }
  }

  addTopicHandler<T = any>(topic: string, handler: MessageHandler<T>): void {
    this.eventHandlers.set(topic, handler as MessageHandler);
    logger.info(`Handler added for topic: ${topic}`);
  }

  async removeTopicHandler(topic: string): Promise<void> {
    if (this.eventHandlers.has(topic)) {
      this.eventHandlers.delete(topic);
      if (this.isConnected) {
        try {
          await this.consumer.stop();
          // Recriar subscrições sem o tópico removido
          for (const topic of this.eventHandlers.keys()) {
            await this.subscribeToTopic(topic);
          }
          await this.consumer.run({ eachMessage: this.processMessage.bind(this) });
        } catch (error) {
          logger.error(`Error while removing topic handler for ${topic}`, error);
          throw error;
        }
      }
      logger.info(`Handler successfully removed for topic: ${topic}`);
    }
  }

  async subscribeToTopic(topic: string, fromBeginning = false): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.consumer.subscribe({ topic, fromBeginning });
      logger.info(`Subscribed to topic: ${topic}, fromBeginning: ${fromBeginning}`);
    } catch (error) {
      logger.error(`Error while trying to subscribe to topic ${topic}`, error);
      throw error;
    }
  }

  async startConsuming(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.consumer.run({
        eachMessage: this.processMessage.bind(this),
      });
      logger.info('Kafka consumer started');
    } catch (error) {
      logger.error('Error starting Kafka consumer', error);
      throw error;
    }
  }

  private async processMessage({ topic, partition, message }: {
    topic: string;
    partition: number;
    message: KafkaMessage;
  }): Promise<void> {
    const handler = this.eventHandlers.get(topic);

    if (!handler) {
      logger.warn(`No handler found for topic: ${topic}`);
      return;
    }

    try {
      // Parse message value
      const valueString = message.value?.toString();
      const data = valueString ? JSON.parse(valueString) : null;

      // Extract headers
      const headers: Record<string, string> = {};
      if (message.headers) {
        for (const [key, value] of Object.entries(message.headers)) {
          if (value !== null && value !== undefined) {
            headers[key] = Buffer.isBuffer(value) ? value.toString() : String(value);
          }
        }
      }

      // Create metadata
      const metadata: MessageMetadata = {
        topic,
        partition,
        timestamp: message.timestamp,
        headers,
        messageId: headers.messageId
      };

      // Process message
      await handler(data, metadata);
    } catch (error) {
      logger.error(`Error while processing message in topic ${topic}`, error);
      // Here you might want to implement a dead-letter queue or a retry mechanism
    }
  }
}

export default KafkaConsumer;
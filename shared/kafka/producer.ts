import { Kafka, Producer, RecordMetadata, TopicMessages } from 'kafkajs';
import {
  KafkaProducerConfig,
  KafkaMessageHeaders,
  TopicMessage
} from './types';
import { createLogger } from '../utils/logger';

// Initialize logger
const logger = createLogger('kafka-producer');

class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected: boolean = false;

  constructor(config?: Partial<KafkaProducerConfig>) {
    const brokers = config?.brokers || process.env.KAFKA_BROKERS?.split(',') || [];
    const clientId = config?.clientId || `producer-${process.env.SERVICE_NAME || 'generic'}`;

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.producer = this.kafka.producer();
    logger.info(`KafkaProducer initialized with clientId: ${clientId}`);
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.producer.connect();
        this.isConnected = true;
        logger.info('Kafka producer successfully connected');
      } catch (error) {
        logger.error('Error connecting Kafka producer', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.producer.disconnect();
        this.isConnected = false;
        logger.info('Kafka producer successfully disconnected');
      } catch (error) {
        logger.error('Error disconnecting Kafka producer', error);
        throw error;
      }
    }
  }

  async sendMessage<T>(
    topic: string,
    message: T,
    key?: string,
    headers?: KafkaMessageHeaders
  ): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    const timestamp = Date.now().toString();

    try {
      // Preparando a mensagem
      const kafkaMessage = {
        key: key ? key.toString() : undefined,
        value: JSON.stringify(message),
        headers: {
          ...headers,
          timestamp,
          messageId: `${topic}-${key || 'nokey'}-${timestamp}`
        },
      };

      // Enviando a mensagem
      const metadata = await this.producer.send({
        topic,
        messages: [kafkaMessage],
      });

      logger.debug(`Message sent to topic ${topic}`, { key, metadata });
      return metadata;
    } catch (error) {
      logger.error(`Error sending message to topic ${topic}`, error);
      throw error;
    }
  }

  async sendBatch<T>(topicMessages: TopicMessage<T>[]): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const timestamp = Date.now().toString();

      // Preparando o lote de mensagens
      const messages: TopicMessages[] = topicMessages.map(({ topic, message, key, headers }) => ({
        topic,
        messages: [{
          key: key ? key.toString() : undefined,
          value: JSON.stringify(message),
          headers: {
            ...headers,
            timestamp,
            messageId: `${topic}-${key || 'nokey'}-${timestamp}`
          },
        }]
      }));

      // Enviando o lote
      const metadata = await this.producer.sendBatch({ topicMessages: messages });
      logger.debug('Message batch successfully sent', metadata);
      return metadata;
    } catch (error) {
      logger.error('Error while sending messages batch', error);
      throw error;
    }
  }
}

export default KafkaProducer;
// user-service/tests/messaging/kafka.producer.test.ts
import { KafkaProducer } from '../../src/messaging/kafka.producer';
import { Kafka, Producer } from 'kafkajs';

// Mock kafkajs
jest.mock('kafkajs');

describe('KafkaProducer', () => {
  let kafkaProducer: KafkaProducer;
  let mockKafka: jest.Mocked<Kafka>;
  let mockProducer: jest.Mocked<Producer>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Kafka mocks
    mockProducer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue({
        topicName: 'test-topic',
        partition: 0,
        errorCode: 0
      }),
      on: jest.fn(),
      transaction: jest.fn(),
      sendBatch: jest.fn(),
      events: {
        CONNECT: 'producer.connect',
        DISCONNECT: 'producer.disconnect'
      }
    } as unknown as jest.Mocked<Producer>;

    mockKafka = {
      producer: jest.fn().mockReturnValue(mockProducer)
    } as unknown as jest.Mocked<Kafka>;

    (Kafka as unknown as jest.Mock).mockImplementation(() => mockKafka);

    // Create the KafkaProducer instance
    kafkaProducer = new KafkaProducer();
  });

  describe('connect', () => {
    it('should connect to Kafka successfully', async () => {
      // Act
      await kafkaProducer.connect();

      // Assert
      expect(mockKafka.producer).toHaveBeenCalled();
      expect(mockProducer.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      // Arrange
      const connectionError = new Error('Connection failed');
      mockProducer.connect.mockRejectedValueOnce(connectionError);

      // Act & Assert
      await expect(kafkaProducer.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Kafka', async () => {
      // Arrange
      await kafkaProducer.connect();

      // Act
      await kafkaProducer.disconnect();

      // Assert
      expect(mockProducer.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnection when not connected', async () => {
      // Act
      await kafkaProducer.disconnect();

      // Assert
      expect(mockProducer.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should send message to Kafka topic', async () => {
      // Arrange
      await kafkaProducer.connect();
      const topic = 'test-topic';
      const message = { type: 'TEST_EVENT', data: { id: '123' } };

      // Act
      await kafkaProducer.sendMessage(topic, message);

      // Assert
      expect(mockProducer.sen
// user-service/tests/integration/kafka.producer.test.ts
import KafkaProducer from '../../../shared/kafka/producer';
import { Kafka, Producer, RecordMetadata } from 'kafkajs';

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
      send: jest.fn().mockResolvedValue([{
        topicName: 'test-topic',
        partition: 0,
        errorCode: 0,
        baseOffset: '0',
        logAppendTime: '-1',
        logStartOffset: '0'
      }]),
      sendBatch: jest.fn().mockResolvedValue([{
        topicName: 'test-topic',
        partition: 0,
        errorCode: 0,
        baseOffset: '0',
        logAppendTime: '-1',
        logStartOffset: '0'
      }]),
      on: jest.fn(),
      transaction: jest.fn(),
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
    kafkaProducer = new KafkaProducer({
      brokers: ['localhost:9092'],
      clientId: 'test-producer'
    });
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

    it('should not reconnect if already connected', async () => {
      // Arrange
      await kafkaProducer.connect();
      mockProducer.connect.mockClear();

      // Act
      await kafkaProducer.connect();

      // Assert
      expect(mockProducer.connect).not.toHaveBeenCalled();
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
      const key = 'test-key';
      const headers = { correlationId: 'abc123' };

      // Act
      const result = await kafkaProducer.sendMessage(topic, message, key, headers);

      // Assert
      expect(mockProducer.send).toHaveBeenCalledWith({
        topic,
        messages: [
          expect.objectContaining({
            key: 'test-key',
            value: JSON.stringify(message),
            headers: expect.objectContaining({
              ...headers,
              timestamp: expect.any(String),
              messageId: expect.stringContaining('test-topic-test-key')
            })
          })
        ]
      });
      expect(result).toEqual([{
        topicName: 'test-topic',
        partition: 0,
        errorCode: 0,
        baseOffset: '0',
        logAppendTime: '-1',
        logStartOffset: '0'
      }]);
    });

    it('should connect automatically if not connected', async () => {
      // Arrange
      const topic = 'test-topic';
      const message = { type: 'TEST_EVENT', data: { id: '123' } };

      // Act
      await kafkaProducer.sendMessage(topic, message);

      // Assert
      expect(mockProducer.connect).toHaveBeenCalled();
      expect(mockProducer.send).toHaveBeenCalled();
    });

    it('should handle sending errors', async () => {
      // Arrange
      await kafkaProducer.connect();
      const sendError = new Error('Send failed');
      mockProducer.send.mockRejectedValueOnce(sendError);
      const topic = 'test-topic';
      const message = { type: 'TEST_EVENT', data: { id: '123' } };

      // Act & Assert
      await expect(kafkaProducer.sendMessage(topic, message)).rejects.toThrow('Send failed');
    });
  });

  describe('sendBatch', () => {
    it('should send batch of messages to Kafka', async () => {
      // Arrange
      await kafkaProducer.connect();
      const messages = [
        {
          topic: 'topic1',
          message: { type: 'EVENT1', data: { id: '123' } },
          key: 'key1',
          headers: { correlationId: 'abc123' }
        },
        {
          topic: 'topic2',
          message: { type: 'EVENT2', data: { id: '456' } },
          key: 'key2',
          headers: { correlationId: 'def456' }
        }
      ];

      // Act
      const result = await kafkaProducer.sendBatch(messages);

      // Assert
      expect(mockProducer.sendBatch).toHaveBeenCalledWith({
        topicMessages: expect.arrayContaining([
          expect.objectContaining({
            topic: 'topic1',
            messages: [expect.objectContaining({
              key: 'key1',
              value: JSON.stringify(messages[0].message)
            })]
          }),
          expect.objectContaining({
            topic: 'topic2',
            messages: [expect.objectContaining({
              key: 'key2',
              value: JSON.stringify(messages[1].message)
            })]
          })
        ])
      });
      expect(result).toEqual([{
        topicName: 'test-topic',
        partition: 0,
        errorCode: 0,
        baseOffset: '0',
        logAppendTime: '-1',
        logStartOffset: '0'
      }]);
    });

    it('should connect automatically if not connected for batch sending', async () => {
      // Arrange
      const messages = [
        {
          topic: 'topic1',
          message: { type: 'EVENT1', data: { id: '123' } }
        }
      ];

      // Act
      await kafkaProducer.sendBatch(messages);

      // Assert
      expect(mockProducer.connect).toHaveBeenCalled();
      expect(mockProducer.sendBatch).toHaveBeenCalled();
    });

    it('should handle batch sending errors', async () => {
      // Arrange
      await kafkaProducer.connect();
      const sendError = new Error('Batch send failed');
      mockProducer.sendBatch.mockRejectedValueOnce(sendError);
      const messages = [
        {
          topic: 'topic1',
          message: { type: 'EVENT1', data: { id: '123' } }
        }
      ];

      // Act & Assert
      await expect(kafkaProducer.sendBatch(messages)).rejects.toThrow('Batch send failed');
    });
  });
});
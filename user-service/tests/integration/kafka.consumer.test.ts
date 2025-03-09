// user-service/tests/integration/kafka.consumer.test.ts
import KafkaConsumer from '../../../shared/kafka/consumer';
import KafkaProducer from '../../../shared/kafka/producer';
import { UserService } from '../../src/services/userService';
import { UserRepository } from '../../src/repositories/userRepository';
import { getPostgresClient } from '../../../shared/db/client';
import { v4 as uuidv4 } from 'uuid';

// Create unique topics for each test run to avoid conflicts
const testTopic = `test-topic-${uuidv4()}`;

// Default JWT config for testing
const JWT_SECRET = 'test-jwt-secret';
const JWT_EXPIRY = '1h';

describe('KafkaConsumer Integration Tests', () => {
  let kafkaConsumer: KafkaConsumer;
  let kafkaProducer: KafkaProducer;
  let userService: UserService;
  let userRepository: UserRepository;

  beforeAll(async () => {
    // Get the postgres client to use with the repository
    const dbClient = getPostgresClient();

    // Create actual instances of classes
    userRepository = new UserRepository(dbClient);

    // Create the Kafka producer first since UserService needs it
    kafkaProducer = new KafkaProducer({
      clientId: 'test-producer',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
    });
    await kafkaProducer.connect();

    // Now create the user service with all required dependencies
    userService = new UserService(userRepository, kafkaProducer, JWT_SECRET, JWT_EXPIRY);

    // Create and connect Kafka consumer
    kafkaConsumer = new KafkaConsumer({
      groupId: `test-consumer-${uuidv4()}`, // Unique group ID to avoid consumer conflicts
      clientId: 'test-consumer',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
    });
    await kafkaConsumer.connect();

    // Subscribe to the test topic
    await kafkaConsumer.subscribeToTopic(testTopic, true);

    // Add userService as the handler for the test topic
    kafkaConsumer.addTopicHandler(testTopic, userService.handleUserEvent.bind(userService));

    // Start consuming messages
    await kafkaConsumer.startConsuming();

    // Wait for a bit to make sure consumer has time to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000); // Increase timeout for Kafka connection

  afterAll(async () => {
    // Clean up connections
    await kafkaConsumer.disconnect();
    await kafkaProducer.disconnect();
  }, 10000); // Increase timeout for cleanup

  it('should process a user event message correctly', async () => {
    // Arrange
    const userId = uuidv4();
    const mockUserEvent = {
      type: 'USER_UPDATED',
      data: {
        id: userId,
        firstName: 'Integration',
        lastName: 'Test'
      }
    };

    // Spy on user service method to verify it's called correctly
    const handleUserEventSpy = jest.spyOn(userService, 'handleUserEvent')
      .mockResolvedValue(undefined);

    // Act
    await kafkaProducer.sendMessage(testTopic, mockUserEvent);

    // Wait for the message to be processed
    // This is a bit tricky in integration tests - we need to wait a reasonable amount of time
    // for the message to be processed by the consumer
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Assert
    expect(handleUserEventSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: mockUserEvent.type,
      data: expect.objectContaining({
        id: userId
      })
    }), expect.anything()); // expect.anything() for the metadata parameter

    // Cleanup
    handleUserEventSpy.mockRestore();
  }, 20000); // Increase timeout for message processing

  it('should handle invalid message format gracefully', async () => {
    // Arrange
    const invalidMessage = "Not a valid JSON message";
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    // Act
    await kafkaProducer.sendMessage(testTopic, invalidMessage as any);

    // Wait for the message to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Assert
    expect(consoleSpy).toHaveBeenCalled();

    // Cleanup
    consoleSpy.mockRestore();
  }, 10000);

  it('should continue processing messages after an error', async () => {
    // Arrange
    const userId1 = uuidv4();
    const userId2 = uuidv4();

    const errorMessage = {
      type: 'USER_UPDATED',
      data: { id: userId1 }
    };

    const validMessage = {
      type: 'USER_UPDATED',
      data: { id: userId2 }
    };

    // First message will throw an error
    const handleUserEventSpy = jest.spyOn(userService, 'handleUserEvent')
      .mockImplementationOnce(() => { throw new Error('Test error'); })
      .mockResolvedValueOnce(undefined);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    // Act
    await kafkaProducer.sendMessage(testTopic, errorMessage);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await kafkaProducer.sendMessage(testTopic, validMessage);

    // Wait for both messages to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Assert
    expect(consoleSpy).toHaveBeenCalled();
    expect(handleUserEventSpy).toHaveBeenCalledTimes(2);
    expect(handleUserEventSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'USER_UPDATED',
        data: expect.objectContaining({
          id: userId2
        })
      }),
      expect.anything() // For the metadata parameter
    );

    // Cleanup
    handleUserEventSpy.mockRestore();
    consoleSpy.mockRestore();
  }, 15000);
});
import { Kafka, Producer, RecordMetadata, TopicMessages } from 'kafkajs';
import {
  KafkaProducerConfig,
  KafkaMessageHeaders,
  TopicMessage
} from './types';

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
    console.log(`KafkaProducer inicializado com clientId: ${clientId}`);
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.producer.connect();
        this.isConnected = true;
        console.log('Produtor Kafka conectado com sucesso');
      } catch (error) {
        console.error('Erro ao conectar o produtor Kafka', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.producer.disconnect();
        this.isConnected = false;
        console.log('Produtor Kafka desconectado com sucesso');
      } catch (error) {
        console.error('Erro ao desconectar o produtor Kafka', error);
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

      console.log(`Mensagem enviada para o tópico ${topic}`, { key, metadata });
      return metadata;
    } catch (error) {
      console.error(`Erro ao enviar mensagem para o tópico ${topic}`, error);
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
      console.log('Lote de mensagens enviado com sucesso', metadata);
      return metadata;
    } catch (error) {
      console.error('Erro ao enviar lote de mensagens', error);
      throw error;
    }
  }
}

export default KafkaProducer;
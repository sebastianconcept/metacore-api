import { exec } from 'child_process';

interface KafkaTopicConfig {
  name: string;
  partitions: number;
  replicationFactor: number;
}

// Topic list grouped by domain
const topics: KafkaTopicConfig[] = [
  // Payments service topics
  { name: 'payments.transaction.created', partitions: 3, replicationFactor: 1 },
  { name: 'payments.transaction.updated', partitions: 3, replicationFactor: 1 },
  { name: 'payments.transaction.completed', partitions: 3, replicationFactor: 1 },
  { name: 'payments.transaction.failed', partitions: 3, replicationFactor: 1 },
  { name: 'payments.refund.created', partitions: 3, replicationFactor: 1 },
  { name: 'payments.refund.completed', partitions: 3, replicationFactor: 1 },

  // Sales service topics
  { name: 'sales.order.created', partitions: 3, replicationFactor: 1 },
  { name: 'sales.order.updated', partitions: 3, replicationFactor: 1 },
  { name: 'sales.order.completed', partitions: 3, replicationFactor: 1 },
  { name: 'sales.order.cancelled', partitions: 3, replicationFactor: 1 },
  { name: 'sales.checkout.started', partitions: 3, replicationFactor: 1 },
  { name: 'sales.checkout.completed', partitions: 3, replicationFactor: 1 },
  { name: 'sales.promotion.applied', partitions: 3, replicationFactor: 1 },

  // Purchasing service topics
  { name: 'purchasing.order.created', partitions: 3, replicationFactor: 1 },
  { name: 'purchasing.order.updated', partitions: 3, replicationFactor: 1 },
  { name: 'purchasing.order.completed', partitions: 3, replicationFactor: 1 },
  { name: 'purchasing.goods.received', partitions: 3, replicationFactor: 1 },
  { name: 'purchasing.supplier.updated', partitions: 3, replicationFactor: 1 },

  // Inventory service topics
  { name: 'inventory.stock.updated', partitions: 3, replicationFactor: 1 },
  { name: 'inventory.stock.low', partitions: 3, replicationFactor: 1 },
  { name: 'inventory.transfer.created', partitions: 3, replicationFactor: 1 },
  { name: 'inventory.transfer.completed', partitions: 3, replicationFactor: 1 },
  { name: 'inventory.adjustment.created', partitions: 3, replicationFactor: 1 },

  // Customer activity service topics 
  { name: 'customer.profile.created', partitions: 3, replicationFactor: 1 },
  { name: 'customer.profile.updated', partitions: 3, replicationFactor: 1 },
  { name: 'customer.browsing.recorded', partitions: 3, replicationFactor: 1 },
  { name: 'customer.preference.updated', partitions: 3, replicationFactor: 1 },
  { name: 'customer.loyalty.points.added', partitions: 3, replicationFactor: 1 },
  { name: 'customer.loyalty.reward.redeemed', partitions: 3, replicationFactor: 1 },

  // User service topics
  { name: 'user.created', partitions: 3, replicationFactor: 1 },
  { name: 'user.updated', partitions: 3, replicationFactor: 1 },
  { name: 'user.deleted', partitions: 3, replicationFactor: 1 },
  { name: 'user.login', partitions: 3, replicationFactor: 1 },
  { name: 'user.login.failed', partitions: 3, replicationFactor: 1 },
  { name: 'user.password.changed', partitions: 3, replicationFactor: 1 },
  { name: 'user.password.reset.requested', partitions: 3, replicationFactor: 1 }
];

// Criar cada tópico
topics.forEach(topic => {
  const command = `kafka-topics --create --bootstrap-server kafka:29092 --replication-factor ${topic.replicationFactor} --partitions ${topic.partitions} --topic ${topic.name} --if-not-exists`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao criar tópico ${topic.name}: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }

    console.log(`Tópico criado com sucesso: ${topic.name}`);
    console.log(`Stdout: ${stdout}`);
  });
});

console.log('Script de criação de tópicos concluído');
// Configurações comuns
export interface KafkaConfig {
  brokers: string[];
  clientId: string;
}

export interface KafkaConsumerConfig extends KafkaConfig {
  groupId: string;
  fromBeginning?: boolean;
}

export interface KafkaProducerConfig extends KafkaConfig {
  // Configurações específicas do produtor
}

// Definições de tipos para mensagens
export interface KafkaMessageHeaders {
  [key: string]: string;
}

export interface KafkaMessage<T = any> {
  key?: string;
  value: T;
  headers?: KafkaMessageHeaders;
}

export interface TopicMessage<T = any> {
  topic: string;
  message: T;
  key?: string;
  headers?: KafkaMessageHeaders;
}

// Tipos para o manipulador de mensagens
export type MessageHandler<T = any> = (message: T, metadata: MessageMetadata) => Promise<void>;

export interface MessageMetadata {
  topic: string;
  partition: number;
  messageId?: string;
  timestamp?: string;
  headers?: KafkaMessageHeaders;
}

// Domínios de eventos

// Pagamentos
export interface PaymentTransactionEvent {
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  gatewayReference?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentRefundEvent {
  refundId: string;
  transactionId: string;
  amount: number;
  reason?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Vendas
export interface SalesOrderEvent {
  orderId: string;
  customerId: string;
  totalAmount: number;
  status: 'created' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutEvent {
  sessionId: string;
  customerId: string;
  orderId?: string;
  status: 'started' | 'payment_pending' | 'payment_completed' | 'completed' | 'abandoned';
  totalAmount: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Compras
export interface PurchaseOrderEvent {
  orderId: string;
  supplierId: string;
  totalAmount: number;
  status: 'created' | 'approved' | 'sent' | 'received' | 'cancelled';
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
  expectedDeliveryDate?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface GoodsReceivedEvent {
  receiptId: string;
  orderId: string;
  receivedDate: string;
  items: Array<{
    productId: string;
    quantity: number;
    condition: 'good' | 'damaged' | 'wrong_item';
  }>;
  notes?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Inventário
export interface StockUpdateEvent {
  productId: string;
  locationId: string;
  previousQuantity: number;
  newQuantity: number;
  reason: 'sale' | 'purchase' | 'return' | 'adjustment' | 'transfer';
  referenceId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface StockTransferEvent {
  transferId: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  status: 'initiated' | 'in_transit' | 'completed' | 'cancelled';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Cliente
export interface CustomerProfileEvent {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate?: string;
  action: 'created' | 'updated' | 'deleted';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerBrowsingEvent {
  customerId: string;
  sessionId: string;
  productId: string;
  action: 'view' | 'add_to_cart' | 'remove_from_cart';
  duration?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerLoyaltyEvent {
  customerId: string;
  points: number;
  action: 'added' | 'redeemed' | 'expired' | 'adjusted';
  reason: string;
  newTotal: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
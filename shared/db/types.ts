import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Configuração do cliente PostgreSQL
 */
export interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Interface para consultas parametrizadas
 */
export interface QueryParams {
  text: string;
  params?: any[];
}

/**
 * Interface para o cliente PostgreSQL
 */
export interface IPostgresClient {
  query<T extends QueryResultRow = any>(textOrParams: string | QueryParams, params?: any[]): Promise<QueryResult<T>>;
  getClient(): Promise<PoolClient>;
  transaction<T = any>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Interface para um repositório de entidade
 */
export interface EntityRepository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findAll(criteria?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: K, entity: Partial<T>): Promise<T | null>;
  delete(id: K): Promise<boolean>;
}

/**
 * Definições de modelos de entidade por domínio
 */

// Payments Domain
export interface Transaction {
  id: number;
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  gatewayReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: number;
  refundId: string;
  transactionId: string;
  amount: number;
  reason?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Sales Domain
export interface Order {
  id: number;
  orderId: string;
  customerId: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  createdAt: Date;
}

export interface Promotion {
  id: number;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Purchasing Domain
export interface Supplier {
  id: number;
  supplierId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrder {
  id: number;
  orderId: string;
  supplierId: string;
  totalAmount: number;
  status: string;
  expectedDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  id: number;
  orderId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  createdAt: Date;
}

export interface GoodsReceived {
  id: number;
  receiptId: string;
  orderId: string;
  receivedDate: Date;
  notes?: string;
  createdAt: Date;
}

// Inventory Domain
export interface Product {
  id: number;
  productId: string;
  name: string;
  description?: string;
  sku: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: number;
  locationId: string;
  name: string;
  type: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stock {
  id: number;
  productId: string;
  locationId: string;
  quantity: number;
  minThreshold: number;
  maxThreshold?: number;
  lastUpdated: Date;
}

export interface StockTransfer {
  id: number;
  transferId: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Customer Domain
export interface CustomerProfile {
  id: number;
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrowsingHistory {
  id: number;
  customerId: string;
  productId: string;
  viewedAt: Date;
  sessionId: string;
}

export interface CustomerPreference {
  id: number;
  customerId: string;
  category: string;
  preferenceValue: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Loyalty {
  id: number;
  customerId: string;
  points: number;
  tier: string;
  joinedDate: Date;
  updatedAt: Date;
}

export interface LoyaltyTransaction {
  id: number;
  customerId: string;
  transactionType: string;
  points: number;
  description?: string;
  createdAt: Date;
}
-- Criação dos schemas para cada microserviço
CREATE SCHEMA IF NOT EXISTS payments;

CREATE SCHEMA IF NOT EXISTS sales;

CREATE SCHEMA IF NOT EXISTS purchasing;

CREATE SCHEMA IF NOT EXISTS inventory;

CREATE SCHEMA IF NOT EXISTS customer;

-- Schema de Pagamentos
CREATE TABLE
  IF NOT EXISTS payments.transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    order_id VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    gateway_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE
  IF NOT EXISTS payments.refunds (
    id SERIAL PRIMARY KEY,
    refund_id VARCHAR(100) UNIQUE NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES payments.transactions (transaction_id)
  );

-- Schema de Vendas
CREATE TABLE
  IF NOT EXISTS sales.orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE
  IF NOT EXISTS sales.order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES sales.orders (order_id)
  );

CREATE TABLE
  IF NOT EXISTS sales.promotions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255) NOT NULL,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

-- Schema de Compras
CREATE TABLE
  IF NOT EXISTS purchasing.suppliers (
    id SERIAL PRIMARY KEY,
    supplier_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE
  IF NOT EXISTS purchasing.purchase_orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    supplier_id VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    expected_delivery_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES purchasing.suppliers (supplier_id)
  );

CREATE TABLE
  IF NOT EXISTS purchasing.purchase_order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES purchasing.purchase_orders (order_id)
  );

CREATE TABLE
  IF NOT EXISTS purchasing.goods_received (
    id SERIAL PRIMARY KEY,
    receipt_id VARCHAR(100) UNIQUE NOT NULL,
    order_id VARCHAR(100) NOT NULL,
    received_date TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES purchasing.purchase_orders (order_id)
  );

-- Schema de Inventário
CREATE TABLE
  IF NOT EXISTS inventory.products (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE
  IF NOT EXISTS inventory.locations (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE
  IF NOT EXISTS inventory.stock (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100) NOT NULL,
    location_id VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_threshold INTEGER DEFAULT 0,
    max_threshold INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES inventory.products (product_id),
    FOREIGN KEY (location_id) REFERENCES inventory.locations (location_id),
    UNIQUE (product_id, location_id)
  );

CREATE TABLE
  IF NOT EXISTS inventory.stock_transfers (
    id SERIAL PRIMARY KEY,
    transfer_id VARCHAR(100) UNIQUE NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    from_location_id VARCHAR(100) NOT NULL,
    to_location_id VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES inventory.products (product_id),
    FOREIGN KEY (from_location_id) REFERENCES inventory.locations (location_id),
    FOREIGN KEY (to_location_id) REFERENCES inventory.locations (location_id)
  );

-- Schema de Cliente
CREATE TABLE
  IF NOT EXISTS customer.profiles (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE
  IF NOT EXISTS customer.browsing_history (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(100) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(100) NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customer.profiles (customer_id)
  );

CREATE TABLE
  IF NOT EXISTS customer.preferences (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    preference_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customer.profiles (customer_id),
    UNIQUE (customer_id, category)
  );

CREATE TABLE
  IF NOT EXISTS customer.loyalty (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(100) UNIQUE NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    tier VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customer.profiles (customer_id)
  );

CREATE TABLE
  IF NOT EXISTS customer.loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    points INTEGER NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customer.profiles (customer_id)
  );
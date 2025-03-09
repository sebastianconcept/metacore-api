import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createLogger, createHttpLoggerMiddleware } from '../../shared/utils/logger';

// Initialize logger
const logger = createLogger('api-gateway');

// Configuration
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

// Service URLs from environment variables
const PAYMENTS_SERVICE_URL = process.env.PAYMENTS_SERVICE_URL || 'http://payments-service:3000';
const SALES_SERVICE_URL = process.env.SALES_SERVICE_URL || 'http://sales-service:3000';
const PURCHASING_SERVICE_URL = process.env.PURCHASING_SERVICE_URL || 'http://purchasing-service:3000';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3000';
const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://customer-activity-service:3000';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3000';

// Initialize Express
const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(createHttpLoggerMiddleware(logger));
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error in API Gateway:', err);
  res.status(500).json({
    status: 500,
    message: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Service proxies
// User Service - this is active since we've implemented it
app.use('/api/users', createProxyMiddleware({
  target: USER_SERVICE_URL,
  pathRewrite: { '^/api/users': '/api/users' },
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    logger.debug(`Proxying request to user service: ${req.method} ${req.url}`);

    // If there's a request body, handle it properly
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    logger.debug(`Received response from user service: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    logger.error('Proxy error:', err);
    res.status(503).json({
      status: 503,
      message: 'User Service Unavailable',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}));

// Other services are commented out since they're not implemented yet
/*
app.use('/api/payments', createProxyMiddleware({
  target: PAYMENTS_SERVICE_URL,
  pathRewrite: { '^/api/payments': '/api' },
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(503).json({
      status: 503,
      message: 'Payments Service Unavailable'
    });
  }
}));

app.use('/api/sales', createProxyMiddleware({
  target: SALES_SERVICE_URL,
  pathRewrite: { '^/api/sales': '/api' },
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(503).json({
      status: 503,
      message: 'Sales Service Unavailable'
    });
  }
}));

app.use('/api/purchasing', createProxyMiddleware({
  target: PURCHASING_SERVICE_URL,
  pathRewrite: { '^/api/purchasing': '/api' },
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(503).json({
      status: 503,
      message: 'Purchasing Service Unavailable'
    });
  }
}));

app.use('/api/inventory', createProxyMiddleware({
  target: INVENTORY_SERVICE_URL,
  pathRewrite: { '^/api/inventory': '/api' },
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(503).json({
      status: 503,
      message: 'Inventory Service Unavailable'
    });
  }
}));

app.use('/api/customers', createProxyMiddleware({
  target: CUSTOMER_SERVICE_URL,
  pathRewrite: { '^/api/customers': '/api' },
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(503).json({
      status: 503,
      message: 'Customer Service Unavailable'
    });
  }
}));
*/

// API documentation endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'API Gateway running',
    availableEndpoints: [
      '/api/users'
    ],
    upcomingEndpoints: [
      '/api/payments',
      '/api/sales',
      '/api/purchasing',
      '/api/inventory',
      '/api/customers'
    ],
    version: '1.0.0'
  });
});

// Error handler must be the last middleware
app.use(errorHandler);

// Start server
app.listen(PORT, HOST, () => {
  logger.info(`API Gateway running on http://${HOST}:${PORT}`);
});
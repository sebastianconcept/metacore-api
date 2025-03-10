// src/config/app.rs
use std::env;

/// Application configuration loaded from environment variables
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub port: u16,
    pub host: String,
    pub user_service_url: String,
    pub payments_service_url: String,
    pub sales_service_url: String,
    pub purchasing_service_url: String,
    pub inventory_service_url: String,
    pub customer_service_url: String,
    pub environment: String,
    pub log_level: String,
}

impl AppConfig {
    /// Load configuration from environment variables
    pub fn from_env() -> Self {
        let port = env::var("PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse::<u16>()
            .expect("PORT must be a valid port number");

        let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());

        let user_service_url =
            env::var("USER_SERVICE_URL").unwrap_or_else(|_| "http://user-service:3000".to_string());

        let payments_service_url = env::var("PAYMENTS_SERVICE_URL")
            .unwrap_or_else(|_| "http://payments-service:3000".to_string());

        let sales_service_url = env::var("SALES_SERVICE_URL")
            .unwrap_or_else(|_| "http://sales-service:3000".to_string());

        let purchasing_service_url = env::var("PURCHASING_SERVICE_URL")
            .unwrap_or_else(|_| "http://purchasing-service:3000".to_string());

        let inventory_service_url = env::var("INVENTORY_SERVICE_URL")
            .unwrap_or_else(|_| "http://inventory-service:3000".to_string());

        let customer_service_url = env::var("CUSTOMER_SERVICE_URL")
            .unwrap_or_else(|_| "http://customer-activity-service:3000".to_string());

        let environment = env::var("NODE_ENV").unwrap_or_else(|_| "development".to_string());

        let log_level = env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string());

        Self {
            port,
            host,
            user_service_url,
            payments_service_url,
            sales_service_url,
            purchasing_service_url,
            inventory_service_url,
            customer_service_url,
            environment,
            log_level,
        }
    }

    /// Check if running in development mode
    pub fn is_development(&self) -> bool {
        self.environment == "development"
    }
}

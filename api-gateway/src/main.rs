// src/main.rs
#[macro_use]
extern crate rocket;
extern crate dotenv;

mod config;
mod errors;
mod middleware;
mod routes;
mod services;

use config::app::AppConfig;
use dotenv::dotenv;
use log::{debug, error, info, warn};
use metrics_exporter_prometheus::PrometheusBuilder;
use rocket::fairing::AdHoc;
use rocket::http::Method;
use rocket_cors::{AllowedHeaders, AllowedOrigins};
use routes::{users, health};

#[launch]
fn rocket() -> _ {
    // Force log level if not set
    if std::env::var("RUST_LOG").is_err() {
        unsafe {
            std::env::set_var("RUST_LOG", "debug,rocket=info");
        }
    }

    // Initialize logging
    env_logger::init();

    info!("====== API Gateway Initialization Starting ======");

    // Load environment variables from .env file if it exists
    dotenv().ok();
    debug!("Environment variables loaded");

    // Load application configuration
    let config = AppConfig::from_env();
    info!("Configuration loaded - API Gateway on port {}", config.port);
    
    // Log service URLs for debugging
    debug!("Using USER_SERVICE_URL: {}", config.user_service_url);

    // Set up metrics
    info!("Setting up metrics...");
    let builder = PrometheusBuilder::new();
    let recorder_result = builder.install_recorder();
    
    let prometheus_handle = match recorder_result {
        Ok(handle) => {
            info!("Metrics recorder installed successfully");
            handle
        }
        Err(e) => {
            error!("Failed to install metrics recorder: {}", e);
            panic!("Critical error: Unable to initialize metrics");
        }
    };

    // Configure CORS
    info!("Configuring CORS...");
    let cors_options = rocket_cors::CorsOptions {
        allowed_origins: AllowedOrigins::all(),
        allowed_methods: vec![
            Method::Get,
            Method::Post,
            Method::Put,
            Method::Delete,
            Method::Options,
        ]
        .into_iter()
        .map(From::from)
        .collect(),
        allowed_headers: AllowedHeaders::all(),
        allow_credentials: true,
        ..Default::default()
    };
    
    let cors_result = cors_options.to_cors();
    
    let cors = match cors_result {
        Ok(cors) => {
            debug!("CORS configured successfully");
            cors
        }
        Err(e) => {
            error!("Failed to create CORS fairing: {}", e);
            panic!("Critical error: Unable to configure CORS");
        }
    };

    info!("Building Rocket instance...");
    
    // Build and configure Rocket instance
    let rocket_instance = rocket::build()
        .manage(config)
        .manage(prometheus_handle.clone())
        .mount("/api/metrics", rocket::routes![metrics])
        .mount("/api/health", routes![health::check])
        .mount(
            "/api/users",
            routes![users::login, users::register, users::refresh, users::logout],
        )
        // Commented out services that are not implemented yet
        // .mount(
        //     "/api/payments",
        //     routes![
        //         payments::process_payment,
        //         payments::get_transaction,
        //         payments::get_transactions
        //     ],
        // )
        // .mount(
        //     "/api/sales",
        //     routes![sales::create_order, sales::get_order, sales::get_orders],
        // )
        // .mount(
        //     "/api/inventory",
        //     routes![
        //         inventory::get_product,
        //         inventory::get_products,
        //         inventory::update_stock
        //     ],
        // )
        // .mount(
        //     "/api/purchasing",
        //     routes![
        //         purchasing::create_purchase_order,
        //         purchasing::get_purchase_order,
        //         purchasing::get_purchase_orders
        //     ],
        // )
        // .mount(
        //     "/api/customers",
        //     routes![
        //         customer::get_customer,
        //         customer::get_customer_activity,
        //         customer::create_customer
        //     ],
        // )
        .attach(cors)
        .attach(middleware::RequestId)
        .attach(middleware::RequestLogger)
        .attach(middleware::ResponseTime)
        .attach(AdHoc::on_liftoff("API Gateway Startup", |_| {
            Box::pin(async move {
                info!("✅ API Gateway successfully started and ready!");
                info!("Prometheus metrics available at /api/metrics");
                
                // This is the proper place to run Tokio tasks since we're in an async context
                let user_service_url = "http://user-service:3000";
                info!("Checking connectivity to user service...");
                if let Err(e) = reqwest::get(&format!("{}/api/health", user_service_url)).await {
                    warn!("Could not connect to user service: {}. This may be expected if the service is not yet available.", e);
                } else {
                    info!("Successfully connected to user service at {}", user_service_url);
                }
            })
        }))
        .attach(AdHoc::on_liftoff("Startup Info", |_| {
            Box::pin(async move {
                info!("🚀 Rocket instance launched and processing requests");
            })
        }));
    
    info!("====== API Gateway Initialization Complete - Launching Rocket ======");
    rocket_instance
}

#[get("/")]
fn metrics(prometheus_handle: &rocket::State<metrics_exporter_prometheus::PrometheusHandle>) -> String {
    prometheus_handle.render()
}
// src/routes/health.rs
use log::info;
use rocket::serde::json::Json;
use rocket::serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct HealthStatus {
    status: String,
    timestamp: String,
    version: String,
}

#[get("/")]
pub fn check() -> Json<HealthStatus> {
    info!("Health check endpoint called");

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();

    Json(HealthStatus {
        status: "ok".into(),
        timestamp: format!("{}", now),
        version: env!("CARGO_PKG_VERSION").into(),
    })
}

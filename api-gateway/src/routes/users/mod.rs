// src/routes/auth.rs
use crate::config::app::AppConfig;
use crate::errors::ApiError;
use log::{debug, error};
use rocket::State;
use rocket::http::Status;
use rocket::response::status;
use rocket::serde::json::{Json, Value, json};
use serde::{Deserialize, Serialize};

// Request data models
#[derive(Debug, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct RegisterRequest {
    pub name: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

// Login route
#[post("/login", data = "<login_data>")]
pub async fn login(
    config: &State<AppConfig>,
    login_data: Json<LoginRequest>,
) -> Result<Value, status::Custom<Json<Value>>> {
    debug!("Proxying login request to user service");

    let client = reqwest::Client::new();
    let response = match client
        .post(format!("{}/api/users/login", config.user_service_url))
        .json(&login_data.into_inner())
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            error!("Error proxying login request: {:?}", e);
            let err = ApiError::ServiceUnavailable("User Service unavailable".into());
            return Err(status::Custom(
                err.status_code(),
                Json(json!({
                    "status": err.status_code().code,
                    "message": err.to_string(),
                    "details": if config.is_development() { e.to_string() } else { String::new() }
                })),
            ));
        }
    };

    let status = response.status();
    let response_body = match response.json::<Value>().await {
        Ok(body) => body,
        Err(e) => {
            error!("Error parsing login response: {:?}", e);
            let err = ApiError::InternalServerError("Error parsing response".into());
            return Err(status::Custom(
                err.status_code(),
                Json(json!({
                    "status": err.status_code().code,
                    "message": err.to_string(),
                    "details": if config.is_development() { e.to_string() } else { String::new() }
                })),
            ));
        }
    };

    if status.is_success() {
        Ok(response_body)
    } else {
        Err(status::Custom(
            Status::from_code(status.as_u16()).unwrap_or(Status::InternalServerError),
            Json(response_body),
        ))
    }
}

// Register route
#[post("/register", data = "<register_data>")]
pub async fn register(
    config: &State<AppConfig>,
    register_data: Json<RegisterRequest>,
) -> Result<Value, status::Custom<Json<Value>>> {
    debug!("Proxying register request to user service");

    let client = reqwest::Client::new();
    let response = match client
        .post(format!("{}/api/users/register", config.user_service_url))
        .json(&register_data.into_inner())
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            error!("Error proxying register request: {:?}", e);
            let err = ApiError::ServiceUnavailable("User Service unavailable".into());
            return Err(status::Custom(
                err.status_code(),
                Json(serde_json::json!({
                    "status": err.status_code().code,
                    "message": err.to_string(),
                    "details": config.is_development().then(|| e.to_string())
                })),
            ));
        }
    };

    let status = response.status();
    let response_body = match response.json::<Value>().await {
        Ok(body) => body,
        Err(e) => {
            error!("Error parsing register response: {:?}", e);
            let err = ApiError::InternalServerError("Error parsing response".into());
            return Err(status::Custom(
                err.status_code(),
                Json(serde_json::json!({
                    "status": err.status_code().code,
                    "message": err.to_string(),
                    "details": config.is_development().then(|| e.to_string())
                })),
            ));
        }
    };

    if status.is_success() {
        Ok(response_body)
    } else {
        Err(status::Custom(
            Status::from_code(status.as_u16()).unwrap_or(Status::InternalServerError),
            Json(response_body),
        ))
    }
}

// Token refresh route
#[post("/refresh", data = "<refresh_data>")]
pub async fn refresh(
    config: &State<AppConfig>,
    refresh_data: Json<RefreshTokenRequest>,
) -> Result<Value, status::Custom<Json<Value>>> {
    debug!("Proxying token refresh request to user service");

    let client = reqwest::Client::new();
    let response = match client
        .post(format!("{}/api/users/refresh", config.user_service_url))
        .json(&refresh_data.into_inner())
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            error!("Error proxying refresh request: {:?}", e);
            let err = ApiError::ServiceUnavailable("User Service unavailable".into());
            return Err(status::Custom(
                err.status_code(),
                Json(serde_json::json!({
                    "status": err.status_code().code,
                    "message": err.to_string(),
                    "details": config.is_development().then(|| e.to_string())
                })),
            ));
        }
    };

    let status = response.status();
    let response_body = match response.json::<Value>().await {
        Ok(body) => body,
        Err(e) => {
            error!("Error parsing refresh response: {:?}", e);
            let err = ApiError::InternalServerError("Error parsing response".into());
            return Err(status::Custom(
                err.status_code(),
                Json(serde_json::json!({
                    "status": err.status_code().code,
                    "message": err.to_string(),
                    "details": config.is_development().then(|| e.to_string())
                })),
            ));
        }
    };

    if status.is_success() {
        Ok(response_body)
    } else {
        Err(status::Custom(
            Status::from_code(status.as_u16()).unwrap_or(Status::InternalServerError),
            Json(response_body),
        ))
    }
}

// Logout route
#[post("/logout")]
pub async fn logout(config: &State<AppConfig>) -> Result<Value, status::Custom<Json<Value>>> {
    debug!("Proxying logout request to user service");

    let client = reqwest::Client::new();
    let response = match client
        .post(format!("{}/api/users/logout", config.user_service_url))
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            error!("Error proxying logout request: {:?}", e);
            let err = ApiError::ServiceUnavailable("User Service unavailable".into());
            return Err(status::Custom(
                err.status_code(),
                Json(serde_json::json!({
                    "status": err.status_code().code,
                    "message": err.to_string(),
                    "details": config.is_development().then(|| e.to_string())
                })),
            ));
        }
    };

    let status = response.status();
    let response_body = match response.json::<Value>().await {
        Ok(body) => body,
        Err(e) => {
            error!("Error parsing logout response: {:?}", e);
            let err = ApiError::InternalServerError("Error parsing response".into());
            return Err(status::Custom(
                err.status_code(),
                Json(serde_json::json!({
                    "status": err.status_code().code,
                    "message": err.to_string(),
                    "details": config.is_development().then(|| e.to_string())
                })),
            ));
        }
    };

    if status.is_success() {
        Ok(response_body)
    } else {
        Err(status::Custom(
            Status::from_code(status.as_u16()).unwrap_or(Status::InternalServerError),
            Json(response_body),
        ))
    }
}

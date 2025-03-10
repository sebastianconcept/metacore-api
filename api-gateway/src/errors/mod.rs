use rocket::http::Status;
use rocket::response::status;
use rocket::serde::json::Json;
use rocket::serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApiError {
    #[allow(dead_code)]
    #[error("Not found: {0}")]
    NotFound(String),

    #[allow(dead_code)]
    #[error("Bad request: {0}")]
    BadRequest(String),

    #[allow(dead_code)]
    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[allow(dead_code)]
    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),

    #[error("Internal server error: {0}")]
    InternalServerError(String),

    #[allow(dead_code)]
    #[error("Request timeout: {0}")]
    RequestTimeout(String),
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct ErrorResponse {
    pub status: u16,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

impl ApiError {
    pub fn status_code(&self) -> Status {
        match self {
            ApiError::NotFound(_) => Status::NotFound,
            ApiError::BadRequest(_) => Status::BadRequest,
            ApiError::Unauthorized(_) => Status::Unauthorized,
            ApiError::Forbidden(_) => Status::Forbidden,
            ApiError::ServiceUnavailable(_) => Status::ServiceUnavailable,
            ApiError::InternalServerError(_) => Status::InternalServerError,
            ApiError::RequestTimeout(_) => Status::GatewayTimeout,
        }
    }

    #[allow(dead_code)]
    pub fn to_response(&self, include_details: bool) -> status::Custom<Json<ErrorResponse>> {
        let status = self.status_code();
        let message = self.to_string();

        let details = if include_details {
            Some(message.clone())
        } else {
            None
        };

        let response = ErrorResponse {
            status: status.code,
            message,
            details,
        };

        status::Custom(status, Json(response))
    }
}

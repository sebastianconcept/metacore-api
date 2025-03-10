// src/middleware/mod.rs
use log::{debug, info};
use rocket::{
    Request, Response,
    fairing::{Fairing, Info, Kind},
};
use std::fmt;
use std::time::Instant;
use uuid::Uuid;

// Request ID middleware
pub struct RequestId;

#[rocket::async_trait]
impl Fairing for RequestId {
    fn info(&self) -> Info {
        Info {
            name: "Request ID",
            kind: Kind::Request | Kind::Response,
        }
    }

    async fn on_request(&self, request: &mut Request<'_>, _: &mut rocket::Data<'_>) {
        let request_id = Uuid::new_v4().to_string();
        request.local_cache(|| RequestIdValue(request_id));
    }

    async fn on_response<'r>(&self, request: &'r Request<'_>, _: &mut Response<'r>) {
        let request_id = request.local_cache(|| RequestIdValue(Uuid::new_v4().to_string()));
        debug!("Request ID: {}", request_id);
    }
}

// Request ID value wrapper for local cache
#[derive(Clone)]
pub struct RequestIdValue(pub String);

impl fmt::Display for RequestIdValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

// Request logger middleware
pub struct RequestLogger;

#[rocket::async_trait]
impl Fairing for RequestLogger {
    fn info(&self) -> Info {
        Info {
            name: "Request Logger",
            kind: Kind::Request | Kind::Response,
        }
    }

    async fn on_request(&self, request: &mut Request<'_>, _: &mut rocket::Data<'_>) {
        let method = request.method();
        let uri = request.uri();

        let request_id = request.local_cache(|| RequestIdValue(Uuid::new_v4().to_string()));

        info!("[{}] {} {}", request_id, method, uri);

        // Increment request counter
        metrics::counter!("api_requests_total").increment(1);
    }

    async fn on_response<'r>(&self, request: &'r Request<'_>, response: &mut Response<'r>) {
        let method = request.method();
        let uri = request.uri();
        let status = response.status();

        let request_id = request.local_cache(|| RequestIdValue(Uuid::new_v4().to_string()));

        info!("[{}] {} {} => {}", request_id, method, uri, status);

        // Increment response counter
        metrics::counter!("api_responses_total").increment(1);
    }
}

// Response time tracking middleware
pub struct ResponseTime;

#[rocket::async_trait]
impl Fairing for ResponseTime {
    fn info(&self) -> Info {
        Info {
            name: "Response Time",
            kind: Kind::Request | Kind::Response,
        }
    }

    async fn on_request(&self, request: &mut Request<'_>, _: &mut rocket::Data<'_>) {
        request.local_cache(Instant::now);
    }

    async fn on_response<'r>(&self, request: &'r Request<'_>, response: &mut Response<'r>) {
        let start_time = request.local_cache(Instant::now);
        let response_time = start_time.elapsed();

        let method = request.method();
        let uri = request.uri();
        let status = response.status();

        // Log response time
        debug!("{} {} => {} in {:.2?}", method, uri, status, response_time);

        let seconds = response_time.as_secs_f64();
        let labels = [("seconds", format!("{}!", seconds))];
        let _ = metrics::histogram!("api_response_time", &labels);
    }
}

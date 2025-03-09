// user.nomad - Job for the user service

// Include base configuration
include {
  path = "base.nomad"
}

// Specific parameters for the user service
locals {
  service_name = "user-service"
  service_port = 3006
  docker_image = "microservices-architecture/user-service:${var.image_tag}"
  
  environment_vars = {
    SERVICE_NAME    = "user-service"
    KAFKA_BROKERS   = "kafka.service.consul:9092"
    POSTGRES_HOST   = "postgres.service.consul"
    POSTGRES_PORT   = "5432"
    POSTGRES_USER   = "admin"
    POSTGRES_DB     = "microservices"
    LOG_LEVEL       = "info"
    JWT_SECRET      = "${var.jwt_secret}"
    AUTH_EXPIRY     = "24h"
  }
}

// Variable for the image tag (used in CI/CD)
variable "image_tag" {
  type    = string
  default = "latest"
}

// Secret variables
variable "jwt_secret" {
  type    = string
  default = "dev-jwt-secret"
  description = "Secret key for JWT token generation and validation"
}

// Parameters for the base configuration
variable "docker_image" {
  type    = string
  default = local.docker_image
}

variable "service_name" {
  type    = string
  default = local.service_name
}

variable "service_port" {
  type    = number
  default = local.service_port
}

variable "count" {
  type    = number
  default = 2  // Two instances of the user service
}

variable "cpu" {
  type    = number
  default = 500
}

variable "memory" {
  type    = number
  default = 512
}

variable "environment_vars" {
  type    = map(string)
  default = local.environment_vars
}
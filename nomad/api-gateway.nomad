// api-gateway.nomad - Job for the API Gateway service

// Include base configuration
include {
  path = "base.nomad"
}

// Specific parameters for the API Gateway
locals {
  service_name = "api-gateway"
  service_port = 4000
  docker_image = "microservices-architecture/api-gateway:${var.image_tag}"
  
  environment_vars = {
    SERVICE_NAME: "api-gateway",
    PORT: "3000",
    NODE_ENV: "${var.environment}",
    PAYMENTS_SERVICE_URL: "http://payments-service.service.consul:3000",
    SALES_SERVICE_URL: "http://sales-service.service.consul:3000",
    PURCHASING_SERVICE_URL: "http://purchasing-service.service.consul:3000",
    INVENTORY_SERVICE_URL: "http://inventory-service.service.consul:3000",
    CUSTOMER_SERVICE_URL: "http://customer-activity-service.service.consul:3000",
    USER_SERVICE_URL: "http://user-service.service.consul:3000",
    LOG_LEVEL: "info"
  }
}

// Variable for the image tag (used in CI/CD)
variable "image_tag" {
  type    = string
  default = "latest"
}

// Variable for environment
variable "environment" {
  type    = string
  default = "production"
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
  default = 2  // Two instances of the API Gateway for high availability
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

// Additional configurations specific to the API Gateway
job "api-gateway" {
  // This extends the base job configuration
  
  // Add service-specific configurations
  group "app" {
    // Add service discovery tags
    service {
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.api-gateway.rule=Host(`api.yourdomain.com`)", // Replace with your domain
        "traefik.http.services.api-gateway.loadbalancer.sticky=true",
        "api-gateway"
      ]
      
      check {
        name     = "gateway-health"
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "2s"
      }
    }
    
    // Add environment variables for rate limiting
    task "app" {
      env {
        RATE_LIMIT_WINDOW_MS = "900000"  // 15 minutes
        RATE_LIMIT_MAX = "1000"          // Maximum requests per window
      }
    }
  }
}
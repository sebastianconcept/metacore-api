// payments.nomad - Job para o serviço de pagamentos

// Inclui a configuração base
include {
  path = "base.nomad"
}

// Parâmetros específicos para o serviço de pagamentos
locals {
  service_name = "payments-service"
  service_port = 3001
  docker_image = "microservices-architecture/payments-service:${var.image_tag}"
  
  environment_vars = {
    SERVICE_NAME    = "payments-service"
    KAFKA_BROKERS   = "kafka.service.consul:9092"
    POSTGRES_HOST   = "postgres.service.consul"
    POSTGRES_PORT   = "5432"
    POSTGRES_USER   = "admin"
    POSTGRES_DB     = "microservices"
    LOG_LEVEL       = "info"
  }
}

// Variável para a tag da imagem (usada no CI/CD)
variable "image_tag" {
  type    = string
  default = "latest"
}

// Parâmetros para a configuração base
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
  default = 2  // Duas instâncias do serviço de pagamentos
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
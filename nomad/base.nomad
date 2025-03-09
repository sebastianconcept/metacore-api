// base.nomad - Configuração base para jobs Nomad

// Variáveis de entrada
variable "docker_image" {
  description = "Docker image to deploy"
  type        = string
}

variable "service_name" {
  description = "Name of the service"
  type        = string
}

variable "service_port" {
  description = "Port the service listens on"
  type        = number
}

variable "count" {
  description = "Number of instances to run"
  type        = number
  default     = 2
}

variable "cpu" {
  description = "CPU resources (in MHz)"
  type        = number
  default     = 500
}

variable "memory" {
  description = "Memory resources (in MB)"
  type        = number
  default     = 512
}

variable "environment_vars" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

// Job definition
job "${var.service_name}" {
  datacenters = ["dc1"]
  type        = "service"

  update {
    max_parallel     = 1
    min_healthy_time = "30s"
    healthy_deadline = "5m"
    auto_revert      = true
  }

  group "app" {
    count = var.count

    network {
      port "http" {
        static = var.service_port
      }
    }

    service {
      name = "${var.service_name}"
      port = "http"
      tags = ["traefik.enable=true"]

      check {
        name     = "alive"
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "2s"
      }
    }

    restart {
      attempts = 3
      interval = "5m"
      delay    = "25s"
      mode     = "delay"
    }

    task "app" {
      driver = "docker"

      config {
        image = var.docker_image
        ports = ["http"]
      }

      env {
        NODE_ENV = "production"
        PORT     = "${NOMAD_PORT_http}"
      }

      dynamic "env" {
        for_each = var.environment_vars
        labels   = ["env"]
        content {
          key   = env.key
          value = env.value
        }
      }

      resources {
        cpu    = var.cpu
        memory = var.memory
      }

      logs {
        max_files     = 10
        max_file_size = 15
      }
    }
  }
}
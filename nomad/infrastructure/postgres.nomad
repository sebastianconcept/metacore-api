// postgres.nomad - Job para o banco de dados PostgreSQL

job "postgres" {
  datacenters = ["dc1"]
  type = "service"

  group "postgres" {
    count = 1

    network {
      port "db" {
        static = 5432
      }
    }

    volume "postgres-data" {
      type      = "host"
      read_only = false
      source    = "postgres-data"
    }

    service {
      name = "postgres"
      port = "db"

      check {
        type     = "tcp"
        interval = "10s"
        timeout  = "2s"
      }
    }

    task "postgres" {
      driver = "docker"

      config {
        image = "postgres:14"
        ports = ["db"]
        volumes = [
          "local/init.sql:/docker-entrypoint-initdb.d/init.sql"
        ]
      }

      volume_mount {
        volume      = "postgres-data"
        destination = "/var/lib/postgresql/data"
        read_only   = false
      }

      env {
        POSTGRES_USER = "admin"
        POSTGRES_PASSWORD = "adminpassword"
        POSTGRES_DB = "microservices"
      }

      resources {
        cpu    = 1000
        memory = 1024
      }

      template {
        data = <<-EOH
          -- Criação dos schemas para cada microserviço
          CREATE SCHEMA IF NOT EXISTS payments;
          CREATE SCHEMA IF NOT EXISTS sales;
          CREATE SCHEMA IF NOT EXISTS purchasing;
          CREATE SCHEMA IF NOT EXISTS inventory;
          CREATE SCHEMA IF NOT EXISTS customer;

          -- Aqui viria o resto do script SQL
          -- (O conteúdo completo do arquivo init.sql que criamos anteriormente)
        EOH
        destination = "local/init.sql"
      }
    }
  }
}
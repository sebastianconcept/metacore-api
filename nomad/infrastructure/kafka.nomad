// kafka.nomad - Job para o cluster Kafka

job "kafka" {
  datacenters = ["dc1"]
  type = "service"

  group "zookeeper" {
    count = 1

    network {
      port "client" {
        static = 2181
      }
      port "follower" {
        static = 2888
      }
      port "leader" {
        static = 3888
      }
    }

    service {
      name = "zookeeper"
      port = "client"

      check {
        type     = "tcp"
        interval = "10s"
        timeout  = "2s"
      }
    }

    task "zookeeper" {
      driver = "docker"

      config {
        image = "confluentinc/cp-zookeeper:latest"
        ports = ["client", "follower", "leader"]
      }

      env {
        ZOOKEEPER_CLIENT_PORT = "${NOMAD_PORT_client}"
        ZOOKEEPER_TICK_TIME = "2000"
      }

      resources {
        cpu    = 500
        memory = 512
      }
    }
  }

  group "kafka-broker" {
    count = 1

    network {
      port "broker" {
        static = 9092
      }
    }

    service {
      name = "kafka"
      port = "broker"

      check {
        type     = "tcp"
        interval = "10s"
        timeout  = "2s"
      }
    }

    task "kafka" {
      driver = "docker"

      config {
        image = "confluentinc/cp-kafka:latest"
        ports = ["broker"]
      }

      env {
        KAFKA_BROKER_ID = "1"
        KAFKA_ZOOKEEPER_CONNECT = "zookeeper.service.consul:2181"
        KAFKA_LISTENER_SECURITY_PROTOCOL_MAP = "PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT"
        KAFKA_ADVERTISED_LISTENERS = "PLAINTEXT://kafka.service.consul:9092,PLAINTEXT_HOST://localhost:9092"
        KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR = "1"
        KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS = "0"
        KAFKA_TRANSACTION_STATE_LOG_MIN_ISR = "1"
        KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR = "1"
      }

      resources {
        cpu    = 1000
        memory = 1024
      }
    }
  }

  group "kafka-setup" {
    count = 1

    restart {
      attempts = 3
      delay    = "15s"
      interval = "1m"
      mode     = "fail"
    }

    task "create-topics" {
      driver = "docker"

      lifecycle {
        hook    = "poststart"
        sidecar = false
      }

      config {
        image   = "confluentinc/cp-kafka:latest"
        command = "bash"
        args    = [
          "-c",
          "echo 'Waiting for Kafka to be ready...' && sleep 30 && kafka-topics --create --bootstrap-server kafka.service.consul:9092 --replication-factor 1 --partitions 3 --topic payments.transaction.created --if-not-exists && kafka-topics --create --bootstrap-server kafka.service.consul:9092 --replication-factor 1 --partitions 3 --topic sales.order.created --if-not-exists"
        ]
      }

      resources {
        cpu    = 200
        memory = 256
      }
    }
  }
}
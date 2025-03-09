#!/bin/bash
# Script to facilitate deployment with Nomad

set -e

# Check if nomad is installed
if ! command -v nomad &> /dev/null
then
    echo "Error: Nomad is not installed. Please install it first."
    echo "Instructions: https://developer.hashicorp.com/nomad/docs/install"
    exit 1
fi

# Base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NOMAD_DIR="$BASE_DIR/nomad"

# Utility functions
function print_usage {
    echo "Usage: $0 [options] [service]"
    echo "Options:"
    echo "  -h, --help                Show this help message"
    echo "  -e, --environment [env]   Environment (dev, staging, prod)"
    echo "  -t, --tag [tag]           Docker image tag"
    echo "  -a, --all                 Deploy all services"
    echo "  -i, --infrastructure      Deploy only infrastructure"
    echo "Available services:"
    echo "  payments, sales, purchasing, inventory, customer"
    exit 1
}

function deploy_service {
    local service=$1
    local tag=$2
    local env=$3
    
    echo "🚀 Deploying service: $service with tag: $tag in environment: $env"
    
    # Check if job file exists
    if [ ! -f "$NOMAD_DIR/$service.nomad" ]; then
        echo "❌ Error: Job file not found: $NOMAD_DIR/$service.nomad"
        exit 1
    fi
    
    # Run nomad job with variables
    nomad job run \
        -var="image_tag=$tag" \
        -var="environment=$env" \
        "$NOMAD_DIR/$service.nomad"
    
    echo "✅ Deployment of service $service completed!"
}

function deploy_infrastructure {
    echo "🏗️ Deploying infrastructure..."
    
    # Deploy PostgreSQL
    echo "🐘 Deploying PostgreSQL..."
    nomad job run "$NOMAD_DIR/infrastructure/postgres.nomad"
    
    # Deploy Kafka
    echo "📬 Deploying Kafka..."
    nomad job run "$NOMAD_DIR/infrastructure/kafka.nomad"
    
    echo "✅ Infrastructure deployment completed!"
}

# Default parameters
ENVIRONMENT="dev"
TAG="latest"
SERVICE=""
DEPLOY_ALL=false
DEPLOY_INFRA=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -h|--help)
            print_usage
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift
            shift
            ;;
        -t|--tag)
            TAG="$2"
            shift
            shift
            ;;
        -a|--all)
            DEPLOY_ALL=true
            shift
            ;;
        -i|--infrastructure)
            DEPLOY_INFRA=true
            shift
            ;;
        *)
            SERVICE="$1"
            shift
            ;;
    esac
done

# Check options
if [ "$DEPLOY_INFRA" = true ]; then
    deploy_infrastructure
    exit 0
fi

if [ "$DEPLOY_ALL" = true ]; then
    # Deploy all services
    deploy_service "payments" "$TAG" "$ENVIRONMENT"
    deploy_service "sales" "$TAG" "$ENVIRONMENT"
    deploy_service "purchasing" "$TAG" "$ENVIRONMENT"
    deploy_service "inventory" "$TAG" "$ENVIRONMENT"
    deploy_service "customer" "$TAG" "$ENVIRONMENT"
    deploy_service "user" "$TAG" "$ENVIRONMENT"
    exit 0
fi

if [ -z "$SERVICE" ]; then
    echo "❌ Error: No service specified."
    print_usage
fi

# Deploy specific service
deploy_service "$SERVICE" "$TAG" "$ENVIRONMENT"
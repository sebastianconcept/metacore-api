#!/bin/bash
set -e

echo "Starting API Gateway..."
echo "Current directory: $(pwd)"
echo "Files in current directory:"
ls -la

echo "Environment variables:"
env | sort

echo "Executing application..."
exec /app/api-gateway

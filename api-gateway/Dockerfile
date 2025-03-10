# Build stage
FROM rust:1.85 as builder

WORKDIR /usr/src/app

# Copy the entire project
COPY . .

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && \
  apt-get install -y --no-install-recommends ca-certificates libssl-dev curl && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the built binary from the builder stage
COPY --from=builder /usr/src/app/target/release/api-gateway /app/

# Copy startup script
COPY start.sh /app/
RUN chmod +x /app/start.sh

# Set environment variables
ENV RUST_LOG=debug
ENV ROCKET_ADDRESS=0.0.0.0
ENV ROCKET_PORT=3000

# Expose the port
EXPOSE 3000

# Run the application
CMD ["/app/start.sh"]
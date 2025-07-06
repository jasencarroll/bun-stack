# Docker Deployment Guide

This guide covers deploying Create Bun Stack applications using Docker for both development and production environments.

## Prerequisites

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed (included with Docker Desktop)
- Basic understanding of Docker concepts

## Quick Start

### Production Dockerfile

Create a `Dockerfile` in your project root:

```dockerfile
# syntax=docker/dockerfile:1

# Build stage
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production=false

# Copy source files
COPY . .

# Build the application
RUN bun run build:css

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 -s /bin/bash bunuser

# Copy application files
COPY --from=builder --chown=bunuser:bunuser /app .

# Remove development files
RUN rm -rf tests docs .git

USER bunuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run healthcheck.ts || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "src/server/index.ts"]
```

### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

## Development Setup

### Development Dockerfile

Create `Dockerfile.dev`:

```dockerfile
FROM oven/bun:1

WORKDIR /app

# Install development tools
RUN apt-get update && apt-get install -y \
    git \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lockb* ./

# Install all dependencies (including dev)
RUN bun install

# Copy source files
COPY . .

# Expose ports
EXPOSE 3000 5555

# Run in development mode
CMD ["bun", "run", "dev"]
```

### Development Docker Compose

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "5555:5555"  # Drizzle Studio
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.bun
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp_dev
      - JWT_SECRET=development-secret
    depends_on:
      - db
    networks:
      - dev-network

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=myapp_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    networks:
      - dev-network

volumes:
  postgres_dev_data:

networks:
  dev-network:
    driver: bridge
```

## Building and Running

### Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Run with rebuild
docker-compose -f docker-compose.dev.yml up --build

# Run in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production

```bash
# Build production image
docker build -t myapp:latest .

# Run with docker-compose
docker-compose up -d

# Run standalone
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  myapp:latest
```

## Database Management

### Running Migrations

```bash
# Development
docker-compose -f docker-compose.dev.yml exec app bun run db:push

# Production
docker-compose exec app bun run db:migrate
```

### Database Backup

```bash
# Backup database
docker-compose exec db pg_dump -U postgres myapp > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres myapp < backup.sql
```

### Accessing Database

```bash
# PostgreSQL CLI
docker-compose exec db psql -U postgres -d myapp

# Drizzle Studio (development)
docker-compose -f docker-compose.dev.yml exec app bun run db:studio
```

## Optimization

### Multi-stage Build Optimization

```dockerfile
# Optimized Dockerfile with caching
FROM oven/bun:1 as deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 as builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build:css && \
    bun run typecheck

FROM oven/bun:1-slim as runner
WORKDIR /app

RUN apt-get update && \
    apt-get install -y dumb-init && \
    rm -rf /var/lib/apt/lists/* && \
    useradd -m -u 1001 bunuser

COPY --from=builder --chown=bunuser:bunuser /app/public ./public
COPY --from=builder --chown=bunuser:bunuser /app/src ./src
COPY --from=builder --chown=bunuser:bunuser /app/node_modules ./node_modules
COPY --from=builder --chown=bunuser:bunuser /app/package.json ./

USER bunuser
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "src/server/index.ts"]
```

### Image Size Reduction

```dockerfile
# .dockerignore
node_modules
.git
.gitignore
README.md
.env*
.vscode
.idea
tests
coverage
docs
*.log
.DS_Store
dist
.turbo
```

### Build Arguments

```dockerfile
ARG NODE_ENV=production
ARG BUN_VERSION=1

FROM oven/bun:${BUN_VERSION} as builder

# Use build args
ENV NODE_ENV=${NODE_ENV}
```

```bash
# Build with arguments
docker build \
  --build-arg NODE_ENV=production \
  --build-arg BUN_VERSION=1.0.25 \
  -t myapp:latest .
```

## Container Orchestration

### Docker Swarm

```yaml
# docker-stack.yml
version: '3.8'

services:
  app:
    image: myapp:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://db:5432/myapp
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    deploy:
      placement:
        constraints:
          - node.role == manager
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    networks:
      - app-network

networks:
  app-network:
    driver: overlay

volumes:
  postgres_data:

secrets:
  db_password:
    external: true
```

Deploy:

```bash
# Initialize swarm
docker swarm init

# Create secrets
echo "strongpassword" | docker secret create db_password -

# Deploy stack
docker stack deploy -c docker-stack.yml myapp

# Scale service
docker service scale myapp_app=5
```

### Kubernetes

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: myapp-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: myapp-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

## Monitoring

### Health Check Script

Create `healthcheck.ts`:

```typescript
// healthcheck.ts
try {
  const response = await fetch("http://localhost:3000/api/health");
  if (!response.ok) {
    process.exit(1);
  }
  const data = await response.json();
  if (data.status !== "healthy") {
    process.exit(1);
  }
  process.exit(0);
} catch (error) {
  process.exit(1);
}
```

### Logging

```yaml
# docker-compose with logging
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Monitoring Stack

Add to `docker-compose.yml`:

```yaml
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - app-network

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    networks:
      - app-network

volumes:
  prometheus_data:
  grafana_data:
```

## Security Best Practices

### 1. **Use Non-Root User**

```dockerfile
RUN useradd -m -u 1001 appuser
USER appuser
```

### 2. **Scan for Vulnerabilities**

```bash
# Scan image with Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image myapp:latest
```

### 3. **Use Secrets**

```yaml
# docker-compose with secrets
services:
  app:
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
    secrets:
      - jwt_secret

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### 4. **Network Isolation**

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/docker.yml
name: Docker Build and Push

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Log in to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            myusername/myapp:latest
            myusername/myapp:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Troubleshooting

### Common Issues

1. **Container exits immediately**
   ```bash
   # Check logs
   docker logs <container_id>
   
   # Run with shell to debug
   docker run -it --entrypoint /bin/bash myapp:latest
   ```

2. **Database connection issues**
   ```bash
   # Check network connectivity
   docker exec app ping db
   
   # Verify environment variables
   docker exec app env | grep DATABASE
   ```

3. **Permission errors**
   ```bash
   # Fix ownership
   docker exec -u root app chown -R bunuser:bunuser /app
   ```

4. **Build cache issues**
   ```bash
   # Build without cache
   docker build --no-cache -t myapp:latest .
   ```

## Next Steps

- Set up [Container Registry](/docs/advanced/container-registry)
- Configure [Kubernetes Deployment](/docs/deployment/kubernetes)
- Implement [Monitoring](/docs/advanced/monitoring)
- Review [Security Hardening](/docs/advanced/security)
# Fly.io Deployment Guide

Fly.io is a platform for running full-stack applications close to your users. This guide covers deploying Create Bun Stack applications to Fly.io with global distribution.

## Prerequisites

- Fly.io account ([Sign up free](https://fly.io))
- Fly CLI installed: `curl -L https://fly.io/install.sh | sh`
- Credit card (required for account verification, free tier available)

## Quick Start

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux/WSL
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Login to Fly

```bash
fly auth login
```

### 3. Launch Your App

```bash
# From your project directory
fly launch

# Follow the prompts:
# - Choose app name (or let Fly generate one)
# - Select region (closest to your users)
# - Setup PostgreSQL? Yes
# - Deploy now? Yes
```

## Configuration

### fly.toml

Fly creates `fly.toml` automatically. Customize it:

```toml
app = "your-app-name"
primary_region = "iad"  # Washington, DC
kill_signal = "SIGINT"
kill_timeout = 5

[build]
  dockerfile = "Dockerfile"
  
[env]
  NODE_ENV = "production"
  PORT = "8080"

[experimental]
  auto_rollback = true
  enable_consul = true

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"

  [[services.http_checks]]
    interval = 10000
    grace_period = "5s"
    method = "get"
    path = "/api/health"
    protocol = "http"
    restart_limit = 0
    timeout = 2000
    tls_skip_verify = false
    [services.http_checks.headers]

[mounts]
  source = "data"
  destination = "/data"

[[statics]]
  guest_path = "/app/public"
  url_prefix = "/"
```

### Dockerfile for Fly

Create an optimized `Dockerfile`:

```dockerfile
# syntax = docker/dockerfile:1

# Build stage
FROM oven/bun:1 as build
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production=false

# Copy application files
COPY . .

# Build application
RUN bun run build:css

# Runtime stage
FROM oven/bun:1-slim
WORKDIR /app

# Install runtime dependencies
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    dumb-init && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser

# Copy built application
COPY --from=build --chown=appuser:appuser /app .

# Switch to non-root user
USER appuser

# Expose port (Fly uses 8080 by default)
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["bun", "run", "src/server/index.ts"]
```

## Database Setup

### PostgreSQL on Fly

```bash
# Create PostgreSQL cluster
fly postgres create

# Follow prompts:
# - Choose name: my-app-db
# - Select region: same as app
# - Choose configuration: Development

# Attach to your app
fly postgres attach my-app-db

# This sets DATABASE_URL automatically
```

### Database Management

```bash
# Connect to database
fly postgres connect -a my-app-db

# Run migrations
fly ssh console -C "bun run db:push"

# Create backup
fly postgres backup create -a my-app-db

# List backups
fly postgres backup list -a my-app-db

# Restore from backup
fly postgres backup restore <backup-id> -a my-app-db
```

### Using Fly Volumes for SQLite

```toml
# fly.toml
[mounts]
  source = "sqlite_data"
  destination = "/data"
```

```bash
# Create volume
fly volumes create sqlite_data --size 1 --region iad

# Update database path
# DATABASE_URL=sqlite:///data/app.db
```

## Deployment

### Deploy Command

```bash
# Deploy to production
fly deploy

# Deploy with specific Docker file
fly deploy --dockerfile Dockerfile.fly

# Deploy without cache
fly deploy --no-cache

# Deploy to specific region
fly deploy --region lhr
```

### Deployment Strategies

#### Blue-Green Deployment

```bash
# Create staging app
fly apps create my-app-staging

# Deploy to staging
fly deploy -a my-app-staging

# Promote to production
fly deploy -a my-app --image registry.fly.io/my-app-staging:latest
```

#### Rolling Deployment

```toml
# fly.toml
[deploy]
  strategy = "rolling"
  max_unavailable = 1
```

### GitHub Actions

```yaml
# .github/workflows/fly.yml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: superfly/flyctl-actions/setup-flyctl@master
      
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Scaling

### Horizontal Scaling

```bash
# Scale to multiple instances
fly scale count 3

# Scale by region
fly scale count 2 --region iad
fly scale count 1 --region lhr

# Auto-scaling
fly autoscale set min=1 max=10
```

### Vertical Scaling

```bash
# List available VMs
fly platform vm-sizes

# Scale VM size
fly scale vm shared-cpu-2x

# Scale memory
fly scale memory 512

# Show current scale
fly scale show
```

### Multi-Region Deployment

```bash
# Add regions
fly regions add sin hkg nrt

# Remove regions
fly regions remove iad

# List regions
fly regions list

# Set backup regions
fly regions backup lhr fra
```

## Environment Variables

### Set Variables

```bash
# Set single variable
fly secrets set JWT_SECRET=your-secret-key

# Set multiple variables
fly secrets set NODE_ENV=production PORT=8080

# From .env file
fly secrets import < .env.production

# List secrets
fly secrets list

# Remove secret
fly secrets unset API_KEY
```

### Runtime Configuration

```typescript
// src/config.ts
export const config = {
  // Fly.io provides these
  region: process.env.FLY_REGION || "unknown",
  appName: process.env.FLY_APP_NAME || "local",
  instanceId: process.env.FLY_ALLOC_ID || "local",
  
  // Your config
  port: parseInt(process.env.PORT || "8080"),
  databaseUrl: process.env.DATABASE_URL!,
};
```

## Custom Domains

### Add Domain

```bash
# Add custom domain
fly certs add yourdomain.com

# Add wildcard
fly certs add "*.yourdomain.com"

# List certificates
fly certs list

# Check certificate status
fly certs check yourdomain.com
```

### DNS Configuration

```
# A record for apex domain
Type: A
Name: @
Value: <fly-ipv4>

# AAAA record for IPv6
Type: AAAA
Name: @
Value: <fly-ipv6>

# CNAME for subdomains
Type: CNAME
Name: www
Value: yourdomain.com.
```

## Monitoring

### Logs

```bash
# View logs
fly logs

# Follow logs
fly logs -f

# Filter by instance
fly logs --instance=abcd1234

# JSON format
fly logs --json
```

### Metrics

```bash
# View metrics dashboard
fly dashboard metrics

# Export metrics
fly metrics export
```

### Custom Metrics

```typescript
// src/server/metrics.ts
import { collectDefaultMetrics, register } from "prom-client";

// Collect default metrics
collectDefaultMetrics();

// Custom metrics endpoint
export const metrics = {
  "/metrics": {
    GET: async () => {
      const metrics = await register.metrics();
      return new Response(metrics, {
        headers: {
          "Content-Type": register.contentType,
        },
      });
    },
  },
};
```

### Health Checks

```typescript
// src/server/routes/health.ts
export const health = {
  "/": {
    GET: async () => {
      const checks = {
        server: "healthy",
        database: await checkDatabase(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        region: process.env.FLY_REGION,
      };
      
      const healthy = Object.values(checks).every(
        (check) => check !== "unhealthy"
      );
      
      return Response.json(
        {
          status: healthy ? "healthy" : "unhealthy",
          checks,
          timestamp: new Date().toISOString(),
        },
        { status: healthy ? 200 : 503 }
      );
    },
  },
};
```

## Caching

### Redis on Fly

```bash
# Create Redis instance
fly apps create my-app-redis
fly redis create

# Get connection info
fly redis status -a my-app-redis
```

### Edge Caching

```typescript
// Cache static assets at edge
export function cacheMiddleware(req: Request): Response | null {
  const url = new URL(req.url);
  
  if (url.pathname.startsWith("/public/")) {
    return new Response(null, {
      headers: {
        "Cache-Control": "public, max-age=31536000",
        "Fly-Cache-Status": "HIT",
      },
    });
  }
  
  return null;
}
```

## Security

### Private Networking

```bash
# Create private network
fly wireguard create

# List peer connections
fly wireguard list

# Connect services privately
# Use: my-app-db.internal:5432
```

### Secrets Management

```bash
# Generate secure secrets
fly secrets set JWT_SECRET=$(openssl rand -base64 32)
fly secrets set SESSION_SECRET=$(openssl rand -base64 32)

# Rotate secrets
fly secrets set JWT_SECRET=$(openssl rand -base64 32) --stage
fly deploy
fly secrets set JWT_SECRET=$(openssl rand -base64 32)
```

### Security Headers

```typescript
// Fly proxy adds some headers automatically
// Add additional security headers:
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
```

## Performance Optimization

### Build Optimization

```dockerfile
# Multi-stage build with layer caching
FROM oven/bun:1 as deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 as build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build:css

FROM oven/bun:1-slim as runtime
WORKDIR /app
COPY --from=build /app .
USER bun
EXPOSE 8080
CMD ["bun", "src/server/index.ts"]
```

### Connection Pooling

```typescript
// Database connection pooling
const sql = postgres(process.env.DATABASE_URL, {
  max: 20, // Fly recommends 20 connections per instance
  idle_timeout: 20,
  connect_timeout: 10,
});
```

### Response Compression

```typescript
// Enable Brotli compression
Bun.serve({
  port: 8080,
  compression: true,
  fetch: router.fetch,
});
```

## Troubleshooting

### Common Issues

1. **Health check failures**
   ```bash
   # Check health endpoint
   fly ssh console -C "curl localhost:8080/api/health"
   
   # Increase grace period in fly.toml
   grace_period = "30s"
   ```

2. **Out of memory**
   ```bash
   # Check memory usage
   fly status
   
   # Scale memory
   fly scale memory 512
   ```

3. **Database connection issues**
   ```bash
   # Check DATABASE_URL
   fly ssh console -C "printenv DATABASE_URL"
   
   # Test connection
   fly postgres connect -a my-app-db
   ```

4. **Deploy failures**
   ```bash
   # Check build logs
   fly logs --stage build
   
   # SSH into instance
   fly ssh console
   
   # Check running processes
   fly ssh console -C "ps aux"
   ```

### Debug Mode

```bash
# Enable debug logging
fly secrets set DEBUG=true LOG_LEVEL=debug

# SSH into running instance
fly ssh console

# Run commands in container
fly ssh console -C "bun run db:migrate"
```

## Cost Optimization

### Resource Limits

```toml
# fly.toml
[[services]]
  internal_port = 8080
  
  [[services.concurrency]]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

[processes]
  app = "bun src/server/index.ts"
  worker = "bun src/worker.ts"
```

### Scale to Zero

```bash
# Enable scale to zero (hobby plan)
fly scale count 0 --yes

# Auto-start on request
fly autoscale set min=0 max=3
```

### Monitor Usage

```bash
# Check current usage
fly status

# View billing
fly billing

# Set spending limit
fly spending limit set 25
```

## Best Practices

1. **Use Health Checks**
   - Implement comprehensive health endpoints
   - Include dependency checks

2. **Optimize Images**
   - Use multi-stage builds
   - Minimize final image size
   - Use slim base images

3. **Handle Graceful Shutdown**
   ```typescript
   process.on("SIGINT", async () => {
     console.log("Shutting down gracefully...");
     await server.stop();
     process.exit(0);
   });
   ```

4. **Use Fly Machines API**
   ```typescript
   // Get instance metadata
   const response = await fetch("http://[::1]:8080/v1/apps/current");
   const metadata = await response.json();
   ```

## Advanced Features

### Machines API

```bash
# Create machine
fly machines create . --name worker --region iad

# List machines
fly machines list

# Update machine
fly machines update <machine-id> --memory 512
```

### Scheduled Tasks

```typescript
// src/cron.ts
import { CronJob } from "cron";

// Run only on one instance
if (process.env.FLY_ALLOC_ID?.endsWith("-0")) {
  new CronJob("0 0 * * *", async () => {
    console.log("Running daily cleanup...");
    await runDailyCleanup();
  }).start();
}
```

### WebSockets

```toml
# fly.toml
[[services]]
  internal_port = 8080
  protocol = "tcp"
  
  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
    
  # Enable WebSocket support
  [[services.tcp_checks]]
    interval = "30s"
    timeout = "5s"
```

## Migration Guide

### From Heroku

```bash
# Export Heroku config
heroku config -s -a your-heroku-app > .env.fly

# Import to Fly
fly secrets import < .env.fly

# Update Procfile commands to fly.toml
```

### From Vercel

- Move API routes to Bun server
- Configure build output
- Update environment variables

## Next Steps

- Configure [Multi-Region Setup](/docs/advanced/multi-region)
- Implement [Edge Computing](/docs/advanced/edge-computing)
- Set up [Monitoring](/docs/advanced/monitoring)
- Review [Production Checklist](/docs/guide/deployment.md#pre-deployment-checklist)
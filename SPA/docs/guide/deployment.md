# Deployment Guide

This guide covers deploying Create Bun Stack applications to various platforms and environments.

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All tests pass (`bun test`)
- [ ] TypeScript compiles without errors (`bun run typecheck`)
- [ ] Environment variables are configured
- [ ] Database migrations are ready
- [ ] Security headers are enabled
- [ ] HTTPS is configured
- [ ] Monitoring is set up

## Environment Variables

### Required for Production

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secure-random-string-min-32-chars
PORT=3000

# Optional but recommended
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

### Generating Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Or using Bun
bun -e "console.log(crypto.randomBytes(32).toString('base64'))"
```

## Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build for smaller image
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build CSS
RUN bun run build:css

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built application
COPY --from=builder /app .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun healthcheck.ts || exit 1

CMD ["bun", "src/server/index.ts"]
```

### Docker Compose

```yaml
# docker-compose.yml
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
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Building and Running

```bash
# Build image
docker build -t myapp .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Run migrations
docker-compose exec app bun run db:push
```

## Platform-Specific Deployments

### Railway

Railway automatically detects and deploys Bun applications.

1. **Install Railway CLI**:
```bash
npm install -g @railway/cli
```

2. **Deploy**:
```bash
# Login to Railway
railway login

# Initialize project
railway init

# Link to existing project
railway link

# Deploy
railway up
```

3. **Configure environment**:
```bash
# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)

# Add PostgreSQL
railway add postgresql

# Deploy with variables
railway up
```

4. **Railway.json** (optional):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "bun src/server/index.ts",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Fly.io

1. **Install Fly CLI**:
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Initialize**:
```bash
fly launch
```

3. **fly.toml**:
```toml
app = "your-app-name"
primary_region = "iad"

[build]
  builder = "dockerfile"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[experimental]
  auto_rollback = true

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
```

4. **Deploy**:
```bash
# Set secrets
fly secrets set JWT_SECRET=$(openssl rand -base64 32)

# Create PostgreSQL
fly postgres create
fly postgres attach

# Deploy
fly deploy

# Open app
fly open
```

### Render

1. **render.yaml**:
```yaml
services:
  - type: web
    name: myapp
    env: docker
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: myapp-db
          property: connectionString

databases:
  - name: myapp-db
    plan: free
```

2. **Deploy via Dashboard**:
- Connect GitHub repository
- Render auto-deploys on push

### DigitalOcean App Platform

1. **app.yaml**:
```yaml
name: myapp
region: nyc
services:
  - name: web
    github:
      repo: your-username/your-repo
      branch: main
    build_command: bun install && bun run build:css
    run_command: bun src/server/index.ts
    environment_slug: bun
    instance_size_slug: basic-xxs
    instance_count: 1
    http_port: 3000
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      - key: JWT_SECRET
        scope: RUN_TIME
        type: SECRET

databases:
  - name: db
    engine: PG
    production: false
```

## VPS Deployment

### Server Setup (Ubuntu/Debian)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Create database
sudo -u postgres createdb myapp
sudo -u postgres createuser myappuser -P

# Clone repository
git clone https://github.com/your-username/your-app.git /var/www/myapp
cd /var/www/myapp

# Install dependencies
bun install

# Build CSS
bun run build:css

# Setup environment
cp .env.example .env
nano .env  # Edit with your values
```

### Systemd Service

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Bun Stack App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/myapp
ExecStart=/home/ubuntu/.bun/bin/bun src/server/index.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/myapp/.env

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/myapp

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable myapp
sudo systemctl start myapp
sudo systemctl status myapp
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/myapp
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Proxy configuration
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /public {
        alias /var/www/myapp/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Database Management

### Running Migrations

```bash
# Production migration
NODE_ENV=production bun run db:push

# Or with explicit URL
DATABASE_URL=postgresql://... bun run db:push
```

### Backup Strategy

```bash
# PostgreSQL backup script
#!/bin/bash
# /home/ubuntu/backup.sh

BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="myapp"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql s3://my-backups/
```

```bash
# Add to crontab
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup.sh
```

## Monitoring

### Health Checks

```typescript
// src/server/routes/health.ts
export const health = {
  "/": {
    GET: async () => {
      try {
        // Check database
        await db.execute(sql`SELECT 1`);
        
        return Response.json({
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        });
      } catch (error) {
        return Response.json(
          { status: "unhealthy", error: error.message },
          { status: 503 }
        );
      }
    },
  },
};
```

### Logging

```typescript
// src/server/middleware/logging.ts
export function loggingMiddleware(req: Request): Response | null {
  const start = Date.now();
  
  // Log after response
  queueMicrotask(() => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      duration,
      userAgent: req.headers.get("user-agent"),
    }));
  });
  
  return null;
}
```

### Application Monitoring

1. **Sentry** for error tracking:
```typescript
import * as Sentry from "@sentry/bun";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

2. **Prometheus** metrics:
```typescript
// src/server/metrics.ts
import { Registry, Counter, Histogram } from "prom-client";

const register = new Registry();

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});
```

## Performance Optimization

### Caching

```nginx
# Nginx caching for static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Compression

```typescript
// Enable Bun compression
Bun.serve({
  port: 3000,
  fetch: router.fetch,
  compression: true, // Enable gzip/br
});
```

### CDN Integration

```html
<!-- Use CDN for static assets -->
<link rel="stylesheet" href="https://cdn.yourdomain.com/styles.css">
<script src="https://cdn.yourdomain.com/app.js"></script>
```

## Security Hardening

### Environment Security

```bash
# Secure file permissions
chmod 600 .env
chmod 755 /var/www/myapp
chmod 644 /var/www/myapp/public/*

# Firewall rules
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Application Security

```typescript
// Additional security headers
const securityHeaders = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
```

## Rollback Strategy

### Git-based Rollback

```bash
# Tag releases
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Rollback script
#!/bin/bash
# /home/ubuntu/rollback.sh

cd /var/www/myapp
git fetch --tags
git checkout $1  # Tag to rollback to
bun install
bun run build:css
sudo systemctl restart myapp
```

### Database Rollback

```bash
# Before deployment
pg_dump myapp > backup_before_deploy.sql

# Rollback if needed
psql myapp < backup_before_deploy.sql
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

2. **Permission denied**:
```bash
sudo chown -R www-data:www-data /var/www/myapp
```

3. **Database connection failed**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -U myappuser -d myapp -h localhost
```

4. **SSL certificate issues**:
```bash
# Renew certificate
sudo certbot renew --dry-run
sudo certbot renew
```

### Debug Production Issues

```bash
# View logs
sudo journalctl -u myapp -f

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Application logs
tail -f /var/www/myapp/logs/app.log
```

## Next Steps

- Set up [Continuous Deployment](/docs/advanced/ci-cd)
- Configure [Monitoring](/docs/advanced/monitoring)
- Implement [Backup Strategy](/docs/advanced/backup)
- Review [Security Checklist](/docs/advanced/security)
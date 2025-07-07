# Railway Deployment Guide

Railway is a modern platform-as-a-service that makes deploying Bun applications simple and fast. This guide covers deploying Create Bun Stack to Railway.

## Prerequisites

- Railway account ([Sign up free](https://railway.app))
- GitHub account (for automatic deployments)
- Railway CLI (optional): `npm install -g @railway/cli`

## Quick Deploy

### Option 1: Deploy from GitHub (Recommended)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/jasencarroll.git
   git push -u origin main
   ```

2. **Connect to Railway**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway auto-detects Bun and configures the build

3. **Configure environment variables**
   - Click on your service
   - Go to "Variables" tab
   - Add required variables:
     ```
     NODE_ENV=production
     JWT_SECRET=your-secret-key-min-32-chars
     ```

4. **Add PostgreSQL**
   - Click "New" in your project
   - Select "Database" → "Add PostgreSQL"
   - Railway automatically adds `DATABASE_URL`

### Option 2: Deploy with CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize new project
railway init

# Link to existing project
railway link

# Deploy
railway up
```

## Configuration

### railway.json

Create `railway.json` in your project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "bun install && bun run build:css"
  },
  "deploy": {
    "runtime": "bun",
    "startCommand": "bun src/server/index.ts",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30
  },
  "environments": {
    "production": {
      "build": {
        "buildCommand": "bun install --production=false && bun run build:css"
      }
    }
  }
}
```

### Nixpacks Configuration

Create `nixpacks.toml` for custom build configuration:

```toml
[phases.setup]
nixPkgs = ["bun", "nodejs"]

[phases.install]
cmds = ["bun install --frozen-lockfile"]

[phases.build]
cmds = [
  "bun run build:css",
  "bun run typecheck"
]

[start]
cmd = "bun src/server/index.ts"

[variables]
NODE_ENV = "production"
```

### Environment Variables

Set these in Railway dashboard or via CLI:

```bash
# Required
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)

# Optional
railway variables set PORT=3000
railway variables set CORS_ORIGIN=https://yourdomain.com
railway variables set RATE_LIMIT_MAX=100
```

## Database Setup

### PostgreSQL with Railway

Railway provides managed PostgreSQL:

1. **Add PostgreSQL to your project**
   ```bash
   railway add postgresql
   ```

2. **DATABASE_URL is automatically set**
   Railway injects `DATABASE_URL` into your app

3. **Run migrations**
   ```bash
   # Via Railway CLI
   railway run bun run db:push
   
   # Or in Railway dashboard terminal
   bun run db:push
   ```

### Database Backups

```bash
# Create backup
railway run pg_dump $DATABASE_URL > backup.sql

# Restore backup
railway run psql $DATABASE_URL < backup.sql
```

## Custom Domain

### Adding a Domain

1. **In Railway Dashboard**
   - Go to your service settings
   - Click "Domains"
   - Add your custom domain

2. **Configure DNS**
   - Add CNAME record pointing to Railway domain
   - Or use Railway's nameservers

3. **SSL Certificate**
   - Railway automatically provisions Let's Encrypt SSL
   - No additional configuration needed

### Example DNS Configuration

```
Type: CNAME
Name: app (or @ for root domain)
Value: your-app.up.railway.app
TTL: 3600
```

## Deployment Configuration

### Build Configuration

```javascript
// railway.config.js
module.exports = {
  build: {
    // Use Bun for installation
    installCommand: "bun install",
    
    // Build assets
    buildCommand: "bun run build:css && bun run build",
    
    // Output directory (if applicable)
    outputDirectory: "dist",
  },
  
  deploy: {
    // Start command
    startCommand: "bun src/server/index.ts",
    
    // Health check
    healthcheck: {
      path: "/api/health",
      interval: 30,
      timeout: 10,
      retries: 3,
    },
  },
};
```

### Multi-Environment Setup

```bash
# Create staging environment
railway environment create staging

# Switch to staging
railway environment staging

# Deploy to staging
railway up

# Promote to production
railway environment production
railway up
```

## Monitoring and Logs

### View Logs

```bash
# Via CLI
railway logs

# Follow logs
railway logs -f

# Filter logs
railway logs --filter="ERROR"
```

### In Dashboard

- Real-time logs
- Metrics (CPU, Memory, Network)
- Deployment history
- Error tracking

### Custom Metrics

```typescript
// src/server/metrics.ts
export async function reportMetrics() {
  const metrics = {
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    // Custom metrics
  };
  
  // Railway captures console output
  console.log("METRICS:", JSON.stringify(metrics));
}

// Report every 5 minutes
setInterval(reportMetrics, 5 * 60 * 1000);
```

## CI/CD with Railway

### GitHub Integration

Railway automatically deploys on push to main:

```yaml
# .github/workflows/railway-preview.yml
name: Railway Preview Deployments

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: bcomnes/deploy-to-railway@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          environment: pr-${{ github.event.number }}
```

### Deployment Hooks

```json
// railway.json
{
  "deploy": {
    "preDeploy": "bun run test",
    "postDeploy": "bun run db:migrate"
  }
}
```

## Scaling

### Horizontal Scaling

```bash
# Scale to multiple instances
railway scale --replicas 3

# Auto-scaling configuration
railway scale --min 1 --max 10 --cpu-threshold 70
```

### Vertical Scaling

In Railway dashboard:
- Adjust CPU and RAM limits
- Default: 8 GB RAM, 8 vCPUs
- Can scale up to 32 GB RAM

### Load Balancing

Railway automatically load balances between instances:

```typescript
// src/server/index.ts
const instanceId = process.env.RAILWAY_INSTANCE_ID || "unknown";

console.log(`Server starting on instance: ${instanceId}`);
```

## Caching

### Redis on Railway

1. **Add Redis**
   ```bash
   railway add redis
   ```

2. **Use in your app**
   ```typescript
   import { createClient } from "redis";
   
   const redis = createClient({
     url: process.env.REDIS_URL,
   });
   
   await redis.connect();
   ```

### Static Asset Caching

```typescript
// Configure cache headers
app.use("/public", (req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=31536000");
  next();
});
```

## Security

### Environment Variables

```bash
# Generate secrets
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set SESSION_SECRET=$(openssl rand -base64 32)

# Set secure flags
railway variables set SECURE_COOKIES=true
railway variables set FORCE_HTTPS=true
```

### Network Security

Railway provides:
- DDoS protection
- SSL/TLS encryption
- Isolated network per project
- Private networking between services

### Security Headers

```typescript
// Automatically applied by Railway proxy
// Additional headers in your app:
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   railway logs --build
   
   # Clear build cache
   railway up --no-cache
   ```

2. **Database Connection**
   ```bash
   # Verify DATABASE_URL
   railway variables
   
   # Test connection
   railway run bun eval "console.log(process.env.DATABASE_URL)"
   ```

3. **Memory Issues**
   ```javascript
   // Add to package.json
   "scripts": {
     "start": "bun --max-old-space-size=4096 src/server/index.ts"
   }
   ```

4. **Port Configuration**
   Railway automatically sets PORT, but you can override:
   ```typescript
   const port = process.env.PORT || 3000;
   ```

### Debug Mode

```bash
# Enable debug logs
railway variables set DEBUG=true
railway variables set LOG_LEVEL=debug

# Deploy with verbose logging
railway up --verbose
```

## Cost Optimization

### Resource Limits

```json
// railway.json
{
  "deploy": {
    "resources": {
      "memory": "512Mi",
      "cpu": "0.5"
    }
  }
}
```

### Sleep Mode

For development/staging:
```bash
railway variables set RAILWAY_SLEEP_AFTER=300  # 5 minutes
```

### Monitoring Usage

- Check Railway dashboard for usage metrics
- Set up billing alerts
- Use Railway's $5/month free tier efficiently

## Best Practices

1. **Use Production Mode**
   ```bash
   railway variables set NODE_ENV=production
   ```

2. **Enable Health Checks**
   ```typescript
   // src/server/routes/health.ts
   export const health = {
     "/": {
       GET: async () => {
         const healthy = await checkDatabaseConnection();
         return Response.json({
           status: healthy ? "healthy" : "unhealthy",
           timestamp: new Date().toISOString(),
         });
       },
     },
   };
   ```

3. **Optimize Build**
   ```toml
   # nixpacks.toml
   [phases.build]
   onlyIncludeFiles = [
     "src/**",
     "public/**",
     "package.json",
     "bun.lockb"
   ]
   ```

4. **Use Private Networking**
   ```typescript
   // For internal services
   const INTERNAL_API = process.env.RAILWAY_PRIVATE_DOMAIN
     ? `http://${process.env.RAILWAY_PRIVATE_DOMAIN}:${process.env.PORT}`
     : "http://localhost:3000";
   ```

## Migration from Other Platforms

### From Heroku

```bash
# Export Heroku config
heroku config -s > .env.production

# Import to Railway
railway variables import .env.production

# Update buildpacks to nixpacks
# Railway auto-detects Bun
```

### From Vercel/Netlify

- Move API routes to Bun server
- Update environment variables
- Configure build commands

## Next Steps

- Set up [Monitoring](/docs/advanced/monitoring)
- Configure [CI/CD Pipeline](/docs/advanced/ci-cd)
- Implement [Caching Strategy](/docs/advanced/caching)
- Review [Production Checklist](/docs/guide/deployment.md#pre-deployment-checklist)
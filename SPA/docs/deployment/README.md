# Deployment Guides

This section provides detailed deployment guides for various platforms and environments. Each guide includes step-by-step instructions, best practices, and troubleshooting tips.

## Platform Guides

### 🐳 [Docker](./docker.md)
Complete guide for containerizing and deploying with Docker.

- Multi-stage Dockerfile optimization
- Docker Compose for development and production
- Container orchestration with Swarm/Kubernetes
- Security best practices
- Monitoring and logging
- CI/CD integration

### 🚂 [Railway](./railway.md)
Deploy to Railway's modern platform-as-a-service.

- One-click deployments from GitHub
- Automatic builds and deployments
- PostgreSQL and Redis integration
- Custom domains and SSL
- Environment management
- Scaling and monitoring

### ✈️ [Fly.io](./fly-io.md)
Global deployment with Fly.io's edge network.

- Multi-region deployment
- Edge computing capabilities
- PostgreSQL clusters
- WebSocket support
- Autoscaling
- Health checks and monitoring

### 🖥️ [VPS](./vps.md)
Traditional VPS deployment guide for full control.

- Initial server setup and security
- Nginx configuration
- SSL with Let's Encrypt
- Process management with systemd/PM2
- Database backup strategies
- Monitoring and maintenance

## Quick Comparison

| Feature | Docker | Railway | Fly.io | VPS |
|---------|--------|---------|---------|-----|
| **Ease of Setup** | Medium | Easy | Easy | Hard |
| **Control Level** | High | Medium | Medium | Full |
| **Scaling** | Manual/Auto | Auto | Auto | Manual |
| **Pricing** | Variable | $5/month | Pay-as-you-go | $5-40/month |
| **SSL Certificates** | Manual | Automatic | Automatic | Let's Encrypt |
| **Database** | Self-managed | Managed | Managed | Self-managed |
| **CI/CD** | DIY | Built-in | GitHub Actions | DIY |
| **Multi-region** | Complex | No | Yes | Complex |
| **Zero-downtime** | Yes | Yes | Yes | Manual |
| **Root Access** | In container | No | No | Yes |

## Choosing a Platform

### Use Docker When:
- You need consistent environments across dev/staging/prod
- You want to deploy to multiple cloud providers
- You have complex dependencies or microservices
- You need fine-grained control over the environment

### Use Railway When:
- You want the simplest deployment experience
- You need automatic deployments from GitHub
- You prefer managed databases
- You're building a traditional web application
- You want predictable pricing

### Use Fly.io When:
- You need global distribution
- You want edge computing capabilities
- You have real-time features (WebSockets)
- You need to scale to zero
- You want pay-per-use pricing

### Use VPS When:
- You need full control over the server
- You have specific compliance requirements
- You want to minimize costs at scale
- You have complex networking needs
- You're comfortable with Linux administration

## Pre-Deployment Checklist

Before deploying to any platform:

### Code Preparation
- [ ] All tests pass (`bun test`)
- [ ] TypeScript compiles without errors (`bun run typecheck`)
- [ ] Code is linted and formatted (`bun run lint`)
- [ ] Production dependencies are specified
- [ ] Environment variables are documented

### Security
- [ ] Strong JWT secret (32+ characters)
- [ ] Database credentials are secure
- [ ] HTTPS is configured
- [ ] Security headers are enabled
- [ ] Rate limiting is configured
- [ ] CORS is properly configured

### Database
- [ ] Migrations are up to date
- [ ] Backup strategy is in place
- [ ] Connection pooling is configured
- [ ] Indexes are optimized

### Performance
- [ ] CSS is built for production
- [ ] Assets are optimized
- [ ] Caching headers are set
- [ ] Compression is enabled
- [ ] Monitoring is configured

## Environment Variables

Required for all deployments:

```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Authentication
JWT_SECRET=your-very-secure-random-string-min-32-chars

# Optional but recommended
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

## Common Deployment Commands

### Build Commands

```bash
# Install production dependencies
bun install --production

# Build CSS
bun run build:css

# Run database migrations
bun run db:migrate

# Start production server
bun run start
```

### Health Check Endpoint

All platforms should use this health check:

```typescript
// GET /api/health
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

## Post-Deployment

### Monitoring

Set up monitoring for:
- Application health
- Error rates
- Response times
- Database performance
- Server resources

### Backups

Implement regular backups:
- Database backups (daily)
- Application state
- User-uploaded files
- Configuration files

### Security Updates

- Enable automatic security updates
- Monitor for vulnerabilities
- Regular dependency updates
- Security audit schedule

## Troubleshooting

### Common Issues Across Platforms

1. **Application won't start**
   - Check environment variables
   - Verify database connection
   - Look at application logs
   - Test locally with production settings

2. **Database connection errors**
   - Verify DATABASE_URL format
   - Check network connectivity
   - Ensure database is running
   - Check connection pool settings

3. **Memory issues**
   - Monitor memory usage
   - Optimize application code
   - Increase server resources
   - Check for memory leaks

4. **Performance problems**
   - Enable caching
   - Optimize database queries
   - Use CDN for static assets
   - Consider horizontal scaling

## Migration Between Platforms

### Export Data
```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Export environment variables
env | grep -E '^(JWT_|DATABASE_|APP_)' > .env.backup
```

### Import Data
```bash
# Import database
psql $NEW_DATABASE_URL < backup.sql

# Import environment variables
source .env.backup
```

## Cost Optimization

### Tips for All Platforms

1. **Right-size resources** - Start small and scale up
2. **Use caching** - Reduce database load
3. **Optimize images** - Compress and resize
4. **Enable compression** - Gzip/Brotli
5. **Monitor usage** - Set up alerts
6. **Clean up unused resources** - Old backups, logs

## Next Steps

1. Choose your deployment platform based on your needs
2. Follow the specific platform guide
3. Set up monitoring and alerts
4. Implement backup strategy
5. Create deployment automation
6. Document your deployment process

## Getting Help

- Check platform-specific documentation
- Review [Troubleshooting Guide](../guide/troubleshooting.md)
- Join our [Community Discord](https://discord.gg/bun-stack)
- Search [GitHub Issues](https://github.com/jasencarroll/create-bun-stack/issues)
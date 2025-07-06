# VPS Deployment Guide

This guide covers deploying Create Bun Stack applications to Virtual Private Servers (VPS) like DigitalOcean, Linode, AWS EC2, or any Linux server.

## Prerequisites

- VPS with Ubuntu 22.04+ or Debian 11+
- SSH access to your server
- Domain name (optional but recommended)
- Basic Linux command line knowledge

## Initial Server Setup

### 1. Connect to Your Server

```bash
# Connect via SSH
ssh root@your-server-ip

# Or with SSH key
ssh -i ~/.ssh/your-key.pem ubuntu@your-server-ip
```

### 2. Create Non-Root User

```bash
# Create new user
adduser deploy

# Add to sudo group
usermod -aG sudo deploy

# Switch to new user
su - deploy
```

### 3. Setup SSH Key Authentication

```bash
# On your local machine
ssh-copy-id deploy@your-server-ip

# Or manually
mkdir ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your public key
chmod 600 ~/.ssh/authorized_keys
```

### 4. Secure SSH

Edit `/etc/ssh/sshd_config`:

```bash
sudo nano /etc/ssh/sshd_config

# Add/modify these lines:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers deploy

# Restart SSH
sudo systemctl restart sshd
```

## Install Dependencies

### System Updates

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  curl \
  git \
  build-essential \
  nginx \
  certbot \
  python3-certbot-nginx \
  postgresql \
  postgresql-contrib \
  redis-server \
  ufw \
  fail2ban \
  htop \
  tmux
```

### Install Bun

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH=$BUN_INSTALL/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Verify installation
bun --version
```

### Setup PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE myapp_production;
CREATE USER myapp WITH ENCRYPTED PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE myapp_production TO myapp;
\q

# Enable PostgreSQL to start on boot
sudo systemctl enable postgresql
```

### Configure Firewall

```bash
# Setup UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

## Deploy Application

### 1. Clone Repository

```bash
# Create app directory
sudo mkdir -p /var/www
sudo chown deploy:deploy /var/www
cd /var/www

# Clone your repository
git clone https://github.com/yourusername/your-app.git myapp
cd myapp
```

### 2. Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

Example `.env`:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://myapp:password@localhost:5432/myapp_production
JWT_SECRET=your-very-long-random-string
CORS_ORIGIN=https://yourdomain.com
```

### 3. Install Dependencies and Build

```bash
# Install dependencies
bun install --production

# Build assets
bun run build:css

# Run database migrations
bun run db:push

# Test the application
bun run start
```

## Process Management

### Using systemd

Create service file `/etc/systemd/system/myapp.service`:

```ini
[Unit]
Description=My Bun Stack App
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/myapp
Environment="NODE_ENV=production"
Environment="PORT=3000"
EnvironmentFile=/var/www/myapp/.env
ExecStart=/home/deploy/.bun/bin/bun src/server/index.ts
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/myapp

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable myapp

# Start service
sudo systemctl start myapp

# Check status
sudo systemctl status myapp

# View logs
sudo journalctl -u myapp -f
```

### Using PM2 (Alternative)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup systemd -u deploy --hp /home/deploy
```

`ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'myapp',
    script: 'bun',
    args: 'src/server/index.ts',
    cwd: '/var/www/myapp',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
```

## Nginx Configuration

### Basic Configuration

Create `/etc/nginx/sites-available/myapp`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logs
    access_log /var/log/nginx/myapp-access.log;
    error_log /var/log/nginx/myapp-error.log;

    # Proxy settings
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /public {
        alias /var/www/myapp/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploads
    client_max_body_size 10M;
}
```

Enable site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

## Database Backup

### Automated Backups

Create `/home/deploy/backup.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/deploy/backups"
DB_NAME="myapp_production"
DB_USER="myapp"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
S3_BUCKET="my-backups"
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
export PGPASSWORD="your-db-password"
pg_dump -h localhost -U $DB_USER $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to S3 (optional)
# aws s3 cp $BACKUP_FILE.gz s3://$S3_BUCKET/database/

# Remove old local backups
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

# Log
echo "Backup completed: $BACKUP_FILE.gz"
```

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/deploy/backup.sh >> /home/deploy/backup.log 2>&1
```

## Monitoring

### System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Check system resources
htop

# Monitor disk I/O
sudo iotop

# Monitor network usage
sudo nethogs
```

### Application Monitoring

Create `/home/deploy/healthcheck.sh`:

```bash
#!/bin/bash

HEALTH_URL="http://localhost:3000/api/health"
SLACK_WEBHOOK="your-slack-webhook-url"

# Check health
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $HTTP_STATUS -ne 200 ]; then
    # Send alert
    curl -X POST $SLACK_WEBHOOK \
        -H 'Content-type: application/json' \
        -d "{\"text\":\"🚨 Health check failed! Status: $HTTP_STATUS\"}"
    
    # Restart service
    sudo systemctl restart myapp
fi
```

Add to crontab:

```bash
# Check every 5 minutes
*/5 * * * * /home/deploy/healthcheck.sh
```

### Log Management

```bash
# Create log directory
sudo mkdir -p /var/log/myapp
sudo chown deploy:deploy /var/log/myapp

# Setup log rotation
sudo nano /etc/logrotate.d/myapp
```

`/etc/logrotate.d/myapp`:

```
/var/log/myapp/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        systemctl reload myapp >/dev/null 2>&1 || true
    endscript
}
```

## Security Hardening

### Fail2ban Configuration

Create `/etc/fail2ban/jail.local`:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
logpath = /var/log/nginx/*error.log

[myapp]
enabled = true
port = http,https
filter = myapp
logpath = /var/log/nginx/myapp-access.log
maxretry = 10
findtime = 60
bantime = 600
```

Create filter `/etc/fail2ban/filter.d/myapp.conf`:

```ini
[Definition]
failregex = ^<HOST> .* "(GET|POST) /api/auth/login.*" 401
ignoreregex =
```

Restart fail2ban:

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status
```

### Security Checklist

```bash
# Disable root login
sudo passwd -l root

# Update packages regularly
sudo apt update && sudo apt upgrade

# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Check for open ports
sudo netstat -tlnp

# Setup intrusion detection
sudo apt install rkhunter
sudo rkhunter --propupd
sudo rkhunter --check
```

## Performance Optimization

### Nginx Caching

Add to Nginx config:

```nginx
# Cache settings
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=myapp_cache:10m inactive=60m;
proxy_cache_key "$scheme$request_method$host$request_uri";

location / {
    proxy_cache myapp_cache;
    proxy_cache_valid 200 60m;
    proxy_cache_valid 404 1m;
    proxy_cache_bypass $http_cache_control;
    add_header X-Proxy-Cache $upstream_cache_status;
}
```

### System Tuning

Edit `/etc/sysctl.conf`:

```bash
# Network optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30

# File descriptors
fs.file-max = 65535
```

Apply changes:

```bash
sudo sysctl -p
```

## Deployment Script

Create `/home/deploy/deploy.sh`:

```bash
#!/bin/bash

set -e

echo "Starting deployment..."

# Variables
APP_DIR="/var/www/myapp"
BACKUP_DIR="/home/deploy/backups/code"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
echo "Creating backup..."
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/backup_$TIMESTAMP.tar.gz -C $APP_DIR .

# Pull latest code
echo "Pulling latest code..."
cd $APP_DIR
git pull origin main

# Install dependencies
echo "Installing dependencies..."
bun install --production

# Build assets
echo "Building assets..."
bun run build:css

# Run migrations
echo "Running migrations..."
bun run db:migrate

# Restart service
echo "Restarting service..."
sudo systemctl restart myapp

# Clean old backups
echo "Cleaning old backups..."
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Deployment completed!"
```

Make executable:

```bash
chmod +x /home/deploy/deploy.sh
```

## Rollback Procedure

Create `/home/deploy/rollback.sh`:

```bash
#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./rollback.sh backup_timestamp"
    exit 1
fi

BACKUP_FILE="/home/deploy/backups/code/backup_$1.tar.gz"
APP_DIR="/var/www/myapp"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Rolling back to $1..."

# Stop service
sudo systemctl stop myapp

# Restore backup
cd $APP_DIR
tar -xzf $BACKUP_FILE

# Restart service
sudo systemctl start myapp

echo "Rollback completed!"
```

## Troubleshooting

### Common Issues

1. **Service won't start**
   ```bash
   # Check logs
   sudo journalctl -u myapp -n 50
   
   # Check permissions
   ls -la /var/www/myapp
   
   # Test manually
   cd /var/www/myapp && bun src/server/index.ts
   ```

2. **502 Bad Gateway**
   ```bash
   # Check if app is running
   sudo systemctl status myapp
   
   # Check Nginx error log
   sudo tail -f /var/log/nginx/error.log
   
   # Verify proxy settings
   curl http://localhost:3000/api/health
   ```

3. **Database connection issues**
   ```bash
   # Test PostgreSQL connection
   psql -U myapp -d myapp_production -h localhost
   
   # Check PostgreSQL logs
   sudo tail -f /var/log/postgresql/*.log
   ```

4. **High memory usage**
   ```bash
   # Check memory
   free -h
   
   # Find memory-hungry processes
   ps aux --sort=-%mem | head
   
   # Add swap if needed
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

## Maintenance

### Regular Tasks

```bash
# Weekly updates
sudo apt update && sudo apt upgrade

# Check disk space
df -h

# Check logs size
du -sh /var/log/*

# Monitor service health
sudo systemctl status myapp nginx postgresql

# Check SSL certificate
sudo certbot certificates
```

### Scaling Considerations

1. **Vertical Scaling**
   - Upgrade VPS resources
   - Optimize application code
   - Add caching layers

2. **Horizontal Scaling**
   - Use load balancer (HAProxy/Nginx)
   - Multiple application servers
   - Centralized session storage (Redis)
   - Shared file storage (NFS/S3)

## Next Steps

- Set up [Monitoring](/docs/advanced/monitoring)
- Configure [CI/CD Pipeline](/docs/advanced/ci-cd)
- Implement [Backup Strategy](/docs/advanced/backup)
- Review [Security Best Practices](/docs/advanced/security)
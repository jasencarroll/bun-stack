# System Requirements

This page details the system requirements for running Create Bun Stack and applications built with it.

## Minimum Requirements

### Operating System

Create Bun Stack is supported on:

- **macOS**: 11.0 (Big Sur) or later
- **Linux**: Ubuntu 20.04+, Debian 10+, Fedora 32+, Alpine 3.13+
- **Windows**: Windows 10+ with WSL2 (Windows Subsystem for Linux)

### Hardware

- **CPU**: x64 or ARM64 processor
- **RAM**: Minimum 1GB, recommended 4GB+
- **Storage**: 500MB free space for Create Bun Stack + dependencies

### Software Dependencies

#### Required

- **Bun**: v1.0.0 or later
  ```bash
  # Check version
  bun --version
  ```

#### Optional

- **Git**: For version control
  ```bash
  git --version
  ```

- **PostgreSQL**: v12+ (for production deployments)
  ```bash
  psql --version
  ```

## Development Environment

### Recommended IDE/Editors

1. **Visual Studio Code** (Recommended)
   - Install the [Bun extension](https://marketplace.visualstudio.com/items?itemName=oven.bun-vscode)
   - Install the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
   - Install the [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

2. **WebStorm/IntelliJ IDEA**
   - Built-in TypeScript support
   - Bun run configuration support

3. **Neovim/Vim**
   - Use [coc.nvim](https://github.com/neoclide/coc.nvim) for TypeScript support
   - Install coc-tsserver for TypeScript LSP

### Browser Requirements

For development, you'll need a modern browser:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Production Environment

### Server Requirements

#### Minimum Server Specs

- **CPU**: 1 vCPU
- **RAM**: 1GB
- **Storage**: 10GB SSD
- **Network**: 100Mbps

#### Recommended Server Specs

- **CPU**: 2+ vCPUs
- **RAM**: 4GB+
- **Storage**: 20GB+ SSD
- **Network**: 1Gbps

### Supported Platforms

Create Bun Stack apps can be deployed to:

1. **VPS/Dedicated Servers**
   - Ubuntu Server 20.04+
   - Debian 10+
   - CentOS 8+
   - Alpine Linux 3.13+

2. **Container Platforms**
   - Docker 20.10+
   - Kubernetes 1.21+

3. **Platform-as-a-Service**
   - Railway
   - Fly.io
   - Render
   - Heroku (with buildpack)

4. **Cloud Providers**
   - AWS EC2
   - Google Cloud Compute
   - Azure VMs
   - DigitalOcean Droplets

## Database Requirements

### SQLite (Default)

- No additional installation required
- Included with Create Bun Stack
- Suitable for development and small production apps

### PostgreSQL (Recommended for Production)

- Version: 12.0 or later
- Extensions required:
  - uuid-ossp (for UUID generation)
  - pgcrypto (optional, for encryption)

### Connection Requirements

- For PostgreSQL: TCP port 5432 (default)
- For remote databases: Stable internet connection

## Network Requirements

### Development

- Internet connection for:
  - Installing dependencies
  - Downloading packages
  - Accessing documentation

### Production

- **Inbound ports**:
  - HTTP: 80
  - HTTPS: 443
  - Custom app port (default: 3000)

- **Outbound connections**:
  - Database server (if remote)
  - External APIs
  - CDN for assets

## Performance Considerations

### Development Machine

For optimal development experience:

- **CPU**: 4+ cores recommended
- **RAM**: 8GB+ recommended
- **Storage**: SSD strongly recommended
- **Node processes**: Bun uses less memory than Node.js

### Production Scaling

- **Single instance**: Can handle 100-1000 concurrent users
- **Horizontal scaling**: Supported via load balancer
- **Database connections**: Pool size of 10-20 recommended

## Checking Your System

Run this script to check if your system meets the requirements:

```bash
#!/bin/bash

echo "Checking system requirements for Create Bun Stack..."
echo "=================================================="

# Check OS
echo -n "Operating System: "
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS $(sw_vers -productVersion)"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Linux $(lsb_release -d -s 2>/dev/null || echo "Unknown distribution")"
else
    echo "Unknown ($OSTYPE)"
fi

# Check architecture
echo -n "Architecture: "
uname -m

# Check RAM
echo -n "RAM: "
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "$(( $(sysctl -n hw.memsize) / 1024 / 1024 / 1024 )) GB"
else
    echo "$(free -h | awk '/^Mem:/ {print $2}')"
fi

# Check Bun
echo -n "Bun: "
if command -v bun &> /dev/null; then
    bun --version
else
    echo "Not installed ❌"
fi

# Check Git
echo -n "Git: "
if command -v git &> /dev/null; then
    git --version | cut -d' ' -f3
else
    echo "Not installed (optional)"
fi

# Check PostgreSQL
echo -n "PostgreSQL: "
if command -v psql &> /dev/null; then
    psql --version | cut -d' ' -f3
else
    echo "Not installed (optional)"
fi

echo "=================================================="
```

Save this as `check-requirements.sh` and run:

```bash
chmod +x check-requirements.sh
./check-requirements.sh
```

## Troubleshooting

### Bun Installation Issues

If Bun installation fails:

1. **On macOS**: Install Xcode Command Line Tools
   ```bash
   xcode-select --install
   ```

2. **On Linux**: Install curl and unzip
   ```bash
   sudo apt-get update
   sudo apt-get install curl unzip
   ```

3. **On Windows**: Ensure WSL2 is properly installed
   ```powershell
   wsl --install
   ```

### Permission Issues

If you encounter permission errors:

```bash
# Fix Bun installation permissions
chmod +x ~/.bun/bin/bun

# Fix npm global permissions (if needed)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Performance Issues

If Bun runs slowly:

1. Check available disk space
2. Close unnecessary applications
3. Disable antivirus real-time scanning for development folders
4. Use SSD instead of HDD
5. Increase system swap space if RAM is limited

## Next Steps

Once your system meets the requirements:

1. [Install Create Bun Stack](/docs/getting-started/installation)
2. Follow the [Quick Start Guide](/docs/getting-started/quick-start)
3. Build your [First App](/docs/getting-started/first-app)
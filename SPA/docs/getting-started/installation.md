# Installation

Create Bun Stack is a CLI tool that generates a full-stack web application using Bun, React, and PostgreSQL/SQLite.

## Prerequisites

Before installing Create Bun Stack, you need to have Bun installed on your system.

### Installing Bun

If you don't have Bun installed, you can install it using one of these methods:

**macOS/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (WSL):**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Using npm (alternative):**
```bash
npm install -g bun
```

Verify your installation:
```bash
bun --version
```

## Installing Create Bun Stack

You don't need to install Create Bun Stack globally. You can use it directly with `bunx`:

```bash
bunx create-bun-stack my-app
```

This will:
1. Download the latest version of Create Bun Stack
2. Generate a new project in the `my-app` directory
3. Install all dependencies
4. Set up the database
5. Start the development server

## System Requirements

- **Bun**: v1.0.0 or higher
- **Node.js**: Not required (Bun is a complete JavaScript runtime)
- **Operating System**: macOS, Linux, or Windows (via WSL)
- **Memory**: 1GB RAM minimum
- **Disk Space**: 200MB for a new project

## Optional Dependencies

### PostgreSQL (Recommended for Production)

While Create Bun Stack uses SQLite by default, PostgreSQL is recommended for production:

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Docker:**
```bash
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

## Verifying Installation

After creating a new project, verify everything is working:

```bash
cd my-app
bun run test
```

All tests should pass, confirming your installation is successful.

## Troubleshooting

### "bun: command not found"

If you get this error after installation, you may need to add Bun to your PATH:

```bash
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH=$BUN_INSTALL/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Permission Errors

If you encounter permission errors during installation:

```bash
# Fix permissions for Bun installation
chmod +x ~/.bun/bin/bun

# Fix permissions for your project
chmod -R 755 my-app
```

### Database Connection Issues

If you're having trouble connecting to PostgreSQL:

1. Check if PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Create a database for your app:
   ```bash
   createdb my_app_development
   ```

3. Update your `.env` file with the correct DATABASE_URL

## Next Steps

Now that you have Create Bun Stack installed, you can:

- Follow the [Quick Start Guide](/docs/getting-started/quick-start) to create your first app
- Learn about the [Project Structure](/docs/guide/project-structure)
- Explore the [Features](/docs/features) included in your app
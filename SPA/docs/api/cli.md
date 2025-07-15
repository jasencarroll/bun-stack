# CLI Reference

Create Bun Stack provides a command-line interface for generating new projects and managing your application.

## Installation

```bash
# No installation needed - use directly with bunx
bunx create-bun-stack
```

## Commands

### `create-bun-stack`

Creates a new Bun Stack application with an interactive setup process.

```bash
bunx create-bun-stack
```

#### Interactive Prompts

The CLI will guide you through the following options:

1. **Project Name**
   - Enter your project name
   - Will be used for the directory name and package.json

2. **Database Selection**
   - SQLite (default for development)
   - PostgreSQL (recommended for production)
   - Both (dual support)

3. **Authentication**
   - Yes (recommended) - Includes full auth system
   - No - Basic setup without auth

4. **Seed Database**
   - Yes - Creates sample data
   - No - Empty database

5. **Git Repository**
   - Yes - Initializes git repo
   - No - Skip git initialization

#### CLI Flags (Future)

```bash
# Skip interactive prompts (planned feature)
bunx create-bun-stack --template default --db postgres --auth --git

# Options:
#   --template <name>    Template to use (default, minimal, api)
#   --db <type>         Database type (sqlite, postgres, both)
#   --auth              Include authentication
#   --no-auth           Skip authentication
#   --git               Initialize git repository
#   --no-git            Skip git initialization
#   --seed              Seed the database
#   --no-seed           Skip database seeding
```

## Project Scripts

After creating your project, these npm scripts are available:

### Development

```bash
# Start development server with hot reload
bun run dev

# Start with debug logging
DEBUG=true bun run dev

# Start with specific port
PORT=4000 bun run dev
```

### Building

```bash
# Build CSS for production
bun run build:css

# Build entire application
bun run build

# Type check TypeScript
bun run typecheck
```

### Database

```bash
# Push schema changes to database
bun run db:push

# Generate migration files
bun run db:generate

# Run migrations
bun run db:migrate

# Seed database with sample data
bun run db:seed

# Open Drizzle Studio (database GUI)
bun run db:studio
```

### Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run specific test file
bun test tests/server/auth.test.ts

# Run tests matching pattern
bun test --pattern auth
```

### Code Quality

```bash
# Run linter
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format

# Check formatting
bun run format:check

# Run all checks
bun run check
```

### Production

```bash
# Start production server
bun run start

# Start with PM2 (process manager)
bun run start:pm2
```

### Utilities

```bash
# Create admin user
bun run make-admin user@example.com

# Clean build artifacts
bun run clean

# Update dependencies
bun update

# Check for outdated packages
bunx npm-check-updates
```

## Configuration Files

### package.json Scripts

```json
{
  "scripts": {
    "dev": "bun run dev.ts",
    "build": "bun run build:css",
    "build:css": "bunx tailwindcss -i ./src/app/index.css -o ./public/styles.css --minify",
    "start": "NODE_ENV=production bun src/server/index.ts",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "db:push": "bunx drizzle-kit push:sqlite",
    "db:push:pg": "bunx drizzle-kit push:pg",
    "db:generate": "bunx drizzle-kit generate:sqlite",
    "db:migrate": "bunx drizzle-kit migrate:sqlite",
    "db:seed": "bun run src/db/seed.ts",
    "db:studio": "bunx drizzle-kit studio",
    "lint": "bunx @biomejs/biome check .",
    "lint:fix": "bunx @biomejs/biome check --apply .",
    "format": "bunx @biomejs/biome format --write .",
    "format:check": "bunx @biomejs/biome format .",
    "typecheck": "bunx tsc --noEmit",
    "check": "bun run lint && bun run format:check && bun run typecheck",
    "clean": "rm -rf dist coverage .turbo app.db app.db-journal",
    "make-admin": "bun run src/scripts/make-admin.ts"
  }
}
```

## Environment Variables

### Development

```bash
# .env
NODE_ENV=development
PORT=3000
DATABASE_URL=sqlite://./app.db
JWT_SECRET=development-secret-change-in-production
```

### Production

```bash
# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
JWT_SECRET=your-super-secret-production-key-min-32-chars
CORS_ORIGIN=https://yourdomain.com
```

### Test

```bash
# .env.test
NODE_ENV=test
PORT=3001
DATABASE_URL=sqlite://./test.db
JWT_SECRET=test-secret
RATE_LIMIT_ENABLED=false
```

## Custom Scripts

### make-admin

Promote a user to admin role:

```bash
# Usage
bun run make-admin <email>

# Example
bun run make-admin admin@example.com

# Output
✅ User admin@example.com has been promoted to admin
```

### Database Management

```bash
# Reset database (development only)
rm app.db app.db-journal
bun run db:push
bun run db:seed

# Backup database
cp app.db app.db.backup

# Restore database
cp app.db.backup app.db
```

## Development Tools

### Bun Shell

Use Bun's built-in shell for scripts:

```typescript
#!/usr/bin/env bun
import { $ } from "bun";

// Run shell commands
await $`rm -rf dist`;
await $`mkdir -p dist`;
await $`cp -r src dist/`;

// With error handling
try {
  await $`bun test`;
  console.log("✅ Tests passed");
} catch (error) {
  console.error("❌ Tests failed");
  process.exit(1);
}
```

### Custom CLI Tools

Create your own CLI commands:

```typescript
// src/scripts/my-tool.ts
#!/usr/bin/env bun

import { parseArgs } from "util";

const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    verbose: {
      type: "boolean",
      short: "v",
    },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Usage: bun run my-tool [options] <command>

Options:
  -h, --help     Show help
  -v, --verbose  Verbose output

Commands:
  init          Initialize something
  clean         Clean something
  `);
  process.exit(0);
}

// Tool implementation
const command = positionals[2];
switch (command) {
  case "init":
    console.log("Initializing...");
    break;
  case "clean":
    console.log("Cleaning...");
    break;
  default:
    console.error("Unknown command:", command);
    process.exit(1);
}
```

## Debugging

### Debug Environment Variables

```bash
# Enable debug logging
DEBUG=true bun run dev

# Debug specific modules
DEBUG=server:* bun run dev
DEBUG=db:* bun run dev
DEBUG=auth,csrf bun run dev

# Verbose Bun output
BUN_DEBUG=1 bun run dev
```

### Inspect Mode

```bash
# Start with debugger
bun --inspect src/server/index.ts

# With specific port
bun --inspect=9229 src/server/index.ts

# Wait for debugger
bun --inspect-brk src/server/index.ts
```

## Performance

### Bundle Analysis

```bash
# Analyze bundle size
bun build src/app/main.tsx --outdir=dist --splitting --sourcemap

# Check bundle contents
ls -la dist/
```

### Benchmarking

```typescript
// src/scripts/benchmark.ts
import { bench, run } from "mitata";

bench("API request", async () => {
  await fetch("http://localhost:3000/api/health");
});

bench("Database query", async () => {
  await db.select().from(users).limit(100);
});

await run();
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 bun run dev
```

#### Database Locked

```bash
# Remove lock file
rm app.db-journal

# Or use different database
DATABASE_URL=sqlite://./dev.db bun run dev
```

#### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install
```

### Getting Help

```bash
# Bun help
bun --help

# Version info
bun --version

# Check installation
which bun
```

## Next Steps

- Learn about [Server API](/docs/server-api) structure
- Understand [Middleware](/docs/middleware) system
- Explore [Utilities](/docs/utilities) and helpers
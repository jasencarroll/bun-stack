# Configuration

Create Bun Stack applications can be configured through environment variables, configuration files, and code-level settings. This guide covers all configuration options.

## Environment Variables

Environment variables are the primary way to configure your application across different environments.

### Setting Environment Variables

Create a `.env` file in your project root:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/myapp

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# External Services (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@myapp.com
SMTP_PASS=email-password

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_API_DOCS=false
```

### Available Environment Variables

#### Core Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3000` | No |
| `HOST` | Server host | `localhost` | No |

#### Database

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | SQLite fallback | No |
| `DATABASE_POOL_SIZE` | Connection pool size | `10` | No |
| `DATABASE_IDLE_TIMEOUT` | Idle connection timeout (ms) | `30000` | No |

#### Authentication

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for JWT signing | Random generated | Yes (production) |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` | No |
| `BCRYPT_ROUNDS` | Password hashing rounds | `10` | No |

#### Security

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CORS_ORIGIN` | Allowed CORS origins | `*` (dev) / same-origin (prod) | No |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | `900000` (15 min) | No |
| `RATE_LIMIT_MAX` | Max requests per window | `100` | No |
| `CSRF_ENABLED` | Enable CSRF protection | `true` | No |

### Loading Environment Variables

Bun automatically loads `.env` files. No need for `dotenv`:

```typescript
// Automatically available
const port = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === "development";
```

### Environment-Specific Files

Create environment-specific files:

- `.env` - Default/development
- `.env.production` - Production only
- `.env.test` - Test environment
- `.env.local` - Local overrides (git-ignored)

Priority order (highest to lowest):
1. `.env.local`
2. `.env.[NODE_ENV]`
3. `.env`

## Configuration Files

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/app/*": ["./src/app/*"],
      "@/server/*": ["./src/server/*"],
      "@/db/*": ["./src/db/*"],
      "@/lib/*": ["./src/lib/*"]
    },
    "types": ["bun-types"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Bun Configuration (`bunfig.toml`)

```toml
# Bun runtime configuration
[install]
# Use exact versions
exact = true

# Auto-install peer dependencies
peer = true

[install.scopes]
# Package registry configuration
"@mycompany" = "https://npm.mycompany.com/"

[run]
# Auto-install missing packages
autoInstall = true

[test]
# Test configuration
timeout = 5000
coverage = true
coverageReporter = ["text", "json", "html"]
```

### Tailwind Configuration (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'off-white': '#FAFAF8',
        'off-white-dark': '#F5F5F0',
        'off-black': '#1A1A1A',
        'gray-soft': '#6B6B6B',
        'border-light': '#E5E5E0',
        'accent-purple': '#A855F7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
```

### Drizzle Configuration (`drizzle.config.ts`)

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: process.env.DATABASE_URL?.startsWith("postgresql") 
    ? "pg" 
    : "better-sqlite",
  dbCredentials: process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : { url: "./app.db" },
} satisfies Config;
```

### Biome Configuration (`biome.json`)

```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.3/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "warn",
        "noConsoleLog": "warn"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "files": {
    "ignore": ["node_modules", "dist", "coverage", "*.min.js"]
  }
}
```

## Application Configuration

### Server Configuration (`src/server/config.ts`)

```typescript
export const config = {
  server: {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || "localhost",
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: process.env.NODE_ENV === "production",
    isTest: process.env.NODE_ENV === "test",
  },
  
  database: {
    url: process.env.DATABASE_URL,
    poolSize: Number(process.env.DATABASE_POOL_SIZE) || 10,
    idleTimeout: Number(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET || generateDefaultSecret(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  },
  
  security: {
    corsOrigin: process.env.CORS_ORIGIN || (
      process.env.NODE_ENV === "production" ? false : "*"
    ),
    rateLimitWindow: Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
    csrfEnabled: process.env.CSRF_ENABLED !== "false",
  },
  
  features: {
    registration: process.env.ENABLE_REGISTRATION !== "false",
    apiDocs: process.env.ENABLE_API_DOCS === "true",
  },
};

function generateDefaultSecret() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  return "development-secret-do-not-use-in-production";
}
```

### Frontend Configuration (`src/app/config.ts`)

```typescript
export const config = {
  api: {
    baseUrl: process.env.VITE_API_URL || "/api",
    timeout: 30000,
  },
  
  app: {
    name: process.env.VITE_APP_NAME || "My App",
    version: process.env.VITE_APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
  
  features: {
    analytics: process.env.VITE_ENABLE_ANALYTICS === "true",
    darkMode: process.env.VITE_ENABLE_DARK_MODE === "true",
  },
};
```

## Package.json Scripts

Configure npm scripts for different environments:

```json
{
  "scripts": {
    "dev": "bun run dev.ts",
    "dev:debug": "DEBUG=true bun run dev.ts",
    "build": "bun run build:css && bun run build:server",
    "build:css": "bunx tailwindcss -i ./src/app/index.css -o ./public/styles.css",
    "build:server": "bun build src/server/index.ts --target=bun --outdir=dist",
    "start": "NODE_ENV=production bun run dist/index.js",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "db:push": "bunx drizzle-kit push:sqlite",
    "db:push:pg": "bunx drizzle-kit push:pg",
    "db:migrate": "bunx drizzle-kit generate:sqlite && bunx drizzle-kit migrate:sqlite",
    "db:studio": "bunx drizzle-kit studio",
    "db:seed": "bun run src/db/seed.ts",
    "lint": "bunx @biomejs/biome check .",
    "format": "bunx @biomejs/biome format --write .",
    "typecheck": "bunx tsc --noEmit",
    "clean": "rm -rf dist coverage .turbo",
    "make-admin": "bun run src/scripts/make-admin.ts"
  }
}
```

## Development vs Production

### Development Configuration

```typescript
// src/server/index.ts
if (config.server.isDevelopment) {
  // Enable detailed error messages
  app.use(errorHandler({ verbose: true }));
  
  // Disable caching
  app.use(noCache());
  
  // Enable API documentation
  app.use("/api-docs", apiDocs());
  
  // Hot module replacement
  app.use(hmr());
}
```

### Production Configuration

```typescript
// src/server/index.ts
if (config.server.isProduction) {
  // Enable compression
  app.use(compression());
  
  // Security hardening
  app.use(helmet());
  
  // Rate limiting
  app.use(rateLimit(config.security));
  
  // Error logging
  app.use(errorLogger());
}
```

## Feature Flags

Implement feature toggles:

```typescript
// src/lib/features.ts
export const features = {
  isEnabled(feature: string): boolean {
    return process.env[`FEATURE_${feature.toUpperCase()}`] === "true";
  },
  
  // Specific feature checks
  get registration() {
    return this.isEnabled("registration");
  },
  
  get socialLogin() {
    return this.isEnabled("social_login");
  },
  
  get apiDocs() {
    return this.isEnabled("api_docs");
  },
};

// Usage
if (features.registration) {
  router.post("/auth/register", registerHandler);
}
```

## Validation

Use Zod for configuration validation:

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.string().transform(Number).pipe(z.number().positive()),
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
});

// Validate on startup
export function validateEnv() {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    console.error("Invalid environment configuration:", error);
    process.exit(1);
  }
}
```

## Best Practices

### 1. Security

- Never commit `.env` files
- Use strong secrets in production
- Rotate keys regularly
- Validate all configuration

### 2. Defaults

- Provide sensible defaults
- Make development easy
- Require only essential variables
- Document all options

### 3. Type Safety

```typescript
// Create typed config
interface Config {
  server: ServerConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
}

// Export typed config
export const config: Config = {
  // ...
};
```

### 4. Environment Detection

```typescript
export const env = {
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
  isCI: process.env.CI === "true",
};
```

## Troubleshooting

### Environment Variables Not Loading

1. Check file name (`.env` not `env`)
2. Restart the server
3. Check for typos
4. Verify file location (project root)

### Type Errors with Environment Variables

```typescript
// Add to env.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT?: string;
      DATABASE_URL?: string;
      JWT_SECRET: string;
    }
  }
}

export {};
```

### Configuration Conflicts

1. Check load order
2. Use unique variable names
3. Log configuration on startup
4. Validate early

## Next Steps

- Set up your [Development](/docs/development) environment
- Learn about [Testing](/docs/testing) configuration
- Configure for [Deployment](/docs/deployment)
# Customization Guide

Create Bun Stack is designed to be easily customizable while maintaining its conventions. This guide covers common customization scenarios and best practices.

## Customizing the CLI Generator

### Adding Custom Templates

Create your own template in the CLI:

```typescript
// src/templates/custom.ts
export const customTemplate = {
  name: "custom",
  description: "Custom template with specific features",
  files: {
    "src/custom/feature.ts": `
export function customFeature() {
  return "Custom implementation";
}
`,
    "src/custom/index.ts": `
export * from "./feature";
`,
  },
};

// Add to templates/index.ts
import { customTemplate } from "./custom";

export const templates = {
  default: defaultTemplate,
  custom: customTemplate,
};
```

### Modifying File Generation

Customize which files are created:

```typescript
// Modify the generator
function generateProject(options: GeneratorOptions) {
  const files = {
    ...baseFiles,
    ...(options.includeAuth ? authFiles : {}),
    ...(options.includeTests ? testFiles : {}),
    ...(options.customFeatures ? customFiles : {}),
  };
  
  return files;
}
```

### Adding CLI Options

Add new options to the CLI:

```typescript
// Add to the CLI prompts
const customOptions = await prompt({
  type: "confirm",
  message: "Include custom features?",
  default: false,
});

// Use in generation
if (customOptions) {
  files["src/custom/config.ts"] = generateCustomConfig(options);
}
```

## Customizing the Server

### Custom Middleware

Create your own middleware:

```typescript
// src/server/middleware/custom.ts
export function customMiddleware(
  handler: (req: Request) => Promise<Response> | Response
) {
  return async (req: Request): Promise<Response> => {
    // Pre-processing
    console.log(`Custom middleware: ${req.method} ${req.url}`);
    
    // Add custom headers
    const customHeaders = {
      "X-Custom-Header": "custom-value",
      "X-Request-Id": crypto.randomUUID(),
    };
    
    // Call the handler
    const response = await handler(req);
    
    // Post-processing
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        ...customHeaders,
      },
    });
    
    return modifiedResponse;
  };
}
```

Use the middleware:

```typescript
// src/server/router.ts
import { customMiddleware } from "./middleware/custom";

const enhancedRouter = {
  fetch: customMiddleware(router.fetch),
};
```

### Custom Route Handlers

Create reusable route handlers:

```typescript
// src/server/handlers/paginated.ts
interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

export function createPaginatedHandler<T>(
  fetcher: (limit: number, offset: number) => Promise<T[]>,
  counter: () => Promise<number>,
  options: PaginationOptions = {}
) {
  const { defaultLimit = 10, maxLimit = 100 } = options;
  
  return async (req: Request) => {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || String(defaultLimit)),
      maxLimit
    );
    const offset = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      fetcher(limit, offset),
      counter(),
    ]);
    
    return Response.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      },
    });
  };
}

// Use in routes
export const users = {
  "/": {
    GET: createPaginatedHandler(
      (limit, offset) => userRepo.findAll({ limit, offset }),
      () => userRepo.count()
    ),
  },
};
```

### Custom Error Handling

Implement global error handling:

```typescript
// src/server/middleware/error-handler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  handler: (req: Request) => Promise<Response> | Response
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (error) {
      console.error("Error:", error);
      
      if (error instanceof AppError) {
        return Response.json(
          {
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
          { status: error.statusCode }
        );
      }
      
      if (error instanceof z.ZodError) {
        return Response.json(
          {
            error: "Validation failed",
            details: error.errors,
          },
          { status: 400 }
        );
      }
      
      // Generic error
      return Response.json(
        {
          error: "Internal server error",
          message: process.env.NODE_ENV === "development" 
            ? error.message 
            : undefined,
        },
        { status: 500 }
      );
    }
  };
}
```

## Customizing the Database

### Custom Database Types

Add custom column types:

```typescript
// src/db/custom-types.ts
import { customType } from "drizzle-orm/sqlite-core";

export const jsonb = customType<{ data: any; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value) {
    return JSON.stringify(value);
  },
  fromDriver(value) {
    return JSON.parse(value);
  },
});

// Use in schema
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
});
```

### Custom Query Builders

Create reusable query patterns:

```typescript
// src/db/query-builder.ts
export class QueryBuilder<T> {
  constructor(
    private table: any,
    private db: any
  ) {}
  
  withDeleted() {
    return this.db
      .select()
      .from(this.table);
  }
  
  active() {
    return this.db
      .select()
      .from(this.table)
      .where(isNull(this.table.deletedAt));
  }
  
  byUser(userId: string) {
    return this.db
      .select()
      .from(this.table)
      .where(eq(this.table.userId, userId));
  }
  
  recent(limit = 10) {
    return this.db
      .select()
      .from(this.table)
      .orderBy(desc(this.table.createdAt))
      .limit(limit);
  }
}

// Use in repository
export class PostRepository {
  private qb = new QueryBuilder(posts, db);
  
  async findRecent() {
    return this.qb.active().recent(20);
  }
  
  async findByUser(userId: string) {
    return this.qb.active().byUser(userId);
  }
}
```

### Custom Migrations

Create complex migrations:

```typescript
// migrations/001_custom_function.sql
-- Create custom function for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  content,
  content_rowid=id
);

-- Trigger to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS posts_ai
AFTER INSERT ON posts
BEGIN
  INSERT INTO posts_fts (rowid, title, content)
  VALUES (new.id, new.title, new.content);
END;

-- Custom index for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
ON posts(user_id, created_at DESC);
```

## Customizing Authentication

### Custom Auth Providers

Add OAuth providers:

```typescript
// src/server/auth/providers/github.ts
export class GitHubAuthProvider {
  private clientId = process.env.GITHUB_CLIENT_ID!;
  private clientSecret = process.env.GITHUB_CLIENT_SECRET!;
  private redirectUri = process.env.GITHUB_REDIRECT_URI!;
  
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: "read:user user:email",
      state,
    });
    
    return `https://github.com/login/oauth/authorize?${params}`;
  }
  
  async getToken(code: string): Promise<string> {
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
        }),
      }
    );
    
    const data = await response.json();
    return data.access_token;
  }
  
  async getUser(token: string) {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return response.json();
  }
}
```

### Custom Session Management

Implement Redis-based sessions:

```typescript
// src/server/auth/session.ts
import { createClient } from "redis";

export class SessionManager {
  private redis = createClient({
    url: process.env.REDIS_URL,
  });
  
  async connect() {
    await this.redis.connect();
  }
  
  async create(userId: string, data: any) {
    const sessionId = crypto.randomUUID();
    const session = {
      userId,
      data,
      createdAt: new Date().toISOString(),
    };
    
    await this.redis.setex(
      `session:${sessionId}`,
      3600, // 1 hour
      JSON.stringify(session)
    );
    
    return sessionId;
  }
  
  async get(sessionId: string) {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
  
  async refresh(sessionId: string) {
    await this.redis.expire(`session:${sessionId}`, 3600);
  }
  
  async destroy(sessionId: string) {
    await this.redis.del(`session:${sessionId}`);
  }
}
```

### Custom Permissions

Implement fine-grained permissions:

```typescript
// src/server/auth/permissions.ts
export enum Permission {
  // Users
  USER_READ = "user:read",
  USER_WRITE = "user:write",
  USER_DELETE = "user:delete",
  
  // Posts
  POST_READ = "post:read",
  POST_WRITE = "post:write",
  POST_DELETE = "post:delete",
  POST_PUBLISH = "post:publish",
  
  // Admin
  ADMIN_ACCESS = "admin:access",
  ADMIN_USERS = "admin:users",
  ADMIN_SETTINGS = "admin:settings",
}

export const rolePermissions: Record<string, Permission[]> = {
  user: [
    Permission.USER_READ,
    Permission.POST_READ,
    Permission.POST_WRITE,
  ],
  moderator: [
    Permission.USER_READ,
    Permission.POST_READ,
    Permission.POST_WRITE,
    Permission.POST_DELETE,
    Permission.POST_PUBLISH,
  ],
  admin: Object.values(Permission),
};

export function hasPermission(
  userRole: string,
  permission: Permission
): boolean {
  const permissions = rolePermissions[userRole] || [];
  return permissions.includes(permission);
}

// Middleware
export function requirePermission(permission: Permission) {
  return async (req: Request) => {
    const user = req.user;
    
    if (!user || !hasPermission(user.role, permission)) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
    
    return null; // Continue to handler
  };
}
```

## Customizing the Frontend

### Custom Theme

Create a custom Tailwind theme:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          // ... custom color palette
          900: "#1e3a8a",
        },
        brand: {
          purple: "#6b46c1",
          pink: "#ec4899",
          orange: "#f97316",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
```

### Custom Components

Create a component library:

```typescript
// src/app/components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary-600 text-white hover:bg-primary-700",
      secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
      ghost: "bg-transparent hover:bg-gray-100",
      danger: "bg-red-600 text-white hover:bg-red-700",
    };
    
    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2",
      lg: "px-6 py-3 text-lg",
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          loading && "cursor-wait",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
```

### Custom Hooks

Create reusable React hooks:

```typescript
// src/app/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// src/app/hooks/useLocalStorage.ts
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });
  
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function 
        ? value(storedValue) 
        : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  
  return [storedValue, setValue];
}

// src/app/hooks/useIntersectionObserver.ts
export function useIntersectionObserver(
  ref: RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIntersecting] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting),
      options
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [ref, options]);
  
  return isIntersecting;
}
```

## Build Customization

### Custom Build Scripts

Add custom build steps:

```json
// package.json
{
  "scripts": {
    "build": "bun run build:clean && bun run build:css && bun run build:app",
    "build:clean": "rm -rf dist",
    "build:css": "tailwindcss -i ./src/app/globals.css -o ./public/styles.css",
    "build:app": "bun build src/app/main.tsx --outdir dist",
    "build:analyze": "bun build src/app/main.tsx --outdir dist --analyze",
    "build:docker": "docker build -t myapp:latest .",
    "prebuild": "bun run lint && bun run typecheck",
    "postbuild": "bun run build:sitemap"
  }
}
```

### Custom Bundling

Configure Bun's bundler:

```typescript
// build.config.ts
import { build } from "bun";

await build({
  entrypoints: ["./src/app/main.tsx"],
  outdir: "./dist",
  target: "browser",
  format: "esm",
  splitting: true,
  sourcemap: "external",
  minify: {
    whitespace: true,
    syntax: true,
    identifiers: process.env.NODE_ENV === "production",
  },
  naming: {
    entry: "[name].[hash].js",
    chunk: "[name].[hash].js",
    asset: "[name].[hash].[ext]",
  },
  external: ["node:*"],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    "process.env.API_URL": JSON.stringify(process.env.API_URL),
  },
  loader: {
    ".png": "file",
    ".jpg": "file",
    ".svg": "text",
  },
});
```

## Plugin System

### Creating Plugins

Design a plugin architecture:

```typescript
// src/plugins/types.ts
export interface Plugin {
  name: string;
  version: string;
  init(app: Application): Promise<void>;
  destroy?(): Promise<void>;
}

export interface Application {
  router: Router;
  db: Database;
  config: Config;
  addRoute(path: string, handler: RouteHandler): void;
  addMiddleware(middleware: Middleware): void;
  on(event: string, handler: EventHandler): void;
  emit(event: string, data: any): void;
}

// src/plugins/example.ts
export class ExamplePlugin implements Plugin {
  name = "example-plugin";
  version = "1.0.0";
  
  async init(app: Application) {
    // Add routes
    app.addRoute("/api/plugin/example", {
      GET: async () => Response.json({ plugin: this.name }),
    });
    
    // Add middleware
    app.addMiddleware(async (req, next) => {
      console.log(`Plugin ${this.name} processing ${req.url}`);
      return next(req);
    });
    
    // Listen to events
    app.on("user:created", async (user) => {
      console.log(`New user created: ${user.email}`);
    });
  }
  
  async destroy() {
    console.log(`Plugin ${this.name} destroyed`);
  }
}
```

### Plugin Loader

Load and manage plugins:

```typescript
// src/plugins/loader.ts
export class PluginLoader {
  private plugins = new Map<string, Plugin>();
  
  async load(plugin: Plugin, app: Application) {
    try {
      await plugin.init(app);
      this.plugins.set(plugin.name, plugin);
      console.log(`Loaded plugin: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      console.error(`Failed to load plugin ${plugin.name}:`, error);
      throw error;
    }
  }
  
  async unload(pluginName: string) {
    const plugin = this.plugins.get(pluginName);
    if (plugin?.destroy) {
      await plugin.destroy();
    }
    this.plugins.delete(pluginName);
  }
  
  async loadFromDirectory(dir: string, app: Application) {
    const files = await fs.readdir(dir);
    
    for (const file of files) {
      if (file.endsWith(".plugin.ts")) {
        const module = await import(path.join(dir, file));
        const PluginClass = module.default;
        const plugin = new PluginClass();
        await this.load(plugin, app);
      }
    }
  }
}
```

## Best Practices

### 1. **Maintain Conventions**

Even when customizing, follow the established patterns:

```typescript
// Good: Follows repository pattern
export class CustomRepository extends BaseRepository {
  // Custom methods that follow the pattern
}

// Bad: Breaking conventions
export function getCustomData() {
  // Direct database access outside repository
}
```

### 2. **Document Customizations**

Always document your customizations:

```typescript
/**
 * Custom authentication provider for SAML SSO
 * 
 * @example
 * ```typescript
 * const saml = new SamlAuthProvider({
 *   entityId: "https://myapp.com",
 *   ssoUrl: "https://idp.example.com/sso",
 * });
 * ```
 */
export class SamlAuthProvider {
  // Implementation
}
```

### 3. **Test Custom Code**

Write tests for all customizations:

```typescript
// tests/custom/auth.test.ts
describe("Custom Auth Provider", () => {
  test("generates correct auth URL", () => {
    const provider = new CustomAuthProvider();
    const url = provider.getAuthUrl("state123");
    
    expect(url).toContain("client_id=");
    expect(url).toContain("state=state123");
  });
});
```

### 4. **Version Control**

Track customizations separately:

```bash
# Create feature branch for customizations
git checkout -b feature/custom-auth

# Document in CHANGELOG
## [1.1.0] - 2024-01-15
### Added
- Custom SAML authentication provider
- Redis session management
```

## Next Steps

- Review [Database Migrations](/docs/migrations)
- Optimize [Performance](/docs/performance)
- Enhance [Security](/docs/security)
- Set up [Monitoring](/docs/monitoring)
# Middleware Reference

Middleware in Create Bun Stack provides a way to process requests before they reach route handlers. This reference covers all built-in middleware and how to create custom middleware.

## Middleware Concepts

### Middleware Signature

```typescript
type Middleware = (
  req: Request,
  params?: any
) => Promise<Response | null> | Response | null;

// Return null to continue to next middleware
// Return Response to stop and send response
```

### Middleware Execution Order

```
Request → CORS → Security → Rate Limit → Auth → Validation → Route Handler → Response
```

## Built-in Middleware

### Authentication Middleware

#### `requireAuth`

Validates JWT token and adds user to request:

```typescript
// src/server/middleware/auth.ts
export function requireAuth(req: Request): Response | null {
  const token = extractToken(req);
  
  if (!token) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    return null; // Continue
  } catch (error) {
    return Response.json(
      { error: "Invalid token" },
      { status: 401 }
    );
  }
}

// Usage
export const protected = {
  "/data": {
    GET: [requireAuth, handleGetData],
  },
};
```

#### `requireAdmin`

Requires admin role:

```typescript
export function requireAdmin(req: Request): Response | null {
  // First check auth
  const authResponse = requireAuth(req);
  if (authResponse) return authResponse;
  
  const user = (req as any).user;
  if (user.role !== "admin") {
    return Response.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }
  
  return null;
}
```

#### `optionalAuth`

Adds user if authenticated but doesn't require it:

```typescript
export function optionalAuth(req: Request): Response | null {
  const token = extractToken(req);
  
  if (token) {
    try {
      const payload = verifyToken(token);
      (req as any).user = payload;
    } catch {
      // Invalid token, but continue without user
    }
  }
  
  return null;
}
```

### CSRF Protection

#### `csrfMiddleware`

Validates CSRF tokens for mutations:

```typescript
// src/server/middleware/csrf.ts
export async function csrfMiddleware(req: Request): Promise<Response | null> {
  // Skip for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return null;
  }
  
  const cookieToken = getCookie(req, "csrf-token");
  const headerToken = req.headers.get("x-csrf-token");
  
  if (!cookieToken || !headerToken) {
    return Response.json(
      { error: "CSRF token missing" },
      { status: 403 }
    );
  }
  
  const isValid = await Bun.password.verify(headerToken, cookieToken);
  
  if (!isValid) {
    return Response.json(
      { error: "CSRF token mismatch" },
      { status: 403 }
    );
  }
  
  return null;
}
```

### Rate Limiting

#### `createRateLimit`

Factory for creating rate limit middleware:

```typescript
// src/server/middleware/rate-limit.ts
interface RateLimitOptions {
  windowMs: number;       // Time window in milliseconds
  max: number;            // Max requests per window
  message?: string;       // Error message
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
  onLimitReached?: (req: Request) => void;
}

export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = "Too many requests",
    keyGenerator = getClientIp,
    skipIf,
    onLimitReached,
  } = options;

  const limits = new Map<string, { count: number; resetAt: number }>();

  return function rateLimitMiddleware(req: Request): Response | null {
    if (skipIf?.(req)) return null;

    const key = keyGenerator(req);
    const now = Date.now();

    let limit = limits.get(key);
    
    if (!limit || limit.resetAt < now) {
      limit = { count: 1, resetAt: now + windowMs };
      limits.set(key, limit);
      return null;
    }

    if (limit.count >= max) {
      onLimitReached?.(req);
      
      return Response.json(
        { error: message },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((limit.resetAt - now) / 1000)),
            "X-RateLimit-Limit": String(max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(limit.resetAt).toISOString(),
          },
        }
      );
    }

    limit.count++;
    return null;
  };
}

// Usage examples
const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // 10 requests
  message: "Too many requests, please slow down",
});

const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  skipIf: (req) => {
    const user = (req as any).user;
    return user?.plan === "premium";
  },
});
```

### Security Headers

#### `securityMiddleware`

Adds security headers to responses:

```typescript
// src/server/middleware/security.ts
export function securityMiddleware(req: Request): Response | null {
  const headers = new Headers();
  const isDev = process.env.NODE_ENV === "development";

  // Content Security Policy
  if (req.headers.get("accept")?.includes("text/html")) {
    headers.set(
      "Content-Security-Policy",
      isDev
        ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: wss:;"
        : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    );
  }

  // Security headers for all responses
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "geolocation=(), camera=(), microphone=()");

  // HSTS for production
  if (!isDev) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Attach headers to request
  (req as any).securityHeaders = headers;
  return null;
}
```

### CORS Middleware

#### `corsMiddleware`

Handles cross-origin requests:

```typescript
// src/server/middleware/cors.ts
interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function createCorsMiddleware(options: CorsOptions = {}) {
  return function corsMiddleware(req: Request): Response | null {
    const origin = req.headers.get("origin");
    
    // Handle preflight
    if (req.method === "OPTIONS") {
      const headers = new Headers();
      
      // Set allowed origin
      if (options.origin === "*") {
        headers.set("Access-Control-Allow-Origin", "*");
      } else if (typeof options.origin === "function" && origin) {
        if (options.origin(origin)) {
          headers.set("Access-Control-Allow-Origin", origin);
        }
      } else if (Array.isArray(options.origin) && origin) {
        if (options.origin.includes(origin)) {
          headers.set("Access-Control-Allow-Origin", origin);
        }
      }

      headers.set("Access-Control-Allow-Methods", 
        (options.methods || ["GET", "POST", "PUT", "DELETE"]).join(", ")
      );
      headers.set("Access-Control-Allow-Headers",
        (options.allowedHeaders || ["Content-Type", "Authorization"]).join(", ")
      );
      headers.set("Access-Control-Max-Age", String(options.maxAge || 86400));

      if (options.credentials) {
        headers.set("Access-Control-Allow-Credentials", "true");
      }

      return new Response(null, { status: 204, headers });
    }

    // Store CORS headers for actual request
    (req as any).corsHeaders = createCorsHeaders(origin, options);
    return null;
  };
}
```

### Validation Middleware

#### `validateBody`

Validates request body with Zod schema:

```typescript
// src/server/middleware/validation.ts
import { z } from "zod";

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async function validationMiddleware(req: Request): Promise<Response | null> {
    try {
      const body = await req.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        return Response.json(
          {
            error: "Validation failed",
            details: result.error.flatten(),
          },
          { status: 400 }
        );
      }

      // Attach validated data
      (req as any).validatedBody = result.data;
      return null;
    } catch (error) {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
  };
}

// Usage
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().int().positive(),
});

export const users = {
  "/": {
    POST: [validateBody(userSchema), createUser],
  },
};
```

#### `validateQuery`

Validates query parameters:

```typescript
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return function validationMiddleware(req: Request): Response | null {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    
    const result = schema.safeParse(params);
    
    if (!result.success) {
      return Response.json(
        {
          error: "Invalid query parameters",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    (req as any).validatedQuery = result.data;
    return null;
  };
}

// Usage
const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const search = {
  "/": {
    GET: [validateQuery(searchSchema), handleSearch],
  },
};
```

### Logging Middleware

#### `loggingMiddleware`

Logs requests and responses:

```typescript
// src/server/middleware/logging.ts
interface LogOptions {
  includeBody?: boolean;
  includeHeaders?: boolean;
  skipPaths?: string[];
}

export function createLoggingMiddleware(options: LogOptions = {}) {
  return function loggingMiddleware(req: Request): Response | null {
    const start = Date.now();
    const url = new URL(req.url);
    
    // Skip certain paths
    if (options.skipPaths?.includes(url.pathname)) {
      return null;
    }

    // Log request
    const requestLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    };

    if (options.includeHeaders) {
      requestLog.headers = Object.fromEntries(req.headers);
    }

    console.log("→ Request:", JSON.stringify(requestLog));

    // Log response after completion
    queueMicrotask(() => {
      const duration = Date.now() - start;
      console.log("← Response:", {
        path: url.pathname,
        duration: `${duration}ms`,
      });
    });

    return null;
  };
}
```

## Creating Custom Middleware

### Basic Pattern

```typescript
export function myMiddleware(req: Request): Response | null {
  // Check condition
  if (!someCondition) {
    // Return response to stop processing
    return Response.json(
      { error: "Condition not met" },
      { status: 400 }
    );
  }
  
  // Modify request
  (req as any).customData = "value";
  
  // Continue to next middleware
  return null;
}
```

### Async Middleware

```typescript
export async function asyncMiddleware(req: Request): Promise<Response | null> {
  // Async operations
  const data = await fetchSomeData();
  
  if (!data) {
    return Response.json(
      { error: "Data not found" },
      { status: 404 }
    );
  }
  
  (req as any).fetchedData = data;
  return null;
}
```

### Middleware Factory

```typescript
export function createCustomMiddleware(options: MiddlewareOptions) {
  // Setup
  const cache = new Map();
  
  return function middleware(req: Request): Response | null {
    // Use options and closure variables
    const cached = cache.get(req.url);
    if (cached && options.useCache) {
      return Response.json(cached);
    }
    
    // Process request
    return null;
  };
}
```

### Composing Middleware

```typescript
// Combine multiple middleware
export function compose(...middlewares: Middleware[]): Middleware {
  return async function composedMiddleware(req: Request, params?: any) {
    for (const middleware of middlewares) {
      const response = await middleware(req, params);
      if (response) return response;
    }
    return null;
  };
}

// Usage
const protectedWithLogging = compose(
  loggingMiddleware,
  requireAuth,
  csrfMiddleware
);

export const secure = {
  "/": {
    POST: [protectedWithLogging, handleSecureAction],
  },
};
```

## Middleware Context

### Passing Data Between Middleware

```typescript
// First middleware adds data
export function fetchUserMiddleware(req: Request): Response | null {
  const userId = req.headers.get("x-user-id");
  const user = userCache.get(userId);
  
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  
  (req as any).cachedUser = user;
  return null;
}

// Second middleware uses data
export function checkPermissionMiddleware(req: Request): Response | null {
  const user = (req as any).cachedUser;
  
  if (!user.permissions.includes("write")) {
    return Response.json({ error: "No write permission" }, { status: 403 });
  }
  
  return null;
}
```

### Request Augmentation

```typescript
// Extend Request type
declare global {
  interface Request {
    user?: User;
    validatedBody?: any;
    validatedQuery?: any;
    startTime?: number;
    requestId?: string;
  }
}

// Add request ID middleware
export function requestIdMiddleware(req: Request): Response | null {
  req.requestId = crypto.randomUUID();
  req.startTime = Date.now();
  return null;
}
```

## Error Handling in Middleware

### Try-Catch Pattern

```typescript
export async function safeMiddleware(req: Request): Promise<Response | null> {
  try {
    // Risky operation
    const result = await riskyOperation();
    (req as any).result = result;
    return null;
  } catch (error) {
    // Log error
    console.error("Middleware error:", error);
    
    // Return error response
    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

### Error Recovery

```typescript
export async function resilientMiddleware(req: Request): Promise<Response | null> {
  try {
    // Try primary service
    const data = await primaryService.getData();
    (req as any).serviceData = data;
  } catch (error) {
    try {
      // Fallback to secondary service
      const data = await secondaryService.getData();
      (req as any).serviceData = data;
      (req as any).serviceFallback = true;
    } catch (fallbackError) {
      // Both failed
      return Response.json(
        { error: "Service unavailable" },
        { status: 503 }
      );
    }
  }
  
  return null;
}
```

## Performance Considerations

### Middleware Order

Place middleware in order of likelihood to reject:

```typescript
// Good order - fail fast
[
  rateLimitMiddleware,    // Reject spam quickly
  authMiddleware,         // Check auth before validation
  validationMiddleware,   // Validate after auth
  expensiveMiddleware,    // Do expensive work last
]
```

### Caching in Middleware

```typescript
const cache = new Map<string, { data: any; expiresAt: number }>();

export function cacheMiddleware(ttl: number = 60000) {
  return function (req: Request): Response | null {
    if (req.method !== "GET") return null;
    
    const key = req.url;
    const cached = cache.get(key);
    
    if (cached && cached.expiresAt > Date.now()) {
      return Response.json(cached.data, {
        headers: {
          "X-Cache": "HIT",
          "X-Cache-TTL": String(cached.expiresAt - Date.now()),
        },
      });
    }
    
    // Store original handler for caching after response
    (req as any).cacheKey = key;
    (req as any).cacheTTL = ttl;
    
    return null;
  };
}
```

## Testing Middleware

### Unit Testing

```typescript
import { test, expect } from "bun:test";

test("auth middleware rejects missing token", async () => {
  const req = new Request("http://localhost/test");
  const response = await authMiddleware(req);
  
  expect(response).not.toBeNull();
  expect(response?.status).toBe(401);
});

test("auth middleware accepts valid token", async () => {
  const req = new Request("http://localhost/test", {
    headers: {
      Authorization: `Bearer ${validToken}`,
    },
  });
  
  const response = await authMiddleware(req);
  
  expect(response).toBeNull();
  expect((req as any).user).toBeDefined();
});
```

### Integration Testing

```typescript
test("middleware chain works correctly", async () => {
  const response = await fetch("http://localhost:3001/api/protected", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ data: "test" }),
  });
  
  expect(response.status).toBe(200);
});
```

## Best Practices

1. **Return Early** - Check conditions and return early
2. **Single Responsibility** - Each middleware does one thing
3. **Error Handling** - Always handle errors gracefully
4. **Performance** - Avoid blocking operations
5. **Testing** - Test both success and failure cases
6. **Documentation** - Document middleware behavior
7. **Composition** - Combine simple middleware for complex behavior

## Next Steps

- Explore [Utilities](/docs/utilities) for helper functions
- Learn about [Security](/docs/features/security) best practices
- Understand [Testing](/docs/features/testing) strategies
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

Global middleware is applied in `src/server/index.ts` via the `wrapResponse()` helper. Per-route middleware (auth, rate limiting, validation) is applied imperatively in route handlers.

```
Request → CORS Preflight → CSRF Protection → Route Handler → CORS Headers → Security Headers → Response
                                                ↑
                                    (per-route: Rate Limit → Auth → Validation)
```

## Built-in Middleware

### Authentication Middleware

#### `requireAuth`

Validates JWT token and adds user to request:

```typescript
// src/server/middleware/auth.ts
import { verifyToken } from "@/lib/crypto";
import type { AuthUser } from "@/lib/types";

declare global {
  interface Request {
    user?: AuthUser;
  }
}

export function requireAuth(req: Request): Response | null {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || !payload.userId) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  req.user = {
    id: payload.userId as string,
    email: payload.email as string,
    name: payload.name as string,
    role: payload.role as "user" | "admin",
  };

  return null;
}
```

#### `requireAdmin`

Requires admin role:

```typescript
export function requireAdmin(req: Request): Response | null {
  const authResponse = requireAuth(req);
  if (authResponse) return authResponse;

  if (req.user?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
```

### CSRF Protection

#### `applyCsrfProtection`

Validates CSRF tokens for mutations:

```typescript
// src/server/middleware/csrf.ts
import { randomBytes } from "node:crypto";

// WARNING: In-memory CSRF store. Tokens are lost on server restart and not shared
// across instances. For production multi-instance deployments, replace with Redis
// or database-backed storage.
const csrfTokenStore = new Map<string, { token: string; expires: number }>();

export function requiresCsrfProtection(req: Request): boolean {
  const url = new URL(req.url);
  const path = url.pathname;

  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;
  // Skip for auth endpoints (login/register)
  if (path === "/api/auth/login" || path === "/api/auth/register") return false;
  // Skip for health check
  if (path === "/api/health") return false;

  return true;
}

export function applyCsrfProtection(req: Request): Response | null {
  if (!requiresCsrfProtection(req)) return null;

  const cookies = parseCookies(req.headers.get("Cookie") || "");
  const csrfCookie = cookies["csrf-token"] || null;
  const csrfToken = req.headers.get("X-CSRF-Token");

  if (!validateCsrfToken(csrfCookie, csrfToken)) {
    return Response.json({ error: "CSRF token validation failed" }, { status: 403 });
  }

  return null;
}
```

### Rate Limiting

#### `createRateLimiter`

Factory for creating rate limit middleware:

```typescript
// src/server/middleware/rate-limit.ts
interface RateLimitOptions {
  windowMs?: number;  // Window size in milliseconds (default: 15 minutes)
  max?: number;       // Max requests per window (default: 5)
  message?: string;   // Error message
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 5,
    message = "Too many requests, please try again later",
  } = options;

  return (req: Request): Response | null => {
    if (process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test") {
      return null;
    }

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    const now = Date.now();
    const resetTime = now + windowMs;

    let entry = rateLimitStore.get(ip);

    if (!entry || entry.resetTime < now) {
      entry = { count: 1, resetTime };
      rateLimitStore.set(ip, entry);
      return null;
    }

    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return new Response(JSON.stringify({ error: message }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(entry.resetTime),
        },
      });
    }

    return null;
  };
}

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many authentication attempts, please try again later",
});

export const strictAuthRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: "Too many failed login attempts, please try again later",
});
```

### Security Headers

#### `applySecurityHeaders`

Adds security headers to responses:

```typescript
// src/server/middleware/security-headers.ts
export function applySecurityHeaders(response: Response, req: Request): Response {
  const headers = new Headers(response.headers);
  const url = new URL(req.url);
  const contentType = response.headers.get("Content-Type") || "";

  // General security headers - apply to all responses
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  headers.delete("X-Powered-By");

  // Content Security Policy - only for HTML responses
  if (contentType.includes("text/html")) {
    const isDev = process.env.NODE_ENV !== "production";
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : ""}`,
      `style-src 'self' ${isDev ? "'unsafe-inline'" : ""}`,
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];
    headers.set("Content-Security-Policy", cspDirectives.join("; "));
  }

  // HSTS - only in production
  if (process.env.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Cache control for API and static assets
  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/users") || url.pathname.startsWith("/api/admin")) {
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    } else {
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    }
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (url.pathname === "/manifest.json") {
    headers.set("Cache-Control", "public, max-age=3600");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
```

### CORS Middleware

#### `corsMiddleware`

Handles cross-origin requests:

```typescript
// src/server/middleware/cors.ts
import { env } from "../../config/env";

const PORT = env.PORT;
const ALLOWED_ORIGINS =
  env.NODE_ENV === "production"
    ? ["https://yourdomain.com"]
    : [
        `http://localhost:${PORT}`,
        `http://localhost:${Number(PORT) + 1}`,
        `http://127.0.0.1:${PORT}`,
      ];

const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
const ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-CSRF-Token"];

export function applyCorsHeaders(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  headers.set("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;

  const origin = req.headers.get("Origin");
  const headers = new Headers();

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS.join(", "));
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS.join(", "));
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");

  return new Response(null, { status: 204, headers });
}
```

### Validation Middleware

#### `validateRequest`

Validates request body with Zod schema:

```typescript
// src/server/middleware/validation.ts
import { z } from "zod";

export async function validateRequest<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<T | Response> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ errors: error.errors }, { status: 400 });
    }
    return new Response("Invalid request", { status: 400 });
  }
}

// Usage in route handler
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function handleLogin(req: Request) {
  const body = await validateRequest(req, loginSchema);
  if (body instanceof Response) return body;

  // body is now typed as { email: string; password: string }
  // ... handle login
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
  requireAuth,
  applyCsrfProtection
);
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
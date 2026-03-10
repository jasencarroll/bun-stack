# Security

Create Bun Stack includes comprehensive security features to protect your application from common vulnerabilities. This guide covers the built-in security measures and best practices.

## Overview

Security features include:

- 🔐 **Authentication & Authorization** - JWT-based auth with role management
- 🛡️ **CSRF Protection** - Double-submit cookie pattern
- 🚦 **Rate Limiting** - Prevent abuse and DDoS
- 📝 **Input Validation** - Zod schemas for all inputs
- 🔒 **Security Headers** - XSS, clickjacking protection
- 💉 **SQL Injection Prevention** - Parameterized queries
- 🔑 **Password Security** - Bun.password hashing
- 🌐 **CORS Configuration** - Cross-origin control

## Security Headers

### Implementation

Security headers are automatically applied to all responses:

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

  // Remove server identification
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

  // Cache control
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

### Header Explanations

| Header | Purpose | Protection Against |
|--------|---------|-------------------|
| `Content-Security-Policy` | Controls resource loading | XSS, data injection |
| `X-Content-Type-Options` | Prevents MIME sniffing | MIME confusion attacks |
| `X-Frame-Options` | Prevents framing | Clickjacking |
| `X-XSS-Protection` | XSS filter (legacy) | XSS in older browsers |
| `Referrer-Policy` | Controls referrer info | Information leakage |
| `Permissions-Policy` | Disables browser features | Feature abuse |
| `Strict-Transport-Security` | Forces HTTPS | Protocol downgrade |

## CSRF Protection

### How It Works

CSRF protection uses the double-submit cookie pattern:

```typescript
// src/server/middleware/csrf.ts
import { randomBytes } from "node:crypto";

// WARNING: In-memory CSRF store. Tokens are lost on server restart and not shared
// across instances. For production multi-instance deployments, replace with Redis
// or database-backed storage.
const csrfTokenStore = new Map<string, { token: string; expires: number }>();

export function generateCsrfToken(): { token: string; cookie: string } {
  const token = randomBytes(32).toString("hex");
  const cookie = randomBytes(32).toString("hex");

  csrfTokenStore.set(cookie, {
    token,
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });

  cleanupExpiredTokens();
  return { token, cookie };
}

export function validateCsrfToken(cookie: string | null, token: string | null): boolean {
  if (!cookie || !token) return false;
  const stored = csrfTokenStore.get(cookie);
  if (!stored) return false;
  if (stored.expires < Date.now()) {
    csrfTokenStore.delete(cookie);
    return false;
  }
  return stored.token === token;
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

### Frontend Integration

> **Note:** The API client below is a recommended pattern. This file is not included in the generated template — create it as needed.

```typescript
// src/app/lib/api/client.ts (not in template — create as needed)
export class ApiClient {
  private csrfToken: string | null = null;

  async request(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    
    // Add CSRF token for mutations
    if (this.csrfToken && !["GET", "HEAD"].includes(options.method || "GET")) {
      headers.set("X-CSRF-Token", this.csrfToken);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Include cookies
    });

    // Store CSRF token from auth responses
    if (url.includes("/auth/")) {
      const data = await response.clone().json();
      if (data.csrfToken) {
        this.csrfToken = data.csrfToken;
      }
    }

    return response;
  }
}
```

## Rate Limiting

### Configuration

```typescript
// src/server/middleware/rate-limit.ts
interface RateLimitOptions {
  windowMs?: number;  // Window size in milliseconds (default: 15 minutes)
  max?: number;       // Max requests per window (default: 5)
  message?: string;   // Error message
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Too many failed login attempts, please try again later",
});
```

## Input Validation

### Zod Schemas

> **Note:** The schema file below (`src/server/schemas/user.schema.ts`) is a recommended pattern. It is not included in the generated template — the template defines schemas inline in route handlers (e.g., `src/server/routes/auth.ts`). The actual template `loginSchema` uses `z.string().email()` and `z.string().min(8)` without complex password rules.

```typescript
// src/server/schemas/user.schema.ts (not in template — create as needed)
import { z } from "zod";

export const emailSchema = z
  .string()
  .email("Invalid email format")
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character");

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(100).trim(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// Sanitize input
export const searchSchema = z.object({
  query: z
    .string()
    .max(100)
    .transform((val) => val.replace(/[<>]/g, "")), // Remove potential XSS
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
```

### Validation Utility

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
async function handleCreateUser(req: Request) {
  const body = await validateRequest(req, createUserSchema);
  if (body instanceof Response) return body;

  // body is now typed as the schema output
  const user = await userRepository.create(body);
  return Response.json(user, { status: 201 });
}
```

## SQL Injection Prevention

### Safe Database Queries

Always use parameterized queries:

```typescript
// ❌ NEVER do this - SQL injection vulnerability
const users = db.query(`SELECT * FROM users WHERE email = '${userInput}'`);

// ✅ Safe - Drizzle ORM query builder
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, userInput));

// ✅ Safe - Drizzle tagged template (automatically parameterized)
const results = await db.execute(
  sql`SELECT * FROM users WHERE email = ${userInput}`
);
```

### Query Builder Safety

> **Note:** The `BaseRepository` class below is a recommended pattern. It is not included in the generated template — create it as needed.

```typescript
// src/db/repositories/base.repository.ts (not in template — create as needed)
export abstract class BaseRepository<T> {
  protected abstract table: Table;

  async findWhere(conditions: Partial<T>): Promise<T[]> {
    // Build conditions safely
    const whereConditions = Object.entries(conditions)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => eq(this.table[key], value));

    if (whereConditions.length === 0) {
      return db.select().from(this.table);
    }

    return db
      .select()
      .from(this.table)
      .where(and(...whereConditions));
  }

  // Safe dynamic ordering
  async findWithOrder(
    orderBy: string,
    direction: "asc" | "desc" = "asc"
  ): Promise<T[]> {
    // Whitelist allowed columns
    const allowedColumns = Object.keys(this.table);
    if (!allowedColumns.includes(orderBy)) {
      throw new Error("Invalid order column");
    }

    const orderFn = direction === "desc" ? desc : asc;
    return db
      .select()
      .from(this.table)
      .orderBy(orderFn(this.table[orderBy]));
  }
}
```

## Password Security

### Secure Password Hashing

```typescript
// src/lib/crypto.ts
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error("Password cannot be empty");
  }
  return await Bun.password.hash(password);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  if (!hashedPassword) return false;
  try {
    return await Bun.password.verify(password, hashedPassword);
  } catch {
    return false;
  }
}
```

### Account Security

> **Note:** The `AuthService` class below is a recommended pattern for production account lockout. It is not included in the generated template — create it as needed.

```typescript
// src/server/services/auth.service.ts (not in template — create as needed)
export class AuthService {
  private failedAttempts = new Map<string, number>();
  private lockedAccounts = new Map<string, number>();

  async login(email: string, password: string) {
    // Check if account is locked
    const lockedUntil = this.lockedAccounts.get(email);
    if (lockedUntil && lockedUntil > Date.now()) {
      throw new Error("Account temporarily locked due to failed attempts");
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      this.recordFailedAttempt(email);
      throw new Error("Invalid credentials");
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      this.recordFailedAttempt(email);
      throw new Error("Invalid credentials");
    }

    // Clear failed attempts
    this.failedAttempts.delete(email);
    this.lockedAccounts.delete(email);

    // Generate token
    return this.generateAuthToken(user);
  }

  private recordFailedAttempt(email: string) {
    const attempts = (this.failedAttempts.get(email) || 0) + 1;
    this.failedAttempts.set(email, attempts);

    // Lock after 5 attempts for 30 minutes
    if (attempts >= 5) {
      this.lockedAccounts.set(email, Date.now() + 30 * 60 * 1000);
      this.failedAttempts.delete(email);
    }
  }
}
```

## CORS Configuration

### Flexible CORS Setup

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

## XSS Prevention

### Content Sanitization

> **Note:** The sanitization utilities below are recommended patterns. They are not included in the generated template — create them as needed and install `isomorphic-dompurify` if you use `sanitizeHtml`.

```typescript
// src/lib/sanitize.ts (not in template — create as needed)
import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "target"],
  });
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// React automatically escapes, but for dangerouslySetInnerHTML:
export function SafeHtml({ html }: { html: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: sanitizeHtml(html),
      }}
    />
  );
}
```

### URL Validation

> **Note:** The URL validation utilities below are recommended patterns. They are not included in the generated template — create them as needed.

```typescript
// src/lib/validation/url.ts (not in template — create as needed)
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http(s)
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function sanitizeRedirectUrl(url: string): string {
  // Prevent open redirects
  if (!url || !url.startsWith("/")) {
    return "/";
  }
  
  // Remove any protocol/host
  const cleaned = url.replace(/^[^/]*\/\/[^/]*/, "");
  
  // Ensure it starts with /
  return cleaned.startsWith("/") ? cleaned : "/" + cleaned;
}
```

## File Upload Security

### Secure File Handling

> **Note:** The `UploadService` class below is a recommended pattern. It is not included in the generated template — create it as needed.

```typescript
// src/server/services/upload.service.ts (not in template — create as needed)
import { createHash } from "crypto";

interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  destination?: string;
}

export class UploadService {
  async handleUpload(
    file: File,
    options: UploadOptions = {}
  ): Promise<string> {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB
      allowedTypes = ["image/jpeg", "image/png", "image/gif"],
      destination = "./uploads",
    } = options;

    // Validate file size
    if (file.size > maxSize) {
      throw new Error(`File too large. Max size: ${maxSize} bytes`);
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type not allowed: ${file.type}`);
    }

    // Validate actual file content (magic numbers)
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    if (!this.validateMagicNumbers(bytes, file.type)) {
      throw new Error("File content does not match declared type");
    }

    // Generate safe filename
    const hash = createHash("sha256")
      .update(buffer)
      .digest("hex");
    const ext = this.getExtension(file.type);
    const filename = `${hash}${ext}`;

    // Save file
    await Bun.write(`${destination}/${filename}`, buffer);

    return filename;
  }

  private validateMagicNumbers(bytes: Uint8Array, mimeType: string): boolean {
    const magicNumbers: Record<string, number[][]> = {
      "image/jpeg": [[0xFF, 0xD8, 0xFF]],
      "image/png": [[0x89, 0x50, 0x4E, 0x47]],
      "image/gif": [[0x47, 0x49, 0x46, 0x38]],
    };

    const validSequences = magicNumbers[mimeType];
    if (!validSequences) return false;

    return validSequences.some((sequence) =>
      sequence.every((byte, index) => bytes[index] === byte)
    );
  }

  private getExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
    };
    return extensions[mimeType] || ".bin";
  }
}
```

## Security Monitoring

### Audit Logging

> **Note:** The `AuditService` class below is a recommended pattern for production monitoring. It is not included in the generated template — create it as needed.

```typescript
// src/server/services/audit.service.ts (not in template — create as needed)
interface AuditLog {
  timestamp: Date;
  userId?: string;
  ip: string;
  action: string;
  resource?: string;
  details?: any;
  userAgent?: string;
}

export class AuditService {
  async log(req: Request, action: string, details?: any) {
    const user = (req as any).user;
    const ip = this.getClientIp(req);

    const log: AuditLog = {
      timestamp: new Date(),
      userId: user?.id,
      ip,
      action,
      resource: new URL(req.url).pathname,
      details,
      userAgent: req.headers.get("user-agent") || undefined,
    };

    // Store in database
    await auditLogRepository.create(log);

    // Alert on suspicious activity
    if (this.isSuspicious(log)) {
      await this.alertAdmins(log);
    }
  }

  private isSuspicious(log: AuditLog): boolean {
    const suspiciousActions = [
      "failed_login_5x",
      "permission_denied",
      "invalid_token",
      "rate_limit_exceeded",
    ];
    return suspiciousActions.includes(log.action);
  }
}
```

## Security Checklist

### Development

- [ ] Enable all security middleware
- [ ] Use HTTPS locally with self-signed certs
- [ ] Test with security headers enabled
- [ ] Validate all inputs
- [ ] Use parameterized queries

### Pre-Deployment

- [ ] Run security audit: `npm audit`
- [ ] Update all dependencies
- [ ] Review environment variables
- [ ] Test rate limiting
- [ ] Verify CORS settings
- [ ] Check CSP policy

### Production

- [ ] Use strong JWT secret (32+ chars)
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags
- [ ] Configure firewall rules
- [ ] Set up monitoring/alerting
- [ ] Regular security updates
- [ ] Implement backup strategy

## Best Practices

1. **Defense in Depth** - Layer security measures
2. **Least Privilege** - Minimal permissions
3. **Input Validation** - Never trust user input
4. **Output Encoding** - Prevent XSS
5. **Secure Defaults** - Fail securely
6. **Regular Updates** - Patch vulnerabilities
7. **Security Testing** - Penetration testing
8. **Incident Response** - Have a plan

## Next Steps

- Implement [Two-Factor Authentication](/docs/advanced/2fa)
- Set up [Security Monitoring](/docs/advanced/monitoring)
- Configure [Web Application Firewall](/docs/advanced/waf)
- Review [OWASP Top 10](https://owasp.org/Top10/)
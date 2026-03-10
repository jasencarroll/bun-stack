# Security Best Practices

This guide covers security best practices for Create Bun Stack applications, including authentication, authorization, data protection, and common security vulnerabilities.

## Security Overview

Create Bun Stack includes several security features by default:

- JWT-based authentication
- CSRF protection
- Secure password hashing
- Security headers
- Input validation
- SQL injection prevention

## Authentication Security

### Password Security

Always use Bun's built-in password hashing:

```typescript
// src/lib/crypto.ts
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error("Password cannot be empty");
  }
  // Bun uses bcrypt by default
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

### JWT Security

Implement secure JWT handling:

```typescript
// src/lib/crypto.ts
import { createHmac } from "node:crypto";
import { env } from "../config/env";

const JWT_EXPIRY = 60 * 60 * 24; // 24 hours in seconds

export function generateToken(payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY,
    })
  ).toString("base64url");

  const signature = createHmac("sha256", env.JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !signature) return null;

    const testSignature = createHmac("sha256", env.JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    if (signature !== testSignature) return null;

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
```

### Session Security

> **Note:** The examples below show recommended patterns for production hardening. These implementations are not included in the generated template.

Implement secure session management:

```typescript
// src/server/auth/session.ts
export class SessionManager {
  // Generate cryptographically secure session IDs
  generateSessionId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
  
  // Secure session storage
  async createSession(userId: string, userAgent: string, ip: string) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      userId,
      userAgent,
      ip,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
    
    await db.insert(sessions).values(session);
    
    return {
      sessionId,
      // Secure cookie options
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: 24 * 60 * 60, // 24 hours
        path: "/",
      },
    };
  }
  
  // Session validation with security checks
  async validateSession(sessionId: string, userAgent: string, ip: string) {
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    
    if (!session[0]) {
      throw new Error("Invalid session");
    }
    
    // Check expiration
    if (new Date() > session[0].expiresAt) {
      await this.destroySession(sessionId);
      throw new Error("Session expired");
    }
    
    // Check for session hijacking
    if (session[0].userAgent !== userAgent) {
      await this.flagSuspiciousActivity(session[0].userId, "User agent mismatch");
    }
    
    if (session[0].ip !== ip && process.env.NODE_ENV === "production") {
      await this.flagSuspiciousActivity(session[0].userId, "IP address change");
    }
    
    // Update last activity
    await db
      .update(sessions)
      .set({ lastActivity: new Date() })
      .where(eq(sessions.id, sessionId));
    
    return session[0];
  }
}
```

## Authorization Security

### Role-Based Access Control (RBAC)

> **Note:** The examples below show recommended patterns for production hardening. These implementations are not included in the generated template.

Implement fine-grained permissions:

```typescript
// src/server/auth/rbac.ts
export enum Permission {
  // Resource permissions
  USER_READ = "user:read",
  USER_WRITE = "user:write",
  USER_DELETE = "user:delete",
  
  // Admin permissions
  ADMIN_ACCESS = "admin:access",
  ADMIN_USERS = "admin:users",
  ADMIN_SETTINGS = "admin:settings",
}

export class RBAC {
  private rolePermissions = new Map<string, Set<Permission>>();
  
  constructor() {
    // Define role permissions
    this.rolePermissions.set("user", new Set([
      Permission.USER_READ,
    ]));
    
    this.rolePermissions.set("moderator", new Set([
      Permission.USER_READ,
      Permission.USER_WRITE,
    ]));
    
    this.rolePermissions.set("admin", new Set([
      Permission.USER_READ,
      Permission.USER_WRITE,
      Permission.USER_DELETE,
      Permission.ADMIN_ACCESS,
      Permission.ADMIN_USERS,
      Permission.ADMIN_SETTINGS,
    ]));
  }
  
  // Check permissions
  can(role: string, permission: Permission): boolean {
    const permissions = this.rolePermissions.get(role);
    return permissions?.has(permission) ?? false;
  }
  
  // Check multiple permissions
  canAll(role: string, permissions: Permission[]): boolean {
    return permissions.every(p => this.can(role, p));
  }
  
  // Check any permission
  canAny(role: string, permissions: Permission[]): boolean {
    return permissions.some(p => this.can(role, p));
  }
  
  // Middleware factory
  require(...permissions: Permission[]) {
    return async (req: Request) => {
      const user = req.user;
      
      if (!user) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      
      if (!this.canAll(user.role, permissions)) {
        return Response.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }
      
      return null; // Continue
    };
  }
}
```

### Resource-Based Access Control

> **Note:** The resource access control below is a recommended pattern for production hardening. It is not included in the generated template — create it as needed.

Implement ownership checks:

```typescript
// src/server/auth/resource-access.ts (not in template — create as needed)
export class ResourceAccess {
  // Check resource ownership
  async canAccessResource(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    switch (resourceType) {
      case "post":
        const post = await db
          .select()
          .from(posts)
          .where(eq(posts.id, resourceId))
          .limit(1);
        return post[0]?.userId === userId;
      
      case "comment":
        const comment = await db
          .select()
          .from(comments)
          .where(eq(comments.id, resourceId))
          .limit(1);
        return comment[0]?.userId === userId;
      
      default:
        return false;
    }
  }
  
  // Middleware for resource access
  requireResourceAccess(resourceType: string) {
    return async (req: Request) => {
      const user = req.user;
      const resourceId = req.params?.id;
      
      if (!user || !resourceId) {
        return Response.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
      
      // Admins can access all resources
      if (user.role === "admin") {
        return null;
      }
      
      const canAccess = await this.canAccessResource(
        user.id,
        resourceType,
        resourceId
      );
      
      if (!canAccess) {
        return Response.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
      
      return null;
    };
  }
}
```

## Input Validation & Sanitization

### Request Validation

The template includes a `validateRequest` utility and defines schemas inline in route handlers:

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

// Usage in route handler (src/server/routes/auth.ts):
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const body = await validateRequest(req, loginSchema);
if (body instanceof Response) return body;
// body is now typed as { email: string; password: string }
```

> **Note:** The `registerSchema`, `sanitizeInput`, and stronger password validation schemas below are recommended patterns for production hardening — they are not included in the generated template.

```typescript
// Recommended: stricter schemas for production (not in template)
export const registerSchema = z.object({
  email: z.string().email().toLowerCase().max(255),
  password: z.string().min(12).max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      "Password must contain uppercase, lowercase, number, and special character"),
  name: z.string().min(2).max(100),
});

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, "").slice(0, 1000);
};
```

### SQL Injection Prevention

Use parameterized queries:

```typescript
// NEVER do this - vulnerable to SQL injection
async function unsafeQuery(userInput: string) {
  return db.execute(`SELECT * FROM users WHERE name = '${userInput}'`);
}

// ALWAYS use parameterized queries
async function safeQuery(userInput: string) {
  return db
    .select()
    .from(users)
    .where(eq(users.name, userInput)); // Automatically parameterized
}

// For raw SQL, use placeholders
async function safeRawQuery(userInput: string) {
  return db.execute(
    sql`SELECT * FROM users WHERE name = ${userInput}`
  );
}

// Validate identifiers for dynamic queries
function validateTableName(tableName: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName);
}
```

## CSRF Protection

### CSRF Token Implementation

Implement double-submit cookie pattern:

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

// Helper: determines which requests need CSRF protection
function requiresCsrfProtection(req: Request): boolean {
  const url = new URL(req.url);
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;
  if (url.pathname === "/api/auth/login" || url.pathname === "/api/auth/register") return false;
  if (url.pathname === "/api/health") return false;
  return true;
}
```

## Security Headers

### Security Headers Implementation

Security headers are applied as a response processor (not middleware):

```typescript
// src/server/middleware/security-headers.ts
export function applySecurityHeaders(response: Response, req: Request): Response {
  const headers = new Headers(response.headers);
  const url = new URL(req.url);
  const contentType = response.headers.get("Content-Type") || "";

  // General security headers
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

## Rate Limiting

### Implement Rate Limiting

Protect against brute force and DoS:

```typescript
// src/server/middleware/rate-limit.ts
interface RateLimitOptions {
  windowMs?: number; // Window size in milliseconds (default: 15 minutes)
  max?: number;      // Max requests per window (default: 5)
  message?: string;  // Error message
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

## Data Encryption

> **Note:** The examples below show recommended patterns for production hardening. These implementations are not included in the generated template.

### Encrypt Sensitive Data

Encrypt data at rest:

```typescript
// src/server/security/encryption.ts
export class Encryption {
  private key: CryptoKey;
  
  async initialize() {
    const keyMaterial = new TextEncoder().encode(
      process.env.ENCRYPTION_KEY!
    );
    
    this.key = await crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  }
  
  async encrypt(data: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.key,
      encoded
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  async decrypt(encryptedData: string): Promise<string> {
    const combined = Uint8Array.from(
      atob(encryptedData),
      c => c.charCodeAt(0)
    );
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  }
}

// Use for sensitive fields
export const encryptedField = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "text";
  },
  async toDriver(value: string) {
    const encryption = new Encryption();
    await encryption.initialize();
    return encryption.encrypt(value);
  },
  async fromDriver(value: string) {
    const encryption = new Encryption();
    await encryption.initialize();
    return encryption.decrypt(value);
  },
});
```

## Security Monitoring

### Audit Logging

> **Note:** The examples below show recommended patterns for production hardening. These implementations are not included in the generated template.

Log security events:

```typescript
// src/server/security/audit.ts
export class AuditLogger {
  async log(event: {
    type: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }) {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      type: event.type,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: JSON.stringify(event.details),
      timestamp: new Date(),
    });
  }
  
  // Log authentication events
  async logAuth(
    type: "login" | "logout" | "failed_login" | "password_reset",
    userId?: string,
    req?: Request
  ) {
    await this.log({
      type: `auth:${type}`,
      userId,
      ip: this.getClientIp(req),
      userAgent: req?.headers.get("User-Agent") || undefined,
    });
  }
  
  // Log access events
  async logAccess(
    resource: string,
    action: string,
    userId: string,
    allowed: boolean,
    req?: Request
  ) {
    await this.log({
      type: "access",
      userId,
      ip: this.getClientIp(req),
      details: { resource, action, allowed },
    });
  }
  
  // Detect suspicious patterns
  async detectSuspiciousActivity(userId: string) {
    const recentLogs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, userId),
          gt(auditLogs.timestamp, new Date(Date.now() - 60 * 60 * 1000))
        )
      );
    
    const patterns = {
      failedLogins: recentLogs.filter(l => l.type === "auth:failed_login").length,
      differentIps: new Set(recentLogs.map(l => l.ip)).size,
      passwordResets: recentLogs.filter(l => l.type === "auth:password_reset").length,
    };
    
    if (patterns.failedLogins > 5) {
      await this.alertSecurity("Multiple failed login attempts", userId);
    }
    
    if (patterns.differentIps > 3) {
      await this.alertSecurity("Login from multiple IPs", userId);
    }
  }
  
  private getClientIp(req?: Request): string {
    if (!req) return "unknown";
    
    const forwarded = req.headers.get("X-Forwarded-For");
    return forwarded?.split(",")[0] || "unknown";
  }
  
  private async alertSecurity(message: string, userId: string) {
    console.error(`SECURITY ALERT: ${message} for user ${userId}`);
    // Send email/notification to security team
  }
}
```

## Security Checklist

### Development Security

- [ ] Use environment variables for secrets
- [ ] Enable TypeScript strict mode
- [ ] Use linting rules for security
- [ ] Regular dependency updates
- [ ] Security testing in CI/CD

### Authentication & Authorization

- [ ] Strong password requirements
- [ ] Secure session management
- [ ] JWT with appropriate expiration
- [ ] Role-based access control
- [ ] Resource-based permissions

### Data Protection

- [ ] Input validation on all endpoints
- [ ] Parameterized database queries
- [ ] Encryption for sensitive data
- [ ] Secure file uploads
- [ ] PII data handling compliance

### Network Security

- [ ] HTTPS everywhere
- [ ] Security headers
- [ ] CORS configuration
- [ ] Rate limiting
- [ ] DDoS protection

### Monitoring & Response

- [ ] Security event logging
- [ ] Intrusion detection
- [ ] Regular security audits
- [ ] Incident response plan
- [ ] Backup and recovery procedures

## Next Steps

- Set up [Monitoring](/docs/monitoring)
- Configure [CI/CD](/docs/ci-cd)
- Review [Performance](/docs/performance) optimizations
- Plan [Deployment](/docs/deployment/) strategy
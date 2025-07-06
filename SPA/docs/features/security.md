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
- 🔑 **Password Security** - Argon2id hashing
- 🌐 **CORS Configuration** - Cross-origin control

## Security Headers

### Implementation

Security headers are automatically applied to all responses:

```typescript
// src/server/middleware/security.ts
export function securityMiddleware(req: Request): Response | null {
  const headers = new Headers();
  const isDev = process.env.NODE_ENV === "development";

  // Determine if response is HTML
  const isHtml = req.headers.get("accept")?.includes("text/html");

  if (isHtml) {
    // Strict CSP for HTML responses
    headers.set(
      "Content-Security-Policy",
      isDev
        ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: wss:; img-src 'self' data: https:; font-src 'self' data:;"
        : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';"
    );
  }

  // Security headers for all responses
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // HSTS for production
  if (!isDev) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Attach headers to request for later use
  (req as any).securityHeaders = headers;
  return null;
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
import { createHash } from "crypto";

export async function csrfMiddleware(req: Request): Promise<Response | null> {
  // Skip for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return null;
  }

  // Skip for API routes that use different auth
  if (req.url.includes("/api/webhook")) {
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

  // Verify tokens match
  const isValid = await Bun.password.verify(headerToken, cookieToken);
  
  if (!isValid) {
    return Response.json(
      { error: "CSRF token invalid" },
      { status: 403 }
    );
  }

  return null;
}

// Generate CSRF token for login/register
export function generateCsrfToken(): { token: string; cookie: string } {
  const token = crypto.randomUUID();
  const cookie = Bun.password.hashSync(token);
  
  return { token, cookie };
}
```

### Frontend Integration

```typescript
// src/app/lib/api/client.ts
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
interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
  message?: string;  // Error message
  skipIf?: (req: Request) => boolean;
}

const limits = new Map<string, { count: number; resetAt: number }>();

export function createRateLimit(config: RateLimitConfig) {
  return async function rateLimitMiddleware(req: Request): Promise<Response | null> {
    // Skip in test environment
    if (process.env.NODE_ENV === "test") {
      return null;
    }

    // Skip if condition met
    if (config.skipIf?.(req)) {
      return null;
    }

    const ip = getClientIp(req);
    const key = `${ip}:${new URL(req.url).pathname}`;
    const now = Date.now();

    const limit = limits.get(key);
    
    if (!limit || limit.resetAt < now) {
      // Create new window
      limits.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return null;
    }

    if (limit.count >= config.max) {
      return Response.json(
        { error: config.message || "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((limit.resetAt - now) / 1000)),
            "X-RateLimit-Limit": String(config.max),
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
```

### Applying Rate Limits

```typescript
// src/server/routes/auth.ts
const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many login attempts, please try again later",
});

export const auth = {
  "/login": {
    POST: [authRateLimit, handleLogin],
  },
  "/register": {
    POST: [authRateLimit, handleRegister],
  },
};

// API rate limit
const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skipIf: (req) => {
    // Skip for authenticated admin users
    const user = getUserFromRequest(req);
    return user?.role === "admin";
  },
});
```

## Input Validation

### Zod Schemas

Define strict validation schemas:

```typescript
// src/server/schemas/user.schema.ts
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

### Validation Middleware

```typescript
// src/server/middleware/validation.ts
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async function validationMiddleware(
    req: Request
  ): Promise<Response | null> {
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
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
  };
}

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
```

## SQL Injection Prevention

### Safe Database Queries

Always use parameterized queries:

```typescript
// ❌ NEVER do this - SQL injection vulnerability
const users = await db.execute(
  sql`SELECT * FROM users WHERE email = ${userInput}`
);

// ✅ Safe - parameterized query
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, userInput));

// ✅ Safe - prepared statement
const getUserByEmail = db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, sql.placeholder("email")))
  .prepare();

const user = await getUserByEmail.execute({ email: userInput });

// ✅ Safe - raw query with parameters (if needed)
const results = await db.execute(
  sql`SELECT * FROM users WHERE email = ${sql.placeholder("email")}`,
  { email: userInput }
);
```

### Query Builder Safety

```typescript
// src/db/repositories/base.repository.ts
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
  // Validate password
  if (!password || password.length === 0) {
    throw new Error("Password cannot be empty");
  }

  // Use Argon2id (Bun's default)
  return await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 19456,  // 19 MB
    timeCost: 2,        // 2 iterations
  });
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else feedback.push("Use at least 8 characters");

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Include lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Include uppercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Include numbers");

  if (/[^A-Za-z0-9]/.test(password)) score += 2;
  else feedback.push("Include special characters");

  // Check common passwords
  if (commonPasswords.includes(password.toLowerCase())) {
    score = 0;
    feedback.unshift("This password is too common");
  }

  return { score: Math.min(score, 5), feedback };
}
```

### Account Security

```typescript
// src/server/services/auth.service.ts
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
interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function createCorsMiddleware(options: CorsOptions = {}) {
  const {
    origin = "*",
    methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders = ["Content-Type", "Authorization", "X-CSRF-Token"],
    exposedHeaders = ["X-Total-Count", "X-Page"],
    credentials = true,
    maxAge = 86400,
  } = options;

  return function corsMiddleware(req: Request): Response | null {
    const requestOrigin = req.headers.get("origin");
    
    // Handle preflight
    if (req.method === "OPTIONS") {
      const headers = new Headers();
      
      // Set origin
      if (origin === "*") {
        headers.set("Access-Control-Allow-Origin", "*");
      } else if (typeof origin === "function") {
        if (requestOrigin && origin(requestOrigin)) {
          headers.set("Access-Control-Allow-Origin", requestOrigin);
        }
      } else if (Array.isArray(origin)) {
        if (requestOrigin && origin.includes(requestOrigin)) {
          headers.set("Access-Control-Allow-Origin", requestOrigin);
        }
      } else {
        headers.set("Access-Control-Allow-Origin", origin);
      }

      headers.set("Access-Control-Allow-Methods", methods.join(", "));
      headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
      headers.set("Access-Control-Max-Age", String(maxAge));
      
      if (credentials) {
        headers.set("Access-Control-Allow-Credentials", "true");
      }

      return new Response(null, { status: 204, headers });
    }

    // Set CORS headers for actual requests
    (req as any).corsHeaders = getCorsHeaders(requestOrigin, options);
    return null;
  };
}

// Production CORS
const productionCors = createCorsMiddleware({
  origin: (origin) => {
    const allowed = [
      "https://myapp.com",
      "https://www.myapp.com",
      "https://app.myapp.com",
    ];
    return allowed.includes(origin);
  },
  credentials: true,
});
```

## XSS Prevention

### Content Sanitization

```typescript
// src/lib/sanitize.ts
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

```typescript
// src/lib/validation/url.ts
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

```typescript
// src/server/services/upload.service.ts
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

```typescript
// src/server/services/audit.service.ts
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
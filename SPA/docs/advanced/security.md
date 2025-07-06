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
// src/server/auth/password.ts
export class PasswordManager {
  // Hash passwords with Bun's secure implementation
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, {
      algorithm: "argon2id", // Most secure algorithm
      memoryCost: 65536,     // 64MB
      timeCost: 3,          // 3 iterations
    });
  }
  
  // Verify passwords
  async verify(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
  
  // Password strength validation
  validateStrength(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 12) {
      errors.push("Password must be at least 12 characters");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain uppercase letters");
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain lowercase letters");
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain numbers");
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must contain special characters");
    }
    
    // Check against common passwords
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
      errors.push("Password is too common");
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

### JWT Security

Implement secure JWT handling:

```typescript
// src/server/auth/jwt.ts
import jwt from "jsonwebtoken";

export class JWTManager {
  private secret = process.env.JWT_SECRET!;
  private issuer = "create-bun-stack";
  
  constructor() {
    // Validate secret strength
    if (this.secret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters");
    }
  }
  
  // Generate secure tokens
  generateToken(payload: any, options?: jwt.SignOptions): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: "24h",
      issuer: this.issuer,
      algorithm: "HS256",
      ...options,
    });
  }
  
  // Generate refresh tokens with longer expiry
  generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: "refresh" },
      this.secret,
      {
        expiresIn: "30d",
        issuer: this.issuer,
        algorithm: "HS256",
      }
    );
  }
  
  // Verify tokens with security checks
  verifyToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        algorithms: ["HS256"],
      });
      
      // Additional security checks
      if (typeof decoded === "string") {
        throw new Error("Invalid token format");
      }
      
      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token expired");
      }
      throw new Error("Invalid token");
    }
  }
  
  // Revoke tokens (requires token blacklist)
  async revokeToken(token: string) {
    const decoded = this.verifyToken(token);
    await this.blacklist.add(token, decoded.exp);
  }
}
```

### Session Security

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

Implement ownership checks:

```typescript
// src/server/auth/resource-access.ts
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

Validate all input data:

```typescript
// src/server/validation/schemas.ts
import { z } from "zod";

// User registration schema
export const registerSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .toLowerCase()
    .max(255),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
  name: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
});

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .slice(0, 1000); // Limit length
};

// Validate and sanitize middleware
export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      
      // Attach validated data to request
      req.validatedBody = validated;
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json(
          {
            error: "Validation failed",
            details: error.errors,
          },
          { status: 400 }
        );
      }
      
      return Response.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
  };
}
```

### SQL Injection Prevention

Use parameterized queries:

```typescript
// src/db/security.ts
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
// src/server/security/csrf.ts
export class CSRFProtection {
  generateToken(): string {
    return crypto.randomUUID();
  }
  
  async createCSRFToken(sessionId: string): Promise<{
    token: string;
    hashedToken: string;
  }> {
    const token = this.generateToken();
    const hashedToken = await Bun.password.hash(token + sessionId);
    
    return { token, hashedToken };
  }
  
  async validateCSRFToken(
    token: string,
    hashedToken: string,
    sessionId: string
  ): Promise<boolean> {
    if (!token || !hashedToken) {
      return false;
    }
    
    return Bun.password.verify(token + sessionId, hashedToken);
  }
  
  middleware() {
    return async (req: Request) => {
      // Skip CSRF for safe methods
      if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return null;
      }
      
      const token = req.headers.get("X-CSRF-Token");
      const cookies = parseCookies(req.headers.get("Cookie") || "");
      const hashedToken = cookies.csrf;
      const sessionId = cookies.session;
      
      if (!token || !hashedToken || !sessionId) {
        return Response.json(
          { error: "CSRF token missing" },
          { status: 403 }
        );
      }
      
      const isValid = await this.validateCSRFToken(
        token,
        hashedToken,
        sessionId
      );
      
      if (!isValid) {
        return Response.json(
          { error: "Invalid CSRF token" },
          { status: 403 }
        );
      }
      
      return null;
    };
  }
}
```

## Security Headers

### Implement Security Headers

Add comprehensive security headers:

```typescript
// src/server/security/headers.ts
export function securityHeaders(
  handler: (req: Request) => Promise<Response> | Response
) {
  return async (req: Request): Promise<Response> => {
    const response = await handler(req);
    
    // Content Security Policy
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Tighten in production
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' wss:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ")
    );
    
    // Other security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    
    // HSTS for production
    if (process.env.NODE_ENV === "production") {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
    }
    
    return response;
  };
}
```

## Rate Limiting

### Implement Rate Limiting

Protect against brute force and DoS:

```typescript
// src/server/security/rate-limit.ts
export class RateLimiter {
  private attempts = new Map<string, number[]>();
  
  constructor(
    private windowMs: number = 15 * 60 * 1000, // 15 minutes
    private maxAttempts: number = 100
  ) {}
  
  // Get client identifier
  private getClientId(req: Request): string {
    // Use IP address or user ID
    const forwarded = req.headers.get("X-Forwarded-For");
    const ip = forwarded?.split(",")[0] || "unknown";
    const userId = req.user?.id;
    
    return userId || ip;
  }
  
  // Check rate limit
  async checkLimit(req: Request, multiplier: number = 1): Promise<boolean> {
    const clientId = this.getClientId(req);
    const now = Date.now();
    
    // Get attempts for this client
    let clientAttempts = this.attempts.get(clientId) || [];
    
    // Remove old attempts
    clientAttempts = clientAttempts.filter(
      time => now - time < this.windowMs
    );
    
    // Check limit
    if (clientAttempts.length >= this.maxAttempts * multiplier) {
      return false;
    }
    
    // Add new attempt
    clientAttempts.push(now);
    this.attempts.set(clientId, clientAttempts);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }
    
    return true;
  }
  
  // Cleanup old entries
  private cleanup() {
    const now = Date.now();
    
    for (const [clientId, attempts] of this.attempts) {
      const validAttempts = attempts.filter(
        time => now - time < this.windowMs
      );
      
      if (validAttempts.length === 0) {
        this.attempts.delete(clientId);
      } else {
        this.attempts.set(clientId, validAttempts);
      }
    }
  }
  
  // Middleware
  middleware(options?: { maxAttempts?: number; windowMs?: number }) {
    const limiter = new RateLimiter(
      options?.windowMs || this.windowMs,
      options?.maxAttempts || this.maxAttempts
    );
    
    return async (req: Request) => {
      const allowed = await limiter.checkLimit(req);
      
      if (!allowed) {
        return Response.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(this.windowMs / 1000)),
            },
          }
        );
      }
      
      return null;
    };
  }
}

// Specific rate limiters
export const loginRateLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 min
export const apiRateLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 min
```

## Data Encryption

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
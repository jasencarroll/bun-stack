# API Reference

This section provides detailed technical reference for Create Bun Stack's APIs, utilities, and command-line interface.

## Contents

### 🖥️ [CLI Reference](./cli.md)
Complete reference for the Create Bun Stack command-line interface.

- Installation and usage
- Project generation options
- Available npm scripts
- Configuration files
- Environment variables
- Custom scripts and tools

### 🌐 [Server API](./server-api.md)
Comprehensive guide to the server-side API structure and patterns.

- Route definition syntax
- Request/response handling
- Built-in API endpoints
- Error handling patterns
- File uploads
- WebSocket support
- API versioning

### ⚙️ [Middleware](./middleware.md)
Reference for all built-in middleware and patterns for creating custom middleware.

- Authentication middleware
- CSRF protection
- Rate limiting
- Security headers
- CORS configuration
- Validation middleware
- Logging and monitoring
- Custom middleware patterns

### 🛠️ [Utilities](./utilities.md)
Collection of utility functions and helpers available throughout the application.

- Authentication utilities (JWT, passwords)
- Validation helpers
- String and number formatting
- Date/time utilities
- Array and object manipulation
- HTTP request helpers
- File system utilities
- React hooks and utilities

## Quick Reference

### Common Imports

```typescript
// Authentication
import { generateToken, verifyToken } from "@/lib/jwt";
import { hashPassword, verifyPassword } from "@/lib/crypto";

// Validation
import { z } from "zod";
import { validateBody, validateQuery } from "@/server/middleware/validation";

// Utilities
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency } from "@/lib/utils";

// Database
import { db } from "@/db/client";
import { users, posts } from "@/db/schema";

// Middleware
import { requireAuth, requireAdmin } from "@/server/middleware/auth";
import { createRateLimit } from "@/server/middleware/rate-limit";
```

### Route Definition Pattern

```typescript
// src/server/routes/example.ts
export const example = {
  "/": {
    GET: handleList,
    POST: [requireAuth, validateBody(schema), handleCreate],
  },
  "/:id": {
    GET: handleGetOne,
    PUT: [requireAuth, handleUpdate],
    DELETE: [requireAuth, requireAdmin, handleDelete],
  },
};
```

### API Response Format

```typescript
// Success response
{
  "success": true,
  "data": { /* resource data */ },
  "meta": {
    "page": 1,
    "total": 100,
    "limit": 20
  }
}

// Error response
{
  "error": "Validation failed",
  "message": "Detailed error message",
  "details": {
    "field": "email",
    "issue": "Invalid format"
  }
}
```

### Common HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected error |

## Type Definitions

### Core Types

```typescript
// Request handler types
type RouteHandler = (
  req: Request,
  params?: { params: Record<string, string> }
) => Promise<Response> | Response;

type Middleware = (
  req: Request,
  params?: any
) => Promise<Response | null> | Response | null;

// User types
interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}

// API response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, any>;
}

// Pagination
interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

## Environment Variables

### Required Variables

```env
# Production requirements
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=minimum-32-character-secret
```

### Optional Variables

```env
# Server
PORT=3000
HOST=localhost

# Security
CORS_ORIGIN=https://example.com
RATE_LIMIT_MAX=100
CSRF_ENABLED=true

# Features
ENABLE_REGISTRATION=true
ENABLE_API_DOCS=false

# External Services
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
```

## Error Handling

### Error Classes

```typescript
// Custom error classes
export class ValidationError extends Error {
  constructor(public errors: Record<string, string[]>) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}
```

### Global Error Handler

```typescript
export function handleError(error: unknown): Response {
  console.error(error);
  
  if (error instanceof ValidationError) {
    return Response.json({
      error: "Validation failed",
      details: error.errors,
    }, { status: 422 });
  }
  
  if (error instanceof AuthenticationError) {
    return Response.json({
      error: error.message,
    }, { status: 401 });
  }
  
  if (error instanceof NotFoundError) {
    return Response.json({
      error: error.message,
    }, { status: 404 });
  }
  
  // Default error
  return Response.json({
    error: "Internal server error",
  }, { status: 500 });
}
```

## Testing APIs

### Test Utilities

```typescript
// Create authenticated request
const { headers } = await authenticate();
const response = await apiRequest("/users", { ...headers });

// Assert API response
await assertResponse(response, {
  status: 200,
  body: { success: true },
});

// Test error cases
const errorResponse = await apiRequest("/invalid");
expect(errorResponse.status).toBe(404);
```

## Performance Tips

1. **Use Prepared Statements** - For repeated database queries
2. **Enable Compression** - Bun.serve({ compression: true })
3. **Cache Responses** - Use Cache-Control headers
4. **Paginate Large Lists** - Default limit of 20-50 items
5. **Use Indexes** - On frequently queried columns
6. **Minimize Middleware** - Only use what's needed

## Security Checklist

- [ ] All routes require authentication where appropriate
- [ ] Admin routes check for admin role
- [ ] Input validation on all endpoints
- [ ] Rate limiting on sensitive endpoints
- [ ] CSRF protection on mutations
- [ ] SQL injection prevention via parameterized queries
- [ ] XSS prevention via output encoding
- [ ] Secure headers on all responses

## Next Steps

- Dive into specific references:
  - [CLI Reference](./cli.md) for command-line usage
  - [Server API](./server-api.md) for backend development
  - [Middleware](./middleware.md) for request processing
  - [Utilities](./utilities.md) for helper functions
  
- Learn about implementation:
  - [Authentication](../features/authentication.md)
  - [Database](../features/database.md)
  - [Security](../features/security.md)
  - [Testing](../features/testing.md)
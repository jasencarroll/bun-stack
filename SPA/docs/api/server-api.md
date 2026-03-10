# Server API Reference

This reference covers the server-side API structure, route definitions, and request/response handling in Create Bun Stack.

## Route Definition

### Basic Structure

Route files export objects with HTTP methods as keys. Top-level methods (GET, POST) sit directly on the object, while parameterized routes use path keys:

```typescript
// src/server/routes/users.ts
export const users = {
  // Top-level handlers (for /api/users)
  GET: async (req: Request) => { ... },
  POST: async (req: Request) => { ... },

  // Parameterized routes (for /api/users/:id)
  "/:id": {
    GET: async (req: Request & { params: { id: string } }) => { ... },
    PUT: async (req: Request & { params: { id: string } }) => { ... },
    DELETE: async (req: Request & { params: { id: string } }) => { ... },
  },
};
```

### Route Registration

Routes are wired imperatively in `src/server/index.ts` using `if` statements (there is no `router.ts` or `createRouter`):

```typescript
// src/server/index.ts
import * as routes from "./routes";

// Inside Bun.serve fetch handler:
if (path.startsWith("/api/auth")) {
  const handlers = routes.auth;
  if (path === "/api/auth/login" && req.method === "POST") {
    response = await handlers["/login"].POST(req);
  }
  // ...
}

if (path.startsWith("/api/users")) {
  const handlers = routes.users;
  if (req.method === "GET" && path === "/api/users") {
    const adminCheck = requireAdmin(req);
    if (adminCheck) { response = adminCheck; }
    else { response = await handlers.GET(req); }
  }
  // ...
}
```

## Request Handling

### Handler Signature

Route parameters are accessed via a type intersection on the request object:

```typescript
type RouteHandler = (
  req: Request & { params: Record<string, string> }
) => Promise<Response> | Response;
```

### Request Object

The standard Web API `Request` object with additional properties:

```typescript
// Added by auth middleware (declared globally in src/server/middleware/auth.ts)
declare global {
  interface Request {
    user?: AuthUser; // From requireAuth middleware
  }
}

// Route params added via Object.assign in index.ts
type RequestWithParams = Request & { params: Record<string, string> };
```

### Accessing Request Data

```typescript
async function handleRequest(req: Request) {
  // URL and path
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Query parameters
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "10";
  
  // Headers
  const contentType = req.headers.get("content-type");
  const authorization = req.headers.get("authorization");
  
  // Body (JSON)
  const body = await req.json();
  
  // Body (FormData)
  const formData = await req.formData();
  
  // Body (Text)
  const text = await req.text();
  
  // Body (Blob)
  const blob = await req.blob();
  
  // Cookies
  const cookies = parseCookies(req.headers.get("cookie"));
}
```

### Route Parameters

Route parameters are accessed via the `req.params` property using a type intersection:

```typescript
// Route definition
"/:category/:id": {
  GET: handleGetItem,
}

// Handler — params are on req via type intersection
async function handleGetItem(
  req: Request & { params: { category: string; id: string } }
) {
  const { category, id } = req.params;
  // Use parameters
}
```

## Response Handling

### JSON Responses

```typescript
// Success response
return Response.json({
  success: true,
  data: result,
  meta: {
    page: 1,
    total: 100,
  },
});

// With status code
return Response.json(
  { message: "Created successfully" },
  { status: 201 }
);

// Error response
return Response.json(
  {
    error: "Validation failed",
    details: {
      field: "email",
      message: "Invalid email format",
    },
  },
  { status: 400 }
);
```

### Other Response Types

```typescript
// HTML response
return new Response(
  `<html><body><h1>Hello</h1></body></html>`,
  {
    headers: {
      "Content-Type": "text/html",
    },
  }
);

// Text response
return new Response("Plain text response", {
  headers: {
    "Content-Type": "text/plain",
  },
});

// Binary response
return new Response(buffer, {
  headers: {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": 'attachment; filename="file.bin"',
  },
});

// Redirect
return Response.redirect("https://example.com", 302);

// No content
return new Response(null, { status: 204 });
```

### Response Headers

```typescript
return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "max-age=3600, s-maxage=3600",
    "X-Total-Count": totalCount.toString(),
    "X-Page": currentPage.toString(),
    "X-Per-Page": perPage.toString(),
  },
});
```

## Middleware System

### Middleware Signature

```typescript
type Middleware = (
  req: Request,
  params?: any
) => Promise<Response | null> | Response | null;
```

### Applying Middleware

Middleware is applied imperatively in `src/server/index.ts`, not as arrays in route definitions:

```typescript
// In the Bun.serve fetch handler (src/server/index.ts)

// Auth check before route handler
if (req.method === "GET" && path === "/api/users") {
  const adminCheck = requireAdmin(req);
  if (adminCheck) {
    response = adminCheck; // Short-circuit on auth failure
  } else {
    response = await handlers.GET(req);
  }
}

// Rate limiting in route handlers (src/server/routes/auth.ts)
POST: async (req: Request) => {
  const rateLimitResponse = authRateLimiter(req);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await validateRequest(req, loginSchema);
  if (body instanceof Response) return body;
  // ... handle login
}
```

### Middleware Flow

```typescript
// Middleware returns null to continue
async function authMiddleware(req: Request): Promise<Response | null> {
  const token = getToken(req);
  
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const user = await verifyToken(token);
    (req as any).user = user;
    return null; // Continue to next middleware/handler
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
}
```

## Built-in API Endpoints

### Authentication

```typescript
// POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
// Response: { token, user, csrfToken }

// POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
// Response: { token, user, csrfToken }

// POST /api/auth/logout
// Response: { message: "Logged out successfully" }
```

### Users

```typescript
// GET /api/users (admin only)
// Headers: Authorization: Bearer <token>
// Response: User[] (password fields stripped)

// GET /api/users/:id (auth required)
// Headers: Authorization: Bearer <token>
// Response: User (password field stripped)

// POST /api/users
// Body: { name, email, password? }
// Response: User (201, password field stripped)

// PUT /api/users/:id (admin only)
// Headers: Authorization: Bearer <token>
// Body: { name?, email?, password?, role? }
// Response: User (password field stripped)

// DELETE /api/users/:id (admin only)
// Headers: Authorization: Bearer <token>
// Response: 204 No Content
```

### Health Check

```typescript
// GET /api/health
// Response (production):
// { status: "ok", timestamp: "2024-01-01T00:00:00Z" }
//
// Response (development only - additional fields):
// {
//   status: "ok",
//   timestamp: "2024-01-01T00:00:00Z",
//   database: { status: "connected", responseTime: 5 },
//   version: "1.0.0",
//   environment: "development"
// }
```

## Error Handling

### Error Response Formats

The template uses two error formats depending on the source:

```typescript
// Validation errors (from validateRequest with Zod)
{ errors: ZodIssue[] }

// General errors (from middleware and handlers)
{ error: string }

// Some 404s return plain text
"User not found"
```

### Standard Error Responses

```typescript
// 400 Bad Request (validation — from validateRequest)
{
  "errors": [
    { "code": "invalid_type", "message": "Expected string", "path": ["email"] }
  ]
}

// 401 Unauthorized
{
  "error": "Unauthorized"
}

// 401 Invalid token
{
  "error": "Invalid token"
}

// 403 Forbidden
{
  "error": "Forbidden - Admin access required"
}

// 404 Not Found (user endpoints return plain text)
"User not found"

// 429 Too Many Requests
{
  "error": "Too many requests, please try again later"
}

// 500 Internal Server Error (plain text from Bun.serve error handler)
"Internal Server Error"
```

### Error Handler

The global error handler is the `error` callback in `Bun.serve()`. It returns plain text, not JSON:

```typescript
// src/server/index.ts
Bun.serve({
  // ...
  error(error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  },
});
```

## Request Validation

### Using Zod Schemas

```typescript
import { z } from "zod";

// Define schema
const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  description: z.string().optional(),
  category: z.enum(["electronics", "clothing", "food"]),
  tags: z.array(z.string()).optional(),
});

// In route handler
async function createProduct(req: Request) {
  const body = await req.json();
  
  const result = createProductSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      {
        error: "Validation failed",
        details: result.error.flatten(),
      },
      { status: 400 }
    );
  }
  
  // Use validated data
  const product = await productRepo.create(result.data);
  return Response.json(product, { status: 201 });
}
```

### Query Parameter Validation

```typescript
const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(["name", "price", "created"]).default("created"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

async function searchProducts(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);
  
  const result = searchSchema.safeParse(params);
  if (!result.success) {
    return Response.json(
      { error: "Invalid query parameters" },
      { status: 400 }
    );
  }
  
  const products = await productRepo.search(result.data);
  return Response.json(products);
}
```

## File Uploads

### Handling File Uploads

```typescript
async function handleUpload(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  
  if (!file) {
    return Response.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }
  
  // Validate file
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: "File too large" },
      { status: 400 }
    );
  }
  
  // Save file
  const buffer = await file.arrayBuffer();
  const filename = `${Date.now()}-${file.name}`;
  await Bun.write(`./uploads/${filename}`, buffer);
  
  return Response.json({
    filename,
    size: file.size,
    type: file.type,
  });
}
```

### Streaming Responses

```typescript
// Stream large files
async function downloadFile(
  req: Request & { params: { id: string } }
) {
  const file = await fileRepo.findById(req.params.id);
  if (!file) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }
  
  const stream = Bun.file(file.path).stream();
  
  return new Response(stream, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "Content-Length": file.size.toString(),
    },
  });
}
```

## WebSocket Support

> **Note:** WebSocket support is not included in the generated template. The example below shows how to add it using Bun's built-in WebSocket API.

### WebSocket Handler

```typescript
// src/server/websocket.ts (not in template — create as needed)
export const websocketHandler = {
  open(ws: ServerWebSocket) {
    console.log("WebSocket opened");
    ws.send(JSON.stringify({ type: "connected" }));
  },

  message(ws: ServerWebSocket, message: string | Buffer) {
    const data = JSON.parse(message.toString());

    switch (data.type) {
      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;
      case "subscribe":
        ws.subscribe(data.channel);
        break;
      case "unsubscribe":
        ws.unsubscribe(data.channel);
        break;
    }
  },

  close(ws: ServerWebSocket) {
    console.log("WebSocket closed");
  },
};

// In server setup
Bun.serve({
  port: 3000,
  fetch(req, server) {
    // Upgrade WebSocket requests
    if (server.upgrade(req)) return;
    // ... regular HTTP handling
  },
  websocket: websocketHandler,
});
```

## Rate Limiting

### Rate Limit Configuration

```typescript
// src/server/middleware/rate-limit.ts
// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many authentication attempts, please try again later",
});

export const strictAuthRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: "Too many failed login attempts, please try again later",
});
```

## CORS Configuration

### CORS Implementation

The template uses two exported functions — `applyCorsHeaders` and `handleCorsPreflightRequest`:

```typescript
// src/server/middleware/cors.ts
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

export function applyCorsHeaders(response: Response, origin: string | null): Response { ... }
export function handleCorsPreflightRequest(req: Request): Response | null { ... }
```

## API Versioning

### Version in Path

```typescript
const routes = {
  "/api/v1/users": usersV1,
  "/api/v2/users": usersV2,
};
```

### Version in Header

```typescript
async function handleVersioned(req: Request) {
  const version = req.headers.get("X-API-Version") || "v1";
  
  switch (version) {
    case "v1":
      return handleV1(req);
    case "v2":
      return handleV2(req);
    default:
      return Response.json(
        { error: "Unsupported API version" },
        { status: 400 }
      );
  }
}
```

## Testing API Endpoints

### Example API Test

```typescript
import { test, expect } from "bun:test";

test("GET /api/users returns user list", async () => {
  const response = await fetch("http://localhost:3001/api/users", {
    headers: {
      Authorization: `Bearer ${testToken}`,
    },
  });
  
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
  
  const data = await response.json();
  expect(Array.isArray(data)).toBe(true);
});
```

## Next Steps

- Learn about [Middleware](/docs/middleware) in detail
- Explore [Utilities](/docs/utilities) and helpers
- Understand [Database API](/docs/features/database)
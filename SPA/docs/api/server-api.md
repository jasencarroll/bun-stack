# Server API Reference

This reference covers the server-side API structure, route definitions, and request/response handling in Create Bun Stack.

## Route Definition

### Basic Structure

Routes are defined as objects with HTTP methods as keys:

```typescript
// src/server/routes/example.ts
export const example = {
  "/": {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete,
    PATCH: handlePatch,
  },
  "/:id": {
    GET: handleGetById,
    PUT: handleUpdate,
    DELETE: handleDeleteById,
  },
  "/:id/nested": {
    GET: handleNestedGet,
  },
};
```

### Route Registration

Register routes in the main router:

```typescript
// src/server/router.ts
import { auth } from "./routes/auth";
import { users } from "./routes/users";
import { products } from "./routes/products";

const routes = {
  "/api/auth": auth,
  "/api/users": users,
  "/api/products": products,
};

export const router = createRouter(routes);
```

## Request Handling

### Handler Signature

```typescript
type RouteHandler = (
  req: Request,
  params?: { params: Record<string, string> }
) => Promise<Response> | Response;
```

### Request Object

The standard Web API `Request` object with additional properties:

```typescript
interface ExtendedRequest extends Request {
  // Added by middleware
  user?: User;              // From auth middleware
  validatedBody?: any;      // From validation middleware
  validatedQuery?: any;     // From query validation
  securityHeaders?: Headers; // From security middleware
}
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

```typescript
// Route definition
"/:category/:id": {
  GET: handleGetItem,
}

// Handler
async function handleGetItem(
  req: Request,
  { params }: { params: { category: string; id: string } }
) {
  const { category, id } = params;
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

```typescript
// Single middleware
export const users = {
  "/": {
    GET: [requireAuth, handleGetUsers],
  },
};

// Multiple middleware
export const admin = {
  "/": {
    POST: [
      requireAuth,
      requireAdmin,
      validateBody(createUserSchema),
      handleCreateUser,
    ],
  },
};

// Conditional middleware
const rateLimitedAuth = process.env.NODE_ENV === "production"
  ? [rateLimit, requireAuth]
  : [requireAuth];

export const sensitive = {
  "/": {
    POST: [...rateLimitedAuth, handleSensitiveAction],
  },
};
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
// Headers: Authorization: Bearer <token>
// Response: { message: "Logged out" }

// GET /api/auth/me
// Headers: Authorization: Bearer <token>
// Response: { user }
```

### Users

```typescript
// GET /api/users
// Headers: Authorization: Bearer <token>
// Query: ?page=1&limit=10&search=john
// Response: { data: User[], total, page, limit }

// GET /api/users/:id
// Headers: Authorization: Bearer <token>
// Response: User

// PUT /api/users/:id
// Headers: Authorization: Bearer <token>
// Body: { name, email }
// Response: User

// DELETE /api/users/:id
// Headers: Authorization: Bearer <token>
// Response: 204 No Content
```

### Health Check

```typescript
// GET /api/health
// Response: {
//   status: "healthy",
//   timestamp: "2024-01-01T00:00:00Z",
//   version: "1.0.0",
//   uptime: 3600
// }
```

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;          // Main error message
  message?: string;       // Detailed message
  code?: string;          // Error code
  field?: string;         // Field that caused error
  details?: any;          // Additional details
  timestamp: string;      // ISO timestamp
  requestId?: string;     // Request tracking ID
}
```

### Standard Error Responses

```typescript
// 400 Bad Request
{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "password": "Password too short"
  }
}

// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}

// 403 Forbidden
{
  "error": "Forbidden",
  "message": "Admin access required"
}

// 404 Not Found
{
  "error": "Not found",
  "message": "User not found"
}

// 429 Too Many Requests
{
  "error": "Too many requests",
  "message": "Rate limit exceeded",
  "retryAfter": 3600
}

// 500 Internal Server Error
{
  "error": "Internal server error",
  "message": "An unexpected error occurred",
  "requestId": "req_123456"
}
```

### Error Handler

```typescript
// Global error handler
export function errorHandler(error: unknown): Response {
  console.error(error);
  
  if (error instanceof ValidationError) {
    return Response.json(
      {
        error: "Validation failed",
        details: error.errors,
      },
      { status: 400 }
    );
  }
  
  if (error instanceof UnauthorizedError) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Default error
  return Response.json(
    {
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}
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
  req: Request, 
  { params }: { params: { id: string } }
) {
  const file = await fileRepo.findById(params.id);
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

### WebSocket Handler

```typescript
// src/server/websocket.ts
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
  fetch: router.fetch,
  websocket: websocketHandler,
});
```

## Rate Limiting

### Rate Limit Configuration

```typescript
// Per-route rate limiting
const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many attempts",
  keyGenerator: (req) => getClientIp(req),
});

const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skipIf: (req) => {
    const user = (req as any).user;
    return user?.role === "admin";
  },
});
```

## CORS Configuration

### CORS Options

```typescript
const corsOptions = {
  origin: (origin: string) => {
    const allowed = ["http://localhost:3000", "https://myapp.com"];
    return allowed.includes(origin);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  exposedHeaders: ["X-Total-Count", "X-Page"],
  credentials: true,
  maxAge: 86400, // 24 hours
};
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
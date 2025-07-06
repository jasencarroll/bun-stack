# Routing

Create Bun Stack uses a file-based routing system for the backend API and React Router for the frontend. This guide covers both routing systems and how they work together.

## Overview

- 🛣️ **File-based API Routes** - Simple, declarative backend routing
- 🔀 **React Router** - Client-side navigation
- 🎯 **Type-safe Routes** - Full TypeScript support
- 🛡️ **Middleware Support** - Route-level middleware
- 🚦 **Parameter Validation** - Built-in request validation
- 📱 **Nested Routes** - Support for complex route hierarchies

## Backend Routing

### Route Structure

Routes are defined as objects with HTTP methods as keys:

```typescript
// src/server/routes/products.ts
export const products = {
  "/": {
    GET: getAllProducts,      // GET /api/products
    POST: createProduct,      // POST /api/products
  },
  "/:id": {
    GET: getProduct,          // GET /api/products/123
    PUT: updateProduct,       // PUT /api/products/123
    DELETE: deleteProduct,    // DELETE /api/products/123
  },
  "/:id/reviews": {
    GET: getProductReviews,   // GET /api/products/123/reviews
    POST: createReview,       // POST /api/products/123/reviews
  },
};
```

### Registering Routes

Routes are registered in the central router:

```typescript
// src/server/router.ts
import { products } from "./routes/products";
import { users } from "./routes/users";
import { auth } from "./routes/auth";

const routes = {
  "/api/auth": auth,
  "/api/users": users,
  "/api/products": products,
};

export const router = createRouter(routes);
```

### Route Handlers

Route handlers receive the request and return a response:

```typescript
// Simple handler
async function getAllProducts(req: Request): Promise<Response> {
  const products = await productRepository.findAll();
  return Response.json(products);
}

// Handler with parameters
async function getProduct(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const product = await productRepository.findById(params.id);
  
  if (!product) {
    return Response.json(
      { error: "Product not found" },
      { status: 404 }
    );
  }
  
  return Response.json(product);
}

// Handler with query parameters
async function searchProducts(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const query = url.searchParams.get("q");
  const category = url.searchParams.get("category");
  
  const products = await productRepository.search({
    query,
    category,
  });
  
  return Response.json(products);
}
```

### Request Body Parsing

```typescript
async function createProduct(req: Request): Promise<Response> {
  // Parse JSON body
  const body = await req.json();
  
  // Validate with Zod
  const result = productSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Invalid input", details: result.error },
      { status: 400 }
    );
  }
  
  const product = await productRepository.create(result.data);
  return Response.json(product, { status: 201 });
}
```

## Middleware

### Applying Middleware

Middleware can be applied at the route level:

```typescript
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { rateLimit } from "../middleware/rate-limit";

export const products = {
  "/": {
    // Public route
    GET: getAllProducts,
    
    // Protected route with middleware chain
    POST: [
      requireAuth,
      requireAdmin,
      validateBody(createProductSchema),
      createProduct,
    ],
  },
  "/:id": {
    // Mix of public and protected
    GET: getProduct,
    PUT: [requireAuth, requireAdmin, updateProduct],
    DELETE: [requireAuth, requireAdmin, deleteProduct],
  },
};
```

### Creating Middleware

Middleware functions return `null` to continue or a `Response` to stop:

```typescript
// src/server/middleware/validation.ts
export function validateBody(schema: ZodSchema) {
  return async function (req: Request): Promise<Response | null> {
    try {
      const body = await req.json();
      const result = schema.safeParse(body);
      
      if (!result.success) {
        return Response.json(
          { error: "Validation failed", details: result.error },
          { status: 400 }
        );
      }
      
      // Attach validated data to request
      (req as any).validatedBody = result.data;
      return null; // Continue to next handler
    } catch (error) {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
  };
}
```

### Global Middleware

Apply middleware to all routes:

```typescript
// src/server/router.ts
export function createRouter(routes: Routes) {
  return {
    async fetch(req: Request): Promise<Response> {
      // Global middleware
      const corsResponse = await corsMiddleware(req);
      if (corsResponse) return corsResponse;
      
      const securityResponse = await securityMiddleware(req);
      if (securityResponse) return securityResponse;
      
      // Route handling
      return handleRoute(req, routes);
    },
  };
}
```

## Route Parameters

### Path Parameters

```typescript
// Route definition
"/:category/:id": {
  GET: getProductByCategoryAndId,
}

// Handler
async function getProductByCategoryAndId(
  req: Request,
  { params }: { params: { category: string; id: string } }
): Promise<Response> {
  const { category, id } = params;
  // Use parameters
}
```

### Query Parameters

```typescript
async function getProducts(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // Get query parameters
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const sort = url.searchParams.get("sort") || "createdAt";
  const order = url.searchParams.get("order") || "desc";
  
  const products = await productRepository.findAll({
    page,
    limit,
    sort,
    order,
  });
  
  return Response.json({
    data: products,
    page,
    limit,
    total: products.length,
  });
}
```

### Request Headers

```typescript
async function getProducts(req: Request): Promise<Response> {
  // Get headers
  const contentType = req.headers.get("content-type");
  const authorization = req.headers.get("authorization");
  const userAgent = req.headers.get("user-agent");
  
  // Custom headers
  const apiVersion = req.headers.get("x-api-version") || "v1";
  
  // Use headers for logic
  if (apiVersion === "v2") {
    return getProductsV2(req);
  }
  
  return getProductsV1(req);
}
```

## Response Handling

### JSON Responses

```typescript
// Success response
return Response.json({
  success: true,
  data: products,
  meta: {
    page: 1,
    total: 100,
  },
});

// Error response
return Response.json(
  {
    error: "Validation failed",
    message: "Price must be positive",
    field: "price",
  },
  { status: 400 }
);
```

### Status Codes

```typescript
// Common status codes
return Response.json(data);                    // 200 OK (default)
return Response.json(data, { status: 201 });   // 201 Created
return new Response(null, { status: 204 });    // 204 No Content
return Response.json(error, { status: 400 });  // 400 Bad Request
return Response.json(error, { status: 401 });  // 401 Unauthorized
return Response.json(error, { status: 403 });  // 403 Forbidden
return Response.json(error, { status: 404 });  // 404 Not Found
return Response.json(error, { status: 500 });  // 500 Internal Server Error
```

### Custom Headers

```typescript
return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "max-age=3600",
    "X-Total-Count": "100",
    "X-Page": "1",
  },
});
```

## Frontend Routing

### React Router Setup

```typescript
// src/app/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products">
          <Route index element={<ProductListPage />} />
          <Route path=":id" element={<ProductDetailPage />} />
          <Route path="new" element={<CreateProductPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Protected Routes

```typescript
// src/app/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/app/hooks/useAuth";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
}

// Usage
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/profile" element={<ProfilePage />} />
  <Route path="/settings" element={<SettingsPage />} />
</Route>
```

### Navigation

```typescript
// Programmatic navigation
import { useNavigate } from "react-router-dom";

export function LoginForm() {
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(credentials);
      navigate("/dashboard");
    } catch (error) {
      // Handle error
    }
  };
}

// Link component
import { Link } from "react-router-dom";

<Link to="/products" className="text-accent-purple hover:underline">
  View Products
</Link>

// NavLink with active state
import { NavLink } from "react-router-dom";

<NavLink
  to="/dashboard"
  className={({ isActive }) =>
    isActive ? "text-accent-purple font-bold" : "text-gray-600"
  }
>
  Dashboard
</NavLink>
```

### Route Parameters

```typescript
// Route definition
<Route path="/products/:id" element={<ProductDetailPage />} />

// Component
import { useParams } from "react-router-dom";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productApi.getById(id!),
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;
  
  return <div>{product.name}</div>;
}
```

### Query Parameters

```typescript
import { useSearchParams } from "react-router-dom";

export function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const page = parseInt(searchParams.get("page") || "1");
  const category = searchParams.get("category") || "all";
  
  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString(), category });
  };
  
  return (
    <div>
      <select
        value={category}
        onChange={(e) => setSearchParams({ page: "1", category: e.target.value })}
      >
        <option value="all">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>
    </div>
  );
}
```

## API Client Integration

### Type-safe API Client

```typescript
// src/app/lib/api/products.ts
import { apiClient } from "./client";
import type { Product, CreateProductDto, UpdateProductDto } from "@/app/types";

export const productsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    category?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.category) searchParams.set("category", params.category);
    
    return apiClient.get<Product[]>(`/products?${searchParams}`);
  },
  
  getById: (id: string) => 
    apiClient.get<Product>(`/products/${id}`),
  
  create: (data: CreateProductDto) =>
    apiClient.post<Product>("/products", data),
  
  update: (id: string, data: UpdateProductDto) =>
    apiClient.put<Product>(`/products/${id}`, data),
  
  delete: (id: string) =>
    apiClient.delete(`/products/${id}`),
  
  getReviews: (id: string) =>
    apiClient.get<Review[]>(`/products/${id}/reviews`),
};
```

### Using with React Query

```typescript
// src/app/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/app/lib/api/products";

export function useProducts(params?: { category?: string }) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productsApi.getAll(params),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
```

## Advanced Routing

### Nested Routes

```typescript
// Backend nested routes
export const products = {
  "/": {
    GET: getAllProducts,
  },
  "/:productId/variants": {
    GET: getProductVariants,
    POST: createVariant,
  },
  "/:productId/variants/:variantId": {
    GET: getVariant,
    PUT: updateVariant,
    DELETE: deleteVariant,
  },
};

// Frontend nested routes
<Route path="/products/:productId">
  <Route index element={<ProductDetail />} />
  <Route path="variants" element={<ProductVariants />} />
  <Route path="variants/:variantId" element={<VariantDetail />} />
  <Route path="edit" element={<EditProduct />} />
</Route>
```

### Dynamic Routes

```typescript
// Catch-all routes
export const cms = {
  "/*": {
    GET: async (req: Request, { params }: { params: { "*": string } }) => {
      const path = params["*"];
      const page = await cmsRepository.findByPath(path);
      
      if (!page) {
        return Response.json({ error: "Page not found" }, { status: 404 });
      }
      
      return Response.json(page);
    },
  },
};
```

### Route Groups

```typescript
// Group related routes
const adminRoutes = {
  "/users": adminUsers,
  "/settings": adminSettings,
  "/analytics": adminAnalytics,
};

const publicRoutes = {
  "/products": products,
  "/categories": categories,
};

const routes = {
  "/api": publicRoutes,
  "/api/admin": adminRoutes,
};
```

## Error Handling

### API Error Responses

```typescript
// Consistent error format
interface ApiError {
  error: string;
  message?: string;
  field?: string;
  code?: string;
}

function errorResponse(
  error: string,
  status: number,
  details?: Partial<ApiError>
): Response {
  return Response.json(
    {
      error,
      ...details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

// Usage
return errorResponse("Validation failed", 400, {
  message: "Email is already taken",
  field: "email",
  code: "EMAIL_TAKEN",
});
```

### Frontend Error Handling

```typescript
// Error boundary for routes
import { ErrorBoundary } from "react-error-boundary";

function RouteErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold text-red-500">Route Error</h1>
      <p className="mt-2">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-accent-purple text-white rounded"
      >
        Reload
      </button>
    </div>
  );
}

// Wrap routes
<ErrorBoundary FallbackComponent={RouteErrorFallback}>
  <Routes>
    {/* Your routes */}
  </Routes>
</ErrorBoundary>
```

## Testing Routes

### Backend Route Testing

```typescript
describe("Product Routes", () => {
  test("GET /api/products returns product list", async () => {
    const response = await fetch("http://localhost:3001/api/products");
    expect(response.status).toBe(200);
    
    const products = await response.json();
    expect(Array.isArray(products)).toBe(true);
  });
  
  test("GET /api/products/:id returns specific product", async () => {
    const response = await fetch("http://localhost:3001/api/products/123");
    expect(response.status).toBe(200);
    
    const product = await response.json();
    expect(product.id).toBe("123");
  });
  
  test("POST /api/products requires authentication", async () => {
    const response = await fetch("http://localhost:3001/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Product" }),
    });
    
    expect(response.status).toBe(401);
  });
});
```

### Frontend Route Testing

```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

test("renders correct page for route", () => {
  render(
    <MemoryRouter initialEntries={["/products"]}>
      <App />
    </MemoryRouter>
  );
  
  expect(screen.getByText("Products")).toBeInTheDocument();
});
```

## Best Practices

1. **RESTful conventions** - Use proper HTTP methods
2. **Consistent naming** - Follow naming patterns
3. **Version your API** - Use `/api/v1/` prefix
4. **Document routes** - Use OpenAPI/Swagger
5. **Validate inputs** - Always validate request data
6. **Handle errors gracefully** - Consistent error format
7. **Use middleware** - DRY principle for common logic
8. **Type everything** - Full TypeScript coverage

## Next Steps

- Implement [API Documentation](/docs/advanced/api-docs)
- Add [WebSocket Routes](/docs/advanced/websockets)
- Learn about [Route Testing](/docs/testing/route-testing)
- Set up [API Versioning](/docs/advanced/versioning)
# Development Guide

This guide covers the development workflow, tools, and best practices for building applications with Create Bun Stack.

## Getting Started

### Initial Setup

After creating your project, start the development server:

```bash
cd my-app
bun run dev
```

This starts:
- 🚀 Bun server on `http://localhost:3000`
- 🔄 Hot Module Replacement (HMR)
- 📦 Automatic bundling
- 🎨 Tailwind CSS compilation

### Development Commands

```bash
# Start development server
bun run dev

# Run with debug logging
DEBUG=true bun run dev

# Run tests in watch mode
bun run test:watch

# Check types
bun run typecheck

# Lint and format code
bun run lint
bun run format

# Database commands
bun run db:push      # Push schema changes
bun run db:studio    # Open Drizzle Studio
bun run db:seed      # Seed database
```

## Development Workflow

### 1. Making Changes

The development server automatically reloads when you modify files:

- **Frontend changes**: Instant HMR updates
- **Backend changes**: Server restarts automatically
- **CSS changes**: Tailwind recompiles
- **Database changes**: Run `bun run db:push`

### 2. Hot Module Replacement

HMR is configured for the frontend:

```typescript
// Changes to React components update instantly
export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-4 py-2 bg-accent-purple text-white rounded">
      {children}
    </button>
  );
}
```

The browser updates without losing state!

### 3. API Development

#### Creating a New Endpoint

1. Create route handler in `src/server/routes/`:

```typescript
// src/server/routes/products.ts
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
});

export const products = {
  "/": {
    GET: async () => {
      const products = await productRepo.findAll();
      return Response.json(products);
    },
    
    POST: async (req: Request) => {
      const body = await req.json();
      const result = createProductSchema.safeParse(body);
      
      if (!result.success) {
        return Response.json(
          { error: "Invalid input", details: result.error },
          { status: 400 }
        );
      }
      
      const product = await productRepo.create(result.data);
      return Response.json(product, { status: 201 });
    },
  },
};
```

2. Register in router:

```typescript
// src/server/router.ts
import { products } from "./routes/products";

const routes = {
  // ... existing routes
  "/api/products": products,
};
```

#### Testing Your Endpoint

Use curl or your favorite API client:

```bash
# GET request
curl http://localhost:3000/api/products

# POST request
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Widget", "price": 9.99}'
```

### 4. Database Development

#### Schema Changes

1. Modify schema in `src/db/schema.ts`:

```typescript
export const products = sqliteTable("products", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  price: real("price").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
```

2. Push changes to database:

```bash
bun run db:push
```

3. Generate TypeScript types are automatic!

#### Using Drizzle Studio

Explore your database visually:

```bash
bun run db:studio
```

Opens at `https://local.drizzle.studio`

### 5. Frontend Development

#### Component Development

Create components with TypeScript and Tailwind:

```typescript
// src/app/components/ProductCard.tsx
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
  };
  onAddToCart: (id: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="p-4 border border-border-light rounded-lg hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <p className="text-gray-soft">${product.price.toFixed(2)}</p>
      <button
        onClick={() => onAddToCart(product.id)}
        className="mt-2 px-4 py-2 bg-accent-purple text-white rounded hover:bg-purple-600"
      >
        Add to Cart
      </button>
    </div>
  );
}
```

#### State Management

Use React Query for server state:

```typescript
// src/app/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/app/lib/api/products";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: productsApi.getAll,
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

## Development Tools

### VS Code Setup

Recommended extensions:

```json
// .vscode/extensions.json
{
  "recommendations": [
    "oven.bun-vscode",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma"
  ]
}
```

Settings:

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Debugging

#### Server Debugging

1. Add debug configuration:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "bun",
      "name": "Debug Server",
      "request": "launch",
      "program": "${workspaceFolder}/src/server/index.ts",
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      }
    }
  ]
}
```

2. Set breakpoints and press F5

#### Client Debugging

Use React DevTools browser extension:

1. Install from Chrome/Firefox store
2. Open DevTools
3. Navigate to Components/Profiler tabs

### Browser DevTools

Essential tabs for development:

- **Console**: Check for errors and logs
- **Network**: Monitor API requests
- **Application**: Inspect cookies and storage
- **React DevTools**: Component tree and props

## Common Development Tasks

### Adding Authentication to a Route

```typescript
// Protect an endpoint
import { requireAuth } from "../middleware/auth";

export const protected = {
  "/data": {
    GET: [
      requireAuth,
      async (req: Request) => {
        const user = (req as any).user;
        return Response.json({ 
          message: `Hello ${user.name}!`,
          userId: user.id 
        });
      },
    ],
  },
};
```

### Working with Forms

```typescript
// Form component with validation
export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    };
    
    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!data.name) newErrors.name = "Name is required";
    if (!data.email) newErrors.email = "Email is required";
    if (!data.message) newErrors.message = "Message is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit to API
    try {
      await apiClient.post("/contact", data);
      alert("Message sent!");
    } catch (error) {
      alert("Failed to send message");
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          className="w-full px-4 py-2 border rounded"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>
      {/* More fields... */}
    </form>
  );
}
```

### Error Handling

```typescript
// Global error boundary
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-2xl font-bold text-red-500">Something went wrong</h2>
      <pre className="mt-4 text-sm">{error.message}</pre>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-accent-purple text-white rounded"
      >
        Reload page
      </button>
    </div>
  );
}

// Wrap your app
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```

### Performance Optimization

#### Code Splitting

```typescript
import { lazy, Suspense } from "react";

// Lazy load heavy components
const Dashboard = lazy(() => import("./pages/Dashboard"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

#### Memoization

```typescript
import { memo, useMemo, useCallback } from "react";

// Memoize expensive components
export const ExpensiveList = memo(function ExpensiveList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});

// Memoize expensive calculations
function MyComponent({ data }: { data: number[] }) {
  const sum = useMemo(() => {
    return data.reduce((a, b) => a + b, 0);
  }, [data]);
  
  const handleClick = useCallback(() => {
    console.log("Clicked!");
  }, []);
  
  return <div>Sum: {sum}</div>;
}
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
pg_isready

# Use SQLite fallback
unset DATABASE_URL
bun run dev
```

#### TypeScript Errors

```bash
# Rebuild TypeScript definitions
bun run typecheck

# Clear TypeScript cache
rm -rf node_modules/.cache
```

#### CSS Not Updating

```bash
# Rebuild CSS
bun run build:css

# Clear browser cache
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

### Debug Mode

Enable verbose logging:

```bash
DEBUG=true bun run dev
```

Add debug logs:

```typescript
if (process.env.DEBUG) {
  console.log("[DEBUG]", "User data:", user);
}
```

## Best Practices

### 1. Code Organization

- Keep components small and focused
- Use clear, descriptive names
- Group related functionality
- Follow consistent patterns

### 2. Type Safety

- Use TypeScript strictly
- Define interfaces for all data
- Avoid `any` types
- Validate at boundaries

### 3. Performance

- Minimize bundle size
- Lazy load routes
- Optimize images
- Cache API responses

### 4. Security

- Validate all inputs
- Sanitize user content
- Use HTTPS in production
- Keep dependencies updated

## Next Steps

- Learn about [Testing](/docs/testing) your application
- Prepare for [Deployment](/docs/deployment)
- Explore [Advanced Features](/docs/features)
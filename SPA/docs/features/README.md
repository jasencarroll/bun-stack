# Features

Create Bun Stack comes with a comprehensive set of features for building modern web applications. This section covers all the built-in features and how to use them effectively.

## Core Features

### 🔐 [Authentication](./authentication.md)
Complete authentication system with JWT tokens, secure password hashing, and role-based access control.

- JWT-based authentication
- Secure password hashing with Argon2id
- CSRF protection
- Role-based access (admin/user)
- Session management

### 🗄️ [Database](./database.md)
Flexible database layer with Drizzle ORM supporting both SQLite and PostgreSQL.

- Dual database support (SQLite/PostgreSQL)
- Type-safe queries with Drizzle ORM
- Automatic migrations
- Repository pattern
- Connection pooling

### 🛣️ [Routing](./routing.md)
Simple and powerful routing for both backend APIs and frontend navigation.

- File-based API routing
- React Router for frontend
- Middleware support
- Parameter validation
- Type-safe routes

### ⚛️ [Frontend](./frontend.md)
Modern React setup with TypeScript, Tailwind CSS, and best practices.

- React 18 with TypeScript
- Tailwind CSS for styling
- React Query for data fetching
- Component architecture
- Performance optimizations

### 🛡️ [Security](./security.md)
Comprehensive security features to protect your application.

- Security headers (CSP, HSTS, etc.)
- Rate limiting
- Input validation with Zod
- SQL injection prevention
- XSS protection
- File upload security

### 🧪 [Testing](./testing.md)
Complete testing setup with Bun's built-in test runner.

- Integration testing
- Component testing
- Database testing
- Test utilities and helpers
- Coverage reporting
- CI/CD integration

## Feature Comparison

| Feature | Create Bun Stack | Next.js | Create React App | Rails |
|---------|-----------------|---------|------------------|-------|
| Full-stack | ✅ | ✅ | ❌ | ✅ |
| TypeScript | ✅ | ✅ | ✅ | ❌ |
| Database ORM | ✅ | ❌ | ❌ | ✅ |
| Authentication | ✅ | ❌ | ❌ | ✅ |
| API Routes | ✅ | ✅ | ❌ | ✅ |
| Testing Setup | ✅ | ⚡ | ⚡ | ✅ |
| Hot Reload | ✅ | ✅ | ✅ | ✅ |
| Production Ready | ✅ | ✅ | ❌ | ✅ |

✅ = Built-in | ⚡ = Partial/Manual setup required | ❌ = Not included

## Quick Start Examples

### Creating an Authenticated API Endpoint

```typescript
// src/server/routes/profile.ts
import { requireAuth } from "../middleware/auth";

export const profile = {
  "/": {
    GET: [
      requireAuth,
      async (req: Request) => {
        const user = (req as any).user;
        const profile = await profileRepository.findByUserId(user.id);
        return Response.json(profile);
      },
    ],
  },
};
```

### Adding a New Database Model

```typescript
// src/db/schema.ts
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content"),
  published: integer("published", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
```

### Creating a React Component

```typescript
// src/app/components/PostList.tsx
export function PostList() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: () => postsApi.getAll(),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid gap-4">
      {posts?.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

### Writing a Test

```typescript
// tests/server/posts.test.ts
test("creates a post", async () => {
  const { headers } = await authenticate();
  
  const response = await apiRequest("/posts", {
    method: "POST",
    ...headers,
    body: JSON.stringify({
      title: "Test Post",
      content: "Test content",
    }),
  });

  expect(response.status).toBe(201);
  const post = await response.json();
  expect(post.title).toBe("Test Post");
});
```

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│  React Frontend │────▶│   Bun Backend   │
│                 │     │                 │
└─────────────────┘     └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │                 │
                        │    Database     │
                        │ (SQLite/PG)     │
                        │                 │
                        └─────────────────┘
```

## Best Practices

### 1. **Use TypeScript Everywhere**
Take advantage of end-to-end type safety from database to frontend.

### 2. **Follow the Repository Pattern**
Keep database logic in repositories for better organization and testing.

### 3. **Validate All Inputs**
Use Zod schemas to validate API inputs and form data.

### 4. **Write Tests**
Test critical paths and business logic with the included test setup.

### 5. **Use Middleware**
Apply cross-cutting concerns like auth and validation via middleware.

### 6. **Optimize Performance**
Use React Query for caching, lazy loading for code splitting, and database indexes.

## Common Patterns

### Protected Pages

```typescript
// Protect entire routes
<Route element={<RequireAuth />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile" element={<Profile />} />
</Route>
```

### Form Handling

```typescript
// Use React Hook Form with Zod
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { title: "", content: "" },
});
```

### Data Fetching

```typescript
// Use React Query for server state
const { data, error, isLoading } = useQuery({
  queryKey: ["posts", filters],
  queryFn: () => postsApi.getAll(filters),
});
```

### Error Handling

```typescript
// Global error boundary
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

## Extending Features

### Adding OAuth

See the [OAuth guide](../advanced/oauth.md) for adding social login.

### WebSocket Support

See the [WebSocket guide](../advanced/websockets.md) for real-time features.

### File Uploads

See the [File Upload guide](../advanced/file-uploads.md) for handling uploads.

### Background Jobs

See the [Background Jobs guide](../advanced/background-jobs.md) for async processing.

## Feature Roadmap

Planned features for future releases:

- 🔔 **Notifications** - Email and in-app notifications
- 📧 **Email Templates** - Transactional email system  
- 🔄 **WebSockets** - Real-time updates
- 📤 **File Uploads** - S3/local storage
- 🗺️ **API Documentation** - OpenAPI/Swagger
- 🌍 **Internationalization** - Multi-language support
- 📊 **Admin Dashboard** - Auto-generated CRUD UI
- 🔍 **Full-text Search** - PostgreSQL/SQLite FTS

## Getting Help

- Check individual feature guides for detailed documentation
- See [Troubleshooting](../guide/troubleshooting.md) for common issues
- Join our [Discord community](https://discord.gg/bun-stack)
- Report bugs on [GitHub](https://github.com/your-repo/create-bun-stack)

## Next Steps

Explore each feature in detail:

1. Start with [Authentication](./authentication.md) to understand user management
2. Learn about the [Database](./database.md) layer and data modeling
3. Master [Routing](./routing.md) for building APIs
4. Build great UIs with the [Frontend](./frontend.md) stack
5. Secure your app with [Security](./security.md) best practices
6. Ensure quality with [Testing](./testing.md)
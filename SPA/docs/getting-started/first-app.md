# Building Your First App

This guide walks you through building a simple todo list application to demonstrate the key features of Create Bun Stack.

## Prerequisites

Make sure you've completed the [Quick Start Guide](/docs/getting-started/quick-start) and have a running Create Bun Stack application.

## What We'll Build

We'll create a todo list app with:
- User authentication
- CRUD operations for todos
- Real-time updates
- Responsive design

## Step 1: Create the Todo Model

First, let's define our database schema for todos.

### 1.1 Update Database Schema

Edit `src/db/schema.ts` and add the todos table:

```typescript
export const todos = sqliteTable("todos", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  completed: integer("completed", { mode: "boolean" })
    .default(false),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL version
export const todosPg = pgTable("todos", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => usersPg.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### 1.2 Apply Schema Changes

Run the database push command to apply your schema changes:

```bash
bun run db:push
```

## Step 2: Create the Todo Repository

Create a repository to handle database operations for todos.

### 2.1 Create Repository File

Create `src/db/repositories/todo.repository.ts`:

```typescript
import { db } from "../client";
import { todos } from "../schema";
import { eq, and } from "drizzle-orm";
import type { InsertTodo, SelectTodo } from "../types";

export class TodoRepository {
  async findAllByUserId(userId: string): Promise<SelectTodo[]> {
    return db.select().from(todos).where(eq(todos.userId, userId));
  }

  async findById(id: string, userId: string): Promise<SelectTodo | null> {
    const [todo] = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));
    return todo || null;
  }

  async create(data: Omit<InsertTodo, "id">): Promise<SelectTodo> {
    const [todo] = await db.insert(todos).values(data).returning();
    return todo;
  }

  async update(
    id: string,
    userId: string,
    data: Partial<Omit<InsertTodo, "id" | "userId">>
  ): Promise<SelectTodo | null> {
    const [todo] = await db
      .update(todos)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();
    return todo || null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));
    return result.changes > 0;
  }
}

export const todoRepository = new TodoRepository();
```

## Step 3: Create API Routes

Now let's create the API endpoints for our todos.

### 3.1 Create Todo Routes

Create `src/server/routes/todos.ts`:

```typescript
import { todoRepository } from "@/db/repositories/todo.repository";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const createTodoSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
});

export const todos = {
  "/": {
    GET: [
      requireAuth,
      async (req: Request) => {
        const user = (req as any).user;
        const todos = await todoRepository.findAllByUserId(user.id);
        return Response.json(todos);
      },
    ],
    POST: [
      requireAuth,
      async (req: Request) => {
        const user = (req as any).user;
        const body = await req.json();
        
        const result = createTodoSchema.safeParse(body);
        if (!result.success) {
          return Response.json(
            { error: "Invalid input", details: result.error.errors },
            { status: 400 }
          );
        }

        const todo = await todoRepository.create({
          ...result.data,
          userId: user.id,
        });

        return Response.json(todo, { status: 201 });
      },
    ],
  },
  "/:id": {
    GET: [
      requireAuth,
      async (req: Request, { params }: { params: { id: string } }) => {
        const user = (req as any).user;
        const todo = await todoRepository.findById(params.id, user.id);
        
        if (!todo) {
          return Response.json({ error: "Todo not found" }, { status: 404 });
        }

        return Response.json(todo);
      },
    ],
    PUT: [
      requireAuth,
      async (req: Request, { params }: { params: { id: string } }) => {
        const user = (req as any).user;
        const body = await req.json();
        
        const result = updateTodoSchema.safeParse(body);
        if (!result.success) {
          return Response.json(
            { error: "Invalid input", details: result.error.errors },
            { status: 400 }
          );
        }

        const todo = await todoRepository.update(params.id, user.id, result.data);
        
        if (!todo) {
          return Response.json({ error: "Todo not found" }, { status: 404 });
        }

        return Response.json(todo);
      },
    ],
    DELETE: [
      requireAuth,
      async (req: Request, { params }: { params: { id: string } }) => {
        const user = (req as any).user;
        const deleted = await todoRepository.delete(params.id, user.id);
        
        if (!deleted) {
          return Response.json({ error: "Todo not found" }, { status: 404 });
        }

        return new Response(null, { status: 204 });
      },
    ],
  },
};
```

### 3.2 Register Routes

Update `src/server/router.ts` to include the todo routes:

```typescript
import { todos } from "./routes/todos";

// Add to the routes object
const routes = {
  // ... existing routes
  "/api/todos": todos,
};
```

## Step 4: Create the Frontend

Now let's build the React components for our todo list.

### 4.1 Create Todo Types

Create `src/app/types/todo.ts`:

```typescript
export interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Create Todo API Client

Create `src/app/lib/api/todos.ts`:

```typescript
import { apiClient } from "./client";
import type { Todo } from "@/app/types/todo";

export const todosApi = {
  getAll: () => apiClient.get<Todo[]>("/todos"),
  
  getById: (id: string) => apiClient.get<Todo>(`/todos/${id}`),
  
  create: (data: { title: string; description?: string }) =>
    apiClient.post<Todo>("/todos", data),
  
  update: (
    id: string, 
    data: Partial<Pick<Todo, "title" | "description" | "completed">>
  ) => apiClient.put<Todo>(`/todos/${id}`, data),
  
  delete: (id: string) => apiClient.delete(`/todos/${id}`),
};
```

### 4.3 Create Todo Components

Create `src/app/components/TodoList.tsx`:

```typescript
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { todosApi } from "@/app/lib/api/todos";
import type { Todo } from "@/app/types/todo";

export function TodoList() {
  const queryClient = useQueryClient();
  const [newTodo, setNewTodo] = useState("");

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: todosApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: todosApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      setNewTodo("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      todosApi.update(id, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: todosApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      createMutation.mutate({ title: newTodo.trim() });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading todos...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">My Todos</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new todo..."
            className="flex-1 px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple"
            disabled={createMutation.isPending}
          />
          <button
            type="submit"
            disabled={createMutation.isPending || !newTodo.trim()}
            className="px-6 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-center text-gray-soft py-8">
            No todos yet. Create your first one!
          </p>
        ) : (
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={() => toggleMutation.mutate({ id: todo.id, completed: !todo.completed })}
              onDelete={() => deleteMutation.mutate(todo.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-border-light hover:shadow-sm transition-shadow">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggle}
        className="w-5 h-5 text-accent-purple rounded focus:ring-accent-purple"
      />
      <div className="flex-1">
        <h3 className={`font-medium ${todo.completed ? "line-through text-gray-soft" : ""}`}>
          {todo.title}
        </h3>
        {todo.description && (
          <p className="text-sm text-gray-soft mt-1">{todo.description}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="text-red-500 hover:text-red-700 transition-colors"
      >
        Delete
      </button>
    </div>
  );
}
```

### 4.4 Create Todo Page

Create `src/app/pages/TodosPage.tsx`:

```typescript
import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/hooks/useAuth";
import { TodoList } from "@/app/components/TodoList";

export function TodosPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <TodoList />;
}
```

### 4.5 Add Route

Update `src/app/App.tsx` to include the todos route:

```typescript
import { TodosPage } from "./pages/TodosPage";

// Add to the routes
<Route path="/todos" element={<TodosPage />} />
```

### 4.6 Add Navigation Link

Update your navigation component to include a link to the todos page:

```typescript
<Link to="/todos" className="hover:text-accent-purple transition-colors">
  Todos
</Link>
```

## Step 5: Test Your App

1. Make sure your dev server is running:
   ```bash
   bun run dev
   ```

2. Log in to your app

3. Navigate to `/todos`

4. Try creating, completing, and deleting todos

## Step 6: Write Tests

Create `tests/server/todos.test.ts`:

```typescript
import { test, expect, describe, beforeAll } from "bun:test";

describe("Todos API", () => {
  let authToken: string;
  let todoId: string;

  beforeAll(async () => {
    // Create a test user and get auth token
    const timestamp = Date.now();
    const response = await fetch("http://localhost:3001/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `test-${timestamp}@example.com`,
        password: "password123",
        name: "Test User",
      }),
    });
    const data = await response.json();
    authToken = data.token;
  });

  test("creates a todo", async () => {
    const response = await fetch("http://localhost:3001/api/todos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: "Test Todo",
        description: "This is a test todo",
      }),
    });

    expect(response.status).toBe(201);
    const todo = await response.json();
    expect(todo.title).toBe("Test Todo");
    todoId = todo.id;
  });

  test("lists todos", async () => {
    const response = await fetch("http://localhost:3001/api/todos", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);
    const todos = await response.json();
    expect(Array.isArray(todos)).toBe(true);
    expect(todos.length).toBeGreaterThan(0);
  });

  test("updates a todo", async () => {
    const response = await fetch(`http://localhost:3001/api/todos/${todoId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        completed: true,
      }),
    });

    expect(response.status).toBe(200);
    const todo = await response.json();
    expect(todo.completed).toBe(true);
  });

  test("deletes a todo", async () => {
    const response = await fetch(`http://localhost:3001/api/todos/${todoId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(204);
  });
});
```

Run the tests:

```bash
bun run test
```

## Conclusion

Congratulations! You've built a complete todo list application with:

- ✅ Database schema and migrations
- ✅ Server-side API with authentication
- ✅ Client-side React components
- ✅ Real-time updates with React Query
- ✅ Comprehensive tests

This demonstrates the key patterns you'll use when building applications with Create Bun Stack:

1. **Schema-first development** - Define your data model first
2. **Repository pattern** - Encapsulate database operations
3. **Route handlers** - Simple, declarative API routes
4. **React Query** - Efficient data fetching and caching
5. **Type safety** - TypeScript throughout the stack

## Next Steps

- Add more features like due dates, tags, or priorities
- Implement search and filtering
- Add real-time updates with WebSockets
- Deploy your app to production

Check out the [Features Documentation](/docs/features) to learn more about what Create Bun Stack offers.
# Database

Create Bun Stack uses Drizzle ORM with dual database support - SQLite for development and PostgreSQL for production. This guide covers database configuration, schema management, and best practices.

## Overview

Key features:

- 🗄️ **Dual Database Support** - SQLite (dev) and PostgreSQL (prod)
- 🔧 **Drizzle ORM** - Type-safe SQL with excellent DX
- 📊 **Automatic Migrations** - Schema versioning and rollbacks
- 🏭 **Repository Pattern** - Clean data access layer
- 🎯 **Type Safety** - Generated TypeScript types
- 🚀 **Performance** - Optimized queries and connection pooling

## Database Configuration

### Automatic Detection

The database client automatically detects which database to use:

```typescript
// src/db/client.ts
import { drizzle } from "drizzle-orm/bun-sqlite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Database } from "bun:sqlite";

const DATABASE_URL = process.env.DATABASE_URL;

// Automatically choose database based on DATABASE_URL
export const db = DATABASE_URL?.startsWith("postgresql://")
  ? drizzlePg(postgres(DATABASE_URL))
  : drizzle(new Database("./app.db"));
```

### Environment Variables

```bash
# SQLite (default, no configuration needed)
# Database created at ./app.db

# PostgreSQL (production)
DATABASE_URL=postgresql://user:password@localhost:5432/myapp

# Connection pool settings (PostgreSQL)
DATABASE_POOL_SIZE=10
DATABASE_IDLE_TIMEOUT=30000
```

## Schema Definition

### Defining Tables

Create your schema with both SQLite and PostgreSQL variants:

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { pgTable, varchar, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";

// SQLite schema
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password"),
  role: text("role").default("user").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL schema (same structure, different types)
export const usersPg = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey().$defaultFn(() => createId()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Relationships

Define relationships between tables:

```typescript
// One-to-Many: User has many Posts
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { 
    onDelete: "cascade" 
  }),
  title: text("title").notNull(),
  content: text("content"),
  published: integer("published", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Many-to-Many: Posts have many Tags
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
});

export const postTags = sqliteTable("post_tags", {
  postId: text("post_id").notNull().references(() => posts.id, {
    onDelete: "cascade",
  }),
  tagId: text("tag_id").notNull().references(() => tags.id, {
    onDelete: "cascade",
  }),
}, (table) => ({
  pk: primaryKey(table.postId, table.tagId),
}));
```

### Indexes

Add indexes for better query performance:

```typescript
import { index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  // ... columns
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
  titleSearchIdx: index("title_search_idx").on(table.title),
}));
```

## Migrations

### Development Workflow

For rapid development, use push:

```bash
# Push schema changes directly to database
bun run db:push

# This runs:
# SQLite: bunx drizzle-kit push:sqlite
# PostgreSQL: bunx drizzle-kit push:pg
```

### Production Migrations

For production, generate and apply migrations:

```bash
# Generate migration files
bun run db:generate

# Review generated SQL
cat drizzle/0001_initial_schema.sql

# Apply migrations
bun run db:migrate
```

### Migration Files

Migrations are stored in the `drizzle/` directory:

```
drizzle/
├── 0001_initial_schema.sql
├── 0002_add_posts_table.sql
└── meta/
    └── _journal.json
```

### Rollback

Create down migrations manually:

```sql
-- drizzle/down/0002_remove_posts_table.sql
DROP TABLE IF EXISTS posts;
DROP INDEX IF EXISTS user_id_idx;
```

## Repository Pattern

### Creating a Repository

```typescript
// src/db/repositories/post.repository.ts
import { db } from "../client";
import { posts, users, type InsertPost, type SelectPost } from "../schema";
import { eq, desc, and, like } from "drizzle-orm";

export class PostRepository {
  async findAll(options?: {
    userId?: string;
    published?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<SelectPost[]> {
    const conditions = [];
    
    if (options?.userId) {
      conditions.push(eq(posts.userId, options.userId));
    }
    
    if (options?.published !== undefined) {
      conditions.push(eq(posts.published, options.published));
    }
    
    let query = db
      .select()
      .from(posts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(posts.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }
  
  async findById(id: string): Promise<SelectPost | null> {
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id));
    
    return post || null;
  }
  
  async findWithAuthor(id: string) {
    const [result] = await db
      .select({
        post: posts,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, id));
    
    return result || null;
  }
  
  async create(data: Omit<InsertPost, "id">): Promise<SelectPost> {
    const [post] = await db
      .insert(posts)
      .values(data)
      .returning();
    
    return post;
  }
  
  async update(
    id: string, 
    data: Partial<Omit<InsertPost, "id">>
  ): Promise<SelectPost | null> {
    const [post] = await db
      .update(posts)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, id))
      .returning();
    
    return post || null;
  }
  
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(posts)
      .where(eq(posts.id, id));
    
    return result.changes > 0;
  }
  
  async search(query: string): Promise<SelectPost[]> {
    return await db
      .select()
      .from(posts)
      .where(like(posts.title, `%${query}%`))
      .orderBy(desc(posts.createdAt));
  }
}

export const postRepository = new PostRepository();
```

### Using Repositories

```typescript
// In your route handlers
import { postRepository } from "@/db/repositories/post.repository";

export const posts = {
  "/": {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const userId = url.searchParams.get("userId");
      const published = url.searchParams.get("published");
      
      const posts = await postRepository.findAll({
        userId: userId || undefined,
        published: published === "true",
        limit: 20,
      });
      
      return Response.json(posts);
    },
  },
};
```

## Querying Data

### Basic Queries

```typescript
// Select all
const allUsers = await db.select().from(users);

// Select with conditions
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.role, "user"));

// Select specific columns
const userEmails = await db
  .select({
    id: users.id,
    email: users.email,
  })
  .from(users);

// Order and limit
const recentUsers = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt))
  .limit(10);
```

### Joins

```typescript
// Inner join
const postsWithAuthors = await db
  .select({
    post: posts,
    author: users,
  })
  .from(posts)
  .innerJoin(users, eq(posts.userId, users.id));

// Left join
const usersWithPosts = await db
  .select({
    user: users,
    postCount: sql<number>`count(${posts.id})`,
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId))
  .groupBy(users.id);
```

### Aggregations

```typescript
// Count
const userCount = await db
  .select({ count: sql<number>`count(*)` })
  .from(users);

// Sum, average, etc.
const stats = await db
  .select({
    total: sql<number>`count(*)`,
    avgAge: sql<number>`avg(${users.age})`,
    maxAge: sql<number>`max(${users.age})`,
  })
  .from(users);
```

### Complex Queries

```typescript
// Subqueries
const usersWithRecentPosts = await db
  .select()
  .from(users)
  .where(
    exists(
      db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.userId, users.id),
            gte(posts.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        )
    )
  );

// Window functions (PostgreSQL)
const rankedPosts = await db.execute(sql`
  SELECT 
    *,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rank
  FROM posts
`);
```

## Transactions

### Basic Transactions

```typescript
// SQLite transaction
await db.transaction(async (tx) => {
  const user = await tx
    .insert(users)
    .values({ email: "new@example.com", name: "New User" })
    .returning();
  
  await tx
    .insert(posts)
    .values({ userId: user[0].id, title: "First Post" });
});

// PostgreSQL transaction
await db.transaction(async (tx) => {
  try {
    const user = await tx.insert(users).values(userData).returning();
    await tx.insert(posts).values({ ...postData, userId: user[0].id });
    // Auto-commit on success
  } catch (error) {
    // Auto-rollback on error
    throw error;
  }
});
```

### Nested Transactions (PostgreSQL)

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(userData);
  
  // Savepoint
  await tx.transaction(async (tx2) => {
    await tx2.insert(posts).values(postData);
    // Can rollback just this part
  });
});
```

## Database Seeding

### Seed Script

```typescript
// src/db/seed.ts
import { db } from "./client";
import { users, posts, tags } from "./schema";
import { faker } from "@faker-js/faker";

async function seed() {
  console.log("🌱 Seeding database...");
  
  // Clear existing data
  await db.delete(posts);
  await db.delete(users);
  
  // Create users
  const userIds = [];
  for (let i = 0; i < 10; i++) {
    const [user] = await db
      .insert(users)
      .values({
        email: faker.internet.email(),
        name: faker.person.fullName(),
        password: await Bun.password.hash("password123"),
        role: i === 0 ? "admin" : "user",
      })
      .returning();
    
    userIds.push(user.id);
  }
  
  // Create posts
  for (const userId of userIds) {
    for (let i = 0; i < 5; i++) {
      await db.insert(posts).values({
        userId,
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(3),
        published: faker.datatype.boolean(),
      });
    }
  }
  
  console.log("✅ Seeding complete!");
}

// Run seed
seed().catch(console.error);
```

Run seeding:

```bash
bun run db:seed
```

## Performance Optimization

### Connection Pooling

```typescript
// PostgreSQL connection pool
const sql = postgres(DATABASE_URL, {
  max: 20,                // Max connections
  idle_timeout: 30,       // Close idle connections after 30s
  connect_timeout: 10,    // Connection timeout
});
```

### Query Optimization

```typescript
// Use prepared statements
const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder("id")))
  .prepare();

// Execute prepared statement
const user = await getUserById.execute({ id: "123" });
```

### Batch Operations

```typescript
// Batch insert
const userData = Array.from({ length: 1000 }, () => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
}));

await db.insert(users).values(userData);

// Batch update
await db
  .update(users)
  .set({ role: "premium" })
  .where(inArray(users.id, premiumUserIds));
```

## Drizzle Studio

Visual database management:

```bash
# Start Drizzle Studio
bun run db:studio

# Opens at https://local.drizzle.studio
```

Features:
- Browse tables and data
- Run SQL queries
- Edit data visually
- Export data

## Testing

### Test Database Setup

```typescript
// tests/helpers/database.ts
import { db } from "@/db/client";

export async function setupTestDatabase() {
  // Use test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  
  // Run migrations
  await runMigrations();
}

export async function cleanupTestDatabase() {
  // Clear all data
  await db.execute(sql`DELETE FROM posts`);
  await db.execute(sql`DELETE FROM users`);
}
```

### Repository Tests

```typescript
describe("PostRepository", () => {
  beforeEach(async () => {
    await cleanupTestDatabase();
  });
  
  test("creates and retrieves post", async () => {
    const user = await userRepository.create({
      email: "test@example.com",
      name: "Test User",
    });
    
    const post = await postRepository.create({
      userId: user.id,
      title: "Test Post",
      content: "Test content",
    });
    
    const retrieved = await postRepository.findById(post.id);
    expect(retrieved?.title).toBe("Test Post");
  });
});
```

## Troubleshooting

### Common Issues

1. **"Cannot find module 'bun:sqlite'"**:
   ```bash
   # Update Bun to latest version
   bun upgrade
   ```

2. **PostgreSQL connection failed**:
   ```bash
   # Check PostgreSQL is running
   pg_isready
   
   # Check connection string
   psql $DATABASE_URL
   ```

3. **Migration conflicts**:
   ```bash
   # Reset migrations
   rm -rf drizzle/
   bun run db:generate
   bun run db:push
   ```

### Debug Queries

```typescript
// Enable query logging
const db = drizzle(database, {
  logger: true,
});

// Custom logger
const db = drizzle(database, {
  logger: {
    logQuery(query, params) {
      console.log("Query:", query);
      console.log("Params:", params);
    },
  },
});
```

## Best Practices

1. **Always use repositories** - Don't query directly in routes
2. **Type your queries** - Use generated types
3. **Handle errors** - Wrap in try/catch
4. **Use transactions** - For related operations
5. **Index foreign keys** - For join performance
6. **Validate input** - Before database operations
7. **Sanitize queries** - Prevent SQL injection

## Next Steps

- Learn about [Query Optimization](/docs/advanced/query-optimization)
- Set up [Database Monitoring](/docs/advanced/monitoring)
- Implement [Data Validation](/docs/advanced/validation)
- Configure [Backups](/docs/advanced/backup)
# Database

Create Bun Stack uses Drizzle ORM with dual database support - SQLite for development and PostgreSQL for production. This guide covers database configuration, schema management, and best practices.

## Overview

Key features:

- 🗄️ **Dual Database Support** - SQLite (dev) and PostgreSQL (prod)
- 🔧 **Drizzle ORM** - Type-safe SQL with excellent DX
- 📊 **Schema Management** - Push-based schema updates and migration generation
- 🏭 **Repository Pattern** - Clean data access layer
- 🎯 **Type Safety** - Generated TypeScript types
- 🚀 **Performance** - Optimized queries and connection pooling

## Database Configuration

### Automatic Detection

The database client automatically detects which database to use:

```typescript
// src/db/client.ts
import { Database } from "bun:sqlite";
import { drizzle as drizzleSqlite } from "drizzle-orm/bun-sqlite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db:
  | ReturnType<typeof drizzlePg<typeof schema>>
  | ReturnType<typeof drizzleSqlite<typeof schema>>
  | undefined;
let dbType: "postgres" | "sqlite" = "sqlite";

async function initializeDatabase() {
  const pgUrl = process.env.DATABASE_URL;

  if (pgUrl?.startsWith("postgres")) {
    try {
      const client = postgres(pgUrl, {
        connect_timeout: 5,
        max: 1,
      });
      await client`SELECT 1`;

      const mainClient = postgres(pgUrl);
      _db = drizzlePg(mainClient, { schema });
      dbType = "postgres";
      console.log("✅ Connected to PostgreSQL database");

      await client.end();
      return;
    } catch (error) {
      console.warn(
        "⚠️  PostgreSQL connection failed, falling back to SQLite:",
        (error as Error).message
      );
    }
  }

  // Fallback to SQLite
  const sqliteDb = new Database(process.env.SQLITE_PATH || "./db/app.db");
  _db = drizzleSqlite(sqliteDb, { schema });
  dbType = "sqlite";
  console.log("✅ Using SQLite database");
}

await initializeDatabase();

export { dbType };

// Export db with type assertion to make operations work with union types
export const db = _db as any as ReturnType<typeof drizzleSqlite<typeof schema>>;
```

### Environment Variables

```bash
# SQLite (default, no configuration needed)
# Database created at ./db/app.db (override with SQLITE_PATH)

# PostgreSQL (production)
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
```

## Schema Definition

### Defining Tables

Create your schema with both SQLite and PostgreSQL variants:

```typescript
// src/db/schema.ts
import { createId } from "@paralleldrive/cuid2";
import { pgTable, text as pgText, timestamp, uuid } from "drizzle-orm/pg-core";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// SQLite schema
export const usersSqlite = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  role: text("role").default("user").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// PostgreSQL schema
export const usersPg = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: pgText("name").notNull(),
  email: pgText("email").notNull().unique(),
  password: pgText("password"),
  role: pgText("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export the appropriate schema based on runtime detection
export const users = process.env.DATABASE_URL?.startsWith("postgres") ? usersPg : usersSqlite;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
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
# Push schema changes directly to database (SQLite)
bun run db:push

# Push schema changes (PostgreSQL)
bun run db:push:pg
```

### Production Migrations

For production, generate and apply migrations:

```bash
# Generate migration files (SQLite)
bun run db:generate

# Generate migration files (PostgreSQL)
bun run db:generate:pg

# Review generated SQL
cat drizzle/0001_initial_schema.sql

# Apply migrations (push schema to database)
bun run db:push       # SQLite
bun run db:push:pg    # PostgreSQL
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

The generated template includes a `UserRepository` interface with separate `SQLiteUserRepository` and `PostgresUserRepository` implementations. The `db` instance is injected via constructor (dependency injection), not imported at module level.

### Template Repository Structure

```typescript
// src/db/repositories/UserRepository.ts (interface)
export interface UserRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | undefined>;
  create(data: NewUser): Promise<User>;
  update(id: string, data: Partial<NewUser>): Promise<User | undefined>;
  delete(id: string): Promise<boolean>;
}

// src/db/repositories/SQLiteUserRepository.ts
export class SQLiteUserRepository implements UserRepository {
  constructor(private db: ReturnType<typeof drizzleSqlite>) {}

  async findAll() {
    return this.db.select().from(usersSqlite);
  }

  async update(id: string, data: Partial<NewUser>) {
    const [user] = await this.db
      .update(usersSqlite)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(usersSqlite.id, id))
      .returning();
    return user;
  }

  async delete(id: string) {
    const result = await this.db
      .delete(usersSqlite)
      .where(eq(usersSqlite.id, id))
      .returning();
    return result.length > 0;
  }
  // ...
}

// src/db/repositories/index.ts (factory)
export const userRepository = dbType === "postgres"
  ? new PostgresUserRepository(db)
  : new SQLiteUserRepository(db);
```

### Creating Your Own Repository

> **Note:** The `PostRepository` below is a recommended pattern for extending the template — it is not included in the generated code.

```typescript
// src/db/repositories/post.repository.ts (not in template — create as needed)
export class PostRepository {
  constructor(private db: ReturnType<typeof drizzleSqlite>) {}

  async findAll(): Promise<SelectPost[]> {
    return this.db.select().from(posts).orderBy(desc(posts.createdAt));
  }

  async findById(id: string): Promise<SelectPost | undefined> {
    const [post] = await this.db
      .select()
      .from(posts)
      .where(eq(posts.id, id));
    return post;
  }

  async create(data: NewPost): Promise<SelectPost> {
    const [post] = await this.db
      .insert(posts)
      .values(data)
      .returning();
    return post;
  }

  async update(id: string, data: Partial<NewPost>): Promise<SelectPost | undefined> {
    const [post] = await this.db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning();
    return result.length > 0;
  }
}
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
import { dbType } from "./client";
import { userRepository } from "./repositories";

// Prevent seeding in production
if (process.env.NODE_ENV === "production") {
  console.error("❌ Seeding is disabled in production.");
  process.exit(1);
}

async function seed() {
  console.log(`🌱 Seeding ${dbType} database...`);

  // These credentials are for local development only
  const users = [
    {
      name: "Alice Johnson",
      email: "alice@example.com",
      password: await Bun.password.hash("Dev-Password-123!"),
      role: "admin" as const,
    },
    {
      name: "Bob Williams",
      email: "bob@example.com",
      password: await Bun.password.hash("Dev-Password-123!"),
      role: "user" as const,
    },
    {
      name: "Charlie Brown",
      email: "charlie@example.com",
      password: await Bun.password.hash("Dev-Password-123!"),
      role: "user" as const,
    },
  ];

  for (const user of users) {
    await userRepository.create(user);
  }

  console.log("✅ Database seeded!");
}

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
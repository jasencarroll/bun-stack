# Database Migrations Guide

This guide covers database migration strategies, best practices, and advanced techniques for managing schema changes in Create Bun Stack applications.

## Overview

Create Bun Stack uses Drizzle ORM for database management, which provides powerful migration tools for both development and production environments.

## Migration Strategies

### Development Strategy

During development, use `push` for rapid iteration:

```bash
# Push schema changes directly to database
bun run db:push

# This command:
# 1. Compares your schema with the database
# 2. Generates and executes SQL to sync them
# 3. No migration files created
```

### Production Strategy

For production, use versioned migrations:

```bash
# Generate migration files
bun run db:generate

# Apply migrations
bun run db:migrate

# This creates:
# - Timestamped migration files
# - Migration history tracking
# - Rollback capabilities
```

## Creating Migrations

### Schema Changes

When you modify your schema, generate a migration:

```typescript
// 1. Update schema in src/db/schema.ts
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  published: integer("published", { mode: "boolean" }).default(false), // New column
  publishedAt: text("published_at"), // New column
  userId: text("user_id").references(() => users.id),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});
```

```bash
# 2. Generate migration
bun run db:generate

# This creates: migrations/0001_add_published_fields.sql
```

### Custom Migrations

Create custom SQL migrations for complex changes:

```sql
-- migrations/0002_custom_indexes.sql
-- Add full-text search
CREATE VIRTUAL TABLE posts_fts USING fts5(
  title,
  content,
  content=posts,
  content_rowid=id
);

-- Add composite index
CREATE INDEX idx_posts_user_published 
ON posts(user_id, published, published_at DESC);

-- Add check constraint
ALTER TABLE posts 
ADD CONSTRAINT check_published_date 
CHECK (published = 0 OR published_at IS NOT NULL);
```

### Data Migrations

Migrate existing data during schema changes:

```sql
-- migrations/0003_migrate_user_roles.sql
-- Add new role column
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- Migrate existing admin users
UPDATE users 
SET role = 'admin' 
WHERE email IN (
  'admin@example.com',
  'superuser@example.com'
);

-- Make column required after migration
-- This would be in next migration file
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
```

## Migration Management

### Migration Configuration

Configure Drizzle migrations:

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  driver: "sqlite", // or "pg" for PostgreSQL
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### Running Migrations

```bash
# Run all pending migrations
bun run db:migrate

# Run specific migration
bun run migrations/0001_initial.sql

# Check migration status
bun run db:status
```

### Migration Scripts

Create helper scripts for migration management:

```typescript
// scripts/migrate.ts
import { migrate } from "drizzle-orm/sqlite/migrator";
import { db } from "../src/db";

async function runMigrations() {
  console.log("Running migrations...");
  
  try {
    await migrate(db, {
      migrationsFolder: "./migrations",
    });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
```

## Advanced Migration Techniques

### Reversible Migrations

Create migrations that can be rolled back:

```typescript
// scripts/migration-builder.ts
export class MigrationBuilder {
  private up: string[] = [];
  private down: string[] = [];
  
  addColumn(table: string, column: string, type: string) {
    this.up.push(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
    this.down.push(`ALTER TABLE ${table} DROP COLUMN ${column};`);
    return this;
  }
  
  dropColumn(table: string, column: string) {
    // Store column definition for rollback
    this.up.push(`ALTER TABLE ${table} DROP COLUMN ${column};`);
    // Would need to store original column definition
    return this;
  }
  
  createIndex(name: string, table: string, columns: string[]) {
    this.up.push(
      `CREATE INDEX ${name} ON ${table}(${columns.join(", ")});`
    );
    this.down.push(`DROP INDEX ${name};`);
    return this;
  }
  
  build() {
    return {
      up: this.up.join("\n"),
      down: this.down.join("\n"),
    };
  }
}

// Usage
const migration = new MigrationBuilder()
  .addColumn("users", "avatar_url", "TEXT")
  .createIndex("idx_users_email", "users", ["email"])
  .build();
```

### Zero-Downtime Migrations

Perform migrations without service interruption:

```typescript
// 1. Add new column (nullable)
ALTER TABLE users ADD COLUMN email_new TEXT;

// 2. Dual-write in application
export async function updateUser(id: string, data: UpdateUserData) {
  if (data.email) {
    data.email_new = data.email; // Write to both columns
  }
  return db.update(users).set(data).where(eq(users.id, id));
}

// 3. Backfill data
UPDATE users SET email_new = email WHERE email_new IS NULL;

// 4. Switch application to use new column
// Update schema.ts to use email_new

// 5. Drop old column (in next deployment)
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_new TO email;
```

### Large Table Migrations

Handle migrations on tables with millions of rows:

```sql
-- migrations/0004_batch_update.sql
-- Create temporary tracking table
CREATE TABLE migration_progress (
  id INTEGER PRIMARY KEY,
  last_processed_id TEXT,
  processed_count INTEGER DEFAULT 0,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- Batch update with progress tracking
DO $$
DECLARE
  batch_size INTEGER := 1000;
  last_id TEXT := '';
  rows_updated INTEGER;
BEGIN
  LOOP
    -- Update batch
    WITH batch AS (
      SELECT id FROM large_table 
      WHERE id > last_id 
      ORDER BY id 
      LIMIT batch_size
    )
    UPDATE large_table 
    SET new_column = some_calculation(old_column)
    WHERE id IN (SELECT id FROM batch)
    RETURNING id;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    -- Exit if no more rows
    EXIT WHEN rows_updated = 0;
    
    -- Track progress
    SELECT MAX(id) INTO last_id FROM batch;
    UPDATE migration_progress 
    SET last_processed_id = last_id,
        processed_count = processed_count + rows_updated;
    
    -- Prevent lock buildup
    COMMIT;
    
    -- Optional: Add delay to reduce load
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

## Migration Best Practices

### 1. **Always Test Migrations**

Test migrations in a staging environment:

```bash
# Create test database
createdb myapp_test

# Run migrations
DATABASE_URL=postgresql://localhost/myapp_test bun run db:migrate

# Verify schema
psql myapp_test -c "\d+"
```

### 2. **Make Migrations Idempotent**

Ensure migrations can be run multiple times safely:

```sql
-- Good: Idempotent
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Bad: Will fail on second run
CREATE TABLE users (
  id TEXT PRIMARY KEY
);
```

### 3. **Keep Migrations Small**

Break large changes into smaller migrations:

```sql
-- Instead of one large migration
-- Split into multiple files:

-- 0001_add_audit_fields.sql
ALTER TABLE users ADD COLUMN created_by TEXT;
ALTER TABLE users ADD COLUMN updated_by TEXT;

-- 0002_add_audit_indexes.sql
CREATE INDEX idx_users_created_by ON users(created_by);
CREATE INDEX idx_users_updated_by ON users(updated_by);

-- 0003_add_audit_triggers.sql
CREATE TRIGGER update_users_updated_by
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();
```

### 4. **Document Migrations**

Add comments to complex migrations:

```sql
-- Migration: Add user preferences system
-- Author: Team
-- Date: 2024-01-15
-- Purpose: Support user customization features

-- Create preferences table with JSONB for flexibility
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications JSONB DEFAULT '{"email": true, "push": false}',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for common queries
CREATE INDEX idx_preferences_theme ON user_preferences(theme);
```

## Migration Tools

### Schema Diffing

Compare schemas between environments:

```typescript
// scripts/schema-diff.ts
import { introspect } from "drizzle-orm/sqlite/introspect";

async function compareSchemas() {
  const prod = await introspect(prodDb);
  const dev = await introspect(devDb);
  
  const diff = {
    missingTables: [],
    extraTables: [],
    modifiedColumns: [],
  };
  
  // Compare tables
  for (const table of dev.tables) {
    if (!prod.tables.find(t => t.name === table.name)) {
      diff.missingTables.push(table.name);
    }
  }
  
  console.log("Schema differences:", diff);
}
```

### Migration Validation

Validate migrations before applying:

```typescript
// scripts/validate-migration.ts
export async function validateMigration(sql: string) {
  const issues = [];
  
  // Check for dangerous operations
  if (sql.match(/DROP TABLE/i) && !sql.match(/IF EXISTS/i)) {
    issues.push("DROP TABLE without IF EXISTS");
  }
  
  if (sql.match(/DELETE FROM/i) && !sql.match(/WHERE/i)) {
    issues.push("DELETE without WHERE clause");
  }
  
  if (sql.match(/ALTER TABLE.*DROP COLUMN/i)) {
    issues.push("Dropping columns - ensure data is backed up");
  }
  
  // Check for missing indexes on foreign keys
  const fkRegex = /REFERENCES\s+(\w+)\s*\((\w+)\)/gi;
  let match;
  while ((match = fkRegex.exec(sql))) {
    const [, table, column] = match;
    if (!sql.includes(`INDEX`) || !sql.includes(column)) {
      issues.push(`Missing index on foreign key: ${table}.${column}`);
    }
  }
  
  return issues;
}
```

### Rollback Management

Implement rollback functionality:

```typescript
// scripts/rollback.ts
class MigrationRollback {
  async rollback(steps = 1) {
    const applied = await this.getAppliedMigrations();
    const toRollback = applied.slice(-steps);
    
    for (const migration of toRollback.reverse()) {
      console.log(`Rolling back: ${migration.name}`);
      
      try {
        await this.executeSql(migration.down);
        await this.markAsRolledBack(migration.id);
      } catch (error) {
        console.error(`Rollback failed: ${error}`);
        throw error;
      }
    }
  }
  
  private async getAppliedMigrations() {
    return db
      .select()
      .from(migrations)
      .where(eq(migrations.status, "applied"))
      .orderBy(migrations.appliedAt);
  }
  
  private async markAsRolledBack(id: string) {
    await db
      .update(migrations)
      .set({ 
        status: "rolled_back",
        rolledBackAt: new Date(),
      })
      .where(eq(migrations.id, id));
  }
}
```

## Database-Specific Considerations

### SQLite Migrations

SQLite has limitations to consider:

```sql
-- SQLite doesn't support these directly:
-- - DROP COLUMN (before version 3.35.0)
-- - ALTER COLUMN
-- - ADD CONSTRAINT

-- Workaround: Create new table
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE, -- Added constraint
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' -- Modified column
);

-- Copy data
INSERT INTO users_new (id, email, name)
SELECT id, email, name FROM users;

-- Replace table
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
```

### PostgreSQL Migrations

PostgreSQL-specific features:

```sql
-- Use transactions for safety
BEGIN;

-- Add enum type
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');

-- Use the enum
ALTER TABLE users 
ADD COLUMN role user_role NOT NULL DEFAULT 'user';

-- Add partial index
CREATE INDEX idx_users_active_admins 
ON users(email) 
WHERE role = 'admin' AND deleted_at IS NULL;

-- Add generated column
ALTER TABLE posts 
ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
  to_tsvector('english', title || ' ' || content)
) STORED;

COMMIT;
```

## Troubleshooting

### Common Issues

1. **Migration Lock**
   ```bash
   # Clear migration lock
   DELETE FROM drizzle_migrations WHERE status = 'pending';
   ```

2. **Failed Migration**
   ```bash
   # Manually mark as failed
   UPDATE drizzle_migrations 
   SET status = 'failed' 
   WHERE id = 'migration_id';
   ```

3. **Schema Mismatch**
   ```bash
   # Force schema sync (development only)
   bun run db:push --force
   ```

### Recovery Procedures

```typescript
// scripts/migration-recovery.ts
export async function recoverFromFailedMigration() {
  // 1. Backup current state
  await exec("pg_dump $DATABASE_URL > backup_before_recovery.sql");
  
  // 2. Identify failed migration
  const failed = await db
    .select()
    .from(migrations)
    .where(eq(migrations.status, "failed"))
    .limit(1);
  
  if (!failed.length) {
    console.log("No failed migrations found");
    return;
  }
  
  // 3. Attempt to complete or rollback
  try {
    // Try to complete the migration
    await executeMigration(failed[0]);
  } catch (error) {
    // Rollback if completion fails
    await rollbackMigration(failed[0]);
  }
}
```

## Next Steps

- Optimize [Performance](/docs/performance)
- Review [Security](/docs/security) considerations
- Set up [Monitoring](/docs/monitoring)
- Implement [CI/CD](/docs/ci-cd) for migrations
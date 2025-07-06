# Performance Optimization Guide

This guide covers performance optimization techniques for Create Bun Stack applications, from server-side optimizations to frontend performance improvements.

## Performance Principles

### Bun's Performance Advantages

Create Bun Stack leverages Bun's inherent performance benefits:

- **Fast startup**: ~10ms vs 100ms+ for Node.js
- **Native performance**: Written in Zig for optimal speed
- **Built-in optimizations**: Fast transpilation and bundling
- **Efficient memory usage**: Lower memory footprint

## Server Performance

### Request Handling Optimization

Optimize your server's request handling:

```typescript
// src/server/index.ts
Bun.serve({
  port: 3000,
  
  // Enable compression
  compression: true,
  
  // Increase max request body size if needed
  maxRequestBodySize: 10 * 1024 * 1024, // 10MB
  
  // Development settings
  development: process.env.NODE_ENV !== "production",
  
  // Custom error handling
  error(error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  },
  
  fetch: router.fetch,
});
```

### Connection Pooling

Optimize database connections:

```typescript
// src/db/index.ts
import postgres from "postgres";

// PostgreSQL connection pool
export const sql = postgres(process.env.DATABASE_URL!, {
  max: 20, // Maximum connections
  idle_timeout: 20, // Idle connection timeout
  connect_timeout: 10, // Connection timeout
  
  // Performance optimizations
  prepare: true, // Use prepared statements
  types: {
    // Custom type parsers for performance
    date: {
      to: 1184,
      from: [1082, 1083, 1114, 1184],
      serialize: (x: Date) => x.toISOString(),
      parse: (x: string) => new Date(x),
    },
  },
  
  // Connection lifecycle hooks
  onnotice: () => {}, // Ignore notices for performance
});
```

### Caching Strategies

Implement efficient caching:

```typescript
// src/server/cache/memory.ts
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private timers = new Map<string, Timer>();
  
  set(key: string, value: T, ttl: number = 3600) {
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    const expires = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expires });
    
    // Auto-cleanup
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl * 1000);
    
    this.timers.set(key, timer);
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  delete(key: string) {
    this.cache.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
  
  clear() {
    this.cache.clear();
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

// Use in routes
const cache = new MemoryCache<any>();

export const cachedRoute = {
  GET: async (req: Request) => {
    const url = new URL(req.url);
    const cacheKey = `route:${url.pathname}${url.search}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return Response.json(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }
    
    // Compute result
    const result = await expensiveOperation();
    
    // Cache for 5 minutes
    cache.set(cacheKey, result, 300);
    
    return Response.json(result, {
      headers: { "X-Cache": "MISS" },
    });
  },
};
```

### Redis Caching

For distributed caching:

```typescript
// src/server/cache/redis.ts
import { createClient } from "redis";

export class RedisCache {
  private client = createClient({
    url: process.env.REDIS_URL,
  });
  
  async connect() {
    await this.client.connect();
  }
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set<T>(key: string, value: T, ttl: number = 3600) {
    await this.client.setex(
      key,
      ttl,
      JSON.stringify(value)
    );
  }
  
  async delete(key: string) {
    await this.client.del(key);
  }
  
  // Cache-aside pattern
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;
    
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
  
  // Cache invalidation patterns
  async invalidatePattern(pattern: string) {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}
```

### Response Streaming

Stream large responses for better performance:

```typescript
// src/server/routes/export.ts
export const exportData = {
  GET: async (req: Request) => {
    const stream = new ReadableStream({
      async start(controller) {
        // Send headers
        controller.enqueue('["');
        
        let first = true;
        let offset = 0;
        const limit = 1000;
        
        while (true) {
          const batch = await db
            .select()
            .from(users)
            .limit(limit)
            .offset(offset);
          
          if (batch.length === 0) break;
          
          for (const user of batch) {
            if (!first) controller.enqueue(",");
            controller.enqueue(JSON.stringify(user));
            first = false;
          }
          
          offset += limit;
        }
        
        controller.enqueue("]");
        controller.close();
      },
    });
    
    return new Response(stream, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="export.json"',
      },
    });
  },
};
```

## Database Performance

### Query Optimization

Optimize database queries:

```typescript
// src/db/repositories/optimized.ts
export class OptimizedUserRepository {
  // Use prepared statements
  private findByEmailStmt = db
    .select()
    .from(users)
    .where(eq(users.email, sql.placeholder("email")))
    .prepare();
  
  async findByEmail(email: string) {
    return this.findByEmailStmt.execute({ email });
  }
  
  // Batch operations
  async createMany(userData: CreateUserData[]) {
    return db.insert(users).values(userData);
  }
  
  // Efficient counting
  async count() {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    return result[0].count;
  }
  
  // Selective field loading
  async findAllBasic() {
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users);
  }
  
  // Efficient pagination with cursor
  async findPaginated(cursor?: string, limit = 20) {
    const query = db
      .select()
      .from(users)
      .orderBy(users.id)
      .limit(limit);
    
    if (cursor) {
      query.where(gt(users.id, cursor));
    }
    
    return query;
  }
}
```

### Index Optimization

Create efficient indexes:

```sql
-- Composite indexes for common queries
CREATE INDEX idx_posts_user_status_created 
ON posts(user_id, status, created_at DESC);

-- Partial indexes for filtered queries
CREATE INDEX idx_users_active 
ON users(email) 
WHERE deleted_at IS NULL;

-- Covering indexes
CREATE INDEX idx_users_login 
ON users(email) 
INCLUDE (id, password, role);

-- Full-text search indexes
CREATE INDEX idx_posts_search 
ON posts USING gin(to_tsvector('english', title || ' ' || content));
```

### Query Analysis

Monitor and analyze queries:

```typescript
// src/db/monitoring.ts
export function withQueryLogging<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = performance.now();
    
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      
      if (duration > 100) {
        console.warn(`Slow query [${name}]: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      console.error(`Query error [${name}]:`, error);
      throw error;
    }
  }) as T;
}

// Usage
const findUsers = withQueryLogging(
  userRepository.findAll,
  "UserRepository.findAll"
);
```

## Frontend Performance

### Bundle Optimization

Optimize client-side bundles:

```typescript
// build.config.ts
await Bun.build({
  entrypoints: ["./src/app/main.tsx"],
  outdir: "./dist",
  
  // Enable optimizations
  minify: true,
  splitting: true,
  treeshaking: true,
  
  // External dependencies for CDN
  external: [
    "react",
    "react-dom",
  ],
  
  // Define constants
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
```

### Code Splitting

Implement route-based code splitting:

```typescript
// src/app/routes.tsx
import { lazy, Suspense } from "react";

// Lazy load routes
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### React Optimization

Optimize React components:

```typescript
// src/app/components/OptimizedList.tsx
import { memo, useMemo, useCallback } from "react";

interface ListItemProps {
  item: Item;
  onSelect: (id: string) => void;
}

// Memoize list items
const ListItem = memo(({ item, onSelect }: ListItemProps) => {
  const handleClick = useCallback(() => {
    onSelect(item.id);
  }, [item.id, onSelect]);
  
  return (
    <li onClick={handleClick}>
      {item.name}
    </li>
  );
});

// Virtualized list for large datasets
import { FixedSizeList } from "react-window";

export function VirtualizedList({ items }: { items: Item[] }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ListItem item={items[index]} onSelect={handleSelect} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Image Optimization

Optimize image loading:

```typescript
// src/app/components/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height 
}: OptimizedImageProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { rootMargin: "50px" }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`${src}?format=webp&w=${width}`}
      />
      <img
        ref={imgRef}
        src={isIntersecting ? src : undefined}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        style={{
          aspectRatio: `${width} / ${height}`,
          backgroundColor: "#f0f0f0",
        }}
      />
    </picture>
  );
}
```

## API Performance

### Request Batching

Implement request batching:

```typescript
// src/app/lib/batch-loader.ts
export class BatchLoader<K, V> {
  private batch: Map<K, Array<(value: V) => void>> = new Map();
  private timeout: Timer | null = null;
  
  constructor(
    private loader: (keys: K[]) => Promise<Map<K, V>>,
    private delay: number = 10
  ) {}
  
  async load(key: K): Promise<V> {
    return new Promise((resolve) => {
      if (!this.batch.has(key)) {
        this.batch.set(key, []);
      }
      
      this.batch.get(key)!.push(resolve);
      
      if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.delay);
      }
    });
  }
  
  private async flush() {
    const batch = this.batch;
    this.batch = new Map();
    this.timeout = null;
    
    const keys = Array.from(batch.keys());
    if (keys.length === 0) return;
    
    try {
      const results = await this.loader(keys);
      
      for (const [key, callbacks] of batch) {
        const value = results.get(key);
        callbacks.forEach(cb => cb(value!));
      }
    } catch (error) {
      for (const callbacks of batch.values()) {
        callbacks.forEach(cb => cb(Promise.reject(error)));
      }
    }
  }
}

// Usage
const userLoader = new BatchLoader<string, User>(async (ids) => {
  const users = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, ids));
  
  return new Map(users.map(u => [u.id, u]));
});
```

### Response Compression

Enable response compression:

```typescript
// src/server/middleware/compression.ts
export function compressionMiddleware(
  handler: (req: Request) => Promise<Response> | Response
) {
  return async (req: Request): Promise<Response> => {
    const response = await handler(req);
    
    // Skip if already compressed
    if (response.headers.get("Content-Encoding")) {
      return response;
    }
    
    // Check if client accepts compression
    const acceptEncoding = req.headers.get("Accept-Encoding") || "";
    const supportsBrotli = acceptEncoding.includes("br");
    const supportsGzip = acceptEncoding.includes("gzip");
    
    if (!supportsBrotli && !supportsGzip) {
      return response;
    }
    
    // Skip small responses
    const contentLength = response.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength) < 1024) {
      return response;
    }
    
    // Compress response
    const body = await response.arrayBuffer();
    let compressed: ArrayBuffer;
    let encoding: string;
    
    if (supportsBrotli) {
      compressed = Bun.deflateSync(body, { level: 4 });
      encoding = "br";
    } else {
      compressed = Bun.gzipSync(body);
      encoding = "gzip";
    }
    
    return new Response(compressed, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        "Content-Encoding": encoding,
        "Vary": "Accept-Encoding",
      },
    });
  };
}
```

## Monitoring Performance

### Performance Metrics

Track key performance indicators:

```typescript
// src/server/monitoring/metrics.ts
export class PerformanceMonitor {
  private metrics = {
    requests: new Map<string, number>(),
    durations: new Map<string, number[]>(),
    errors: new Map<string, number>(),
  };
  
  recordRequest(path: string, duration: number, error?: boolean) {
    // Count requests
    this.metrics.requests.set(
      path,
      (this.metrics.requests.get(path) || 0) + 1
    );
    
    // Track durations
    if (!this.metrics.durations.has(path)) {
      this.metrics.durations.set(path, []);
    }
    this.metrics.durations.get(path)!.push(duration);
    
    // Count errors
    if (error) {
      this.metrics.errors.set(
        path,
        (this.metrics.errors.get(path) || 0) + 1
      );
    }
  }
  
  getMetrics() {
    const summary = {};
    
    for (const [path, durations] of this.metrics.durations) {
      const sorted = durations.sort((a, b) => a - b);
      summary[path] = {
        count: this.metrics.requests.get(path) || 0,
        errors: this.metrics.errors.get(path) || 0,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }
    
    return summary;
  }
}
```

### Performance Middleware

Add performance tracking middleware:

```typescript
// src/server/middleware/performance.ts
const monitor = new PerformanceMonitor();

export function performanceMiddleware(
  handler: (req: Request) => Promise<Response> | Response
) {
  return async (req: Request): Promise<Response> => {
    const start = performance.now();
    const url = new URL(req.url);
    const path = url.pathname;
    
    try {
      const response = await handler(req);
      const duration = performance.now() - start;
      
      monitor.recordRequest(path, duration, response.status >= 500);
      
      // Add timing header
      response.headers.set("Server-Timing", `total;dur=${duration}`);
      
      return response;
    } catch (error) {
      const duration = performance.now() - start;
      monitor.recordRequest(path, duration, true);
      throw error;
    }
  };
}
```

## Load Testing

### Load Test Script

Create load testing scripts:

```typescript
// scripts/load-test.ts
async function loadTest(
  url: string,
  concurrent: number = 10,
  requests: number = 1000
) {
  const results = {
    success: 0,
    failed: 0,
    durations: [] as number[],
  };
  
  const worker = async () => {
    while (results.success + results.failed < requests) {
      const start = performance.now();
      
      try {
        const response = await fetch(url);
        if (response.ok) {
          results.success++;
        } else {
          results.failed++;
        }
      } catch {
        results.failed++;
      }
      
      results.durations.push(performance.now() - start);
    }
  };
  
  // Run concurrent workers
  await Promise.all(
    Array(concurrent).fill(0).map(() => worker())
  );
  
  // Calculate statistics
  const sorted = results.durations.sort((a, b) => a - b);
  console.log({
    success: results.success,
    failed: results.failed,
    avgDuration: results.durations.reduce((a, b) => a + b) / results.durations.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  });
}

// Run test
loadTest("http://localhost:3000/api/users", 50, 10000);
```

## Best Practices

### 1. **Measure Before Optimizing**

Always profile before optimizing:

```bash
# Profile with Bun
bun --inspect src/server/index.ts

# Use Chrome DevTools for profiling
```

### 2. **Set Performance Budgets**

Define performance targets:

```typescript
// performance.config.ts
export const performanceBudgets = {
  server: {
    responseTime: {
      p50: 50,   // 50ms
      p95: 200,  // 200ms
      p99: 500,  // 500ms
    },
  },
  frontend: {
    bundleSize: 200 * 1024,      // 200KB
    firstContentfulPaint: 1500,   // 1.5s
    timeToInteractive: 3000,      // 3s
  },
};
```

### 3. **Implement Caching Layers**

Use multiple caching layers:

1. Browser cache (static assets)
2. CDN cache (global distribution)
3. Application cache (memory/Redis)
4. Database cache (query results)

### 4. **Optimize Critical Path**

Focus on the critical rendering path:

```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/main.woff2" as="font" crossorigin>
<link rel="preload" href="/css/critical.css" as="style">

<!-- Prefetch next likely pages -->
<link rel="prefetch" href="/dashboard">
```

## Next Steps

- Implement [Security](/docs/security) best practices
- Set up [Monitoring](/docs/monitoring)
- Configure [CI/CD](/docs/ci-cd)
- Review [Deployment](/docs/deployment/) guides
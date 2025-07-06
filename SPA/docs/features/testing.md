# Testing Features

Create Bun Stack provides a comprehensive testing setup using Bun's built-in test runner. This guide covers the testing features and utilities available.

## Overview

Testing features include:

- 🧪 **Bun Test Runner** - Fast, built-in test execution
- 🔄 **Integration Testing** - Real HTTP requests against running server
- 🎭 **Test Utilities** - Helpers for common testing tasks
- 📊 **Coverage Reports** - Track test coverage
- 🏃 **Parallel Execution** - Fast test runs
- 🔧 **Test Fixtures** - Reusable test data
- 🗄️ **Database Testing** - Isolated test databases
- 🎯 **Snapshot Testing** - Component snapshot comparisons

## Test Setup

### Configuration

The test environment is configured in `tests/setup.ts`:

```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach } from "bun:test";
import { spawn } from "bun";
import type { Subprocess } from "bun";

let testServer: Subprocess | null = null;
const TEST_PORT = 3001;
const TEST_DATABASE = "./test.db";

beforeAll(async () => {
  // Clean test database
  try {
    await unlink(TEST_DATABASE);
  } catch {}

  // Start test server
  testServer = spawn(["bun", "src/server/index.ts"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: TEST_PORT.toString(),
      DATABASE_URL: `sqlite://${TEST_DATABASE}`,
      JWT_SECRET: "test-secret",
      LOG_LEVEL: "error",
    },
  });

  // Wait for server to be ready
  await waitForServer(`http://localhost:${TEST_PORT}/api/health`);
  
  // Run migrations
  await runMigrations(TEST_DATABASE);
});

afterAll(async () => {
  // Cleanup
  if (testServer) {
    testServer.kill();
    await testServer.exited;
  }
  
  try {
    await unlink(TEST_DATABASE);
  } catch {}
});

// Reset database between test suites
beforeEach(async () => {
  await resetDatabase();
});
```

### Test Helpers

Common utilities for testing:

```typescript
// tests/helpers.ts
import { faker } from "@faker-js/faker";

const API_URL = `http://localhost:${process.env.TEST_PORT || 3001}/api`;

// API request helper
export async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

// Create test user
export async function createTestUser(overrides?: Partial<CreateUserDto>) {
  const userData = {
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }),
    name: faker.person.fullName(),
    ...overrides,
  };

  const response = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  return { user: data.user, token: data.token, password: userData.password };
}

// Authenticate helper
export async function authenticate() {
  const { token } = await createTestUser();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

// Database cleanup
export async function cleanupTestData(pattern: string) {
  const db = await getTestDatabase();
  await db.execute(`DELETE FROM users WHERE email LIKE '${pattern}%'`);
}

// Wait for condition
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 5000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await Bun.sleep(100);
  }
  throw new Error("Timeout waiting for condition");
}
```

## Writing Tests

### API Testing

Test your API endpoints:

```typescript
// tests/server/products.test.ts
import { test, expect, describe, beforeAll } from "bun:test";
import { apiRequest, authenticate, createTestUser } from "../helpers";

describe("Products API", () => {
  let authHeaders: { headers: { Authorization: string } };
  let adminHeaders: { headers: { Authorization: string } };

  beforeAll(async () => {
    // Create regular user
    authHeaders = await authenticate();
    
    // Create admin user
    const admin = await createTestUser({ role: "admin" });
    await promoteToAdmin(admin.user.id);
    adminHeaders = {
      headers: { Authorization: `Bearer ${admin.token}` },
    };
  });

  describe("GET /api/products", () => {
    test("returns product list", async () => {
      const response = await apiRequest("/products");
      
      expect(response.status).toBe(200);
      const products = await response.json();
      expect(Array.isArray(products)).toBe(true);
    });

    test("supports pagination", async () => {
      const response = await apiRequest("/products?page=2&limit=10");
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("page", 2);
      expect(data).toHaveProperty("limit", 10);
    });

    test("filters by category", async () => {
      const response = await apiRequest("/products?category=electronics");
      
      expect(response.status).toBe(200);
      const products = await response.json();
      
      products.forEach(product => {
        expect(product.category).toBe("electronics");
      });
    });
  });

  describe("POST /api/products", () => {
    test("requires authentication", async () => {
      const response = await apiRequest("/products", {
        method: "POST",
        body: JSON.stringify({ name: "Test Product" }),
      });
      
      expect(response.status).toBe(401);
    });

    test("requires admin role", async () => {
      const response = await apiRequest("/products", {
        method: "POST",
        ...authHeaders,
        body: JSON.stringify({ name: "Test Product" }),
      });
      
      expect(response.status).toBe(403);
    });

    test("creates product with valid data", async () => {
      const productData = {
        name: "Test Product",
        price: 99.99,
        description: "A test product",
        category: "electronics",
      };

      const response = await apiRequest("/products", {
        method: "POST",
        ...adminHeaders,
        body: JSON.stringify(productData),
      });
      
      expect(response.status).toBe(201);
      const product = await response.json();
      expect(product.name).toBe(productData.name);
      expect(product.price).toBe(productData.price);
      expect(product).toHaveProperty("id");
    });

    test("validates required fields", async () => {
      const response = await apiRequest("/products", {
        method: "POST",
        ...adminHeaders,
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error).toHaveProperty("details");
    });
  });
});
```

### Database Testing

Test your database operations:

```typescript
// tests/db/user.repository.test.ts
import { test, expect, describe, beforeEach } from "bun:test";
import { userRepository } from "@/db/repositories/user.repository";
import { faker } from "@faker-js/faker";

describe("UserRepository", () => {
  beforeEach(async () => {
    // Clean test users
    await cleanupTestData("test-");
  });

  test("creates a user", async () => {
    const userData = {
      email: `test-${Date.now()}@example.com`,
      name: faker.person.fullName(),
      password: await Bun.password.hash("password123"),
    };

    const user = await userRepository.create(userData);

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);
    expect(user.name).toBe(userData.name);
  });

  test("finds user by email", async () => {
    const email = `test-${Date.now()}@example.com`;
    const created = await userRepository.create({
      email,
      name: "Test User",
      password: "hashed",
    });

    const found = await userRepository.findByEmail(email);

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
  });

  test("updates user", async () => {
    const user = await userRepository.create({
      email: `test-${Date.now()}@example.com`,
      name: "Original Name",
      password: "hashed",
    });

    const updated = await userRepository.update(user.id, {
      name: "Updated Name",
    });

    expect(updated?.name).toBe("Updated Name");
  });

  test("handles concurrent operations", async () => {
    const operations = Array.from({ length: 10 }, (_, i) =>
      userRepository.create({
        email: `test-concurrent-${i}@example.com`,
        name: `User ${i}`,
        password: "hashed",
      })
    );

    const users = await Promise.all(operations);
    expect(users).toHaveLength(10);
    
    // All users should have unique IDs
    const ids = users.map(u => u.id);
    expect(new Set(ids).size).toBe(10);
  });
});
```

### Component Testing

Test React components:

```typescript
// tests/app/components/ProductCard.test.tsx
import { test, expect, describe } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductCard } from "@/app/components/ProductCard";

describe("ProductCard", () => {
  const mockProduct = {
    id: "1",
    name: "Test Product",
    price: 99.99,
    description: "A test product description",
    image: "/test-image.jpg",
  };

  test("renders product information", () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText(mockProduct.name)).toBeDefined();
    expect(screen.getByText(`$${mockProduct.price}`)).toBeDefined();
    expect(screen.getByText(mockProduct.description)).toBeDefined();
  });

  test("calls onAddToCart when clicked", () => {
    const handleAddToCart = jest.fn();
    
    render(
      <ProductCard
        product={mockProduct}
        onAddToCart={handleAddToCart}
      />
    );

    const button = screen.getByText("Add to Cart");
    fireEvent.click(button);

    expect(handleAddToCart).toHaveBeenCalledTimes(1);
    expect(handleAddToCart).toHaveBeenCalledWith(mockProduct.id);
  });

  test("disables button when out of stock", () => {
    const outOfStockProduct = {
      ...mockProduct,
      inStock: false,
    };

    render(<ProductCard product={outOfStockProduct} />);

    const button = screen.getByText("Out of Stock");
    expect(button).toBeDisabled();
  });
});
```

### Hook Testing

Test custom React hooks:

```typescript
// tests/app/hooks/useCart.test.ts
import { test, expect, describe } from "bun:test";
import { renderHook, act } from "@testing-library/react-hooks";
import { useCart } from "@/app/hooks/useCart";

describe("useCart", () => {
  test("adds items to cart", () => {
    const { result } = renderHook(() => useCart());

    expect(result.current.items).toHaveLength(0);

    act(() => {
      result.current.addItem({
        productId: "1",
        quantity: 2,
        price: 10,
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(20);
  });

  test("updates item quantity", () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        productId: "1",
        quantity: 1,
        price: 10,
      });
    });

    act(() => {
      result.current.updateQuantity("1", 3);
    });

    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.total).toBe(30);
  });

  test("removes items from cart", () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        productId: "1",
        quantity: 1,
        price: 10,
      });
    });

    act(() => {
      result.current.removeItem("1");
    });

    expect(result.current.items).toHaveLength(0);
  });
});
```

## Test Patterns

### Snapshot Testing

```typescript
// tests/app/components/Footer.test.tsx
import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Footer } from "@/app/components/Footer";

test("matches snapshot", () => {
  const { container } = render(<Footer year={2024} />);
  expect(container.innerHTML).toMatchSnapshot();
});

// First run creates: tests/app/components/__snapshots__/Footer.test.tsx.snap
// Subsequent runs compare against snapshot
```

### Error Testing

```typescript
test("handles errors gracefully", async () => {
  // Mock API error
  const mockFetch = jest.fn().mockRejectedValue(new Error("Network error"));
  global.fetch = mockFetch;

  const response = await apiRequest("/products").catch(e => e);
  
  expect(response).toBeInstanceOf(Error);
  expect(response.message).toBe("Network error");

  // Restore fetch
  global.fetch = fetch;
});

test("validates error responses", async () => {
  const response = await apiRequest("/products/invalid-id");
  
  expect(response.status).toBe(404);
  const error = await response.json();
  expect(error).toHaveProperty("error", "Product not found");
});
```

### Async Testing

```typescript
test("handles async operations", async () => {
  const promise = processDataAsync();
  
  // Test promise state
  expect(promise).toBeInstanceOf(Promise);
  
  // Wait for resolution
  const result = await promise;
  expect(result).toBe("processed");
});

test("handles timeouts", async () => {
  const slowOperation = () => 
    new Promise(resolve => setTimeout(resolve, 10000));

  // Test with timeout
  await expect(
    Promise.race([
      slowOperation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 1000)
      ),
    ])
  ).rejects.toThrow("Timeout");
});
```

## Mocking

### Mock Functions

```typescript
import { mock, spyOn } from "bun:test";

test("tracks function calls", () => {
  const mockFn = mock(() => "mocked");
  
  const result = mockFn("arg1", "arg2");
  
  expect(result).toBe("mocked");
  expect(mockFn).toHaveBeenCalledTimes(1);
  expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
});

test("spies on existing functions", () => {
  const obj = {
    method: () => "original",
  };
  
  const spy = spyOn(obj, "method");
  spy.mockReturnValue("mocked");
  
  expect(obj.method()).toBe("mocked");
  expect(spy).toHaveBeenCalled();
  
  // Restore
  spy.mockRestore();
  expect(obj.method()).toBe("original");
});
```

### Module Mocking

```typescript
// Mock entire module
jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: "123" }),
}));

import { sendEmail } from "@/lib/email";

test("sends email", async () => {
  const result = await sendEmail({
    to: "test@example.com",
    subject: "Test",
  });
  
  expect(result.id).toBe("123");
  expect(sendEmail).toHaveBeenCalledWith({
    to: "test@example.com",
    subject: "Test",
  });
});
```

## Test Coverage

### Running Coverage

```bash
# Generate coverage report
bun test --coverage

# With specific reporters
bun test --coverage --coverage-reporter=text
bun test --coverage --coverage-reporter=html
bun test --coverage --coverage-reporter=json

# Set coverage thresholds
bun test --coverage --coverage-threshold=80
```

### Coverage Configuration

```toml
# bunfig.toml
[test]
coverage = true
coverageReporter = ["text", "html", "json"]
coverageDirectory = "./coverage"
coverageThreshold = {
  global = {
    branches = 80,
    functions = 80,
    lines = 80,
    statements = 80
  }
}
```

### Viewing Coverage

```bash
# Open HTML report
open coverage/index.html

# Example output:
# File             | % Stmts | % Branch | % Funcs | % Lines |
# -----------------|---------|----------|---------|---------|
# All files        |   89.5  |   85.2   |   91.3  |   89.5  |
# server/routes    |   95.2  |   92.1   |   100   |   95.2  |
# db/repositories  |   88.7  |   83.5   |   89.2  |   88.7  |
# app/components   |   85.3  |   81.2   |   87.5  |   85.3  |
```

## Performance Testing

### Load Testing

```typescript
// tests/performance/load.test.ts
test("handles concurrent requests", async () => {
  const requests = Array.from({ length: 100 }, () =>
    apiRequest("/products")
  );

  const start = performance.now();
  const responses = await Promise.all(requests);
  const duration = performance.now() - start;

  // All requests should succeed
  responses.forEach(response => {
    expect(response.status).toBe(200);
  });

  // Should complete within reasonable time
  expect(duration).toBeLessThan(5000); // 5 seconds for 100 requests
  
  console.log(`100 requests completed in ${duration}ms`);
  console.log(`Average: ${duration / 100}ms per request`);
});
```

### Memory Testing

```typescript
test("doesn't leak memory", async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Perform operations
  for (let i = 0; i < 1000; i++) {
    await apiRequest("/products");
  }
  
  // Force garbage collection
  if (global.gc) global.gc();
  
  const finalMemory = process.memoryUsage().heapUsed;
  const increase = finalMemory - initialMemory;
  
  // Memory increase should be reasonable
  expect(increase).toBeLessThan(50 * 1024 * 1024); // 50MB
});
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
      
      - run: bun install
      
      - name: Run tests
        run: bun test --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Best Practices

1. **Test Isolation** - Each test should be independent
2. **Clear Names** - Descriptive test names
3. **AAA Pattern** - Arrange, Act, Assert
4. **Fast Tests** - Keep tests quick
5. **Real Data** - Use realistic test data
6. **Error Cases** - Test error paths
7. **Edge Cases** - Test boundaries
8. **Maintenance** - Keep tests updated

## Debugging Tests

### Debug Output

```typescript
test("debug failing test", async () => {
  console.log("Starting test...");
  
  const response = await apiRequest("/products");
  console.log("Response status:", response.status);
  console.log("Response headers:", response.headers);
  
  const data = await response.json();
  console.log("Response data:", JSON.stringify(data, null, 2));
  
  expect(response.status).toBe(200);
});
```

### Interactive Debugging

```bash
# Run specific test with inspector
bun test --inspect tests/server/products.test.ts

# Use debugger statements
test("debug with breakpoint", async () => {
  debugger; // Execution will pause here
  const result = await someFunction();
  expect(result).toBe(expected);
});
```

## Next Steps

- Set up [Continuous Integration](/docs/deployment/ci-cd)
- Implement [E2E Testing](/docs/advanced/e2e-testing)
- Add [Visual Regression Tests](/docs/advanced/visual-testing)
- Configure [Test Environments](/docs/advanced/test-environments)
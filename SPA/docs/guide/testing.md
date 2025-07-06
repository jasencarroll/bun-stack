# Testing Guide

Create Bun Stack uses Bun's built-in test runner for fast, reliable testing. This guide covers testing strategies, patterns, and best practices.

## Overview

### Test Structure

```
tests/
├── app/                 # Frontend component tests
│   ├── components/     # Component tests
│   ├── hooks/          # Hook tests
│   └── pages/          # Page tests
├── server/             # Backend API tests
│   ├── routes/         # Route handler tests
│   └── middleware/     # Middleware tests
├── db/                 # Database tests
│   └── repositories/   # Repository tests
├── lib/                # Utility tests
├── e2e/                # End-to-end tests
├── helpers.ts          # Test utilities
└── setup.ts            # Test setup
```

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/server/auth.test.ts

# Run tests matching pattern
bun test --pattern auth

# Run with coverage
bun test --coverage

# Run in different environment
NODE_ENV=test bun test
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect, describe, beforeAll, afterAll } from "bun:test";

describe("Feature Name", () => {
  // Setup before all tests
  beforeAll(async () => {
    await setupDatabase();
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    await cleanupDatabase();
  });
  
  test("should do something", async () => {
    // Arrange
    const input = { name: "Test" };
    
    // Act
    const result = await doSomething(input);
    
    // Assert
    expect(result).toBe("expected value");
  });
});
```

### API Testing

#### Testing Endpoints

```typescript
// tests/server/users.test.ts
import { test, expect, describe } from "bun:test";

describe("Users API", () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Create test user and get token
    const response = await fetch("http://localhost:3001/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: "password123",
        name: "Test User",
      }),
    });
    
    const data = await response.json();
    authToken = data.token;
  });
  
  test("GET /api/users returns user list", async () => {
    const response = await fetch("http://localhost:3001/api/users", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    
    expect(response.status).toBe(200);
    const users = await response.json();
    expect(Array.isArray(users)).toBe(true);
  });
  
  test("GET /api/users requires authentication", async () => {
    const response = await fetch("http://localhost:3001/api/users");
    expect(response.status).toBe(401);
  });
});
```

#### Testing with Different Methods

```typescript
describe("CRUD Operations", () => {
  test("creates a resource", async () => {
    const response = await fetch("http://localhost:3001/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Test Product",
        price: 99.99,
      }),
    });
    
    expect(response.status).toBe(201);
    const product = await response.json();
    expect(product.name).toBe("Test Product");
  });
  
  test("updates a resource", async () => {
    const response = await fetch(`http://localhost:3001/api/products/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        price: 89.99,
      }),
    });
    
    expect(response.status).toBe(200);
  });
  
  test("deletes a resource", async () => {
    const response = await fetch(`http://localhost:3001/api/products/${productId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    
    expect(response.status).toBe(204);
  });
});
```

### Component Testing

#### Testing React Components

```typescript
// tests/app/components/Button.test.tsx
import { test, expect } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { Button } from "@/app/components/Button";

test("Button renders and handles clicks", () => {
  const handleClick = jest.fn();
  const { getByText } = render(
    <Button onClick={handleClick}>Click me</Button>
  );
  
  const button = getByText("Click me");
  expect(button).toBeDefined();
  
  fireEvent.click(button);
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### Testing Hooks

```typescript
// tests/app/hooks/useCounter.test.ts
import { test, expect } from "bun:test";
import { renderHook, act } from "@testing-library/react-hooks";
import { useCounter } from "@/app/hooks/useCounter";

test("useCounter increments value", () => {
  const { result } = renderHook(() => useCounter());
  
  expect(result.current.count).toBe(0);
  
  act(() => {
    result.current.increment();
  });
  
  expect(result.current.count).toBe(1);
});
```

### Database Testing

#### Testing Repositories

```typescript
// tests/db/user.repository.test.ts
import { test, expect, describe, beforeEach } from "bun:test";
import { userRepository } from "@/db/repositories/user.repository";
import { db } from "@/db/client";
import { users } from "@/db/schema";

describe("UserRepository", () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(users).where(like(users.email, "test-%"));
  });
  
  test("creates a user", async () => {
    const userData = {
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
      password: "hashed_password",
    };
    
    const user = await userRepository.create(userData);
    
    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);
    expect(user.name).toBe(userData.name);
  });
  
  test("finds user by email", async () => {
    const email = `test-${Date.now()}@example.com`;
    await userRepository.create({
      email,
      name: "Test User",
      password: "hashed_password",
    });
    
    const found = await userRepository.findByEmail(email);
    expect(found).toBeDefined();
    expect(found?.email).toBe(email);
  });
});
```

### Unit Testing

#### Testing Utilities

```typescript
// tests/lib/validation.test.ts
import { test, expect, describe } from "bun:test";
import { validateEmail, validatePassword } from "@/lib/validation";

describe("Validation utilities", () => {
  describe("validateEmail", () => {
    test("accepts valid emails", () => {
      expect(validateEmail("user@example.com")).toBe(true);
      expect(validateEmail("user+tag@example.co.uk")).toBe(true);
    });
    
    test("rejects invalid emails", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
    });
  });
  
  describe("validatePassword", () => {
    test("accepts strong passwords", () => {
      expect(validatePassword("StrongP@ss123")).toBe(true);
    });
    
    test("rejects weak passwords", () => {
      expect(validatePassword("weak")).toBe(false);
      expect(validatePassword("12345678")).toBe(false);
    });
  });
});
```

## Test Helpers

### Creating Test Utilities

```typescript
// tests/helpers.ts
import { faker } from "@faker-js/faker";

export function createTestUser() {
  return {
    email: faker.internet.email(),
    password: faker.internet.password({ length: 10 }),
    name: faker.person.fullName(),
  };
}

export async function authenticateTestUser() {
  const user = createTestUser();
  
  const response = await fetch("http://localhost:3001/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  
  const data = await response.json();
  return { user, token: data.token };
}

export async function cleanupTestData(pattern: string) {
  await db.delete(users).where(like(users.email, pattern));
}
```

### Test Fixtures

```typescript
// tests/fixtures/products.ts
export const testProducts = [
  {
    name: "Widget",
    price: 9.99,
    description: "A useful widget",
  },
  {
    name: "Gadget",
    price: 19.99,
    description: "An amazing gadget",
  },
];

export async function seedTestProducts() {
  const products = [];
  for (const product of testProducts) {
    const created = await productRepository.create(product);
    products.push(created);
  }
  return products;
}
```

## Test Configuration

### Test Setup

```typescript
// tests/setup.ts
import { spawn } from "bun";
import type { Subprocess } from "bun";

let testServer: Subprocess | null = null;
const TEST_PORT = 3001;

beforeAll(async () => {
  // Start test server
  testServer = spawn(["bun", "src/server/index.ts"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: TEST_PORT.toString(),
      DATABASE_URL: process.env.TEST_DATABASE_URL || undefined,
    },
  });
  
  // Wait for server to start
  await waitForServer(`http://localhost:${TEST_PORT}/api/health`);
});

afterAll(async () => {
  // Stop test server
  if (testServer) {
    testServer.kill();
    await testServer.exited;
  }
});

async function waitForServer(url: string, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await Bun.sleep(100);
  }
  throw new Error("Server failed to start");
}
```

### Environment Variables

```bash
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://localhost/myapp_test
JWT_SECRET=test-secret-do-not-use-in-production
RATE_LIMIT_ENABLED=false
```

## Testing Patterns

### Arrange-Act-Assert

```typescript
test("calculates order total", () => {
  // Arrange
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 },
  ];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(35);
});
```

### Test Data Isolation

```typescript
test("creates unique test data", async () => {
  // Use timestamps for uniqueness
  const timestamp = Date.now();
  const email = `test-${timestamp}@example.com`;
  
  const user = await createUser({ email, name: "Test" });
  
  // Cleanup
  await deleteUser(user.id);
});
```

### Mocking External Services

```typescript
import { mock } from "bun:test";

test("sends email on registration", async () => {
  // Mock email service
  const sendEmail = mock(() => Promise.resolve());
  
  await registerUser({
    email: "new@example.com",
    password: "password123",
  });
  
  expect(sendEmail).toHaveBeenCalledWith({
    to: "new@example.com",
    subject: "Welcome!",
  });
});
```

## Coverage

### Generating Coverage Reports

```bash
# Generate coverage report
bun test --coverage

# Coverage output
#  server/routes/auth.ts    | 95.2% | 100%  | 87.5% |
#  server/middleware/auth.ts| 100%  | 100%  | 100%  |
#  lib/validation.ts        | 88.9% | 75%   | 100%  |
```

### Coverage Configuration

```json
// bunfig.toml
[test]
coverage = true
coverageReporter = ["text", "json", "html"]
coverageThreshold = {
  global = {
    branches = 80,
    functions = 80,
    lines = 80,
    statements = 80
  }
}
```

## End-to-End Testing

### Writing E2E Tests

```typescript
// tests/e2e/auth-flow.test.ts
import { test, expect } from "bun:test";
import puppeteer from "puppeteer";

test("complete authentication flow", async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Navigate to app
  await page.goto("http://localhost:3000");
  
  // Click login
  await page.click('a[href="/login"]');
  
  // Fill form
  await page.type('input[name="email"]', "test@example.com");
  await page.type('input[name="password"]', "password123");
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  await page.waitForNavigation();
  
  // Check logged in
  const userName = await page.$eval(".user-name", el => el.textContent);
  expect(userName).toBe("Test User");
  
  await browser.close();
});
```

## Best Practices

### 1. Test Organization

- Group related tests with `describe`
- Use clear, descriptive test names
- Keep tests focused and atomic
- Avoid test interdependencies

### 2. Performance

```typescript
// ❌ Slow: Multiple API calls
test("gets user data", async () => {
  const user = await createUser();
  const profile = await getProfile(user.id);
  const posts = await getPosts(user.id);
});

// ✅ Fast: Parallel requests
test("gets user data", async () => {
  const user = await createUser();
  const [profile, posts] = await Promise.all([
    getProfile(user.id),
    getPosts(user.id),
  ]);
});
```

### 3. Maintainability

```typescript
// Use constants for test data
const TEST_USER = {
  email: "test@example.com",
  password: "TestPass123!",
};

// Extract common assertions
function assertSuccessResponse(response: Response) {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}
```

### 4. Debugging

```typescript
test("debug failing test", async () => {
  const result = await complexOperation();
  
  // Add debug output
  console.log("Result:", JSON.stringify(result, null, 2));
  
  // Use specific assertions
  expect(result).toHaveProperty("id");
  expect(result.status).toBe("active");
});
```

## Continuous Integration

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
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - run: bun install
      
      - run: bun test --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test
      
      - uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

#### Tests Timing Out

```typescript
// Increase timeout for slow operations
test("slow operation", async () => {
  // Test code
}, { timeout: 10000 }); // 10 seconds
```

#### Port Conflicts

```typescript
// Use dynamic ports
const TEST_PORT = 3000 + Math.floor(Math.random() * 1000);
```

#### Database State

```typescript
// Reset database between tests
beforeEach(async () => {
  await db.execute("TRUNCATE TABLE users CASCADE");
});
```

## Next Steps

- Set up [Continuous Integration](/docs/deployment/ci-cd)
- Learn about [Performance Testing](/docs/advanced/performance)
- Explore [Security Testing](/docs/advanced/security)
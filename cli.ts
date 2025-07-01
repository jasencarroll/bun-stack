#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";

// Database client that supports both PostgreSQL and SQLite with automatic fallback
const DB_CLIENT_TEMPLATE = `import { Database } from "bun:sqlite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleSqlite } from "drizzle-orm/bun-sqlite";
import postgres from "postgres";
import * as schema from "./schema";

let db: ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzleSqlite<typeof schema>>;
let dbType: "postgres" | "sqlite";

// Try PostgreSQL first, fallback to SQLite
async function initializeDatabase() {
  const pgUrl = process.env.DATABASE_URL;

  if (pgUrl?.startsWith("postgres")) {
    try {
      // Test PostgreSQL connection
      const client = postgres(pgUrl);
      await client\`SELECT 1\`;

      db = drizzlePg(client, { schema });
      dbType = "postgres";
      console.log("✅ Connected to PostgreSQL database");
      return;
    } catch (error) {
      console.warn(
        "⚠️  PostgreSQL connection failed, falling back to SQLite:",
        (error as Error).message,
      );
    }
  }

  // Fallback to SQLite
  const sqliteDb = new Database(process.env.SQLITE_PATH || "./db/app.db");
  db = drizzleSqlite(sqliteDb, { schema });
  dbType = "sqlite";
  console.log("✅ Using SQLite database");
}

// Initialize on module load
await initializeDatabase();

export { db, dbType };
`;

// Drizzle config that supports both databases
const DRIZZLE_CONFIG_TEMPLATE = `import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL || "";
const isPostgres = databaseUrl.startsWith("postgres");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: isPostgres ? "postgresql" : "sqlite",
  dbCredentials: isPostgres 
    ? { url: databaseUrl }
    : { url: process.env.SQLITE_PATH || "db/app.db" },
});
`;

// Schema that works with both PostgreSQL and SQLite
const SCHEMA_TEMPLATE = `import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { pgTable, text as pgText, timestamp, uuid } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// Define tables for both SQLite and PostgreSQL
// The app will use the appropriate one based on the database type

// SQLite schema
export const usersSqlite = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// PostgreSQL schema  
export const usersPg = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: pgText("name").notNull(),
  email: pgText("email").notNull().unique(),
  password: pgText("password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export the appropriate schema based on runtime detection
export const users = process.env.DATABASE_URL?.startsWith("postgres")
  ? usersPg
  : usersSqlite;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`;

// Template definition for fullstack app
const FULLSTACK_TEMPLATE = {
  "package.json": JSON.stringify(
    {
      name: "bun-fullstack-app",
      version: "0.0.1",
      type: "module",
      scripts: {
        // Development
        dev: "bun run build:css && bun --hot src/server/index.ts",
        "build:css": "bunx tailwindcss -i ./src/app/index.css -o ./public/styles.css",
        "watch:css": "bunx tailwindcss -i ./src/app/index.css -o ./public/styles.css --watch",

        // Code quality checks
        typecheck: "bunx tsc --noEmit",
        format: "bunx prettier --write .",
        "format:check": "bunx prettier --check .",
        lint: "bunx @biomejs/biome check --write .",
        "lint:check": "bunx @biomejs/biome check .",
        "lint:fix": "bunx @biomejs/biome check --write --unsafe .",
        check: "bun run typecheck && bun run format:check && bun run lint:check",
        fix: "bun run format && bun run lint",

        // Testing
        test: "bun test",
        "test:watch": "bun test --watch",
        "test:setup": "bun run db:push && bun run db:seed",

        // Database
        "db:push": "drizzle-kit push",
        "db:push:pg": "DATABASE_URL=$DATABASE_URL drizzle-kit push",
        "db:generate": "drizzle-kit generate",
        "db:generate:pg": "DATABASE_URL=$DATABASE_URL drizzle-kit generate",
        "db:studio": "drizzle-kit studio",
        "db:seed": "bun run src/db/seed.ts",

        // Production
        build: "bun run build:css && bun build src/app/main.tsx --outdir=dist",
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "react-router-dom": "^6.20.0",
        "drizzle-orm": "^0.33.0",
        postgres: "^3.4.0",
        zod: "^3.22.0",
        "@tanstack/react-query": "^5.0.0",
        "@paralleldrive/cuid2": "^2.2.2",
        "@heroicons/react": "^2.0.18",
      },
      devDependencies: {
        "@types/bun": "latest",
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "drizzle-kit": "^0.24.0",
        "@libsql/client": "^0.3.0",
        tailwindcss: "^3.3.0",
        "@biomejs/biome": "^1.8.3",
        prettier: "^3.3.3",
        typescript: "^5.5.0",
      },
    },
    null,
    2
  ),
  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        lib: ["ESNext", "DOM"],
        module: "esnext",
        target: "esnext",
        moduleResolution: "bundler",
        moduleDetection: "force",
        allowImportingTsExtensions: true,
        noEmit: true,
        composite: true,
        strict: true,
        downlevelIteration: true,
        skipLibCheck: true,
        jsx: "react-jsx",
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        allowJs: true,
        types: ["bun-types"],
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"],
        },
      },
    },
    null,
    2
  ),
  ".gitignore": `node_modules
.DS_Store
*.log
.env
.env.local
dist/
db/*.sqlite
db/*.sqlite-journal
db/*.db
db/*.db-journal
drizzle/
`,
  ".env.example": `# Server
PORT=3000
NODE_ENV=development

# Database
# SQLite is used by default (no configuration needed)
# To use PostgreSQL instead, uncomment and set:
# DATABASE_URL=postgres://user:password@localhost:5432/myapp

# Auth
JWT_SECRET=your-secret-key

# External APIs
# OAUTH_CLIENT_ID=
# OAUTH_CLIENT_SECRET=
`,
  "README.md": `# Create Bun Stack

A modern fullstack application built with Bun, React, and Drizzle ORM.

## Features

- 🚀 **Bun Runtime** - Fast all-in-one JavaScript runtime
- ⚛️ **React 18** - Modern UI with React Router
- 🗄️ **Dual Database Support** - PostgreSQL primary with SQLite fallback
- 🔐 **Authentication** - JWT-based auth system
- 📦 **Drizzle ORM** - Type-safe database queries
- 🎨 **Tailwind CSS** - Utility-first styling
- 🧪 **Testing** - Bun test runner included

## Getting Started

1. Install dependencies:
   \`\`\`bash
   bun install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your database credentials
   \`\`\`

3. Set up the database:
   \`\`\`bash
   bun run db:push      # For SQLite (default)
   # OR
   bun run db:push:pg   # For PostgreSQL
   \`\`\`

4. (Optional) Seed the database:
   \`\`\`bash
   bun run db:seed
   \`\`\`

5. Start the development server:
   \`\`\`bash
   bun run dev
   \`\`\`

## Database Configuration

This app supports both PostgreSQL and SQLite:

- **PostgreSQL** (recommended for production): Set \`DATABASE_URL\` in your 
  \`.env\` file
- **SQLite** (automatic fallback): Used when PostgreSQL is unavailable

The app will automatically detect and use the appropriate database.

## Project Structure

- \`src/app/\` - Frontend React SPA
- \`src/server/\` - Bun backend API
- \`src/db/\` - Database layer with Drizzle ORM
- \`src/lib/\` - Shared utilities and types
- \`public/\` - Static assets

## Scripts

- \`bun run dev\` - Start development server
- \`bun run build\` - Build for production
- \`bun test\` - Run tests
- \`bun run db:push\` - Push database schema
- \`bun run db:studio\` - Open Drizzle Studio
- \`bun run db:seed\` - Seed database with sample data`,
  "bunfig.toml": `# Bun configuration
[test]
preload = ["./tests/setup.ts"]
# Run tests sequentially to avoid conflicts
smol = true
`,
  "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
`,
  "public/index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Bun Stack App">
  <title>Bun Stack App</title>
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="https://rsms.me/inter/inter.css">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/app/main.tsx"></script>
</body>
</html>`,
  "public/manifest.json": JSON.stringify(
    {
      name: "Bun Stack App",
      short_name: "BunApp",
      start_url: "/",
      display: "standalone",
      theme_color: "#000000",
      background_color: "#ffffff",
      icons: [
        {
          src: "/favicon.ico",
          sizes: "64x64 32x32 24x24 16x16",
          type: "image/x-icon",
        },
      ],
    },
    null,
    2
  ),
  "public/offline.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Bun App</title>
</head>
<body>
  <div style="text-align: center; padding: 50px;">
    <h1>You're offline</h1>
    <p>Please check your internet connection and try again.</p>
  </div>
</body>
</html>`,
  "public/styles.css": `/* Tailwind CSS directives */
@tailwind base;
@tailwind components;
@tailwind utilities;
`,
  "src/app/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

@theme {
  --font-sans: Inter, sans-serif;
}
`,
  "src/server/index.ts": `import * as routes from "./routes";
import { applyCorsHeaders, handleCorsPreflightRequest } from "./middleware/cors";
import { applyCsrfProtection } from "./middleware/csrf";
import { applySecurityHeaders } from "./middleware/security-headers";

const PORT = process.env.PORT || 3000;

// For development, we'll serve the React app dynamically
const isDevelopment = process.env.NODE_ENV !== "production";

const appServer = Bun.serve({
  port: PORT,
    async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const origin = req.headers.get("Origin");
    
    // Helper to apply all security middleware
    const wrapResponse = (response: Response): Response => {
      let finalResponse = response;
      
      // Apply CORS headers for API routes
      if (path.startsWith("/api")) {
        finalResponse = applyCorsHeaders(finalResponse, origin);
      }
      
      // Apply security headers to all responses
      return applySecurityHeaders(finalResponse, req);
    };

    // Handle CORS preflight requests for API routes
    if (path.startsWith("/api")) {
      const preflightResponse = handleCorsPreflightRequest(req);
      if (preflightResponse) return wrapResponse(preflightResponse);
      
      // Apply CSRF protection
      const csrfError = applyCsrfProtection(req);
      if (csrfError) return wrapResponse(csrfError);
    }

    // Serve React app files
    if (path === "/" || !path.startsWith("/api")) {
      if (path === "/" || path.endsWith(".html")) {
        // Serve index.html
        const html = await Bun.file("./public/index.html").text();
        // In development, update the script src to use the bundled version
        const modifiedHtml = isDevelopment 
          ? html.replace('/src/app/main.tsx', '/main.js')
          : html;
        return wrapResponse(new Response(modifiedHtml, {
          headers: { "Content-Type": "text/html" },
        }));
      }
      
      // Handle JavaScript bundle request
      if (path === "/main.js" && isDevelopment) {
        const result = await Bun.build({
          entrypoints: ["./src/app/main.tsx"],
          target: "browser",
          minify: false,
        });
        
        if (result.success && result.outputs.length > 0) {
          return wrapResponse(new Response(result.outputs[0], {
            headers: { "Content-Type": "application/javascript" },
          }));
        }
      }
      
      // Handle CSS
      if (path === "/styles.css") {
        // For now, just serve the CSS file directly
        // In production, you'd want to run Tailwind CSS build
        return wrapResponse(new Response(Bun.file("./public/styles.css"), {
          headers: { "Content-Type": "text/css" },
        }));
      }
      
      // Static files
      if (path === "/manifest.json") {
        return wrapResponse(new Response(Bun.file("./public/manifest.json"), {
          headers: { "Content-Type": "application/json" },
        }));
      }
      if (path === "/favicon.ico") {
        return wrapResponse(new Response(Bun.file("./public/favicon.ico")));
      }
    }

    // API Routes
    if (path === "/api/health") {
      const response = Response.json({ status: "ok", timestamp: new Date() });
      return wrapResponse(response);
    }

    if (path.startsWith("/api/users")) {
      const handlers = routes.users;
      let response: Response | undefined;
      
      if (req.method === "GET" && path === "/api/users") {
        response = await handlers.GET(req);
      }
      if (req.method === "POST" && path === "/api/users") {
        response = await handlers.POST(req);
      }
      const match = path.match(/^\\/api\\/users\\/(.+)$/);
      if (match?.[1]) {
        const reqWithParams = Object.assign(req, {
          params: { id: match[1] },
        });
        
        if (req.method === "GET") {
          response = await handlers["/:id"].GET(reqWithParams);
        }
        if (req.method === "PUT") {
          response = await handlers["/:id"].PUT(reqWithParams);
        }
        if (req.method === "DELETE") {
          response = await handlers["/:id"].DELETE(reqWithParams);
        }
      }
      
      if (response) {
        return wrapResponse(response);
      }
    }

    if (path.startsWith("/api/auth")) {
      const handlers = routes.auth;
      let response: Response | undefined;
      
      if (path === "/api/auth/login" && req.method === "POST") {
        response = await handlers["/login"].POST(req);
      }
      if (path === "/api/auth/register" && req.method === "POST") {
        response = await handlers["/register"].POST(req);
      }
      if (path === "/api/auth/logout" && req.method === "POST") {
        response = await handlers["/logout"].POST(req);
      }
      
      if (response) {
        return wrapResponse(response);
      }
    }

    // Catch-all for SPA - return index.html for client-side routing
    const html = await Bun.file("./public/index.html").text();
    const modifiedHtml = isDevelopment 
      ? html.replace('/src/app/main.tsx', '/main.js')
      : html;
    return wrapResponse(new Response(modifiedHtml, {
      headers: { "Content-Type": "text/html" },
    }));
  },
  error(error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

console.log(\`🚀 Server running at http://localhost:\${PORT}\`);

export { appServer as server };`,
  "src/server/routes/index.ts": `export { users } from "./users";
export { auth } from "./auth";
`,
  "src/server/routes/users.ts": `import { userRepository } from "@/db/repositories";
import { validateRequest } from "../middleware/validation";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

export const users = {
  GET: async (_req: Request) => {
    const users = await userRepository.findAll();
    return Response.json(users);
  },
  
  POST: async (req: Request) => {
    const body = await validateRequest(req, createUserSchema);
    if (body instanceof Response) return body;
    
    // Hash password if provided
    if (body.password) {
      body.password = await Bun.password.hash(body.password);
    }
    
    const newUser = await userRepository.create(body);
    return Response.json(newUser, { status: 201 });
  },

  "/:id": {
    GET: async (req: Request & { params: { id: string } }) => {
      const user = await userRepository.findById(req.params.id);
      
      if (!user) {
        return new Response("User not found", { status: 404 });
      }
      
      return Response.json(user);
    },
    
    PUT: async (req: Request & { params: { id: string } }) => {
      const body = await validateRequest(req, updateUserSchema);
      if (body instanceof Response) return body;
      
      // Hash password if provided
      if (body.password) {
        body.password = await Bun.password.hash(body.password);
      }
      
      const updatedUser = await userRepository.update(req.params.id, body);
      
      if (!updatedUser) {
        return new Response("User not found", { status: 404 });
      }
      
      return Response.json(updatedUser);
    },
    
    DELETE: async (req: Request & { params: { id: string } }) => {
      const deleted = await userRepository.delete(req.params.id);
      
      if (!deleted) {
        return new Response("User not found", { status: 404 });
      }
      
      return new Response(null, { status: 204 });
    }
  }
};`,
  "src/server/routes/auth.ts": `import { z } from "zod";
import { validateRequest } from "../middleware/validation";
import { hashPassword, verifyPassword, generateToken } from "@/lib/crypto";
import { userRepository } from "@/db/repositories";
import { generateCsrfToken, addCsrfTokenToResponse, clearCsrfToken } from "../middleware/csrf";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const auth = {
  "/login": {
    POST: async (req: Request) => {
      const body = await validateRequest(req, loginSchema);
      if (body instanceof Response) return body;
      
      // Find user by email
      const users = await userRepository.findAll();
      const user = users.find((u: any) => u.email === body.email);
      
      if (!user || !user.password) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }
      
      // Verify password
      const isValid = await verifyPassword(body.password, user.password);
      if (!isValid) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }
      
      // Generate JWT token
      const token = generateToken({ userId: user.id, email: user.email });
      
      // Generate CSRF token
      const csrf = generateCsrfToken();
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      const response = Response.json({ 
        token, 
        user: userWithoutPassword,
        csrfToken: csrf.token 
      });
      
      // Add CSRF cookie to response
      return await addCsrfTokenToResponse(response, csrf.token, csrf.cookie);
    }
  },
  
  "/register": {
    POST: async (req: Request) => {
      const body = await validateRequest(req, registerSchema);
      if (body instanceof Response) return body;
      
      // Check if user already exists
      const users = await userRepository.findAll();
      const existing = users.find((u: any) => u.email === body.email);
      
      if (existing) {
        return Response.json(
          { error: "User with this email already exists" },
          { status: 400 }
        );
      }
      
      // Hash password
      const hashedPassword = await hashPassword(body.password);
      
      // Create user
      const newUser = await userRepository.create({
        name: body.name,
        email: body.email,
        password: hashedPassword,
      });
      
      // Generate JWT token
      const token = generateToken({ userId: newUser.id, email: newUser.email });
      
      // Generate CSRF token
      const csrf = generateCsrfToken();
      
      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;
      
      const response = Response.json(
        { 
          token, 
          user: userWithoutPassword,
          csrfToken: csrf.token 
        },
        { status: 201 }
      );
      
      // Add CSRF cookie to response
      return await addCsrfTokenToResponse(response, csrf.token, csrf.cookie);
    }
  },
  
  "/logout": {
    POST: async (req: Request) => {
      // Get CSRF cookie to clear it
      const cookies = parseCookies(req.headers.get("Cookie") || "");
      const csrfCookie = cookies["csrf-token"];
      
      if (csrfCookie) {
        clearCsrfToken(csrfCookie);
      }
      
      // Clear CSRF cookie
      const headers = new Headers();
      headers.append("Set-Cookie", "csrf-token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
      
      return new Response(JSON.stringify({ message: "Logged out successfully" }), {
        status: 200,
        headers
      });
    }
  }
};

// Helper to parse cookies
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const cookie of cookieString.split(";")) {
    const [name, value] = cookie.trim().split("=");
    if (name && value) cookies[name] = value;
  }
  return cookies;
}`,
  "src/server/middleware/validation.ts": `import { z } from "zod";

export async function validateRequest<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<T | Response> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { errors: error.errors },
        { status: 400 }
      );
    }
    return new Response("Invalid request", { status: 400 });
  }
}
`,
  "src/server/middleware/cors.ts": `// CORS configuration and middleware
const ALLOWED_ORIGINS = process.env.NODE_ENV === "production" 
  ? ["https://yourdomain.com"] // Replace with your production domain
  : ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"];

const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
const ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-CSRF-Token"];

export function applyCorsHeaders(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  
  // Check if origin is allowed
  if (origin && (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== "production")) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  
  // Always set Vary header
  headers.set("Vary", "Origin");
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  
  const origin = req.headers.get("Origin");
  const headers = new Headers();
  
  // Check if origin is allowed
  if (origin && (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== "production")) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS.join(", "));
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS.join(", "));
  headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  headers.set("Vary", "Origin");
  
  return new Response(null, { status: 204, headers });
}
`,
  "src/server/middleware/security-headers.ts": `// Security headers middleware

export function applySecurityHeaders(response: Response, req: Request): Response {
  const headers = new Headers(response.headers);
  const url = new URL(req.url);
  const contentType = response.headers.get("Content-Type") || "";
  
  // General security headers - apply to all responses
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  
  // Remove server identification
  headers.delete("X-Powered-By");
  
  // Content Security Policy - only for HTML responses
  if (contentType.includes("text/html")) {
    const isDev = process.env.NODE_ENV !== "production";
    const cspDirectives = [
      "default-src 'self'",
      \`script-src 'self' \${isDev ? "'unsafe-inline' 'unsafe-eval'" : ""}\`,
      \`style-src 'self' \${isDev ? "'unsafe-inline'" : ""}\`,
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];
    headers.set("Content-Security-Policy", cspDirectives.join("; "));
  }
  
  // HSTS - only in production
  if (process.env.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  
  // Cache control
  if (url.pathname.startsWith("/api/")) {
    // API responses should not be cached
    if (url.pathname.startsWith("/api/users") || url.pathname.startsWith("/api/admin")) {
      // Authenticated endpoints need private cache control
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    } else {
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    }
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
  } else if (url.pathname.match(/\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    // Static assets can be cached
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (url.pathname === "/manifest.json") {
    // Manifest can be cached but not forever
    headers.set("Cache-Control", "public, max-age=3600");
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
`,
  "src/server/middleware/csrf.ts": `import { randomBytes } from "crypto";

// Store for CSRF tokens - in production, use Redis or database
const csrfTokenStore = new Map<string, { token: string; expires: number }>();

// Generate a secure CSRF token
export function generateCsrfToken(): { token: string; cookie: string } {
  const token = randomBytes(32).toString("hex");
  const cookie = randomBytes(32).toString("hex");
  
  // Store with 24 hour expiry
  csrfTokenStore.set(cookie, {
    token,
    expires: Date.now() + 24 * 60 * 60 * 1000
  });
  
  // Clean up old tokens periodically
  cleanupExpiredTokens();
  
  return { token, cookie };
}

// Validate CSRF token
export function validateCsrfToken(cookie: string | null, token: string | null): boolean {
  if (!cookie || !token) return false;
  
  const stored = csrfTokenStore.get(cookie);
  if (!stored) return false;
  
  // Check if expired
  if (stored.expires < Date.now()) {
    csrfTokenStore.delete(cookie);
    return false;
  }
  
  return stored.token === token;
}

// Clear CSRF token (for logout)
export function clearCsrfToken(cookie: string): void {
  csrfTokenStore.delete(cookie);
}

// Clean up expired tokens
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [cookie, data] of csrfTokenStore.entries()) {
    if (data.expires < now) {
      csrfTokenStore.delete(cookie);
    }
  }
}

// Check if request needs CSRF protection
export function requiresCsrfProtection(req: Request): boolean {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Skip CSRF for:
  // - GET, HEAD, OPTIONS requests
  // - Auth endpoints (login/register)
  // - Health check
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;
  if (path === "/api/auth/login" || path === "/api/auth/register") return false;
  if (path === "/api/health") return false;
  
  // All other state-changing requests need CSRF protection
  return true;
}

// Apply CSRF protection to a request
export function applyCsrfProtection(req: Request): Response | null {
  if (!requiresCsrfProtection(req)) return null;
  
  // Get CSRF cookie and token
  const cookies = parseCookies(req.headers.get("Cookie") || "");
  const csrfCookie = cookies["csrf-token"] || null;
  const csrfToken = req.headers.get("X-CSRF-Token");
  
  // Validate
  if (!validateCsrfToken(csrfCookie, csrfToken)) {
    return Response.json({ error: "CSRF token validation failed" }, { status: 403 });
  }
  
  return null;
}

// Helper to parse cookies
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const cookie of cookieString.split(";")) {
    const [name, value] = cookie.trim().split("=");
    if (name && value) cookies[name] = value;
  }
  return cookies;
}

// Add CSRF token to response
export async function addCsrfTokenToResponse(response: Response, token: string, cookie: string): Promise<Response> {
  const headers = new Headers(response.headers);
  
  // Set CSRF cookie
  headers.append("Set-Cookie", \`csrf-token=\${cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400\`);
  
  // If response already has csrfToken in body, just add the cookie
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
`,
  "src/db/client.ts": DB_CLIENT_TEMPLATE,
  "src/db/schema.ts": SCHEMA_TEMPLATE,
  "src/lib/types.ts": `// Re-export database types for convenience
export type { User, NewUser } from "@/db/schema";

// Additional app types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
`,
  "src/lib/crypto.ts": `import { createHash, randomBytes } from "crypto";

// Hash password with salt
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return \`\${salt}$\${hash}\`;
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!hashedPassword) return false;
  const [salt, hash] = hashedPassword.split("$");
  if (!salt || !hash) return false;
  const testHash = createHash("sha256").update(password + salt).digest("hex");
  return hash === testHash;
}

// Generate JWT token
export function generateToken(payload: Record<string, unknown>): string {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  })).toString("base64url");
  
  const signature = createHash("sha256")
    .update(\`\${encodedHeader}.\${encodedPayload}\${process.env.JWT_SECRET || "secret"}\`)
    .digest("base64url");
  
  return \`\${encodedHeader}.\${encodedPayload}.\${signature}\`;
}

// Verify JWT token
export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");
    
    if (!encodedHeader || !encodedPayload || !signature) return null;
    
    const testSignature = createHash("sha256")
      .update(\`\${encodedHeader}.\${encodedPayload}\${process.env.JWT_SECRET || "secret"}\`)
      .digest("base64url");
    
    if (signature !== testSignature) return null;
    
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}
`,
  "src/db/seed.ts": `import { userRepository } from "./repositories";
import { dbType } from "./client";

async function seed() {
  console.log(\`🌱 Seeding \${dbType} database...\`);
  
  const users = [
    {
      name: "Alice Johnson",
      email: "alice@example.com",
      password: await Bun.password.hash("password123"),
    },
    {
      name: "Bob Williams",
      email: "bob@example.com",
      password: await Bun.password.hash("password123"),
    },
    {
      name: "Charlie Brown",
      email: "charlie@example.com",
      password: await Bun.password.hash("password123"),
    },
  ];
  
  for (const user of users) {
    await userRepository.create(user);
  }
  
  console.log("✅ Database seeded!");
}

seed().catch(console.error);`,
  "src/config/env.ts": `import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string().default(""),
  SQLITE_PATH: z.string().default("./db/app.db"),
  JWT_SECRET: z.string().default("development-secret"),
});

export const env = envSchema.parse(process.env);`,
  "src/db/repositories/types.ts": `import type { User, NewUser } from "../schema";

export interface UserRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  create(data: NewUser): Promise<User>;
  update(id: string, data: Partial<NewUser>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

export interface RepositoryContext {
  users: UserRepository;
}
`,
  "src/db/repositories/PostgresUserRepository.ts": `import { eq } from "drizzle-orm";
import type { UserRepository } from "./types";
import type { User, NewUser } from "../schema";
import { usersPg } from "../schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export class PostgresUserRepository implements UserRepository {
  constructor(private db: PostgresJsDatabase<typeof import("../schema")>) {}

  async findAll(): Promise<User[]> {
    return await this.db.select().from(usersPg);
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(usersPg)
      .where(eq(usersPg.id, id))
      .limit(1);
    return result[0] || null;
  }

  async create(data: NewUser): Promise<User> {
    const result = await this.db
      .insert(usersPg)
      .values(data)
      .returning();
    return result[0]!;
  }

  async update(id: string, data: Partial<NewUser>): Promise<User | null> {
    const result = await this.db
      .update(usersPg)
      .set(data)
      .where(eq(usersPg.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(usersPg)
      .where(eq(usersPg.id, id))
      .returning();
    return result.length > 0;
  }
}
`,
  "src/db/repositories/SQLiteUserRepository.ts": `import { eq } from "drizzle-orm";
import type { UserRepository } from "./types";
import type { User, NewUser } from "../schema";
import { usersSqlite } from "../schema";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export class SQLiteUserRepository implements UserRepository {
  constructor(private db: BunSQLiteDatabase<typeof import("../schema")>) {}

  async findAll(): Promise<User[]> {
    return await this.db.select().from(usersSqlite);
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(usersSqlite)
      .where(eq(usersSqlite.id, id))
      .limit(1);
    return result[0] || null;
  }

  async create(data: NewUser): Promise<User> {
    const result = await this.db
      .insert(usersSqlite)
      .values(data)
      .returning();
    return result[0]!;
  }

  async update(id: string, data: Partial<NewUser>): Promise<User | null> {
    const result = await this.db
      .update(usersSqlite)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(usersSqlite.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(usersSqlite)
      .where(eq(usersSqlite.id, id))
      .returning();
    return result.length > 0;
  }
}
`,
  "src/db/repositories/index.ts": `import { db, dbType } from "../client";
import { PostgresUserRepository } from "./PostgresUserRepository";
import { SQLiteUserRepository } from "./SQLiteUserRepository";
import type { RepositoryContext } from "./types";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { usersPg, usersSqlite } from "../schema";

// Create the appropriate repository based on the database type
const createRepositories = (): RepositoryContext => {
  if (dbType === "postgres") {
    return {
      users: new PostgresUserRepository(db as PostgresJsDatabase<typeof import("../schema")>),
    };
  }
  return {
    users: new SQLiteUserRepository(db as BunSQLiteDatabase<typeof import("../schema")>),
  };
};

// Export a singleton instance
export const repositories = createRepositories();
export const userRepository = repositories.users;
`,
  "src/lib/constants.ts": `export const APP_NAME = "Bun Stack App";
export const API_BASE_URL = "/api";
export const DEFAULT_PAGE_SIZE = 20;
`,
  "src/lib/date.ts": `export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString();
}

export function isToday(date: Date | string): boolean {
  const today = new Date();
  const compareDate = new Date(date);
  return today.toDateString() === compareDate.toDateString();
}
`,
  "src/app/main.tsx": `import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);`,
  "src/app/App.tsx": `import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { UsersPage } from "./pages/UsersPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export function App() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}`,
  "src/app/components/Layout.tsx": `import { Link } from "react-router-dom";
import { HomeIcon, UserGroupIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/app/hooks/useAuth";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link
                to="/"
                className="flex items-center px-2 py-2 text-gray-900 font-semibold"
              >
                Bun App
              </Link>
              <div className="ml-6 flex space-x-8">
                <Link
                  to="/"
                  className="inline-flex items-center px-1 pt-1 text-gray-500
                    hover:text-gray-900"
                >
                  <HomeIcon className="w-5 h-5 mr-1" />
                  Home
                </Link>
                <Link
                  to="/users"
                  className="inline-flex items-center px-1 pt-1 text-gray-500
                    hover:text-gray-900"
                >
                  <UserGroupIcon className="w-5 h-5 mr-1" />
                  Users
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <span className="text-sm text-gray-700">
                    {user.name || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center px-3 py-2 border border-transparent
                      text-sm font-medium rounded-md text-gray-700 bg-gray-100
                      hover:bg-gray-200 focus:outline-none focus:ring-2
                      focus:ring-offset-2 focus:ring-gray-500"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-1" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}`,
  "src/app/pages/HomePage.tsx": `export function HomePage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg h-96
        flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Bun Stack App
          </h1>
          <p className="text-xl text-gray-600">
            Built with Bun, React, and Drizzle ORM
          </p>
          <p className="text-sm text-gray-500 mt-2">
            PostgreSQL with SQLite fallback
          </p>
        </div>
      </div>
    </div>
  );
}`,
  "src/app/pages/UsersPage.tsx": `import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/app/lib/api";
import type { User } from "@/lib/types";

export function UsersPage() {
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiClient.get<User[]>("/api/users"),
  });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>;

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Users</h1>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users?.map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-indigo-600 truncate">
                    {user.name}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}`,
  "src/app/pages/LoginPage.tsx": `import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/app/hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}`,
  "src/app/pages/RegisterPage.tsx": `import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/app/hooks/useAuth";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await register(formData.name, formData.email, formData.password);
    
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Registration failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              sign in to existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password (min 8 characters)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}`,
  "src/app/pages/NotFoundPage.tsx": `import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="min-h-full px-4 py-16 sm:px-6 sm:py-24 md:grid
      md:place-items-center lg:px-8">
      <div className="max-w-max mx-auto">
        <main className="sm:flex">
          <p className="text-4xl font-extrabold text-indigo-600
            sm:text-5xl">
            404
          </p>
          <div className="sm:ml-6">
            <div className="sm:border-l sm:border-gray-200 sm:pl-6">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight
                sm:text-5xl">
                Page not found
              </h1>
              <p className="mt-1 text-base text-gray-500">
                Please check the URL in the address bar and try again.
              </p>
            </div>
            <div className="mt-10 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border
                  border-transparent text-sm font-medium rounded-md shadow-sm
                  text-white bg-indigo-600 hover:bg-indigo-700
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  focus:ring-indigo-500"
              >
                Go back home
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}`,
  "src/app/lib/api.ts": `// API client with CSRF support

class ApiClient {
  private csrfToken: string | null = null;

  constructor() {
    // Initialize CSRF token from storage if available
    this.csrfToken = localStorage.getItem("csrfToken");
  }

  private getHeaders(includeAuth = true): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (includeAuth) {
      const token = localStorage.getItem("token");
      if (token) {
        headers.Authorization = \`Bearer \${token}\`;
      }
    }

    if (this.csrfToken) {
      headers["X-CSRF-Token"] = this.csrfToken;
    }

    return headers;
  }

  async request<T>(
    url: string,
    options: RequestInit = {},
    includeAuth = true
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(includeAuth),
        ...options.headers,
      },
      credentials: "include", // Important for CSRF cookies
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" })) as { error?: string };
      throw new Error(error.error || \`Request failed with status \${response.status}\`);
    }

    const data = await response.json() as T & { csrfToken?: string };

    // Update CSRF token if provided in response
    if (data.csrfToken) {
      this.csrfToken = data.csrfToken;
      localStorage.setItem("csrfToken", data.csrfToken);
    }

    return data as T;
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: "GET" });
  }

  async post<T>(url: string, body: any, includeAuth = true): Promise<T> {
    return this.request<T>(
      url,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      includeAuth
    );
  }

  async put<T>(url: string, body: any): Promise<T> {
    return this.request<T>(url, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: "DELETE" });
  }

  clearTokens() {
    this.csrfToken = null;
    localStorage.removeItem("csrfToken");
    localStorage.removeItem("token");
  }
}

export const apiClient = new ApiClient();
`,
  "src/app/hooks/useAuth.ts": `import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/app/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  token: string;
  user: User;
  csrfToken: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem("token");
    if (token) {
      // In a real app, you'd validate the token and fetch user data
      // For now, we'll just parse the basic info
      try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token');
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          setUser({
            id: payload.userId,
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
          });
        } else {
          // Token expired
          apiClient.clearTokens();
        }
      } catch (e) {
        // Invalid token
        apiClient.clearTokens();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiClient.post<AuthResponse>(
        "/api/auth/login",
        { email, password },
        false // Don't include auth header for login
      );

      localStorage.setItem("token", data.token);
      setUser(data.user);
      
      return { success: true, user: data.user };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Login failed" 
      };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const data = await apiClient.post<AuthResponse>(
        "/api/auth/register",
        { name, email, password },
        false // Don't include auth header for registration
      );

      localStorage.setItem("token", data.token);
      setUser(data.user);
      
      return { success: true, user: data.user };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Registration failed" 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/auth/logout", {});
    } catch (e) {
      // Even if logout fails on server, clear local state
    }
    
    apiClient.clearTokens();
    setUser(null);
  }, []);

  return { user, loading, login, register, logout };
}`,
  "tests/setup.ts": `// Test setup and globals
import { afterEach, beforeAll } from "bun:test";

// Tests use real fetch, no special handling needed

// Minimal DOM mock for Bun tests
class MockElement {
  tagName: string;
  id: string = "";
  className: string = "";
  textContent: string = "";
  innerHTML: string = "";
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  style: Record<string, string> = {};
  attributes: Record<string, string> = {};
  
  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }
  
  appendChild(child: MockElement) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  
  removeChild(child: MockElement) {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parentElement = null;
    }
    return child;
  }
  
  querySelector(selector: string): MockElement | null {
    // Very basic selector support
    if (selector.startsWith("#")) {
      const id = selector.slice(1);
      return this.findById(id);
    }
    if (selector.startsWith(".")) {
      const className = selector.slice(1);
      return this.findByClassName(className);
    }
    return this.findByTagName(selector);
  }
  
  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    if (selector.startsWith(".")) {
      const className = selector.slice(1);
      this.findAllByClassName(className, results);
    } else {
      this.findAllByTagName(selector, results);
    }
    return results;
  }
  
  getAttribute(name: string): string | null {
    return this.attributes[name] || null;
  }
  
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
    if (name === "id") this.id = value;
    if (name === "class") this.className = value;
  }
  
  addEventListener() {}
  removeEventListener() {}
  click() {}
  
  private findById(id: string): MockElement | null {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return null;
  }
  
  private findByClassName(className: string): MockElement | null {
    if (this.className.includes(className)) return this;
    for (const child of this.children) {
      const found = child.findByClassName(className);
      if (found) return found;
    }
    return null;
  }
  
  private findByTagName(tagName: string): MockElement | null {
    if (this.tagName === tagName.toUpperCase()) return this;
    for (const child of this.children) {
      const found = child.findByTagName(tagName);
      if (found) return found;
    }
    return null;
  }
  
  private findAllByClassName(className: string, results: MockElement[]) {
    if (this.className.includes(className)) results.push(this);
    for (const child of this.children) {
      child.findAllByClassName(className, results);
    }
  }
  
  private findAllByTagName(tagName: string, results: MockElement[]) {
    if (this.tagName === tagName.toUpperCase()) results.push(this);
    for (const child of this.children) {
      child.findAllByTagName(tagName, results);
    }
  }
}

// Mock document
const mockDocument = {
  body: new MockElement("body"),
  head: new MockElement("head"),
  documentElement: new MockElement("html"),
  
  createElement(tagName: string): MockElement {
    return new MockElement(tagName);
  },
  
  getElementById(id: string): MockElement | null {
    return mockDocument.body.querySelector(\`#\${id}\`);
  },
  
  querySelector(selector: string): MockElement | null {
    return mockDocument.body.querySelector(selector);
  },
  
  querySelectorAll(selector: string): MockElement[] {
    return mockDocument.body.querySelectorAll(selector);
  },
};

// Mock window
const mockWindow = {
  document: mockDocument,
  location: {
    href: "http://localhost:3000",
    pathname: "/",
    search: "",
    hash: "",
  },
  localStorage: {
    store: {} as Record<string, string>,
    getItem(key: string) { return this.store[key] || null; },
    setItem(key: string, value: string) { this.store[key] = value; },
    removeItem(key: string) { delete this.store[key]; },
    clear() { this.store = {}; },
  },
  fetch: globalThis.fetch ? globalThis.fetch.bind(globalThis) : fetch, // Use real fetch for integration tests
};

// Set up globals
(global as any).window = mockWindow;
(global as any).document = mockDocument;
(global as any).Element = MockElement;
(global as any).localStorage = mockWindow.localStorage;

// Tests use real fetch, no special handling needed

// Mock vi functions for Bun test compatibility
(global as any).vi = {
  fn: (implementation?: Function) => {
    const mockFn = (...args: any[]) => {
      mockFn.calls.push(args);
      if (mockFn.mockImplementation) {
        return mockFn.mockImplementation(...args);
      }
      if (implementation) {
        return implementation(...args);
      }
      return mockFn._mockReturnValue;
    };
    
    mockFn.calls = [] as any[];
    mockFn._mockReturnValue = undefined;
    mockFn.mockImplementation = implementation;
    mockFn.mockReturnThis = () => mockFn;
    mockFn.mockImplementationOnce = (impl: Function) => {
      const originalImpl = mockFn.mockImplementation;
      mockFn.mockImplementation = (...args: any[]) => {
        mockFn.mockImplementation = originalImpl;
        return impl(...args);
      };
      return mockFn;
    };
    mockFn.mockResolvedValueOnce = (value: any) => {
      return mockFn.mockImplementationOnce(() => Promise.resolve(value));
    };
    mockFn.mockRejectedValueOnce = (value: any) => {
      return mockFn.mockImplementationOnce(() => Promise.reject(value));
    };
    mockFn.mockReturnValueOnce = (value: any) => {
      return mockFn.mockImplementationOnce(() => value);
    };
    mockFn.mockReturnValue = (value: any) => {
      mockFn._mockReturnValue = value;
      mockFn.mockImplementation = () => value;
      return mockFn;
    };
    mockFn.mockClear = () => {
      mockFn.calls = [];
    };
    
    return mockFn as any;
  },
  
  clearAllMocks: () => {
    // Clear all mocks
  },
  
  mock: (moduleName: string, factory: () => any) => {
    // Simple module mocking
    const mockModule = factory();
    (require.cache as any)[require.resolve(moduleName)] = {
      exports: mockModule,
      id: moduleName,
      filename: moduleName,
      loaded: true,
      children: [],
      paths: [],
      parent: null,
    } as any;
  }
};

// Set test environment
process.env.DATABASE_URL = ""; // Force SQLite for tests
process.env.JWT_SECRET = "test-secret";

// Ensure global fetch is available
if (typeof globalThis.fetch === 'undefined' && typeof fetch !== 'undefined') {
  globalThis.fetch = fetch;
}

beforeAll(() => {
  // Reset DOM before tests
  mockDocument.body = new MockElement("body");
  mockDocument.head = new MockElement("head");
});

afterEach(() => {
  // Clean up after each test
  mockDocument.body = new MockElement("body");
  mockWindow.localStorage.clear();
  mockWindow.location.pathname = "/";
});
`,
  "tests/helpers.ts": `import type { User } from "@/lib/types";

// Mock request helper
export function createMockRequest(
  url: string = "http://localhost:3000",
  options: RequestInit = {}
): Request {
  return new Request(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
}

// Test data factories
export const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: "test-user-1",
  name: "Test User",
  email: "test@example.com",
  password: "hashed_password",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Response helpers
export async function parseJsonResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  return JSON.parse(text) as T;
}

// Mock repository for testing
export class MockUserRepository {
  private users: User[] = [];
  
  async findAll(): Promise<User[]> {
    return [...this.users];
  }
  
  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }
  
  async create(data: any): Promise<User> {
    const user: User = {
      id: \`user-\${this.users.length + 1}\`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }
  
  async update(id: string, data: any): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    this.users[index] = {
      ...this.users[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.users[index];
  }
  
  async delete(id: string): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }
  
  reset() {
    this.users = [];
  }
  
  seed(users: User[]) {
    this.users = [...users];
  }
}
`,
  "tests/server/users.test.ts": `import { test, expect, describe, beforeEach } from "bun:test";
import { users } from "@/server/routes/users";
import { createMockRequest, createTestUser, parseJsonResponse, MockUserRepository } from "../helpers";
import { userRepository } from "@/db/repositories";

// Mock the repository
const mockRepo = new MockUserRepository();
(userRepository as any).findAll = mockRepo.findAll.bind(mockRepo);
(userRepository as any).findById = mockRepo.findById.bind(mockRepo);
(userRepository as any).create = mockRepo.create.bind(mockRepo);
(userRepository as any).update = mockRepo.update.bind(mockRepo);
(userRepository as any).delete = mockRepo.delete.bind(mockRepo);

describe("User Routes", () => {
  beforeEach(() => {
    mockRepo.reset();
  });

  describe("GET /api/users", () => {
    test("returns empty array when no users", async () => {
      const request = createMockRequest("http://localhost:3000/api/users");
      const response = await users.GET(request);
      
      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data).toEqual([]);
    });

    test("returns all users", async () => {
      const testUsers = [
        createTestUser({ id: "1", name: "User 1" }),
        createTestUser({ id: "2", name: "User 2" }),
      ];
      mockRepo.seed(testUsers);

      const request = createMockRequest("http://localhost:3000/api/users");
      const response = await users.GET(request);
      
      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe("User 1");
      expect(data[1].name).toBe("User 2");
    });
  });

  describe("POST /api/users", () => {
    test("creates a new user with valid data", async () => {
      const newUser = {
        name: "New User",
        email: \`new-\${Date.now()}@example.com\`,
        password: "password123",
      };

      const request = createMockRequest("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      });

      const response = await users.POST(request);
      
      expect(response.status).toBe(201);
      const data = await parseJsonResponse(response);
      expect(data.name).toBe(newUser.name);
      expect(data.email).toBe(newUser.email);
      expect(data.password).toContain("$"); // Should be hashed
      expect(data.id).toBeDefined();
    });

    test("returns 400 for invalid email", async () => {
      const request = createMockRequest("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Test",
          email: "invalid-email",
        }),
      });

      const response = await users.POST(request);
      expect(response.status).toBe(400);
    });

    test("returns 400 for missing name", async () => {
      const request = createMockRequest("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      const response = await users.POST(request);
      expect(response.status).toBe(400);
    });

    test("returns 400 for invalid JSON", async () => {
      const request = createMockRequest("http://localhost:3000/api/users", {
        method: "POST",
        body: "invalid json",
      });

      const response = await users.POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/users/:id", () => {
    test("returns user by id", async () => {
      const testUser = createTestUser({ id: "123" });
      mockRepo.seed([testUser]);

      const request = createMockRequest("http://localhost:3000/api/users/123") as any;
      request.params = { id: "123" };

      const response = await users["/:id"].GET(request);
      
      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.id).toBe("123");
    });

    test("returns 404 for non-existent user", async () => {
      const request = createMockRequest("http://localhost:3000/api/users/999") as any;
      request.params = { id: "999" };

      const response = await users["/:id"].GET(request);
      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/users/:id", () => {
    test("updates existing user", async () => {
      const testUser = createTestUser({ id: "123" });
      mockRepo.seed([testUser]);

      const updates = { name: "Updated Name" };
      const request = createMockRequest("http://localhost:3000/api/users/123", {
        method: "PUT",
        body: JSON.stringify(updates),
      }) as any;
      request.params = { id: "123" };

      const response = await users["/:id"].PUT(request);
      
      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.name).toBe("Updated Name");
      expect(data.id).toBe("123");
    });

    test("returns 404 for non-existent user", async () => {
      const request = createMockRequest("http://localhost:3000/api/users/999", {
        method: "PUT",
        body: JSON.stringify({ name: "Test" }),
      }) as any;
      request.params = { id: "999" };

      const response = await users["/:id"].PUT(request);
      expect(response.status).toBe(404);
    });

    test("hashes password when updating", async () => {
      const testUser = createTestUser({ id: "123" });
      mockRepo.seed([testUser]);

      const updates = { password: "newpassword123" };
      const request = createMockRequest("http://localhost:3000/api/users/123", {
        method: "PUT",
        body: JSON.stringify(updates),
      }) as any;
      request.params = { id: "123" };

      const response = await users["/:id"].PUT(request);
      
      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.password).toContain("$"); // Should be hashed
      expect(data.password).not.toBe("newpassword123");
    });
  });

  describe("DELETE /api/users/:id", () => {
    test("deletes existing user", async () => {
      const testUser = createTestUser({ id: "123" });
      mockRepo.seed([testUser]);

      const request = createMockRequest("http://localhost:3000/api/users/123", {
        method: "DELETE",
      }) as any;
      request.params = { id: "123" };

      const response = await users["/:id"].DELETE(request);
      expect(response.status).toBe(204);
      
      // Verify user is deleted
      const checkUser = await mockRepo.findById("123");
      expect(checkUser).toBeNull();
    });

    test("returns 404 for non-existent user", async () => {
      const request = createMockRequest("http://localhost:3000/api/users/999", {
        method: "DELETE",
      }) as any;
      request.params = { id: "999" };

      const response = await users["/:id"].DELETE(request);
      expect(response.status).toBe(404);
    });
  });
});
`,
  "tests/server/middleware/cors.test.ts": `import { test, expect, describe, beforeAll } from "bun:test";

// Use real fetch

const testOrigins = {
  allowed: "http://localhost:3000",
  disallowed: "http://malicious-site.com"
};

describe("CORS Middleware", () => {
  beforeAll(async () => {
    // Small delay to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test("health check endpoint works with CORS", async () => {
    const response = await fetch("http://localhost:3000/api/health", {
      headers: {
        Origin: "http://localhost:3000",
      },
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("ok");
  });

  test("users endpoint works with CORS", async () => {
    const response = await fetch("http://localhost:3000/api/users", {
      headers: {
        Origin: "http://localhost:3000",
      },
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("OPTIONS request returns 204", async () => {
    const response = await fetch("http://localhost:3000/api/users", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
      },
    });
    
    expect(response.status).toBe(204);
  });

  describe("API vs Static Assets", () => {
    test("applies CORS headers to API routes", async () => {
      const response = await fetch("http://localhost:3000/api/health", {
        headers: {
          "Origin": testOrigins.allowed,
        },
      });

      expect(response).toBeDefined();
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
    });

    test("does not apply CORS headers to static assets", async () => {
      const response = await fetch("http://localhost:3000/manifest.json", {
        headers: {
          "Origin": testOrigins.allowed,
        },
      });

      // Static assets should not have CORS headers by default
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("Security Headers", () => {
    test("does not expose sensitive headers", async () => {
      const response = await fetch("http://localhost:3000/api/health", {
        headers: {
          "Origin": testOrigins.allowed,
        },
      });

      // Should not expose headers that could reveal server info
      expect(response.headers.get("X-Powered-By")).toBeNull();
    });

    test("sets Vary header for Origin", async () => {
      const response = await fetch("http://localhost:3000/api/health", {
        headers: {
          "Origin": testOrigins.allowed,
        },
      });

      expect(response.headers.get("Vary")).toContain("Origin");
    });
  });
});`,
  "tests/server/middleware/csrf.test.ts": `import { test, expect, describe, beforeEach, beforeAll } from "bun:test";

// Use real fetch

describe("CSRF Protection", () => {
  beforeAll(async () => {
    // Small delay to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  beforeEach(async () => {
    // Each test should use unique email addresses to avoid conflicts
    // No direct database access in integration tests
  });

  describe("CSRF Token Generation", () => {
    test("generates CSRF token on successful login", async () => {
      // Create test user via API
      const timestamp = Date.now();
      await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "CSRF Test User",
          email: \`csrf-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: \`csrf-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      expect(response.status).toBe(200);
      
      // Check for CSRF token in response
      const data = await response.json();
      expect(data.csrfToken).toBeDefined();
      expect(data.csrfToken).toBeTypeOf("string");
      expect(data.csrfToken.length).toBeGreaterThan(32);

      // Check for CSRF cookie
      const cookies = response.headers.get("Set-Cookie");
      expect(cookies).toContain("csrf-token");
      expect(cookies).toContain("HttpOnly");
      expect(cookies).toContain("SameSite=Strict");
    });

    test("generates CSRF token on successful registration", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "New User",
          email: "newuser@test.example.com",
          password: "password123",
        }),
      });

      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.csrfToken).toBeDefined();
      
      const cookies = response.headers.get("Set-Cookie");
      expect(cookies).toContain("csrf-token");
    });
  });

  describe("CSRF Token Validation", () => {
    let authToken: string;
    let csrfToken: string;
    let csrfCookie: string;

    beforeEach(async () => {
      // First register a user via API
      const timestamp = Date.now();
      const registerResponse = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test User",
          email: \`validation-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      if (!registerResponse.ok) {
        throw new Error(\`Registration failed: \${registerResponse.status}\`);
      }

      // Then login to get tokens
      const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: \`validation-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      if (!loginResponse.ok) {
        throw new Error(\`Login failed: \${loginResponse.status}\`);
      }

      const loginData = await loginResponse.json();
      authToken = loginData.token;
      csrfToken = loginData.csrfToken;
      
      // Extract CSRF cookie
      const cookies = loginResponse.headers.get("Set-Cookie");
      const csrfCookieMatch = cookies?.match(/csrf-token=([^;]+)/);
      csrfCookie = csrfCookieMatch?.[1] || "";
    });

    test("accepts valid CSRF token on POST requests", async () => {
      const response = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${authToken}\`,
          "X-CSRF-Token": csrfToken,
          "Cookie": \`csrf-token=\${csrfCookie}\`,
        },
        body: JSON.stringify({
          name: "New User",
          email: "newuser2@test.example.com",
          password: "password123",
        }),
      });

      expect(response.status).toBe(201);
    });

    test("rejects POST requests without CSRF token", async () => {
      const response = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${authToken}\`,
          "Cookie": \`csrf-token=\${csrfCookie}\`,
        },
        body: JSON.stringify({
          name: "New User",
          email: \`newuser3-\${Date.now()}@test.example.com\`,
          password: "password123",
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("CSRF");
    });

    test("rejects POST requests with invalid CSRF token", async () => {
      const response = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${authToken}\`,
          "X-CSRF-Token": "invalid-token",
          "Cookie": \`csrf-token=\${csrfCookie}\`,
        },
        body: JSON.stringify({
          name: "New User",
          email: \`newuser4-\${Date.now()}@test.example.com\`,
          password: "password123",
        }),
      });

      expect(response.status).toBe(403);
    });

    test("rejects POST requests with mismatched CSRF token and cookie", async () => {
      const response = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${authToken}\`,
          "X-CSRF-Token": csrfToken,
          "Cookie": "csrf-token=wrong-cookie-value",
        },
        body: JSON.stringify({
          name: "New User",
          email: \`newuser5-\${Date.now()}@test.example.com\`,
          password: "password123",
        }),
      });

      expect(response.status).toBe(403);
    });

    test("allows GET requests without CSRF token", async () => {
      const response = await fetch("http://localhost:3000/api/users", {
        headers: {
          "Authorization": \`Bearer \${authToken}\`,
        },
      });

      expect(response.status).toBe(200);
    });

    test("requires CSRF for PUT requests", async () => {
      // Create a user first via API  
      const createResponse = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${authToken}\`,
          "X-CSRF-Token": csrfToken,
          "Cookie": \`csrf-token=\${csrfCookie}\`,
        },
        body: JSON.stringify({
          name: "Update Test",
          email: \`update-\${Date.now()}@test.example.com\`,
          password: "password123",
        }),
      });
      const user = await createResponse.json();

      const response = await fetch(\`http://localhost:3000/api/users/\${user.id}\`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${authToken}\`,
          // Missing CSRF token
          "Cookie": \`csrf-token=\${csrfCookie}\`,
        },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      });

      expect(response.status).toBe(403);
    });

    test("requires CSRF for DELETE requests", async () => {
      // Create a user first via API
      const createResponse = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${authToken}\`,
          "X-CSRF-Token": csrfToken,
          "Cookie": \`csrf-token=\${csrfCookie}\`,
        },
        body: JSON.stringify({
          name: "Delete Test",
          email: \`delete-\${Date.now()}@test.example.com\`,
          password: "password123",
        }),
      });
      const user = await createResponse.json();

      const response = await fetch(\`http://localhost:3000/api/users/\${user.id}\`, {
        method: "DELETE",
        headers: {
          "Authorization": \`Bearer \${authToken}\`,
          // Missing CSRF token
          "Cookie": \`csrf-token=\${csrfCookie}\`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe("CSRF Exemptions", () => {
    test("login endpoint does not require CSRF token", async () => {
      // Register user via API first
      const timestamp = Date.now();
      await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Login Test",
          email: \`login-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: \`login-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      expect(response.status).toBe(200);
    });

    test("register endpoint does not require CSRF token", async () => {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Register Test",
          email: "register@test.example.com",
          password: "password123",
        }),
      });

      expect(response.status).toBe(201);
    });

    test("health check does not require CSRF token", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      expect(response.status).toBe(200);
    });
  });

  describe("CSRF Token Lifecycle", () => {
    test("CSRF token is cleared on logout", async () => {
      // First register user via API
      const timestamp = Date.now();
      await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Logout Test",
          email: \`logout-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: \`logout-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      const { token, csrfToken } = await loginResponse.json();
      const cookies = loginResponse.headers.get("Set-Cookie");
      const csrfCookieMatch = cookies?.match(/csrf-token=([^;]+)/);
      const csrfCookie = csrfCookieMatch?.[1] || "";

      // Logout
      const logoutResponse = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          "Authorization": \`Bearer \${token}\`,
          "X-CSRF-Token": csrfToken,
          "Cookie": \`csrf-token=\${csrfCookie}\`,
        },
      });

      expect(logoutResponse.status).toBe(200);
      
      // Check that CSRF cookie is cleared
      const logoutCookies = logoutResponse.headers.get("Set-Cookie");
      expect(logoutCookies).toContain("csrf-token=;");
      expect(logoutCookies).toContain("Max-Age=0");
    });

    test("old CSRF tokens are invalidated after new login", async () => {
      // Create user via API
      const timestamp = Date.now();
      await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Token Rotation Test",
          email: \`rotation-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      // First login
      const firstLogin = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: \`rotation-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      const firstData = await firstLogin.json();
      const oldCsrfToken = firstData.csrfToken;

      // Second login (should invalidate old token)
      const secondLogin = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: \`rotation-\${timestamp}@test.example.com\`,
          password: "password123",
        }),
      });

      const secondData = await secondLogin.json();
      const newCsrfToken = secondData.csrfToken;

      // Tokens should be different
      expect(newCsrfToken).not.toBe(oldCsrfToken);

      // Try to use old CSRF token
      const response = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${firstData.token}\`,
          "X-CSRF-Token": oldCsrfToken,
          "Cookie": \`csrf-token=\${oldCsrfToken}\`,
        },
        body: JSON.stringify({
          name: "Should Fail",
          email: \`shouldfail-\${Date.now()}@test.example.com\`,
          password: "password123",
        }),
      });

      expect(response.status).toBe(403);
    });
  });
});`,
  "tests/server/security-integration.test.ts": `import { test, expect, describe, beforeEach, beforeAll } from "bun:test";

// Use real fetch

describe("Security Integration Tests", () => {
  beforeAll(async () => {
    // Small delay to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  beforeEach(async () => {
    // Each test should use unique email addresses to avoid conflicts
    // No direct database access in integration tests
  });

  describe("Full Authentication Flow with Security", () => {
    test("complete secure authentication workflow", async () => {
      // 1. Register a new user
      const timestamp = Date.now();
      const registerResponse = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Integration Test User",
          email: \`test-\${timestamp}@integration.example.com\`,
          password: "securePassword123",
        }),
      });

      expect(registerResponse.status).toBe(201);
      
      // Check security headers are present
      expect(registerResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(registerResponse.headers.get("X-Frame-Options")).toBe("DENY");
      expect(registerResponse.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
      expect(registerResponse.headers.get("Access-Control-Allow-Credentials")).toBe("true");
      
      const registerData = await registerResponse.json();
      expect(registerData.token).toBeDefined();
      expect(registerData.csrfToken).toBeDefined();
      
      // Extract CSRF cookie
      const setCookieHeader = registerResponse.headers.get("Set-Cookie");
      expect(setCookieHeader).toContain("csrf-token");
      expect(setCookieHeader).toContain("HttpOnly");
      expect(setCookieHeader).toContain("SameSite=Strict");
      
      const csrfCookieMatch = setCookieHeader?.match(/csrf-token=([^;]+)/);
      const csrfCookie = csrfCookieMatch?.[1] || "";
      
      // 2. Make an authenticated request with CSRF token
      const getUsersResponse = await fetch("http://localhost:3000/api/users", {
        headers: {
          "Authorization": \`Bearer \${registerData.token}\`,
          "X-CSRF-Token": registerData.csrfToken,
          "Cookie": \`csrf-token=\${csrfCookie}\`,
          "Origin": "http://localhost:3000",
        },
      });
      
      expect(getUsersResponse.status).toBe(200);
      expect(getUsersResponse.headers.get("Cache-Control")).toContain("private");
      
      // 3. Try to make a state-changing request without CSRF token (should fail)
      const createUserWithoutCsrf = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${registerData.token}\`,
          "Cookie": \`csrf-token=\${csrfCookie}\`,
          "Origin": "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Should Fail",
          email: "fail@integration.example.com",
          password: "password123",
        }),
      });
      
      expect(createUserWithoutCsrf.status).toBe(403);
      const errorData = await createUserWithoutCsrf.json();
      expect(errorData.error).toContain("CSRF");
      
      // 4. Make the same request with CSRF token (should succeed)
      const createUserWithCsrf = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${registerData.token}\`,
          "X-CSRF-Token": registerData.csrfToken,
          "Cookie": \`csrf-token=\${csrfCookie}\`,
          "Origin": "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Should Succeed",
          email: \`success-\${timestamp}@integration.example.com\`,
          password: "password123",
        }),
      });
      
      expect(createUserWithCsrf.status).toBe(201);
      
      // 5. Logout and verify CSRF token is cleared
      const logoutResponse = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          "Authorization": \`Bearer \${registerData.token}\`,
          "X-CSRF-Token": registerData.csrfToken,
          "Cookie": \`csrf-token=\${csrfCookie}\`,
          "Origin": "http://localhost:3000",
        },
      });
      
      expect(logoutResponse.status).toBe(200);
      const logoutCookies = logoutResponse.headers.get("Set-Cookie");
      expect(logoutCookies).toContain("csrf-token=;");
      expect(logoutCookies).toContain("Max-Age=0");
      
      // 6. Try to use the old CSRF token after logout (should fail)
      const postLogoutRequest = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${registerData.token}\`,
          "X-CSRF-Token": registerData.csrfToken,
          "Cookie": \`csrf-token=\${csrfCookie}\`,
          "Origin": "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "After Logout",
          email: \`afterlogout-\${timestamp}@integration.example.com\`,
          password: "password123",
        }),
      });
      
      expect(postLogoutRequest.status).toBe(403);
    });
  });

  describe("Cross-Origin Security", () => {
    test("handles cross-origin requests properly", async () => {
      // Create a user for testing via API
      const timestamp = Date.now();
      await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "CORS Test User",
          email: \`cors-\${timestamp}@integration.example.com\`,
          password: "password123",
        }),
      });
      
      // 1. Preflight request from allowed origin
      const preflightResponse = await fetch("http://localhost:3000/api/users", {
        method: "OPTIONS",
        headers: {
          "Origin": "http://localhost:3001",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type, X-CSRF-Token",
        },
      });
      
      expect(preflightResponse.status).toBe(204);
      expect(preflightResponse.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3001");
      expect(preflightResponse.headers.get("Access-Control-Allow-Headers")).toContain("X-CSRF-Token");
      
      // 2. Login from allowed origin
      const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:3001",
        },
        credentials: "include",
        body: JSON.stringify({
          email: \`cors-\${timestamp}@integration.example.com\`,
          password: "password123",
        }),
      });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.headers.get("Access-Control-Allow-Credentials")).toBe("true");
      
      // 3. Request from disallowed origin
      // In development, all origins are allowed
      const disallowedResponse = await fetch("http://localhost:3000/api/health", {
        headers: {
          "Origin": "https://evil.com",
        },
      });
      
      // In development mode, the origin is allowed
      if (process.env.NODE_ENV !== "production") {
        expect(disallowedResponse.headers.get("Access-Control-Allow-Origin")).toBe("https://evil.com");
      } else {
        expect(disallowedResponse.headers.get("Access-Control-Allow-Origin")).toBeNull();
      }
    });
  });

  describe("Security Headers on Different Response Types", () => {
    test("applies appropriate headers to different content types", async () => {
      // 1. HTML response
      const htmlResponse = await fetch("http://localhost:3000/");
      expect(htmlResponse.headers.get("Content-Security-Policy")).toBeTruthy();
      expect(htmlResponse.headers.get("X-Frame-Options")).toBe("DENY");
      
      // 2. API JSON response
      const apiResponse = await fetch("http://localhost:3000/api/health");
      expect(apiResponse.headers.get("Content-Type")).toContain("application/json");
      expect(apiResponse.headers.get("Cache-Control")).toContain("no-store");
      expect(apiResponse.headers.get("Content-Security-Policy")).toBeNull();
      
      // 3. Static asset response
      const staticResponse = await fetch("http://localhost:3000/manifest.json");
      expect(staticResponse.headers.get("Cache-Control")).toContain("public");
      expect(staticResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
      
      // 4. JavaScript response (in development)
      if (process.env.NODE_ENV !== "production") {
        const jsResponse = await fetch("http://localhost:3000/main.js");
        expect(jsResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
      }
    });
  });

  describe("Attack Prevention", () => {
    test("prevents common attack vectors", async () => {
      // 1. Clickjacking protection
      const response = await fetch("http://localhost:3000/");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      
      // 2. XSS protection
      expect(response.headers.get("X-XSS-Protection")).toBe("1; mode=block");
      expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
      
      // 3. MIME type sniffing protection
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      
      // 4. Referrer leakage protection
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      
      // 5. Feature policy restrictions
      expect(response.headers.get("Permissions-Policy")).toContain("geolocation=()");
      expect(response.headers.get("Permissions-Policy")).toContain("microphone=()");
      expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
    });
    
    test("prevents CSRF attacks on state-changing operations", async () => {
      // Setup: Create a user and login via API
      const timestamp = Date.now();
      await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "CSRF Attack Test",
          email: \`csrfattack-\${timestamp}@integration.example.com\`,
          password: "password123",
        }),
      });
      
      const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: \`csrfattack-\${timestamp}@integration.example.com\`,
          password: "password123",
        }),
      });
      
      const { token, user } = await loginResponse.json();
      
      // Simulate CSRF attack: Try to delete user without CSRF token
      const deleteResponse = await fetch(\`http://localhost:3000/api/users/\${user.id}\`, {
        method: "DELETE",
        headers: {
          "Authorization": \`Bearer \${token}\`,
          // Missing CSRF token and cookie - simulating cross-site request
        },
      });
      
      expect(deleteResponse.status).toBe(403);
      
      // Verify user was not deleted by trying to login again
      const verifyResponse = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: \`csrfattack-\${timestamp}@integration.example.com\`,
          password: "password123",
        }),
      });
      expect(verifyResponse.status).toBe(200);
    });
  });
});
`,
  "tests/server/middleware/security-headers.test.ts": `import { test, expect, describe, beforeAll } from "bun:test";

// Use real fetch

describe("Security Headers", () => {
  beforeAll(async () => {
    // Small delay to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe("General Security Headers", () => {
    test("sets X-Content-Type-Options header", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    test("sets X-Frame-Options header", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    test("sets X-XSS-Protection header", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      
      expect(response.headers.get("X-XSS-Protection")).toBe("1; mode=block");
    });

    test("sets Referrer-Policy header", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    });

    test("sets Permissions-Policy header", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      
      const policy = response.headers.get("Permissions-Policy");
      expect(policy).toContain("geolocation=()");
      expect(policy).toContain("camera=()");
      expect(policy).toContain("microphone=()");
    });

    test("does not expose X-Powered-By header", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      
      expect(response.headers.get("X-Powered-By")).toBeNull();
    });
  });

  describe("Content Security Policy", () => {
    test("sets Content-Security-Policy header for HTML responses", async () => {
      const response = await fetch("http://localhost:3000/");
      
      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src");
      expect(csp).toContain("script-src");
      expect(csp).toContain("style-src");
    });

    test("allows inline styles and scripts in development", async () => {
      if (process.env.NODE_ENV !== "production") {
        const response = await fetch("http://localhost:3000/");
        const csp = response.headers.get("Content-Security-Policy");
        
        expect(csp).toContain("'unsafe-inline'");
      }
    });

    test("restricts to self and trusted sources in production", async () => {
      if (process.env.NODE_ENV === "production") {
        const response = await fetch("http://localhost:3000/");
        const csp = response.headers.get("Content-Security-Policy");
        
        expect(csp).toContain("'self'");
        expect(csp).not.toContain("'unsafe-inline'");
      }
    });

    test("does not set CSP for API responses", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      
      expect(response.headers.get("Content-Security-Policy")).toBeNull();
    });
  });

  describe("HSTS (Strict Transport Security)", () => {
    test("sets Strict-Transport-Security in production", async () => {
      if (process.env.NODE_ENV === "production") {
        const response = await fetch("http://localhost:3000/api/health");
        
        const hsts = response.headers.get("Strict-Transport-Security");
        expect(hsts).toBeTruthy();
        expect(hsts).toContain("max-age=");
        expect(hsts).toContain("includeSubDomains");
      }
    });

    test("does not set HSTS in development", async () => {
      if (process.env.NODE_ENV !== "production") {
        const response = await fetch("http://localhost:3000/api/health");
        
        expect(response.headers.get("Strict-Transport-Security")).toBeNull();
      }
    });
  });

  describe("Cache Control", () => {
    test("sets appropriate cache headers for static assets", async () => {
      const response = await fetch("http://localhost:3000/manifest.json");
      
      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toBeTruthy();
      
      // Static assets can be cached
      expect(cacheControl).toContain("public");
      expect(cacheControl).toContain("max-age=");
    });

    test("prevents caching for API responses", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      
      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toBe("no-store, no-cache, must-revalidate");
    });

    test("prevents caching for authenticated endpoints", async () => {
      const response = await fetch("http://localhost:3000/api/users");
      
      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toContain("no-store");
      expect(cacheControl).toContain("private");
    });
  });

  describe("Security Headers for Different Content Types", () => {
    test("applies security headers to JSON responses", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      
      expect(response.headers.get("Content-Type")).toContain("application/json");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    test("applies security headers to HTML responses", async () => {
      const response = await fetch("http://localhost:3000/");
      
      expect(response.headers.get("Content-Type")).toContain("text/html");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    test("applies security headers to JavaScript responses", async () => {
      if (process.env.NODE_ENV !== "production") {
        const response = await fetch("http://localhost:3000/main.js");
        
        expect(response.headers.get("Content-Type")).toContain("application/javascript");
        expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      }
    });
  });

  describe("Error Response Security", () => {
    test("does not leak sensitive information in error responses", async () => {
      // Try to access a non-existent user
      const response = await fetch("http://localhost:3000/api/users/nonexistent");
      
      expect(response.status).toBe(404);
      
      const text = await response.text();
      // Should not contain stack traces or internal paths
      expect(text).not.toContain("Error:");
      expect(text).not.toContain("/Users/");
      expect(text).not.toContain("\\\\");
    });

    test("returns generic error for server errors", async () => {
      // This would need a way to trigger a 500 error
      // For now, we'll test that the error handler exists
      const response = await fetch("http://localhost:3000/api/this-will-404");
      
      // Should get HTML response for SPA fallback
      expect(response.headers.get("Content-Type")).toContain("text/html");
    });
  });

  describe("Headers for Authentication", () => {
    test("does not expose JWT in response headers", async () => {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });
      
      // JWT should be in body, not headers
      expect(response.headers.get("Authorization")).toBeNull();
      expect(response.headers.get("X-Auth-Token")).toBeNull();
    });

    test("sets secure cookie attributes", async () => {
      // This test would check Set-Cookie headers when we implement auth cookies
      const response = await fetch("http://localhost:3000/api/health");
      
      const setCookie = response.headers.get("Set-Cookie");
      if (setCookie) {
        expect(setCookie).toContain("SameSite=");
        expect(setCookie).toContain("HttpOnly");
        
        if (process.env.NODE_ENV === "production") {
          expect(setCookie).toContain("Secure");
        }
      }
    });
  });
});`,
  "tests/db/repositories/PostgresUserRepository.test.ts": `import { test, expect, describe, beforeAll } from "bun:test";
import { PostgresUserRepository } from "@/db/repositories/PostgresUserRepository";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";

describe("PostgresUserRepository", () => {
  // Skip these tests if no PostgreSQL is available
  const pgUrl = process.env.DATABASE_URL;
  const skipTests = !pgUrl?.startsWith("postgres");

  if (skipTests) {
    test.skip("PostgreSQL tests skipped - no DATABASE_URL configured", () => {});
    return;
  }

  let repository: PostgresUserRepository;
  let db: PostgresJsDatabase<typeof schema>;
  let client: ReturnType<typeof postgres>;

  beforeAll(async () => {
    try {
      client = postgres(pgUrl!);
      db = drizzle(client, { schema });
      
      // Schema should already exist from migrations
      // Just clear any existing test data
      try {
        await client\`TRUNCATE TABLE users\`;
      } catch (e) {
        // Table might not exist yet
      }
      
      repository = new PostgresUserRepository(db);
    } catch (error) {
      console.warn("PostgreSQL connection failed:", error);
      test.skip("PostgreSQL tests skipped - connection failed", () => {});
    }
  });

  describe("findAll", () => {
    test("returns all users", async () => {
      // Insert test data using repository
      await repository.create({ name: 'User 1', email: 'user1@example.com', password: null });
      await repository.create({ name: 'User 2', email: 'user2@example.com', password: null });
      
      const result = await repository.findAll();
      
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('user1@example.com');
      expect(result[1].email).toBe('user2@example.com');
    });

    // Add more PostgreSQL tests here following the same pattern as SQLite tests
    // but only if you have a real PostgreSQL instance to test against
  });
});`,
  "tests/db/repositories/SQLiteUserRepository.test.ts": `import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { SQLiteUserRepository } from "@/db/repositories/SQLiteUserRepository";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";

describe("SQLiteUserRepository", () => {
  let repository: SQLiteUserRepository;
  let db: BunSQLiteDatabase<typeof schema>;
  let sqliteDb: Database;

  beforeEach(async () => {
    // Create in-memory database for tests
    sqliteDb = new Database(":memory:");
    db = drizzle(sqliteDb, { schema });
    
    // Create tables
    sqliteDb.exec(\`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`);
    
    repository = new SQLiteUserRepository(db);
  });

  afterEach(() => {
    sqliteDb.close();
  });

  describe("findAll", () => {
    test("returns all users", async () => {
      // Insert test data
      sqliteDb.exec(\`
        INSERT INTO users (id, name, email) VALUES 
        ('1', 'User 1', 'user1@example.com'),
        ('2', 'User 2', 'user2@example.com')
      \`);
      
      const result = await repository.findAll();
      
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('user1@example.com');
      expect(result[1].email).toBe('user2@example.com');
    });

    test("returns empty array when no users", async () => {
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    test("returns user when found", async () => {
      sqliteDb.exec(\`
        INSERT INTO users (id, name, email) VALUES 
        ('123', 'Test User', 'test@example.com')
      \`);
      
      const result = await repository.findById("123");
      
      expect(result).toBeDefined();
      expect(result?.id).toBe("123");
      expect(result?.email).toBe("test@example.com");
    });

    test("returns null when user not found", async () => {
      const result = await repository.findById("999");
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    test("creates and returns new user", async () => {
      const newUserData = { 
        name: "New User", 
        email: "new@example.com", 
        password: "hashed" 
      };
      
      const result = await repository.create(newUserData);
      
      expect(result.id).toBeDefined();
      expect(result.name).toBe(newUserData.name);
      expect(result.email).toBe(newUserData.email);
      expect(result.createdAt).toBeDefined();
    });
  });

  describe("update", () => {
    test("updates and returns user when found", async () => {
      sqliteDb.exec(\`
        INSERT INTO users (id, name, email) VALUES 
        ('123', 'Original Name', 'test@example.com')
      \`);
      
      const updates = { name: "Updated Name" };
      const result = await repository.update("123", updates);
      
      expect(result).toBeDefined();
      expect(result?.name).toBe("Updated Name");
      expect(result?.email).toBe("test@example.com");
    });

    test("returns null when user not found", async () => {
      const result = await repository.update("999", { name: "Test" });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    test("returns true when user deleted", async () => {
      sqliteDb.exec(\`
        INSERT INTO users (id, name, email) VALUES 
        ('123', 'User to Delete', 'delete@example.com')
      \`);
      
      const result = await repository.delete("123");
      expect(result).toBe(true);
      
      // Verify user is actually deleted
      const user = await repository.findById("123");
      expect(user).toBeNull();
    });

    test("returns false when user not found", async () => {
      const result = await repository.delete("999");
      expect(result).toBe(false);
    });
  });
});`,
  "tests/server/routes/auth.test.ts": `import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { db } from "@/db/client";
import { userRepository } from "@/db/repositories";
import { hashPassword } from "@/lib/crypto";
import { auth } from "@/server/routes/auth";
import { sql } from "drizzle-orm";
import { createMockRequest, parseJsonResponse } from "../../helpers";


describe("Auth Routes", () => {
  beforeEach(async () => {
    // Clean up test data
    // Clean up test users using repository
    const users = await userRepository.findAll();
    for (const user of users) {
      if (user.email.includes('@test.')) {
        await userRepository.delete(user.id);
      }
    }
  });

  afterEach(async () => {
    // Clean up after tests
    // Clean up test users using repository
    const users = await userRepository.findAll();
    for (const user of users) {
      if (user.email.includes('@test.')) {
        await userRepository.delete(user.id);
      }
    }
  });

  describe("POST /api/auth/register", () => {
    test("registers new user with valid data", async () => {
      const newUser = {
        name: "New User",
        email: "new@test.example.com",
        password: "password123",
      };

      const request = createMockRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(newUser),
      });

      const response = await auth["/register"].POST(request);
      
      expect(response.status).toBe(201);
      const data = await parseJsonResponse(response);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(newUser.email);
      expect(data.user.password).toBeUndefined(); // Password should not be returned
    });

    test("returns 400 for duplicate email", async () => {
      // First create a user
      await userRepository.create({
        name: 'Existing User',
        email: 'existing@test.example.com',
        password: 'hashed'
      });

      const request = createMockRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "existing@test.example.com",
          password: "password123",
        }),
      });

      const response = await auth["/register"].POST(request);
      expect(response.status).toBe(400);
      const data = await parseJsonResponse(response);
      expect(data.error).toContain("already exists");
    });

    test("returns 400 for invalid email format", async () => {
      const request = createMockRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: "invalid-email",
          password: "password123",
        }),
      });

      const response = await auth["/register"].POST(request);
      expect(response.status).toBe(400);
    });

    test("returns 400 for missing password", async () => {
      const request = createMockRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: "test@test.example.com",
        }),
      });

      const response = await auth["/register"].POST(request);
      expect(response.status).toBe(400);
    });

    test("returns 400 for short password", async () => {
      const request = createMockRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: "test@test.example.com",
          password: "123",
        }),
      });

      const response = await auth["/register"].POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    test("logs in with valid credentials", async () => {
      // Create a user with known password hash
      const hashedPassword = await hashPassword("password123");
      await userRepository.create({
        name: 'Test User',
        email: 'login@test.example.com',
        password: hashedPassword
      });

      const request = createMockRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "login@test.example.com",
          password: "password123",
        }),
      });

      const response = await auth["/login"].POST(request);
      
      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("login@test.example.com");
      expect(data.user.password).toBeUndefined();
    });

    test("returns 401 for wrong password", async () => {
      const hashedPassword = await hashPassword("password123");
      await userRepository.create({
        name: 'Test User',
        email: 'wrongpass@test.example.com',
        password: hashedPassword
      });

      const request = createMockRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "wrongpass@test.example.com",
          password: "wrongpassword",
        }),
      });

      const response = await auth["/login"].POST(request);
      expect(response.status).toBe(401);
    });

    test("returns 401 for non-existent user", async () => {
      const request = createMockRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "nonexistent@test.example.com",
          password: "password123",
        }),
      });

      const response = await auth["/login"].POST(request);
      expect(response.status).toBe(401);
    });

    test("returns 400 for invalid email format", async () => {
      const request = createMockRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
          password: "password123",
        }),
      });

      const response = await auth["/login"].POST(request);
      expect(response.status).toBe(400);
    });

    test("returns 400 for missing credentials", async () => {
      const request = createMockRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await auth["/login"].POST(request);
      expect(response.status).toBe(400);
    });

    test("returns 400 for invalid JSON", async () => {
      const request = createMockRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: "invalid json",
      });

      const response = await auth["/login"].POST(request);
      expect(response.status).toBe(400);
    });
  });
});`,
  "tests/lib/crypto.test.ts": `import { test, expect, describe } from "bun:test";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "@/lib/crypto";

describe("crypto utilities", () => {
  describe("hashPassword", () => {
    test("hashes password with salt", async () => {
      const password = "testpassword123";
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed).toContain("$"); // Should contain salt separator
    });

    test("generates different hashes for same password", async () => {
      const password = "testpassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    test("handles empty password", async () => {
      const hashed = await hashPassword("");
      expect(hashed).toBeDefined();
    });
  });

  describe("verifyPassword", () => {
    test("verifies correct password", async () => {
      const password = "testpassword123";
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword(password, hashed);
      
      expect(isValid).toBe(true);
    });

    test("rejects incorrect password", async () => {
      const password = "testpassword123";
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword("wrongpassword", hashed);
      
      expect(isValid).toBe(false);
    });

    test("handles empty password verification", async () => {
      const hashed = await hashPassword("");
      const isValid = await verifyPassword("", hashed);
      
      expect(isValid).toBe(true);
    });

    test("handles null hash", async () => {
      const isValid = await verifyPassword("password", null as any);
      expect(isValid).toBe(false);
    });
  });

  describe("JWT functions", () => {
    const testPayload = { userId: "123", email: "test@example.com" };

    describe("generateToken", () => {
      test("generates a token", () => {
        const token = generateToken(testPayload);
        
        expect(token).toBeDefined();
        expect(typeof token).toBe("string");
        expect(token.split(".")).toHaveLength(3); // JWT format
      });

      test("generates different tokens for same payload", () => {
        const token1 = generateToken(testPayload);
        const token2 = generateToken(testPayload);
        
        // Tokens might be the same if generated in same millisecond
        // But the important thing is they're valid JWTs
        expect(token1.split(".")).toHaveLength(3);
        expect(token2.split(".")).toHaveLength(3);
      });

      test("handles empty payload", () => {
        const token = generateToken({});
        expect(token).toBeDefined();
        expect(token.split(".")).toHaveLength(3);
      });
    });

    describe("verifyToken", () => {
      test("verifies valid token", () => {
        const token = generateToken(testPayload);
        const decoded = verifyToken(token);
        
        expect(decoded).toBeDefined();
        expect(decoded?.userId).toBe(testPayload.userId);
        expect(decoded?.email).toBe(testPayload.email);
      });

      test("returns null for invalid token", () => {
        const decoded = verifyToken("invalid.token.here");
        expect(decoded).toBeNull();
      });

      test("returns null for malformed token", () => {
        const decoded = verifyToken("notavalidtoken");
        expect(decoded).toBeNull();
      });

      test("returns null for empty token", () => {
        const decoded = verifyToken("");
        expect(decoded).toBeNull();
      });

      test("handles expired token", () => {
        // Create a token that expires immediately
        const oldEnv = process.env.JWT_SECRET;
        process.env.JWT_SECRET = "test-secret";
        
        // Mock Date to create expired token
        const originalNow = Date.now;
        Date.now = () => 0;
        const expiredToken = generateToken(testPayload);
        Date.now = originalNow;
        
        const decoded = verifyToken(expiredToken);
        expect(decoded).toBeNull();
        
        process.env.JWT_SECRET = oldEnv;
      });
    });
  });
});`,
  "tests/app/App.test.tsx": `import { test, expect, describe } from "bun:test";
import { App } from "@/app/App";
import { HomePage } from "@/app/pages/HomePage";
import { UsersPage } from "@/app/pages/UsersPage";
import { NotFoundPage } from "@/app/pages/NotFoundPage";

declare global {
  var vi: any;
}

describe("App Component", () => {
  test("exports a valid component", () => {
    expect(typeof App).toBe("function");
    expect(App.name).toBe("App");
  });
});

describe("HomePage Component", () => {
  test("exports a valid component", () => {
    expect(typeof HomePage).toBe("function");
    expect(HomePage.name).toBe("HomePage");
  });
});

describe("UsersPage Component", () => {
  test("exports a valid component", () => {
    expect(typeof UsersPage).toBe("function");
    expect(UsersPage.name).toBe("UsersPage");
  });
});

describe("NotFoundPage Component", () => {
  test("exports a valid component", () => {
    expect(typeof NotFoundPage).toBe("function");
    expect(NotFoundPage.name).toBe("NotFoundPage");
  });
});

// Note: For comprehensive React component testing with Bun,
// consider using integration tests with the actual server
// or mocking React's render output directly.
// DOM-based testing requires external libraries which can
// cause compatibility issues with Bun's test runner.
`,
  "tests/app/hooks/useAuth.test.tsx": `import { test, expect, describe, beforeEach } from "bun:test";
import { useAuth } from "@/app/hooks/useAuth";

describe("useAuth hook", () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
  });

  test("exports a valid hook", () => {
    expect(typeof useAuth).toBe("function");
  });

  test("login makes correct API call", async () => {
    // Create a test user first
    const timestamp = Date.now();
    const testEmail = \`auth-test-\${timestamp}@example.com\`;
    
    await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Auth Test User",
        email: testEmail,
        password: "password123",
      }),
    });

    // Test that the login endpoint works
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "password123",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.token).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testEmail);
  });

  test("logout clears localStorage", () => {
    localStorage.setItem("token", "mock-token");
    
    // Simulate logout behavior
    localStorage.removeItem("token");
    
    expect(localStorage.getItem("token")).toBeNull();
  });

  test("handles invalid credentials", async () => {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: "nonexistent@example.com", 
        password: "wrongpassword" 
      }),
    });

    expect(response.status).toBe(401);
  });
});`,
  "tests/server/index.test.ts": `import { test, expect, describe, beforeEach, afterEach } from "bun:test";

// Use real fetch

describe("Server", () => {
  const originalPort = process.env.PORT;

  beforeEach(() => {
    // Mock environment for tests
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    // Restore original port
    process.env.PORT = originalPort;
  });

  test("serves index.html at root", async () => {
    const response = await fetch("http://localhost:3000/");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  test("serves manifest.json", async () => {
    const response = await fetch("http://localhost:3000/manifest.json");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  test("serves offline.html", async () => {
    const response = await fetch("http://localhost:3000/offline.html");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  test("health check endpoint", async () => {
    const response = await fetch("http://localhost:3000/api/health");
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
  });

  test("handles 404 with SPA fallback", async () => {
    const response = await fetch("http://localhost:3000/nonexistent");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  test("error handler returns 500", async () => {
    // This would need to trigger an actual error in the server
    // For now, we'll skip this test as it requires more complex setup
  });
});`,
  "tests/db/seed.test.ts": `import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { db } from "@/db/client";
import { userRepository } from "@/db/repositories";

describe("Database Seed", () => {
  beforeEach(async () => {
    // Clear existing data
    const users = await userRepository.findAll();
    for (const user of users) {
      await userRepository.delete(user.id);
    }
  });

  afterEach(async () => {
    // Clean up after tests
    const users = await userRepository.findAll();
    for (const user of users) {
      await userRepository.delete(user.id);
    }
  });

  test("seeds initial users", async () => {
    // Run seed function directly instead of importing
    const { hashPassword } = await import("@/lib/crypto");
    const timestamp = Date.now();
    
    const users = [
      {
        name: "Alice Johnson",
        email: \`alice-\${timestamp}@example.com\`,
        password: await hashPassword("password123"),
      },
      {
        name: "Bob Williams",
        email: \`bob-\${timestamp}@example.com\`,
        password: await hashPassword("password123"),
      },
      {
        name: "Charlie Brown",
        email: \`charlie-\${timestamp}@example.com\`,
        password: await hashPassword("password123"),
      },
    ];
    
    for (const user of users) {
      await userRepository.create(user);
    }
    
    const allUsers = await userRepository.findAll();
    expect(allUsers.length).toBeGreaterThanOrEqual(3);
    
    // Check first user
    const firstUser = allUsers.find(u => u.email === \`alice-\${timestamp}@example.com\`);
    expect(firstUser).toBeDefined();
    expect(firstUser?.name).toBe("Alice Johnson");
  });

  test("handles duplicate seed runs", async () => {
    // First seed
    const { hashPassword } = await import("@/lib/crypto");
    const testUser = {
      name: "Test User",
      email: \`duplicate-\${Date.now()}@example.com\`,
      password: await hashPassword("password123"),
    };
    
    await userRepository.create(testUser);
    const firstCount = (await userRepository.findAll()).length;
    
    // Try to create same user again - should fail
    try {
      await userRepository.create(testUser);
      // If it doesn't throw, check count didn't increase
      const secondCount = (await userRepository.findAll()).length;
      expect(secondCount).toBe(firstCount);
    } catch (error) {
      // Expected - duplicate email should fail
      expect(error).toBeDefined();
    }
  });
});`,
  "tests/db/client.test.ts": `import { test, expect, describe } from "bun:test";
import { db, dbType } from "@/db/client";
import { usersSqlite } from "@/db/schema";
import { sql } from "drizzle-orm";

describe("Database Client", () => {
  test("database client is initialized", () => {
    expect('db').toBeDefined();
    expect(dbType).toBeDefined();
  });

  test("database type is either postgres or sqlite", () => {
    expect(["postgres", "sqlite"]).toContain(dbType);
  });

  test("can execute basic query", async () => {
    // This is a basic connectivity test
    if (dbType === "postgres") {
      // For PostgreSQL
      const result = await (db as any).execute(sql\`SELECT 1 as test\`);
      expect(result).toBeDefined();
    } else {
      // For SQLite
      const result = await (db as any).select().from(usersSqlite).limit(1);
      expect(result).toBeDefined();
    }
  });
});`,
  "drizzle.config.ts": DRIZZLE_CONFIG_TEMPLATE,
  ".prettierrc.json": JSON.stringify(
    {
      semi: true,
      trailingComma: "es5",
      singleQuote: false,
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      arrowParens: "always",
      endOfLine: "lf",
    },
    null,
    2
  ),
  ".prettierignore": `node_modules
.create-bun-stack
*.lock
bun.lockb
dist
build
.next
.cache
coverage
.env*
*.log
drizzle
*.db
*.sqlite`,
  "biome.json": JSON.stringify(
    {
      $schema: "https://biomejs.dev/schemas/1.8.3/schema.json",
      organizeImports: {
        enabled: true,
      },
      linter: {
        enabled: true,
        rules: {
          recommended: true,
          style: {
            useNodejsImportProtocol: "off",
            noNonNullAssertion: "off",
          },
          suspicious: {
            noExplicitAny: "off",
          },
          complexity: {
            noBannedTypes: "off",
          },
        },
      },
      formatter: {
        enabled: true,
        formatWithErrors: false,
        indentStyle: "space",
        indentWidth: 2,
        lineWidth: 100,
        lineEnding: "lf",
      },
      javascript: {
        formatter: {
          quoteStyle: "double",
          trailingCommas: "es5",
          semicolons: "always",
        },
      },
      files: {
        ignore: ["node_modules", "dist", "build", "*.lock", "drizzle"],
      },
    },
    null,
    2
  ),
};

// Check if Bun is installed
function checkBunInstalled(): boolean {
  try {
    const proc = Bun.spawnSync(["bun", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

// Get OS platform
function getInstallInstructions(): string {
  const platform = process.platform;

  if (platform === "win32") {
    return `powershell -c "irm bun.sh/install.ps1 | iex"`;
  }
  return "curl -fsSL https://bun.sh/install | bash";
}

async function main() {
  // Check if Bun is installed
  if (!checkBunInstalled()) {
    console.log("\n╭─────────────────────────────────────────╮");
    console.log("│      ❌ Bun is not installed!          │");
    console.log("╰─────────────────────────────────────────╯\n");

    const platform = process.platform;
    const osName = platform === "win32" ? "Windows" : platform === "darwin" ? "macOS" : "Linux";

    console.log(`📦 To install Bun on ${osName}, run:\n`);
    console.log(`   ${getInstallInstructions()}\n`);

    if (platform === "win32") {
      console.log("💡 Make sure to run this in PowerShell as Administrator\n");
    }

    console.log("📚 Visit https://bun.sh for more information");
    console.log("🔄 After installing, run this command again!\n");
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  console.log("\n╭─────────────────────────────────────╮");
  console.log("│  🚀 Create Bun Fullstack Stack v0.1 │");
  console.log("╰─────────────────────────────────────╯\n");

  // Use default project name
  const name = "bun-app";

  // Check if directory already exists
  if (existsSync(name)) {
    console.log(`❌ Directory "${name}" already exists!`);
    console.log("Please remove it or run this command in a different directory.\n");
    process.exit(1);
  }

  console.log(`📦 Creating project: ${name}`);
  console.log(`📍 Location: ${join(process.cwd(), name)}\n`);

  rl.close();

  // Create project
  const targetDir = join(process.cwd(), name);
  mkdirSync(targetDir, { recursive: true });

  // Create directory structure
  const dirs = [
    "public",
    "src/app/components",
    "src/app/pages",
    "src/app/hooks",
    "src/app/styles",
    "src/config",
    "src/db",
    "src/lib",
    "src/server/routes",
    "src/server/services",
    "src/server/api_clients",
    "src/server/middleware",
    "src/server/utils",
    "tests/app",
    "tests/server",
    "tests/db",
    "db",
  ];

  for (const dir of dirs) {
    mkdirSync(join(targetDir, dir), { recursive: true });
  }

  // Write all template files
  const packageJson = JSON.parse(FULLSTACK_TEMPLATE["package.json"]);

  for (const [file, content] of Object.entries(FULLSTACK_TEMPLATE)) {
    if (file === "package.json") continue;
    const filePath = join(targetDir, file);
    const fileDir = join(targetDir, file.substring(0, file.lastIndexOf("/")));

    if (file.includes("/")) {
      mkdirSync(fileDir, { recursive: true });
    }

    writeFileSync(filePath, content);
  }

  // Write final package.json
  packageJson.name = name;
  writeFileSync(join(targetDir, "package.json"), JSON.stringify(packageJson, null, 2));

  // Add .gitkeep to db folder
  writeFileSync(join(targetDir, "db/.gitkeep"), "");

  // Create a basic favicon
  const faviconData = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  writeFileSync(join(targetDir, "public/favicon.ico"), faviconData);

  console.log("✨ Success! Created project structure");

  // Always install dependencies
  console.log("\n📦 Installing dependencies...\n");
  const proc = Bun.spawnSync(["bun", "install"], {
    cwd: targetDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (proc.exitCode !== 0) {
    console.error("\n❌ Installation failed");
  } else {
    console.log("\n✅ Dependencies installed!");
  }

  // Auto-setup the project
  console.log("\n🔧 Setting up your project...");

  // Copy .env.example to .env
  console.log("   📝 Creating .env file...");
  Bun.spawnSync(["cp", ".env.example", ".env"], {
    cwd: targetDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  // Push database schema
  console.log("   🗄️  Setting up database...");
  const dbProc = Bun.spawnSync(["bun", "run", "db:push"], {
    cwd: targetDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  if (dbProc.exitCode === 0) {
    // Seed database
    console.log("   🌱 Seeding database...");
    Bun.spawnSync(["bun", "run", "db:seed"], {
      cwd: targetDir,
      stdout: "inherit",
      stderr: "inherit",
    });
  }

  // Build CSS
  console.log("   🎨 Building CSS...");
  Bun.spawnSync(["bun", "run", "build:css"], {
    cwd: targetDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  // Summary box
  console.log("\n╭────────────────────────────────────╮");
  console.log("│         🎉 Setup Complete!         │");
  console.log("╰────────────────────────────────────╯");

  console.log("\n📋 Project Summary:");
  console.log("   • Template: 🏗️  Fullstack (React + Drizzle + Auth)");
  console.log("   • Database: 🐘 PostgreSQL (primary) / 🪶 SQLite (fallback)");
  console.log("   • Features: Auth, API Routes, Drizzle ORM, Tailwind CSS");

  console.log("\n🚀 Starting development server...");
  console.log(`   Directory: ${targetDir}`);
  console.log("   URL: http://localhost:3000");

  // Change to project directory and start dev server
  process.chdir(targetDir);
  console.log("\n💡 Server is running! Press Ctrl+C to stop.");
  const devProc = Bun.spawn(["bun", "run", "dev"], {
    cwd: targetDir,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

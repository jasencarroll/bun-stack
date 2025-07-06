# Project Structure

Understanding the project structure is key to being productive with Create Bun Stack. This guide explains how projects are organized and the purpose of each directory and file.

## Directory Overview

```
my-app/
├── src/                    # All source code
│   ├── app/               # React frontend application
│   ├── server/            # Bun backend server
│   ├── db/                # Database layer
│   └── lib/               # Shared utilities
├── public/                # Static assets
├── tests/                 # Test files
├── .env                   # Environment variables
├── .env.example          # Example environment variables
├── .gitignore            # Git ignore patterns
├── biome.json            # Biome linter/formatter config
├── bunfig.toml           # Bun configuration
├── dev.ts                # Development server script
├── drizzle.config.ts     # Drizzle ORM configuration
├── package.json          # Project dependencies and scripts
├── README.md             # Project documentation
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Source Code Organization

### `/src/app` - Frontend Application

The React application with all client-side code:

```
src/app/
├── components/           # Reusable UI components
│   ├── ui/              # Generic UI components
│   └── features/        # Feature-specific components
├── hooks/               # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   └── useApi.ts       # API utilities hook
├── layouts/             # Page layouts
│   └── MainLayout.tsx  # Main app layout
├── lib/                 # Frontend utilities
│   └── api/            # API client
│       ├── client.ts   # Base API client
│       └── auth.ts     # Auth API calls
├── pages/               # Page components (routes)
│   ├── HomePage.tsx    # Landing page
│   ├── LoginPage.tsx   # Login page
│   └── SignupPage.tsx  # Registration page
├── types/               # TypeScript types
├── App.tsx             # Main app component
├── index.css           # Global styles
└── main.tsx            # App entry point
```

#### Key Frontend Files

- **`main.tsx`**: Entry point that renders the React app
- **`App.tsx`**: Main component with routing setup
- **`lib/api/client.ts`**: Configured API client with auth headers
- **`hooks/useAuth.ts`**: Authentication state management

### `/src/server` - Backend Server

The Bun server with API routes and middleware:

```
src/server/
├── middleware/          # Express-style middleware
│   ├── auth.ts         # JWT authentication
│   ├── cors.ts         # CORS handling
│   ├── csrf.ts         # CSRF protection
│   ├── rate-limit.ts   # Rate limiting
│   └── security.ts     # Security headers
├── routes/              # API route handlers
│   ├── auth.ts         # Authentication routes
│   ├── health.ts       # Health check
│   └── users.ts        # User management
├── config.ts           # Server configuration
├── index.ts            # Server entry point
└── router.ts           # Route registration
```

#### Key Backend Files

- **`index.ts`**: Bun server setup and static file serving
- **`router.ts`**: Central route registration
- **`middleware/auth.ts`**: JWT verification and user context

### `/src/db` - Database Layer

Database schema, clients, and repositories:

```
src/db/
├── repositories/        # Data access layer
│   └── user.repository.ts
├── client.ts           # Database connection
├── config.ts           # Database configuration
├── schema.ts           # Drizzle schema definitions
├── seed.ts             # Database seeding script
└── types.ts            # Generated TypeScript types
```

#### Key Database Files

- **`schema.ts`**: Table definitions for both SQLite and PostgreSQL
- **`client.ts`**: Database client with automatic PostgreSQL/SQLite detection
- **`repositories/`**: Encapsulated database operations

### `/src/lib` - Shared Utilities

Code shared between frontend and backend:

```
src/lib/
├── constants.ts        # App-wide constants
├── crypto.ts           # Encryption utilities
└── jwt.ts              # JWT utilities
```

## Configuration Files

### `package.json`

Defines scripts, dependencies, and project metadata:

```json
{
  "scripts": {
    "dev": "bun run dev.ts",
    "build": "bun run build:css",
    "test": "bun test",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

### `tsconfig.json`

TypeScript configuration with path aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/app/*": ["./src/app/*"],
      "@/server/*": ["./src/server/*"],
      "@/db/*": ["./src/db/*"]
    }
  }
}
```

### `tailwind.config.js`

Tailwind CSS configuration with custom theme:

```javascript
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'off-white': '#FAFAF8',
        'off-black': '#1A1A1A',
        'accent-purple': '#A855F7'
      }
    }
  }
}
```

### `.env` Files

Environment variables for configuration:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/myapp

# Auth
JWT_SECRET=your-secret-key

# Server
PORT=3000
```

## Static Assets

### `/public`

Static files served directly:

```
public/
├── .gitkeep            # Keeps directory in git
└── favicon.ico         # Site favicon
```

Files in this directory are served at the root path (e.g., `/favicon.ico`).

## Testing Structure

### `/tests`

Organized by feature area:

```
tests/
├── app/                # Frontend tests
├── server/             # API tests
├── db/                 # Database tests
├── lib/                # Utility tests
├── helpers.ts          # Test utilities
└── setup.ts            # Test environment setup
```

## Build Outputs

Generated files (git-ignored):

```
.hmr-timestamp          # HMR polling file
app.db                  # SQLite database
app.db-journal          # SQLite journal
node_modules/           # Dependencies
dist/                   # Production build
coverage/               # Test coverage reports
```

## Import Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
// Instead of: import { userRepo } from "../../../db/repositories/user"
import { userRepo } from "@/db/repositories/user";

// Instead of: import { Button } from "../../components/ui/Button"
import { Button } from "@/app/components/ui/Button";
```

Available aliases:
- `@/*` - Root src directory
- `@/app/*` - Frontend code
- `@/server/*` - Backend code
- `@/db/*` - Database code
- `@/lib/*` - Shared utilities

## Best Practices

### 1. File Naming

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Routes**: kebab-case (e.g., `user-profile.ts`)
- **Tests**: match source with `.test.ts` suffix

### 2. Code Organization

- Keep components small and focused
- Co-locate related code
- Use barrel exports for cleaner imports
- Separate concerns (UI, business logic, data access)

### 3. Type Safety

- Define types in dedicated files
- Use Zod for runtime validation
- Leverage TypeScript strict mode
- Generate types from database schema

### 4. Dependencies

- Prefer Bun built-ins over npm packages
- Keep dependencies minimal
- Audit dependencies regularly
- Lock versions for production

## Extending the Structure

### Adding a New Feature

1. **Database**: Add schema in `/src/db/schema.ts`
2. **Repository**: Create in `/src/db/repositories/`
3. **API Routes**: Add to `/src/server/routes/`
4. **Frontend**: Create components in `/src/app/components/`
5. **Pages**: Add to `/src/app/pages/`
6. **Tests**: Mirror structure in `/tests/`

### Adding a New Page

1. Create component in `/src/app/pages/`
2. Add route in `/src/app/App.tsx`
3. Update navigation if needed
4. Add tests in `/tests/app/`

### Adding Middleware

1. Create in `/src/server/middleware/`
2. Apply in `/src/server/router.ts`
3. Test middleware behavior
4. Document usage

## Next Steps

- Learn about [Configuration](/docs/configuration) options
- Understand the [Development](/docs/development) workflow
- Explore [Testing](/docs/testing) strategies
- Plan your [Deployment](/docs/deployment)
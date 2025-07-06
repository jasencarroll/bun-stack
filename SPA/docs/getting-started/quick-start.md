# Quick Start Guide

Get up and running with Create Bun Stack in under 5 minutes.

## Create Your First App

```bash
bunx create-bun-stack
```

This will open an interactive CLI that guides you through the setup process.

## What Just Happened?

When you ran the create command, Create Bun Stack:

1. ✅ Opened an interactive prompt to configure your project
2. ✅ Generated a complete project structure based on your choices
3. ✅ Installed all dependencies using Bun
4. ✅ Set up a SQLite database with initial schema
5. ✅ Created database migrations
6. ✅ Seeded the database with sample data (if selected)
7. ✅ Built the CSS with Tailwind

## Starting Your App

After the setup is complete, navigate to your project and start the development server:

```bash
cd my-awesome-app
bun run dev
```

Your app is now running at [http://localhost:3000](http://localhost:3000)!

## Exploring Your App

### Home Page
Visit [http://localhost:3000](http://localhost:3000) to see your app's landing page.

### Authentication
Your app comes with a complete authentication system:

1. Click "Sign Up" to create a new account
2. Enter your details and submit
3. You'll be automatically logged in
4. Try logging out and logging back in

### API Explorer
Your app includes a REST API. Try these endpoints:

```bash
# Get all users (requires authentication)
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Health check (no auth required)
curl http://localhost:3000/api/health
```

## Project Structure Overview

```
my-awesome-app/
├── src/
│   ├── app/           # React frontend
│   ├── server/        # Bun backend
│   ├── db/            # Database layer
│   └── lib/           # Shared utilities
├── public/            # Static assets
├── tests/             # Test files
└── package.json       # Project config
```

## Available Commands

Your new app comes with several useful commands:

```bash
# Development
bun run dev          # Start dev server with hot reload
bun run build        # Build for production
bun run start        # Start production server

# Database
bun run db:push      # Apply schema changes
bun run db:migrate   # Run migrations
bun run db:seed      # Seed database

# Testing
bun run test         # Run all tests
bun run test:watch   # Run tests in watch mode

# Code Quality
bun run lint         # Run linter
bun run format       # Format code
bun run typecheck    # Check TypeScript types
```

## Making Your First Change

Let's customize the home page:

1. Open `src/app/pages/HomePage.tsx`
2. Find the heading that says "Welcome to my-awesome-app"
3. Change it to something unique
4. Save the file - the page will automatically refresh!

## Adding a New API Route

1. Create a new file `src/server/routes/hello.ts`:

```typescript
export const hello = {
  "/": {
    GET: async () => {
      return Response.json({ message: "Hello from my new route!" });
    },
  },
};
```

2. Register it in `src/server/router.ts`:

```typescript
import { hello } from "./routes/hello";

// Add to the routes object
const routes = {
  // ... existing routes
  "/api/hello": hello,
};
```

3. Test your new route:

```bash
curl http://localhost:3000/api/hello
```

## Connecting to PostgreSQL (Optional)

By default, your app uses SQLite. To use PostgreSQL:

1. Install PostgreSQL (see [Installation Guide](/docs/getting-started/installation))

2. Create a database:
```bash
createdb my_awesome_app_dev
```

3. Update your `.env` file:
```env
DATABASE_URL=postgresql://localhost/my_awesome_app_dev
```

4. Restart your dev server:
```bash
bun run dev
```

## What's Next?

Congratulations! You now have a working full-stack application. Here's what to explore next:

- 📖 [Project Structure](/docs/guide/project-structure) - Understand how your app is organized
- 🔐 [Authentication](/docs/features/authentication) - Learn about the auth system
- 🗄️ [Database](/docs/features/database) - Work with your database
- 🧪 [Testing](/docs/guide/testing) - Write and run tests
- 🚀 [Deployment](/docs/guide/deployment) - Deploy your app to production

## Getting Help

- Check the [documentation](/docs)
- Report issues on [GitHub](https://github.com/your-repo/create-bun-stack)
- Join our community [Discord](https://discord.gg/your-invite)
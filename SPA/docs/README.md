# Create Bun Stack Documentation

Welcome to the official documentation for Create Bun Stack - a modern, full-stack application generator built for Bun runtime. This documentation will guide you through everything from getting started to advanced deployment strategies.

## What is Create Bun Stack?

Create Bun Stack is a Rails-inspired, full-stack application generator that leverages Bun's speed and modern web technologies to help you build production-ready applications quickly. It provides:

- ⚡ **Lightning-fast development** with Bun's native performance
- 🏗️ **Complete application structure** with sensible defaults
- 🔐 **Built-in authentication** with JWT and role-based access control
- 🗄️ **Dual database support** (PostgreSQL + SQLite)
- 🎨 **Modern frontend** with React 18 and Tailwind CSS
- 🔒 **Security best practices** out of the box
- 🚀 **Production-ready** with Docker and PaaS deployment guides

## Quick Start

Get started in less than a minute:

```bash
bunx create-bun-stack
cd my-app
bun run dev
```

Visit [Quick Start Guide](/docs/getting-started/quick-start) for detailed instructions.

## Documentation Structure

### 🚀 [Getting Started](/docs/getting-started/)
New to Create Bun Stack? Start here!
- [Installation](/docs/getting-started/installation) - Install Bun and Create Bun Stack
- [Quick Start](/docs/getting-started/quick-start) - Create your first app in minutes
- [Your First App](/docs/getting-started/first-app) - Build a complete todo application
- [System Requirements](/docs/getting-started/system-requirements) - Prerequisites and compatibility

### 📖 [User Guide](/docs/guide/)
Core concepts and daily development workflow
- [Project Structure](/docs/guide/project-structure) - Understand the file organization
- [Configuration](/docs/guide/configuration) - Environment variables and settings
- [Development Workflow](/docs/guide/development) - Local development best practices
- [Testing](/docs/guide/testing) - Write and run tests
- [Deployment](/docs/guide/deployment) - Deploy to production

### ✨ [Features](/docs/features/)
Deep dive into built-in features
- [Authentication](/docs/features/authentication) - User auth with JWT and sessions
- [Database](/docs/features/database) - Drizzle ORM with dual database support
- [Routing](/docs/features/routing) - File-based API routing system
- [Frontend](/docs/features/frontend) - React, TypeScript, and Tailwind setup
- [Security](/docs/features/security) - CSRF protection and security headers
- [Testing](/docs/features/testing) - Integration testing with Bun test

### 🔧 [API Reference](/docs/api/)
Technical reference for APIs and utilities
- [CLI Commands](/docs/api/cli) - Available command-line options
- [Server API](/docs/api/server-api) - Route definitions and handlers
- [Middleware](/docs/api/middleware) - Built-in middleware functions
- [Utilities](/docs/api/utilities) - Helper functions and utilities

### 🚢 [Deployment](/docs/deployment/)
Deploy your app to production
- [Docker](/docs/deployment/docker) - Containerize your application
- [Railway](/docs/deployment/railway) - Deploy to Railway platform
- [Fly.io](/docs/deployment/fly-io) - Global deployment with Fly
- [VPS](/docs/deployment/vps) - Traditional server deployment

### 🎓 [Advanced Topics](/docs/advanced/)
Advanced patterns and optimizations
- [Customization](/docs/advanced/customization) - Extend and customize the framework
- [Migrations](/docs/advanced/migrations) - Database migration strategies
- [Performance](/docs/advanced/performance) - Optimization techniques
- [Security](/docs/advanced/security) - Security hardening

## Key Features Explained

### 🚄 Bun-First Design
Built specifically for Bun runtime, taking advantage of:
- Fast startup times (3-10x faster than Node.js)
- Native TypeScript support
- Built-in bundler and test runner
- Efficient package management

### 🏗️ Modern Architecture
- **File-based routing** for APIs
- **Repository pattern** for data access
- **Middleware pipeline** for request processing
- **Type-safe** throughout with TypeScript

### 🔐 Security by Default
- JWT authentication with refresh tokens
- CSRF protection for state-changing operations
- Security headers on all responses
- Input validation with Zod
- SQL injection prevention with Drizzle ORM

### 🗄️ Flexible Database Support
- **Development**: SQLite for simplicity
- **Production**: PostgreSQL for scalability
- **Same code**: Works with both databases
- **Migrations**: Built-in migration system

## Common Use Cases

### Building a SaaS Application
```bash
bunx create-bun-stack my-saas
# Includes user auth, billing hooks, and multi-tenancy patterns
```

### Creating an API Backend
Perfect for building REST APIs with built-in auth and validation.

### Full-Stack Web Applications
Complete setup with React frontend and Bun backend.

### Microservices
Lightweight and fast startup makes it ideal for microservices.

## Philosophy

Create Bun Stack follows these principles:

1. **Convention over Configuration** - Sensible defaults that just work
2. **Developer Experience First** - Fast feedback loops and clear errors
3. **Production-Ready** - Security and performance built-in
4. **Modern Stack** - Latest stable versions of all dependencies
5. **Type Safety** - TypeScript everywhere for confidence

## Community

- 🐛 [Report Issues](https://github.com/your-repo/create-bun-stack/issues)
- 💡 [Discussions](https://github.com/your-repo/create-bun-stack/discussions)
- 💬 [Discord Community](https://discord.gg/bun-stack)
- 🐦 [Twitter Updates](https://twitter.com/bunstack)

## Contributing

We welcome contributions! See our [Contributing Guide](/docs/CONTRIBUTING) for details.

### Ways to Contribute
- Report bugs and request features
- Improve documentation
- Submit pull requests
- Share your projects built with Create Bun Stack
- Help others in discussions

## Comparison with Other Frameworks

| Feature | Create Bun Stack | Next.js | Remix | Rails |
|---------|-----------------|---------|--------|--------|
| **Runtime** | Bun | Node.js | Node.js | Ruby |
| **Full-Stack** | ✅ | ✅ | ✅ | ✅ |
| **Built-in Auth** | ✅ | ❌ | ❌ | ✅ |
| **Database ORM** | ✅ | ❌ | ❌ | ✅ |
| **API Routes** | ✅ | ✅ | ✅ | ✅ |
| **TypeScript** | ✅ | ✅ | ✅ | ❌ |
| **Testing** | ✅ | ⚠️ | ⚠️ | ✅ |
| **CLI Generator** | ✅ | ✅ | ✅ | ✅ |

## Version Support

| Version | Bun Version | Support Status |
|---------|-------------|----------------|
| 1.x | 1.0+ | ✅ Active |
| 0.x | 0.8+ | ⚠️ Legacy |

## License

Create Bun Stack is open source software licensed under the [MIT License](/docs/LICENSE).

## Sponsors

Support the development of Create Bun Stack:
- [GitHub Sponsors](https://github.com/sponsors/your-username)
- [Open Collective](https://opencollective.com/create-bun-stack)

---

Ready to build something amazing? [Get started now!](/docs/getting-started/quick-start)
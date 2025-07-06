# Admin User Management

Learn how to promote users to admin status and manage administrative privileges in your Create Bun Stack application.

## Overview

Create Bun Stack includes a built-in role-based access control system. By default, all new users are created with the "user" role. To access admin-only features and endpoints, users must be promoted to the "admin" role.

## Using the Admin Promotion Script

The project includes a script specifically for this purpose:

```bash
# Navigate to your project directory
cd your-project-name

# Run the admin promotion script
bun run src/scripts/make-admin.ts <user-email>
```

For example:

```bash
bun run src/scripts/make-admin.ts user@example.com
```

## What the Script Does

The `make-admin.ts` script will:

1. Look up the user by email address
2. Update their role from "user" to "admin"
3. Save the changes to the database
4. Confirm the promotion was successful

## Manual Database Update (Alternative)

If you prefer to do it manually through the database:

### For SQLite (development)

```bash
# Open SQLite CLI
bun run db:studio

# Or use sqlite3 directly
sqlite3 db/app.db "UPDATE users SET role = 'admin' WHERE email = 'user@example.com';"
```

### For PostgreSQL (production)

```bash
# Connect to your database
psql $DATABASE_URL

# Update the user
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

## Checking Admin Status

After promotion, you can verify the user has admin privileges by:

### 1. Checking the database

```sql
SELECT id, email, name, role FROM users WHERE email = 'user@example.com';
```

### 2. Testing admin endpoints

Admin users can access `/api/users` (GET all users) and perform user management operations that regular users cannot.

## Admin Capabilities

Once promoted to admin, the user can:

- **View all users** (GET `/api/users`)
- **Update any user** (PUT `/api/users/:id`)
- **Delete users** (DELETE `/api/users/:id`)
- **Access admin-only features** in the frontend

The role-based access control is enforced by the `requireAdmin` middleware in the server routes.

## Security Considerations

### Best Practices

- **Limit admin accounts**: Only promote users who genuinely need administrative access
- **Use strong passwords**: Ensure admin users have secure authentication credentials
- **Regular audits**: Periodically review who has admin access
- **Environment separation**: Use different admin accounts for development and production

### Middleware Protection

Admin routes are protected by the `requireAdmin` middleware:

```typescript
import { requireAdmin } from "../middleware/auth";

export const adminRoutes = {
  "/users": {
    GET: [requireAdmin, getAllUsers],
    POST: [requireAdmin, createUser],
  },
};
```

## Troubleshooting

### Common Issues

**"User not found" error**
- Verify the email address is correct
- Check that the user exists in the database
- Ensure you're connected to the right database (dev vs prod)

**Script fails to run**
- Make sure you're in the project root directory
- Verify the script file exists at `src/scripts/make-admin.ts`
- Check that your database connection is working

**Admin features not working**
- Confirm the role was updated successfully
- Clear browser cache and cookies
- Check that the frontend is reading the user role correctly

### Verification Commands

```bash
# Check if user exists
bun run db:studio
# Then query: SELECT * FROM users WHERE email = 'user@example.com';

# Test admin endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/users
```

## Related Documentation

- [Authentication](/docs/features/authentication) - Learn about the auth system
- [Configuration](/docs/guide/configuration) - Database and environment setup
- [API Reference](/docs/api/server-api) - Admin endpoint documentation
- [Security](/docs/features/security) - Security best practices
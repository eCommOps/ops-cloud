# Ops Cloud Setup Guide

This is an enterprise-grade AI tools directory with full authentication, role-based access control, and tool execution environment.

## Architecture

- **Frontend**: Astro with SSR on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Session Storage**: Cloudflare KV
- **Authentication**: JWT with bcrypt password hashing
- **Authorization**: Role-based access control (viewer, admin, super_user)

## Prerequisites

1. Cloudflare account
2. Wrangler CLI installed (`npm install -g wrangler`)
3. Node.js 18+ installed

## Database Setup

### 1. Create D1 Database

```bash
wrangler d1 create ops-cloud-db
```

Copy the database ID from the output and update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "ops-cloud-db",
    "database_id": "YOUR_DATABASE_ID_HERE"
  }
]
```

### 2. Run Database Migrations

```bash
wrangler d1 execute ops-cloud-db --file=./db/schema.sql
```

### 3. Create Initial Super User (Local Development)

```bash
wrangler d1 execute ops-cloud-db --command="
INSERT INTO users (id, email, password_hash, role, created_at, updated_at, is_active, email_verified)
VALUES (
  'super-user-001',
  'admin@mybobs.com',
  '\$2a\$10\$YourHashedPasswordHere',
  'super_user',
  $(date +%s)000,
  $(date +%s)000,
  1,
  1
);"
```

To generate a password hash:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(console.log)"
```

## KV Namespace Setup

### 1. Create KV Namespace for Sessions

```bash
wrangler kv:namespace create "SESSION"
```

Copy the namespace ID and update `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "SESSION",
    "id": "YOUR_KV_NAMESPACE_ID_HERE"
  }
]
```

## Environment Variables

Update `wrangler.jsonc` with secure values:

```jsonc
"vars": {
  "JWT_SECRET": "CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS",
  "ALLOWED_EMAIL_DOMAIN": "mybobs.com"
}
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## User Roles

### Viewer (Default)
- Can view all tools in the directory
- Cannot execute tools
- Cannot edit tool configurations
- Read-only access

### Admin
- Can view all tools
- Can execute tools
- Cannot edit tool configurations
- Can manage users (except super_users)

### Super User
- Full access to everything
- Can execute tools
- Can edit tool configurations
- Can manage all users including admins
- Can modify tool permissions

## Tool Development Workflow

### Isolated Development Structure

Each tool is developed in its own isolated environment:

```
src/
  tools/              # Tool implementations (isolated)
    tool-name/
      index.astro     # Tool UI
      api.ts          # Tool backend logic
      schema.ts       # Input/output validation
      README.md       # Tool documentation
  content/
    tools/            # Tool metadata only
      tool-name.md    # Public-facing description
```

### Working on Tools in Branches

1. **Create a feature branch for each tool**:
```bash
git checkout -b tool/ai-analyzer
```

2. **Develop the tool in isolation**:
```
src/tools/ai-analyzer/
  ├── index.astro      # UI components
  ├── api.ts           # Backend logic
  ├── schema.ts        # Zod validation schemas
  └── README.md        # Development notes
```

3. **Never modify other tools** - each tool is completely isolated

4. **Merge to main when ready**:
```bash
git checkout main
git merge tool/ai-analyzer
```

This prevents:
- Tool code conflicts
- Accidental overwrites
- Breaking other tools while developing

## Security Features

### Authentication
- Email domain restriction (@mybobs.com only)
- Bcrypt password hashing (10 rounds)
- JWT tokens with 7-day expiration
- Session management in Cloudflare KV

### Authorization
- Role-based access control at middleware level
- Per-tool permission system
- Execution logging for audit trails
- IP address and user agent tracking

### Audit Logging
All sensitive actions are logged:
- User logins/logouts
- Role changes
- Tool executions
- Permission modifications

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (@mybobs.com only)
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout and invalidate session
- `GET /api/auth/me` - Get current user info

### Admin (admin/super_user only)
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/role` - Update user role (super_user only)
- `DELETE /api/admin/users/:id` - Deactivate user (super_user only)

### Tools
- `GET /api/tools/:slug` - Get tool details
- `POST /api/tools/:slug/execute` - Execute tool (admin/super_user only)
- `GET /api/tools/:slug/permissions` - Check tool permissions

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Run local D1 database:
```bash
wrangler d1 execute ops-cloud-db --local --file=./db/schema.sql
```

3. Start development server:
```bash
npm run dev
```

4. Access at `http://localhost:4322`

## Production Deployment

### Automatic Deployment (via GitHub Actions)
Simply push to `main` branch - GitHub Actions will:
1. Build the project
2. Run database migrations
3. Deploy to Cloudflare Workers

### Manual Deployment
```bash
npm run build
wrangler deploy
```

## Adding New Tools

1. Create tool metadata in `src/content/tools/tool-name.md`
2. Create tool implementation in `src/tools/tool-name/`
3. Define input/output schemas with Zod
4. Implement execution logic with proper error handling
5. Set tool permissions (default: viewers can view, admins can execute)

## Monitoring

- View logs: `wrangler tail`
- Check D1 database: `wrangler d1 execute ops-cloud-db --command="SELECT * FROM users"`
- Monitor executions: `wrangler d1 execute ops-cloud-db --command="SELECT * FROM tool_executions LIMIT 10"`

## Troubleshooting

### "Invalid binding `SESSION`" error
- Ensure KV namespace is created and ID is in wrangler.jsonc

### "Database not found" error
- Run database migration: `wrangler d1 execute ops-cloud-db --file=./db/schema.sql`

### "Unauthorized" errors
- Check JWT_SECRET is set correctly
- Verify token is being sent in Authorization header or cookie
- Check user role has required permissions

## Next Steps

1. Complete the authentication UI (login/register pages)
2. Build admin dashboard for user management
3. Create tool execution environment with sandboxing
4. Add advanced animations and interactions
5. Implement real-time updates with WebSockets
6. Add tool versioning system
7. Build analytics dashboard

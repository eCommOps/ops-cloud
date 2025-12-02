# Cloudflare Setup Guide

This guide will walk you through setting up the D1 database and KV namespace in Cloudflare.

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler@latest
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open your browser to authenticate with Cloudflare.

## Step 3: Create D1 Database

```bash
wrangler d1 create ops-cloud-db
```

You'll see output like:
```
✅ Successfully created DB 'ops-cloud-db'!

[[d1_databases]]
binding = "DB"
database_name = "ops-cloud-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**COPY the `database_id` value!**

## Step 4: Run Database Migrations

```bash
wrangler d1 execute ops-cloud-db --file=./db/schema.sql
```

You should see:
```
🌀 Mapping SQL input into an array of statements
🌀 Parsing 6 statements
🌀 Executing on ops-cloud-db (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx):
✅ Successfully executed 6 commands.
```

## Step 5: Create KV Namespace

```bash
wrangler kv:namespace create "SESSION"
```

You'll see output like:
```
✨  Success!
Add the following to your configuration file:
kv_namespaces = [
  { binding = "SESSION", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
]
```

**COPY the `id` value!**

## Step 6: Update wrangler.toml

Edit `wrangler.toml` and replace the placeholders:

```toml
[[d1_databases]]
binding = "DB"
database_name = "ops-cloud-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace with actual ID from Step 3

[[kv_namespaces]]
binding = "SESSION"
id = "YOUR_KV_ID_HERE"  # Replace with actual ID from Step 5
```

## Step 7: Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (it will be a long string like `a1b2c3d4e5f6...`).

Update `wrangler.toml`:
```toml
[vars]
JWT_SECRET = "YOUR_GENERATED_SECRET_HERE"  # Replace with actual secret
ALLOWED_EMAIL_DOMAIN = "mybobs.com"
```

## Step 8: Create Super User

First, generate a password hash:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourSecurePassword123', 10).then(console.log)"
```

Copy the hash output (starts with `$2a$10$...`).

Then insert the super user:

```bash
wrangler d1 execute ops-cloud-db --command="
INSERT INTO users (id, email, password_hash, role, created_at, updated_at, is_active, email_verified)
VALUES (
  'super-user-001',
  'admin@mybobs.com',
  '\$2a\$10\$YOUR_HASH_HERE',
  'super_user',
  $(date +%s)000,
  $(date +%s)000,
  1,
  1
);"
```

**Replace `YOUR_HASH_HERE` with the hash from above (keep the `$2a$10$` prefix)**

## Step 9: Set GitHub Secrets (for Auto-Deploy)

Go to: `https://github.com/eCommOps/ops-cloud/settings/secrets/actions`

Add these secrets:

### CLOUDFLARE_API_TOKEN
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template
4. Click "Continue to summary" → "Create Token"
5. Copy the token
6. Add as GitHub secret: `CLOUDFLARE_API_TOKEN`

### CLOUDFLARE_ACCOUNT_ID
1. Go to https://dash.cloudflare.com/
2. Click on "Workers & Pages"
3. Your Account ID is shown on the right side
4. Copy it
5. Add as GitHub secret: `CLOUDFLARE_ACCOUNT_ID`

## Step 10: Add Bindings to Cloudflare Dashboard

1. Go to https://dash.cloudflare.com/
2. Click "Workers & Pages"
3. Click on your "ops-cloud" worker
4. Click "Settings" → "Variables"

### Add D1 Database Binding:
- Click "Add" under "D1 Database Bindings"
- Variable name: `DB`
- D1 database: Select "ops-cloud-db"
- Click "Save"

### Add KV Namespace Binding:
- Click "Add" under "KV Namespace Bindings"
- Variable name: `SESSION`
- KV namespace: Create or select your SESSION namespace
- Click "Save"

### Add Environment Variables:
- Click "Add variable" under "Environment Variables"
- Name: `JWT_SECRET`
- Value: Your generated secret from Step 7
- Click "Encrypt" (important!)
- Click "Add variable"
- Name: `ALLOWED_EMAIL_DOMAIN`
- Value: `mybobs.com`
- Click "Save"

## Step 11: Deploy!

### Option A: Manual Deploy
```bash
npm run build
wrangler deploy
```

### Option B: GitHub Actions (Automatic)
Just push to main:
```bash
git push origin main
```

GitHub Actions will automatically deploy!

## Step 12: Test Your Deployment

1. Go to your worker URL (shown after deploy)
2. You should see the login page
3. Click "Sign Up"
4. Try to register with a non-@mybobs.com email → Should fail
5. Register with `test@mybobs.com` → Should succeed
6. Login with super user: `admin@mybobs.com` / `YourSecurePassword123`
7. You should see the directory with execute buttons
8. Click "Admin" → Should see admin dashboard

## Troubleshooting

### "KV namespace not found" error
- Make sure you added the KV binding in Cloudflare dashboard (Step 10)
- Variable name must be exactly `SESSION`

### "Database not found" error
- Make sure you added the D1 binding in Cloudflare dashboard (Step 10)
- Variable name must be exactly `DB`

### "Invalid JWT" error
- Make sure JWT_SECRET is set in Cloudflare dashboard (Step 10)
- Make sure it's the same secret in wrangler.toml and Cloudflare dashboard

### Cannot login as super user
- Check you ran the INSERT command correctly
- The password hash must start with `$2a$10$`
- The email must be exact: `admin@mybobs.com`

### Build fails
- Make sure all dependencies are installed: `npm install`
- Make sure TypeScript compiles: `npm run build`

## Verify Everything Works

Run this checklist:

```bash
# 1. Check D1 database exists
wrangler d1 list

# 2. Check tables were created
wrangler d1 execute ops-cloud-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# 3. Check super user exists
wrangler d1 execute ops-cloud-db --command="SELECT id, email, role FROM users WHERE role='super_user';"

# 4. Check KV namespace exists
wrangler kv:namespace list
```

## You're Done! 🎉

Your ops-cloud platform is now deployed and ready to use!

### Next Steps:
1. Login as super user
2. Create more user accounts
3. Assign roles (viewer, admin, super_user)
4. Start using the tools!

### URLs:
- Workers.dev: https://ops-cloud.manuel-medina.workers.dev
- Custom Domain: https://opscloud.us (if DNS is configured)
- Admin Dashboard: `/admin`

### Default Credentials:
- Email: `admin@mybobs.com`
- Password: `YourSecurePassword123` (change this!)

**IMPORTANT: Change the super user password after first login!**

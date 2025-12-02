# 🚀 Quick User Setup

Your login is failing because the user doesn't exist yet. Follow these steps:

## Step 1: Run Database Migrations

This creates all the necessary tables:

```bash
npx wrangler d1 execute opscloud_admindb --remote --file=./db/schema.sql
```

## Step 2: Generate Password Hash

Run this locally (requires Node.js):

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourSecurePassword123', 10).then(console.log)"
```

Copy the output (starts with `$2a$10$...`)

## Step 3: Create Your Super User

Replace `YOUR_HASH_HERE` with the hash from Step 2:

```bash
npx wrangler d1 execute opscloud_admindb --remote --command="
INSERT INTO users (id, email, password_hash, role, created_at, updated_at, is_active, email_verified)
VALUES (
  'super-user-001',
  'manuel.medina@mybobs.com',
  '\$2a\$10\$YOUR_HASH_HERE',
  'super_user',
  $(date +%s)000,
  $(date +%s)000,
  1,
  1
);"
```

## Step 4: Verify User Was Created

```bash
npx wrangler d1 execute opscloud_admindb --remote --command="SELECT id, email, role FROM users WHERE email='manuel.medina@mybobs.com';"
```

You should see:
```
┌────────────────┬────────────────────────────┬────────────┐
│ id             │ email                      │ role       │
├────────────────┼────────────────────────────┼────────────┤
│ super-user-001 │ manuel.medina@mybobs.com   │ super_user │
└────────────────┴────────────────────────────┴────────────┘
```

## Step 5: Login

Now you can login at https://opscloud.us/login with:
- Email: `manuel.medina@mybobs.com`
- Password: `YourSecurePassword123` (or whatever you chose)

---

## Alternative: Use Cloudflare Dashboard

If you prefer to use the dashboard:

1. Go to https://dash.cloudflare.com/
2. Click **Workers & Pages** → **D1**
3. Click **opscloud_admindb**
4. Click **Console** tab
5. Paste contents of `db/schema.sql` and click Execute
6. Generate hash: `node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourPassword', 10).then(console.log)"`
7. In D1 Console, run:
```sql
INSERT INTO users (id, email, password_hash, role, created_at, updated_at, is_active, email_verified)
VALUES (
  'super-user-001',
  'manuel.medina@mybobs.com',
  '$2a$10$YOUR_HASH_HERE',
  'super_user',
  1733165000000,
  1733165000000,
  1,
  1
);
```

---

## Troubleshooting

### "User already exists"
Your user is already created! Try logging in.

### "Table already exists"
Tables are created! Skip to Step 2.

### Still can't login?
Check the browser console for the exact error message and password hash format.

# 🚀 Quick Deploy Guide

Your Cloudflare resources are configured! Follow these steps to complete setup and deploy.

## ✅ What's Already Done

- ✅ D1 Database created: `opscloud_admindb` (ID: `aa2eb914-8299-4adf-8e2a-c64d364caa8f`)
- ✅ KV Namespace created: `OPSCLOUD_ADMINKV` (ID: `9e5ce6f579a64566a2cfa75147e65559`)
- ✅ JWT Secret generated: `9a23dcbdde512a18b2df3699661b3893c180dfa2a57bffee996c7b9f7e27acc5`
- ✅ wrangler.toml updated with your IDs

## 📋 Next Steps (5 minutes)

### Step 1: Run Database Migrations

Run this command from your local machine (where you have Wrangler authenticated):

```bash
npx wrangler d1 execute opscloud_admindb --remote --file=./db/schema.sql
```

You should see:
```
🌀 Executing on opscloud_admindb (aa2eb914-8299-4adf-8e2a-c64d364caa8f):
✅ Successfully executed 6 commands.
```

### Step 2: Create Super User

Generate password hash:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourSecurePassword123', 10).then(console.log)"
```

Copy the hash (starts with `$2a$10$...`) and run:

```bash
npx wrangler d1 execute opscloud_admindb --remote --command="
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

**Replace `YOUR_HASH_HERE` with the hash from above.**

### Step 3: Deploy to Cloudflare

```bash
npm run build
npx wrangler deploy
```

### Step 4: Test Your Platform

1. Visit: `https://ops-cloud.manuel-medina.workers.dev` or `https://opscloud.us`
2. Click "Sign Up"
3. Register with: `test@mybobs.com`
4. Login and explore!

**Super User Login:**
- Email: `admin@mybobs.com`
- Password: `YourSecurePassword123`

---

## 🔍 Verify Everything Works

```bash
# Check tables were created
npx wrangler d1 execute opscloud_admindb --remote --command="SELECT name FROM sqlite_master WHERE type='table';"

# Check super user exists
npx wrangler d1 execute opscloud_admindb --remote --command="SELECT id, email, role FROM users WHERE role='super_user';"
```

---

## 🎯 Alternative: Use Cloudflare Dashboard

If you prefer to use the dashboard instead of CLI:

### Run Migrations via Dashboard:
1. Go to https://dash.cloudflare.com/
2. Click "Workers & Pages" → "D1"
3. Click "opscloud_admindb"
4. Click "Console" tab
5. Copy contents of `db/schema.sql` and paste
6. Click "Execute"

### Create Super User via Dashboard:
1. Generate hash: `node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourSecurePassword123', 10).then(console.log)"`
2. In D1 Console, run:
```sql
INSERT INTO users (id, email, password_hash, role, created_at, updated_at, is_active, email_verified)
VALUES (
  'super-user-001',
  'admin@mybobs.com',
  '$2a$10$YOUR_HASH_HERE',
  'super_user',
  1733164800000,
  1733164800000,
  1,
  1
);
```

---

## 🚨 Troubleshooting

### "Table already exists" error
Tables are already created, skip Step 1 and go to Step 2.

### "User already exists" error
Super user is already created! Try logging in.

### Build fails
```bash
npm install
npm run build
```

### Deployment fails
Make sure you're logged in:
```bash
npx wrangler login
```

---

## ✅ Success Checklist

- [ ] Database migrations run (6 tables created)
- [ ] Super user created
- [ ] Platform deployed
- [ ] Can access platform URL
- [ ] Can register new user
- [ ] Can login as super user
- [ ] Can see admin dashboard
- [ ] Can execute tools

---

## 🎉 You're Done!

Your platform is live at:
- **Workers URL**: https://ops-cloud.manuel-medina.workers.dev
- **Custom Domain**: https://opscloud.us
- **Admin Dashboard**: /admin

**Default Login:**
- Email: `admin@mybobs.com`
- Password: `YourSecurePassword123`

Change the password after first login!

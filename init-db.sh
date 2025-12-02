#!/bin/bash

echo "🚀 Initializing Ops Cloud Database..."
echo ""

# Step 1: Create tables
echo "📋 Step 1: Creating database tables..."
npx wrangler d1 execute opscloud_admindb --remote --file=./db/schema.sql

if [ $? -ne 0 ]; then
  echo "❌ Failed to create tables. Make sure you're logged in with: npx wrangler login"
  exit 1
fi

echo "✅ Tables created successfully!"
echo ""

# Step 2: Generate password hash
echo "🔐 Step 2: Creating super user account..."
echo "Enter your desired password (or press Enter to use 'AdminPass123'):"
read -s USER_PASSWORD
USER_PASSWORD=${USER_PASSWORD:-AdminPass123}

echo "Generating password hash..."
HASH=$(node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('$USER_PASSWORD', 10).then(console.log)")

echo "Creating user with email: manuel.medina@mybobs.com"

# Step 3: Create super user
TIMESTAMP=$(date +%s)000

npx wrangler d1 execute opscloud_admindb --remote --command="
INSERT INTO users (id, email, password_hash, role, created_at, updated_at, is_active, email_verified)
VALUES (
  'super-user-001',
  'manuel.medina@mybobs.com',
  '$HASH',
  'super_user',
  $TIMESTAMP,
  $TIMESTAMP,
  1,
  1
);"

if [ $? -ne 0 ]; then
  echo "❌ Failed to create user. User might already exist."
  exit 1
fi

echo ""
echo "✅ Database initialized successfully!"
echo ""
echo "🎉 You can now login at https://opscloud.us/login"
echo ""
echo "   Email: manuel.medina@mybobs.com"
echo "   Password: $USER_PASSWORD"
echo ""
echo "⚠️  Save your password - it won't be shown again!"

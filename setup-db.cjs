#!/usr/bin/env node

/**
 * Database Initialization Script
 * Run with: node setup-db.js <CLOUDFLARE_API_TOKEN>
 */

const https = require('https');
const fs = require('fs');

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.argv[2];
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'your-account-id';
const DATABASE_ID = 'aa2eb914-8299-4adf-8e2a-c64d364caa8f';

if (!API_TOKEN) {
  console.error('❌ Error: CLOUDFLARE_API_TOKEN is required');
  console.error('Usage: node setup-db.js <API_TOKEN>');
  console.error('Or set CLOUDFLARE_API_TOKEN environment variable');
  process.exit(1);
}

// Read the schema file
const schema = fs.readFileSync('./db/schema.sql', 'utf8');

console.log('🚀 Initializing Ops Cloud Database...\n');

// Execute SQL via Cloudflare API
const data = JSON.stringify({ sql: schema });

const options = {
  hostname: 'api.cloudflare.com',
  port: 443,
  path: `/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('📋 Creating database tables...');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', async () => {
    if (res.statusCode === 200) {
      console.log('✅ Tables created successfully!\n');

      // Now create the super user
      console.log('👤 Creating super user account...');

      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('AdminPass123', 10);
      const timestamp = Date.now();

      const insertSQL = `
        INSERT INTO users (id, email, password_hash, role, created_at, updated_at, is_active, email_verified)
        VALUES (
          'super-user-001',
          'manuel.medina@mybobs.com',
          '${passwordHash}',
          'super_user',
          ${timestamp},
          ${timestamp},
          1,
          1
        );
      `;

      const insertData = JSON.stringify({ sql: insertSQL });

      const insertReq = https.request({
        ...options,
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': insertData.length
        }
      }, (insertRes) => {
        let insertResponseData = '';

        insertRes.on('data', (chunk) => {
          insertResponseData += chunk;
        });

        insertRes.on('end', () => {
          if (insertRes.statusCode === 200) {
            console.log('✅ Super user created!\n');
            console.log('🎉 Database setup complete!\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 Email: manuel.medina@mybobs.com');
            console.log('🔑 Password: AdminPass123');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log('🌐 Login at: https://opscloud.us/login\n');
          } else {
            console.error('❌ Failed to create user:', insertRes.statusCode);
            console.error(insertResponseData);
          }
        });
      });

      insertReq.on('error', (error) => {
        console.error('❌ Error creating user:', error.message);
      });

      insertReq.write(insertData);
      insertReq.end();

    } else {
      console.error('❌ Failed to create tables:', res.statusCode);
      console.error(responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(data);
req.end();

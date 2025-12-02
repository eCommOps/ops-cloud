# Cloudflare Workers Deployment Setup

This project is configured to automatically deploy to Cloudflare Workers on every push to the `main` branch.

## GitHub Secrets Required

You need to add these secrets to your GitHub repository:

### 1. CLOUDFLARE_API_TOKEN

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template or create a custom token with these permissions:
   - Account > Cloudflare Workers Scripts > Edit
   - Account > Account Settings > Read
4. Copy the token and add it to GitHub:
   - Go to your repo: `https://github.com/eCommOps/ops-cloud/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: Paste your API token

### 2. CLOUDFLARE_ACCOUNT_ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Your Account ID is shown in the right sidebar (or in the URL)
4. Add it to GitHub secrets:
   - Go to your repo: `https://github.com/eCommOps/ops-cloud/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: Paste your Account ID

## How It Works

1. You push code to the `main` branch
2. GitHub Actions automatically triggers
3. The workflow:
   - Checks out your code
   - Installs dependencies
   - Builds your Astro project
   - Deploys to Cloudflare Workers using Wrangler

## Manual Deployment

To deploy manually from your local machine:

```bash
npm install -g wrangler
wrangler login
npm run build
wrangler deploy
```

## Observability Configuration

The project includes observability settings in [wrangler.jsonc](wrangler.jsonc):
- **Logs**: Enabled with full sampling and persistence
- **Traces**: Configured but currently disabled
- **Invocation logs**: Enabled for detailed request tracking

To view logs after deployment:
```bash
wrangler tail
```

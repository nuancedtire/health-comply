# Better Auth Setup for Cloudflare Workers

This document explains how to configure Better Auth for production deployment on Cloudflare Workers.

## Required Environment Variables

You must set the following environment variables in your Cloudflare Dashboard:

### 1. BETTER_AUTH_SECRET (Required)
- **Purpose**: Used for encryption, signing, and hashing by Better Auth
- **Requirements**: Must be at least 32 characters with high entropy
- **How to generate**: Run `openssl rand -base64 32` in your terminal
- **Example**: `dGhpc2lzYXNlY3JldGtleWZvcmJldHRlcmF1dGg=`

### 2. BETTER_AUTH_URL (Required for Production)
- **Purpose**: Tells Better Auth the base URL of your application
- **Format**: Your production domain (e.g., `https://your-app.workers.dev`)
- **Example**: `https://health-comply.pages.dev`

### 3. BETTER_AUTH_TRUSTED_ORIGINS (Optional but Recommended)
- **Purpose**: Specifies which origins can make requests to your auth endpoints (CORS protection)
- **Format**: Comma-separated list of origins
- **Example**: `https://your-app.workers.dev,https://your-custom-domain.com`
- **Wildcard support**: You can use patterns like `https://*.your-domain.com`
- **Note**: If not set, only the baseURL will be trusted

## Setting Environment Variables in Cloudflare

### Method 1: Cloudflare Dashboard (Recommended for Production)

1. Go to your Cloudflare Workers dashboard
2. Select your Worker
3. Navigate to **Settings** → **Variables**
4. Add the following variables:
   - `BETTER_AUTH_SECRET`: Your generated secret
   - `BETTER_AUTH_URL`: Your production URL
   - `BETTER_AUTH_TRUSTED_ORIGINS`: Your trusted origins (comma-separated)
5. Click **Save**

### Method 2: Wrangler CLI (For Development)

For local development, create a `.dev.vars` file in your project root:

```bash
BETTER_AUTH_SECRET=your-generated-secret-here
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
```

**Note**: `.dev.vars` should be added to `.gitignore` (it already is by default).

### Method 3: wrangler.jsonc (Not Recommended for Secrets)

You can add non-secret variables to `wrangler.jsonc`, but **DO NOT** put secrets here:

```jsonc
{
  "vars": {
    "BETTER_AUTH_URL": "https://your-app.workers.dev"
  }
}
```

## Quick Setup Checklist

- [ ] Generate a secret: `openssl rand -base64 32`
- [ ] Add `BETTER_AUTH_SECRET` to Cloudflare Dashboard
- [ ] Add `BETTER_AUTH_URL` with your production URL
- [ ] (Optional) Add `BETTER_AUTH_TRUSTED_ORIGINS` with trusted domains
- [ ] Deploy your application
- [ ] Test login/signup on the deployed version

## Troubleshooting

### Issue: "Database binding missing"
**Solution**: Ensure your D1 database is properly bound in `wrangler.jsonc` and deployed to Cloudflare.

### Issue: "Unauthorized" or CORS errors
**Solution**: Check that `BETTER_AUTH_TRUSTED_ORIGINS` includes your frontend domain.

### Issue: "Invalid secret"
**Solution**: Ensure `BETTER_AUTH_SECRET` is at least 32 characters long and properly set in Cloudflare Dashboard.

### Issue: Auth works locally but not in production
**Solutions**:
1. Verify all environment variables are set in Cloudflare Dashboard
2. Check that `BETTER_AUTH_URL` matches your production URL
3. Ensure you've deployed the latest code with `pnpm deploy`
4. Check Cloudflare Workers logs for specific error messages

## Security Notes

1. **Never commit secrets**: Keep `.dev.vars` in `.gitignore`
2. **Use strong secrets**: Always generate secrets with high entropy
3. **Trusted origins**: Only add domains you control to prevent CSRF attacks
4. **HTTPS in production**: Always use HTTPS for `BETTER_AUTH_URL` in production

## Additional Resources

- [Better Auth Documentation](https://www.better-auth.com/docs/basic-usage)
- [Better Auth Options Reference](https://www.better-auth.com/docs/reference/options)
- [Better Auth Security Guide](https://www.better-auth.com/docs/reference/security)
- [Cloudflare Workers Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)

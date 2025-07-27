# GitHub Secrets Setup Guide

## Required Secrets for CI/CD Pipeline

To fully enable the CI/CD pipeline, add these secrets to your GitHub repository:

### 1. Navigate to Repository Settings
1. Go to your repository on GitHub
2. Click on "Settings" tab
3. In the left sidebar, click on "Secrets and variables" → "Actions"

### 2. Add the Following Secrets

Click "New repository secret" for each:

#### Essential Secrets (Required)
- **VITE_SUPABASE_URL**: Your Supabase project URL
  - Get from: Supabase Dashboard → Settings → API
  - Example: `https://xyzcompany.supabase.co`

- **VITE_SUPABASE_ANON_KEY**: Your Supabase anonymous key
  - Get from: Supabase Dashboard → Settings → API → anon public
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### Optional Secrets (For Enhanced Features)
- **CODECOV_TOKEN**: For code coverage reports
  - Get from: https://codecov.io → Your repo → Settings
  
- **SENTRY_AUTH_TOKEN**: For source map uploads
  - Get from: Sentry → Settings → Auth Tokens → Create New Token
  - Scopes needed: `project:releases`, `org:read`

- **SONAR_TOKEN**: For code quality analysis (if using SonarCloud)
  - Get from: https://sonarcloud.io → My Account → Security

- **VERCEL_TOKEN**: For preview deployments (if using Vercel)
  - Get from: Vercel → Settings → Tokens

### 3. Verify Secrets
After adding, you should see them listed in the "Repository secrets" section.

## Testing the Pipeline

1. Create a new branch: `git checkout -b test-ci`
2. Make a small change
3. Push and create a PR
4. Watch the checks run in the PR

## Notes
- Secrets are encrypted and only exposed to workflows
- They are not visible in logs
- Update them periodically for security
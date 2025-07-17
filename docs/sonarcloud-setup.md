# SonarCloud Integration Setup Guide

## Overview
This guide provides step-by-step instructions to complete the SonarCloud integration for the iwishBag project. The automated workflow has been created and configured, but manual setup steps are required to activate the integration.

## Prerequisites
- GitHub repository access with admin permissions
- Access to the iwishBag codebase

## Manual Setup Steps

### 1. Create SonarCloud Account and Organization

1. **Visit SonarCloud**: Go to [https://sonarcloud.io](https://sonarcloud.io)
2. **Sign up/Login**: Use your GitHub account to sign up or log in
3. **Create Organization**: 
   - Click "+" in the top navigation
   - Select "Create an organization"
   - Choose "Free plan" for open source projects
   - Enter organization details:
     - **Organization Key**: `iwishbag-org` (or your preferred key)
     - **Display Name**: `iwishBag`
     - **Description**: `E-commerce platform for international shopping`

### 2. Create SonarCloud Project

1. **Import Project**: 
   - In your SonarCloud organization, click "Analyze new project"
   - Select "GitHub" as the source
   - Choose the iwishBag repository
2. **Configure Project**:
   - **Project Key**: `iwishBag`
   - **Display Name**: `iwishBag`
   - **Main Branch**: `main`

### 3. Generate SonarCloud Token

1. **Navigate to Security**: 
   - Click on your profile icon (top right)
   - Select "My Account"
   - Go to "Security" tab
2. **Generate Token**:
   - Click "Generate Tokens"
   - **Name**: `iwishBag-GitHub-Actions`
   - **Type**: "Global Analysis Token"
   - **Expires in**: Select appropriate duration (e.g., 90 days)
   - Click "Generate"
   - **IMPORTANT**: Copy the token immediately (it won't be shown again)

### 4. Add GitHub Repository Secret

1. **Go to Repository Settings**:
   - Navigate to your GitHub repository
   - Click "Settings" tab
   - Select "Secrets and variables" → "Actions"
2. **Add New Secret**:
   - Click "New repository secret"
   - **Name**: `SONAR_TOKEN`
   - **Secret**: Paste the token you copied from SonarCloud
   - Click "Add secret"

### 5. Update Workflow Configuration

Update the SonarCloud organization in the workflow file:

1. **Edit Workflow File**: `.github/workflows/sonarcloud.yml`
2. **Find Line 52**: 
   ```yaml
   -Dsonar.organization=your-sonarcloud-organization \
   ```
3. **Replace with your organization key**:
   ```yaml
   -Dsonar.organization=iwishbag-org \
   ```

## Verification Steps

### 1. Test the Integration

1. **Push Changes**: Commit and push the updated workflow file
2. **Check GitHub Actions**: 
   - Go to "Actions" tab in your repository
   - Look for "SonarCloud Analysis" workflow
   - Ensure it runs successfully
3. **Check SonarCloud Dashboard**:
   - Visit your SonarCloud project
   - Verify that analysis results appear
   - Review code quality metrics

### 2. Validate Coverage Reports

1. **Coverage Generation**: Ensure tests generate LCOV reports in `coverage/lcov.info`
2. **ESLint Integration**: Verify ESLint reports are generated as `eslint-report.json`
3. **SonarCloud Metrics**: Check that coverage percentages appear in SonarCloud

## Configuration Details

### Coverage Requirements
- **Minimum Coverage**: 70% for statements, branches, functions, and lines
- **Coverage Format**: LCOV for SonarCloud integration
- **Test Framework**: Vitest with jsdom environment

### Code Quality Gates
- **ESLint Integration**: JSON output for detailed rule violations
- **TypeScript Coverage**: Source code analysis including type checking
- **Security Analysis**: Integration with existing Semgrep SAST

### Project Structure
```
iwishBag/
├── coverage/                 # Generated coverage reports
│   ├── lcov.info            # LCOV format for SonarCloud
│   └── ...                  # Other coverage formats
├── eslint-report.json       # ESLint results for SonarCloud
├── .github/workflows/
│   ├── sonarcloud.yml       # SonarCloud analysis workflow
│   └── code-quality.yml     # Main quality checks
└── docs/
    └── sonarcloud-setup.md  # This documentation
```

## Troubleshooting

### Common Issues

1. **Token Authentication Errors**:
   - Verify `SONAR_TOKEN` is correctly added to GitHub secrets
   - Ensure token hasn't expired
   - Check organization permissions

2. **Coverage Report Not Found**:
   - Verify `npm run test:coverage` generates `coverage/lcov.info`
   - Check vitest configuration includes LCOV reporter
   - Ensure coverage thresholds are met

3. **Organization Not Found**:
   - Verify organization key matches exactly
   - Check SonarCloud organization exists and is accessible
   - Ensure project is properly created in SonarCloud

### Workflow Triggers

The SonarCloud analysis runs on:
- **Push to main branch**: Full analysis for production code
- **Pull requests**: Analysis for code changes
- **Manual trigger**: `workflow_dispatch` for on-demand analysis

## Next Steps

After completing the setup:

1. **Monitor Quality Gates**: Set up SonarCloud quality gates for your requirements
2. **Branch Protection**: Consider requiring SonarCloud checks for PR merging
3. **Notifications**: Configure SonarCloud notifications for quality gate failures
4. **Regular Reviews**: Establish periodic code quality reviews using SonarCloud metrics

## Resources

- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [GitHub Actions Integration](https://docs.sonarcloud.io/advanced-setup/ci-based-analysis/github-actions/)
- [TypeScript Analysis](https://docs.sonarcloud.io/enriching-the-analysis/languages/typescript/)
- [Coverage Integration](https://docs.sonarcloud.io/enriching-the-analysis/test-coverage/overview/)
# Automatic Cache Refresh System

This application includes an automatic cache refresh system that forces cache invalidation whenever a new deployment is made. This ensures users always get fresh data after updates without manual intervention.

## How It Works

### 1. Deployment Tracking
- Each deployment gets a unique timestamp stored in `src/config/deployment.ts`
- The application checks this timestamp on startup and compares it with locally stored deployment ID
- If a new deployment is detected, all cache is automatically cleared

### 2. Files Involved

- **`src/config/deployment.ts`** - Contains deployment timestamp and configuration
- **`scripts/update-deployment.js`** - Script to update deployment timestamp
- **`deploy.sh`** - Complete deployment script with cache refresh
- **`src/services/cacheService.ts`** - Modified to check for deployment changes

### 3. Cache Refresh Logic

```typescript
export const shouldForceRefresh = (): boolean => {
  const storedDeploymentId = localStorage.getItem('cryptosage-deployment-id');
  const currentDeploymentId = getDeploymentId();
  
  if (!storedDeploymentId || storedDeploymentId !== currentDeploymentId) {
    console.log('New deployment detected, forcing cache refresh');
    localStorage.setItem('cryptosage-deployment-id', currentDeploymentId);
    return true;
  }
  
  return false;
};
```

## Deployment Process

### Option 1: Using the Deploy Script (Recommended)
```bash
./deploy.sh
```

This script automatically:
1. Updates deployment timestamp
2. Builds the application  
3. Commits changes to git
4. Pushes to GitHub
5. Deploys to Vercel
6. Forces cache refresh for all users

### Option 2: Manual Process
```bash
# Update deployment config
npm run update-deployment

# Build and deploy
npm run build
npx vercel --prod

# Commit the config changes
git add src/config/deployment.ts package.json
git commit -m "chore: update deployment config"
git push origin main
```

### Option 3: GitHub Actions (Future Enhancement)
A GitHub Action is prepared in `.github/workflows/deploy.yml` that can automatically deploy and refresh cache on pushes to main branch.

## Benefits

1. **Automatic Cache Invalidation**: Users get fresh data immediately after deployments
2. **No Manual Intervention**: Cache refresh happens automatically
3. **Consistent Experience**: All users see the same data after deployments
4. **Deployment Tracking**: Each deployment is uniquely identified
5. **Fallback Safety**: System gracefully handles localStorage errors

## Configuration

### Deployment Config Structure
```typescript
export const DEPLOYMENT_CONFIG = {
  deploymentTimestamp: 1749657840259,    // Auto-updated timestamp
  deploymentVersion: '1.0.0',            // Manual version
  deploymentDate: '2025-06-11T16:04:00.259Z',  // Auto-updated date
  cacheVersion: 'v1.0.0'                 // Manual cache version
};
```

### NPM Scripts
- `npm run update-deployment` - Updates deployment timestamp
- `npm run predeploy` - Runs before deployment (updates config + builds)

## Logging

The system provides clear console logging:
- ✅ "New deployment detected, forcing cache refresh"
- 📝 "Deployment configuration updated successfully!"
- 🔄 "Cache will be automatically refreshed for all users"

## Troubleshooting

1. **Cache not refreshing**: Check browser console for deployment detection logs
2. **Build errors**: Ensure `src/config/deployment.ts` has valid TypeScript syntax
3. **Script permission**: Make sure `deploy.sh` is executable (`chmod +x deploy.sh`)

## Integration with Existing Cache System

The cache refresh system integrates seamlessly with the existing hourly cache system:
- Scheduled fetches continue to work every hour starting at 10:00 GMT+2
- Deployment-triggered refreshes override the schedule when needed
- Both systems use the same cache clearing mechanism 
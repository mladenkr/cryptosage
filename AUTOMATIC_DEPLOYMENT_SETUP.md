# Automatic Deployment Setup

This guide will help you set up completely automatic deployments that update the cache refresh system without any manual intervention.

## 🎯 Goal
Every time you push code to the `main` branch, the system should:
1. ✅ Automatically update deployment timestamp
2. ✅ Automatically deploy to Vercel
3. ✅ Force cache refresh for all users

## 🔧 Setup Options

### Option 1: Vercel GitHub Integration (Recommended)

This is the easiest and most reliable method:

1. **Connect Vercel to GitHub** (if not already done):
   - Go to [vercel.com](https://vercel.com)
   - Go to your project dashboard
   - Settings → Git → Connect to GitHub repository

2. **Enable Auto-Deploy**:
   - In Vercel project settings → Git
   - Make sure "Production Branch" is set to `main`
   - Enable "Automatically deploy successful builds"

3. **The automatic flow**:
   ```
   Push to main → GitHub Action updates deployment config → 
   Vercel detects new commit → Auto-deploys → Cache refreshes for users
   ```

### Option 2: GitHub Actions with Vercel CLI

If you want more control, set up Vercel secrets:

1. **Get Vercel Token**:
   ```bash
   npx vercel login
   npx vercel --token  # This will show your token
   ```

2. **Add GitHub Secrets**:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Add these secrets:
     - `VERCEL_TOKEN`: Your Vercel token
     - `VERCEL_ORG_ID`: Your organization ID
     - `VERCEL_PROJECT_ID`: Your project ID

3. **Update the GitHub Action** (uncomment this section):
   ```yaml
   - name: Deploy to Vercel
     run: |
       npm install -g vercel
       vercel --token ${{ secrets.VERCEL_TOKEN }} --prod --yes
   ```

## 🚀 Current Setup Status

✅ **GitHub Action**: Configured to update deployment config automatically
✅ **Cache Refresh System**: Working and integrated
✅ **Build Process**: Automated with proper scripts
🔄 **Vercel Deployment**: Needs GitHub integration setup

## 🔄 How It Works

### Current Automatic Flow:
1. **You push code** to `main` branch
2. **GitHub Action triggers** and updates `src/config/deployment.ts` 
3. **Vercel detects new commit** and auto-deploys (if GitHub integration is set up)
4. **Users visit site** and automatically get cache refresh

### Manual Backup Option:
If automatic deployment isn't working, you can still use:
```bash
./deploy.sh  # One command does everything
```

## 🎛️ Configuration Files

- **`.github/workflows/deploy.yml`**: GitHub Action for auto-updating deployment config
- **`src/config/deployment.ts`**: Deployment timestamp that triggers cache refresh
- **`scripts/update-deployment.js`**: Script that updates the timestamp
- **`deploy.sh`**: Manual deployment script (backup option)

## 🔍 Verifying Automatic Deployment

1. **Make a small change** to any file
2. **Push to main branch**:
   ```bash
   git add .
   git commit -m "test: trigger auto deployment"
   git push origin main
   ```
3. **Check GitHub Actions tab** in your repository
4. **Check Vercel dashboard** for new deployment
5. **Visit your site** - cache should refresh automatically

## 🛠️ Troubleshooting

### GitHub Action not running:
- Check `.github/workflows/deploy.yml` is in the repository
- Verify you have push permissions to the repository
- Check the Actions tab for error logs

### Vercel not deploying automatically:
- Ensure GitHub integration is connected in Vercel project settings
- Check that "main" is set as the production branch
- Verify no deployment errors in Vercel dashboard

### Cache not refreshing:
- Check browser console for "New deployment detected" message
- Verify deployment timestamp was updated in the latest commit
- Clear browser cache manually as a test

## ✅ Benefits of Automatic Setup

1. **Zero Manual Work**: Just push code, everything else is automatic
2. **Always Fresh Data**: Users get cache refresh on every deployment  
3. **No Deployment Forgotten**: Can't forget to update deployment config
4. **Consistent Process**: Same deployment process every time
5. **Error Prevention**: No manual steps means no manual errors

## 🎯 Next Steps

1. **Set up Vercel GitHub integration** (if not done)
2. **Test the automatic flow** with a small commit
3. **Optional**: Configure Vercel CLI secrets for full GitHub Actions control
4. **Enjoy automatic deployments!** 🎉 
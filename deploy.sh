#!/bin/bash

echo "🚀 Starting deployment process..."

# Update deployment configuration
echo "📝 Updating deployment configuration..."
npm run update-deployment

# Build the application
echo "🔨 Building application..."
npm run build

# Commit the deployment config changes
echo "📝 Committing deployment config changes..."
git add src/config/deployment.ts package.json
git commit -m "chore: update deployment config for cache refresh [auto-deploy]" || echo "No changes to commit"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
npx vercel --prod

echo "✅ Deployment complete!"
echo "🔄 Cache will be automatically refreshed for all users" 
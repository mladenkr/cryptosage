#!/bin/bash

# CryptoSage Deployment Reminder Script
# This script ensures we never forget to deploy changes!

set -e  # Exit on any error

echo "🚀 CryptoSage Deployment Reminder Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "Not in a git repository! Please run this from the project root."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_status "Found uncommitted changes. Let's commit them first..."
    
    # Show status
    git status --short
    
    # Add all changes
    print_status "Adding all changes to git..."
    git add .
    
    # Get commit message
    echo ""
    echo "Enter commit message (or press Enter for default):"
    read -r commit_message
    
    if [ -z "$commit_message" ]; then
        commit_message="Enhanced AI system with multi-source analysis and 500+ coin support"
    fi
    
    # Commit changes
    print_status "Committing changes..."
    git commit -m "$commit_message"
    print_success "Changes committed successfully!"
else
    print_success "No uncommitted changes found."
fi

# Check if we have a remote origin
if ! git remote get-url origin >/dev/null 2>&1; then
    print_error "No git remote 'origin' found!"
    echo "Please add your GitHub repository as origin:"
    echo "git remote add origin https://github.com/yourusername/cryptosage.git"
    exit 1
fi

# Push to GitHub
print_status "Pushing to GitHub..."
current_branch=$(git branch --show-current)
print_status "Current branch: $current_branch"

if git push origin "$current_branch"; then
    print_success "Successfully pushed to GitHub!"
else
    print_error "Failed to push to GitHub. Please check your credentials and network connection."
    exit 1
fi

# Check if Vercel is configured
print_status "Checking Vercel deployment status..."

if command -v vercel >/dev/null 2>&1; then
    print_success "Vercel CLI found!"
    
    # Check if project is linked
    if [ -f ".vercel/project.json" ]; then
        print_success "Vercel project is linked!"
        
        # Trigger deployment
        print_status "Triggering Vercel deployment..."
        if vercel --prod; then
            print_success "Vercel deployment triggered successfully!"
        else
            print_warning "Vercel deployment may have failed. Check Vercel dashboard."
        fi
    else
        print_warning "Vercel project not linked. Run 'vercel' to link your project."
        print_status "You can also deploy via GitHub integration on Vercel dashboard."
    fi
else
    print_warning "Vercel CLI not installed."
    print_status "Install with: npm i -g vercel"
    print_status "Or deploy via GitHub integration on Vercel dashboard."
fi

# Netlify check (alternative)
if [ -f "netlify.toml" ]; then
    print_status "Netlify configuration found!"
    print_status "If using Netlify, your site should auto-deploy from GitHub."
fi

# Final reminders
echo ""
print_success "🎉 DEPLOYMENT CHECKLIST COMPLETE!"
echo ""
echo "✅ Code committed to git"
echo "✅ Changes pushed to GitHub"
echo "✅ Deployment triggered (if configured)"
echo ""
print_warning "IMPORTANT REMINDERS:"
echo "1. Check your deployment platform (Vercel/Netlify) for build status"
echo "2. Test the live site after deployment"
echo "3. Monitor for any runtime errors"
echo "4. Update environment variables if needed"
echo ""
print_status "Live site should be available at your configured domain."
print_status "GitHub repository: $(git remote get-url origin)"
echo ""
print_success "Never forget to deploy again! 🚀" 
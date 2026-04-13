#!/bin/bash
# B-Side Deploy Script — Run this in Terminal to push code to GitHub and deploy on Vercel
#
# HOW TO USE:
# 1. Open Terminal (search "Terminal" in Windows search, or "Terminal" on Mac)
# 2. Copy and paste this command, then press Enter:
#    cd ~/bSide/bside-app/web && bash deploy.sh

echo "🎵 B-Side Deploy Script"
echo "======================"
echo ""

# Step 1: Initialize git repo
echo "Step 1: Setting up git repository..."
git init
git checkout -b main 2>/dev/null || git branch -M main

# Step 2: Create .gitignore
echo "node_modules/" > .gitignore
echo "dist/" >> .gitignore
echo ".env" >> .gitignore
echo "*.local" >> .gitignore

# Step 3: Add all files
echo "Step 2: Adding all files..."
git add -A

# Step 4: Commit
echo "Step 3: Creating initial commit..."
git commit -m "Initial commit: B-Side web app"

# Step 5: Add remote and push
echo "Step 4: Pushing to GitHub..."
git remote add origin https://github.com/GrizzillaAI/bside-app.git 2>/dev/null || git remote set-url origin https://github.com/GrizzillaAI/bside-app.git
git push -u origin main --force

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "Step 5: Now go to https://vercel.com/new"
echo "  - Find 'bside-app' in the repo list and click 'Import'"
echo "  - Set Framework Preset to 'Vite'"
echo "  - Click 'Environment Variables' and add:"
echo "    VITE_SUPABASE_URL = https://qzatxnogsiluxmflgfgy.supabase.co"
echo "    VITE_SUPABASE_ANON_KEY = (check your .env file)"
echo "  - Click 'Deploy'"
echo ""
echo "🎉 That's it! Your app will be live in about 60 seconds."

@echo off
echo.
echo  B-Side Deploy Script
echo  ====================
echo.

REM Step 1: Initialize git repo
echo Step 1: Setting up git repository...
git init
git checkout -b main 2>nul || git branch -M main

REM Step 2: Create .gitignore
echo node_modules/> .gitignore
echo dist/>> .gitignore
echo .env>> .gitignore
echo *.local>> .gitignore

REM Step 3: Add all files
echo Step 2: Adding all files...
git add -A

REM Step 4: Commit
echo Step 3: Creating initial commit...
git commit -m "Initial commit: B-Side web app"

REM Step 5: Add remote and push
echo Step 4: Pushing to GitHub...
git remote add origin https://github.com/GrizzillaAI/bside-app.git 2>nul || git remote set-url origin https://github.com/GrizzillaAI/bside-app.git
git push -u origin main --force

echo.
echo  Code pushed to GitHub!
echo.
echo  NOW GO TO: https://vercel.com/new
echo  1. Find 'bside-app' in the repo list and click 'Import'
echo  2. Set Framework Preset to 'Vite'
echo  3. Click 'Environment Variables' and add these two:
echo     VITE_SUPABASE_URL = https://qzatxnogsiluxmflgfgy.supabase.co
echo     VITE_SUPABASE_ANON_KEY = (copy from your .env file)
echo  4. Click 'Deploy'
echo.
pause

# GitHub Repository Setup Script
# Replace 'workflow-management-platform' with your chosen repository name

$repoName = "workflow-management-platform"  # Change this if needed
$githubUsername = "RuBiQ101"

Write-Host "Setting up GitHub repository..." -ForegroundColor Green

# Initialize git if not already initialized
if (-not (Test-Path .git)) {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
}

# Create .gitignore if it doesn't exist
if (-not (Test-Path .gitignore)) {
    Write-Host "Creating .gitignore..." -ForegroundColor Yellow
    @"
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Prisma
apps/api/prisma/dev.db
apps/api/prisma/dev.db-journal

# Misc
*.pem
.vercel
"@ | Out-File -FilePath .gitignore -Encoding utf8
}

# Stage all files
Write-Host "Staging files..." -ForegroundColor Yellow
git add .

# Commit
Write-Host "Creating initial commit..." -ForegroundColor Yellow
git commit -m "Initial commit: Full-stack workflow management platform with real-time collaboration

Features:
- NestJS backend with JWT authentication
- PostgreSQL database with Prisma ORM
- React + Vite frontend with Tailwind CSS
- Real-time collaboration with Socket.IO
- Organizations, workspaces, projects, and tasks
- Activity feed and notifications
- Comments and file attachments support
- Kanban board UI"

# Add remote (replace with your actual repository URL)
$repoUrl = "https://github.com/$githubUsername/$repoName.git"
Write-Host "Adding remote: $repoUrl" -ForegroundColor Yellow
git remote add origin $repoUrl

# Rename branch to main if needed
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "Renaming branch to main..." -ForegroundColor Yellow
    git branch -M main
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "You may be prompted for GitHub credentials..." -ForegroundColor Cyan
git push -u origin main

Write-Host "`nDone! Repository setup complete." -ForegroundColor Green
Write-Host "View your repository at: https://github.com/$githubUsername/$repoName" -ForegroundColor Cyan

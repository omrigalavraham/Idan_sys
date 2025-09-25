#!/bin/bash

# Script to deploy to Render
echo "🚀 Starting deployment to Render..."

# Build the project
echo "📦 Building project..."
npm run build
npm run server:build

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes. Please commit them first."
    echo "Files with changes:"
    git status --porcelain
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled."
        exit 1
    fi
fi

# Add all changes
echo "📝 Adding changes to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Update deleted users functionality - $(date)"

# Push to origin
echo "⬆️  Pushing to origin..."
git push origin master

echo "✅ Deployment initiated! Render will automatically build and deploy."
echo "🔗 Check your Render dashboard for deployment status."
echo "🌐 Your app will be available at: https://avraham-tikshoret.onrender.com"

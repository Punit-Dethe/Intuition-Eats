#!/bin/bash

# Deployment Script for AI Menu Project

echo "🚀 Starting deployment process..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1

# Initialize git repository if not already
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit"
fi

echo "✅ Prerequisites check passed!"

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "✅ Dependencies installed successfully!"

echo "🚀 Deployment preparation complete!"
echo "Next steps:"
echo "1. Create a new GitHub repository"
echo "2. Add the remote repository: git remote add origin YOUR_REPO_URL"
echo "3. Push your code: git push -u origin main"
echo "4. Follow the deployment instructions in README.md"

echo "🎉 All set! Your project is ready for deployment to Render.com"

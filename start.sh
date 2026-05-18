#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting Schoolyard SMS development environment..."

# 1. Check for .env file
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "⚠️  .env file not found. Creating from .env.example..."
        cp .env.example .env
        echo "✅ Created .env. Please update it with your actual credentials."
    else
        echo "❌ Error: .env and .env.example not found."
        exit 1
    fi
fi

# 2. Check for node_modules
if [ ! -d node_modules ]; then
    echo "📦 node_modules not found. Installing dependencies..."
    npm install
fi

# 3. Start Database (PostgreSQL) if docker-compose.yml exists
if [ -f docker-compose.yml ]; then
    echo "🐘 Starting database container..."
    docker compose up -d postgres
    
    # Wait for postgres to be ready
    echo "⏳ Waiting for database to be ready..."
    until docker compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do
      sleep 1
    done
    echo "✅ Database is ready."
fi

# 4. Prisma Setup
echo "🏗️  Syncing database schema..."
npx prisma generate
npx prisma db push

# 5. Start Next.js Development Server
echo "⚡ Starting Next.js dev server..."
npm run dev

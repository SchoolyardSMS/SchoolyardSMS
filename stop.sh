#!/bin/bash

echo "🛑 Stopping Schoolyard SMS development environment..."

# Stop database container
if [ -f docker-compose.yml ]; then
    echo "🐘 Stopping database container..."
    docker compose stop postgres
fi

echo "✅ Environment stopped."

#!/bin/bash

# Fix for Docker build issue - alternative method

echo "🔧 Rebuilding backend without go mod download..."
echo ""

cd backend

# Clean state
echo "1️⃣ Cleaning Docker state..."
docker-compose down -v 2>/dev/null
docker rmi coldlinebrasil-backend-server 2>/dev/null || true

echo ""
echo "2️⃣ Building fresh image..."
docker-compose build --no-cache

echo ""
echo "3️⃣ Starting containers..."
docker-compose up -d

echo ""
echo "4️⃣ Waiting for services to be ready..."
sleep 5

echo ""
echo "5️⃣ Testing backend..."

for i in {1..30}; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Backend is running!"
        curl -s http://localhost:8080/health | jq .
        break
    else
        echo "   Waiting... ($i/30)"
        sleep 1
    fi
done

echo ""
echo "✅ Setup complete!"
echo ""
echo "Frontend URL:   http://localhost:5173"
echo "Backend URL:    http://localhost:8080"
echo "Database URL:   localhost:5432"
echo ""
echo "To start frontend, run: npm run dev"

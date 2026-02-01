#!/bin/bash

# Buget Personal - Quick Start Script

echo "🚀 Starting Buget Personal Application..."
echo ""

# Check if dependencies are installed
if [ ! -d "apps/api/node_modules" ]; then
    echo "📦 Installing API dependencies..."
    cd apps/api && npm install && cd ../..
fi

if [ ! -d "apps/web/node_modules" ]; then
    echo "📦 Installing Web dependencies..."
    cd apps/web && npm install && cd ../..
fi

# Check if database exists
if [ ! -f "apps/api/prisma/dev.db" ]; then
    echo "🗄️  Setting up database..."
    cd apps/api
    npx prisma generate
    npx prisma migrate dev --name init
    npm run db:seed
    cd ../..
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Test credentials:"
echo "   Email: test@example.com"
echo "   Password: password123"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "⚠️  You need to run these in 2 separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  npm run dev:api"
echo ""
echo "Terminal 2 (Frontend):"
echo "  npm run dev:web"
echo ""

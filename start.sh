#!/bin/bash

# Script para iniciar toda a aplicação (Backend + Frontend)

echo "🚀 ColdLine Brasil - App Initialization"
echo "=========================================="

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale em: https://docker.com"
    exit 1
fi

# Iniciar Backend
echo ""
echo "🔧 Iniciando Backend em Go..."
cd backend

if [ ! -f ".env" ]; then
    echo "   📝 Criando .env..."
    cp .env.example .env
fi

echo "   🐳 Iniciando containers Docker..."
docker-compose up -d

# Aguardar backend
echo "   ⏳ Aguardando backend ficar pronto..."
for i in {1..30}; do
    if curl -s http://localhost:8080/health > /dev/null; then
        echo "   ✅ Backend pronto!"
        break
    fi
    sleep 1
done

# Voltar para raiz
cd ..

# Iniciar Frontend
echo ""
echo "🎨 Iniciando Frontend React..."

if [ ! -d "node_modules" ]; then
    echo "   📦 Instalando dependências..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "   📝 Criando .env..."
    cp .env.example .env
fi

echo ""
echo "=========================================="
echo "✅ Iniciação Completa!"
echo "=========================================="
echo ""
echo "📱 Frontend:     http://localhost:5173"
echo "🔧 Backend API:  http://localhost:8080"
echo "🗄️  Database:     localhost:5432 (postgres/password)"
echo ""
echo "🚀 Para iniciar o frontend, execute: npm run dev"
echo ""

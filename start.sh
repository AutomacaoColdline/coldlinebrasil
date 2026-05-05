#!/bin/bash

echo "🚀 Coldline Brasil — Sistema de Gestão"
echo "========================================"

# Verificar Docker
if command -v docker &> /dev/null; then
    echo ""
    echo "🐳 Docker encontrado. Para rodar com Docker:"
    echo "   docker compose up --build"
    echo ""
fi

# Iniciar API Go separadamente (sem Docker)
if command -v go &> /dev/null; then
    echo "🔧 Iniciando API Go em background..."
    cd api
    go mod tidy
    go run ./cmd/server &
    API_PID=$!
    cd ..
    echo "   ✅ API rodando em http://localhost:4000 (PID: $API_PID)"
else
    echo "⚠️  Go não encontrado. Instale de https://go.dev ou use Docker."
    echo "   A API deve estar rodando em http://localhost:4000"
fi

# Frontend
echo ""
echo "🎨 Iniciando Frontend React..."

if [ ! -d "node_modules" ]; then
    echo "   📦 Instalando dependências..."
    npm install
fi

echo ""
echo "========================================"
echo "✅ Sistema pronto!"
echo ""
echo "📱 Frontend:  http://localhost:5173"
echo "🔧 API:       http://localhost:4000"
echo "🗄️  MongoDB:   Atlas (ColdlineDB)"
echo ""

npm run dev

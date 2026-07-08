#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Carregando imagens Docker..."
docker load -i "$DIR/api-image.tar"
docker load -i "$DIR/web-image.tar"

echo "==> Subindo containers..."
cd "$DIR"
docker compose up -d

echo ""
echo "==> Status:"
docker compose ps

echo ""
echo "==> Validando:"
sleep 3
curl -sf http://localhost:4000/api/health && echo " - API OK" || echo " - API FAIL"
curl -sf -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200" && echo " - Web OK" || echo " - Web FAIL"

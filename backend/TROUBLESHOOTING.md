# Troubleshooting - Docker Build

## ❌ Erro: "go mod download" falha

### Causa
Incompatibilidade de versão do Go ou problemas de cache Docker.

### Solução 1: Limpar Cache (Recomendado)
```bash
# Parar containers
docker-compose down -v

# Remover imagem
docker rmi coldlinebrasil-backend-server

# Rebuild com --no-cache
docker-compose build --no-cache
```

### Solução 2: Build Local (Mais rápido)
```bash
# Instalar Go 1.22+: https://golang.org/dl

# Build local
go build -o ./bin/server ./cmd/server

# Depois rodar com Go direto
go run ./cmd/server
```

### Solução 3: Ignorar e usar Go Direto
Se o Docker continuar tendo problemas:

```bash
# Terminal 1: PostgreSQL via Docker
docker run -d \
  -p 5432:5432 \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=coldlinebrasil \
  postgres:16-alpine

# Terminal 2: Backend (Go local)
go run ./cmd/server
```

---

## ✅ Build OK - Próximos Passos

Se o build passou:
```bash
docker-compose up -d
docker-compose logs -f server
```

---

## 🔧 Debug - Ver detalhes do build

```bash
# Ver todos os logs
docker-compose logs

# Ver apenas o servidor
docker-compose logs -f server

# Ver PostgreSQL
docker-compose logs -f postgres

# Entrar no container
docker-compose exec server sh
```

---

## 🗑️ Remover tudo e recomeçar

```bash
# Para containers
docker-compose down

# Remove volumes (dados)
docker-compose down -v

# Remove images
docker rmi coldlinebrasil-backend-server postgres:16-alpine

# Limpar cache Docker
docker system prune -a

# Recomeçar
docker-compose up --no-cache
```

---

## 📝 Alternativa Rápida (SEM DOCKER)

### Windows
```bash
# Instale Go: https://golang.org/dl
# Instale PostgreSQL: https://www.postgresql.org/download/windows/

# Configure .env
copy .env.example .env
# Edite DATABASE_URL apontando para seu PostgreSQL local

# Rode
go run ./cmd/server
```

### Mac
```bash
brew install go postgresql

# Configure .env
cp .env.example .env

# Inicie PostgreSQL
brew services start postgresql

# Rode
go run ./cmd/server
```

### Linux
```bash
sudo apt install golang-go postgresql

# Configure .env
cp .env.example .env

# Inicie PostgreSQL
sudo systemctl start postgresql

# Rode
go run ./cmd/server
```

---

## 🆘 Ainda com problema?

1. **Verificar Go version**
   ```bash
   go version
   # Deve ser 1.20 ou superior
   ```

2. **Verificar Docker version**
   ```bash
   docker version
   # Recomendado: 24.0+
   ```

3. **Testar conectividade**
   ```bash
   # Teste se consegue baixar módulos
   go get -v github.com/gin-gonic/gin
   ```

4. **Veja os logs completos**
   ```bash
   docker-compose build --verbose 2>&1 | tee build.log
   ```

---

## 💡 Recomendação

Se continuar com problemas, use **Go local** + **PostgreSQL Docker**:

```bash
# Terminal 1
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16-alpine

# Terminal 2
go run ./cmd/server

# Frontend (Terminal 3)
npm run dev
```

Isso é bem mais rápido para desenvolvimento!

# 🚀 Setup Rápido SEM Docker

Se o Docker estiver dando issues, aqui está a forma mais simples de rodar.

## ⚡ 3 Passos

### 1️⃣ PostgreSQL

Você tem 2 opções:

**Opção A: Docker (só Database)**
```bash
docker run -d \
  --name coldlinebrasil-db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=coldlinebrasil \
  -e POSTGRES_USER=user \
  postgres:16-alpine
```

**Opção B: Instalar localmente**
- Windows: https://www.postgresql.org/download/windows/
- Mac: `brew install postgresql`
- Linux: `sudo apt install postgresql`

Depois create DB:
```sql
CREATE USER user WITH PASSWORD 'password';
CREATE DATABASE coldlinebrasil OWNER user;
```

### 2️⃣ Backend (Go)

```bash
cd backend

# Create .env
cp .env.example .env

# Verify DATABASE_URL is correct
# postgres://user:password@localhost:5432/coldlinebrasil?sslmode=disable

# Run
go run ./cmd/server

# Você deve ver: 🚀 Servidor rodando em http://localhost:8080
```

### 3️⃣ Frontend (React)

```bash
cd ..

# Install
npm install

# Create .env
cp .env.example .env
# VITE_API_URL=http://localhost:8080

# Run
npm run dev

# Acesse: http://localhost:5173
```

---

## ✅ Verify Everything Works

```bash
# Test Backend
curl http://localhost:8080/health
# {"status":"ok"}

# Test Database connection
curl http://localhost:8080/api/services
# []

# Create user
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'
```

---

## 📊 Status Terminal

Você deve ter 2 terminais assim:

**Terminal 1: Backend**
```
🚀 Servidor rodando em http://localhost:8080
```

**Terminal 2: Frontend**
```
  VITE v5.3.5  ready in 123 ms

  ➜  Local:   http://localhost:5173/
```

---

## 🎨 Usar Agora

1. Abra:  http://localhost:5173
2. Teste ContactForm (envia para backend)
3. Teste /admin (admin panel)

---

## 🗑️ Parar Tudo

```bash
# Backend: Ctrl+C
# Frontend: Ctrl+C

# Se usou Docker
docker stop coldlinebrasil-db
```

---

## 🆘 Erros Comuns

### ❌ "Failed to connect to database"
- PostgreSQL está rodando?
- DATABASE_URL correto?
- User/senha corretos?

Teste:
```bash
psql -h localhost -U user -d coldlinebrasil
# Digite: password
```

### ❌ "Cannot find module"
```bash
cd backend
go mod download
go mod tidy
```

### ❌ PORT 8080 already in use
```bash
# Mude PORT em backend/.env
PORT=3000
```

### ❌ CORS Error no Frontend
- Backend rodando em `http://localhost:8080`?
- Verifique CORS_ORIGINS no backend/.env

---

## 🎯 Recomendação

**Para Desenvolvimento:**
```
✅ PostgreSQL via Docker (rápido setup)
✅ Backend via Go local (alterações recarregam rápido)
✅ Frontend via npm local (Vite com HMR)
```

**Para Produção:**
```
✅ Usar Docker Compose
✅ Usar docker-compose up -d
```

---

**Isso é muito mais rápido e simples!** 🚀

# 🚀 Setup Local Windows (SEM DOCKER)

## 📥 Pré-requisitos

### 1. Go 1.22+
Download: https://golang.org/dl
- Instale e verifique: `go version`

### 2. PostgreSQL
Download: https://www.postgresql.org/download/windows/
- Ou use: https://www.pgadmin.org/ (recomendado para GUI)

Ao instalar, anote:
- **User:** postgres (default)
- **Password:** [sua senha]
- **Port:** 5432 (default)

### 3. Node.js 18+
Download: https://nodejs.org/
- Instale e verifique: `node --version`

---

## ⚡ Setup (3 passos)

### Passo 1: Database

Abra **pgAdmin** (vem com PostgreSQL) ou use `psql`:

```sql
-- Criar usuário
CREATE USER "user" WITH PASSWORD 'password';

-- Criar database
CREATE DATABASE coldlinebrasil OWNER "user";

-- Verificar (opcional)
\l
```

**Ou use o Windows PowerShell:**

```powershell
# Conectar como postgres
psql -U postgres

# Dentro do psql:
CREATE USER "user" WITH PASSWORD 'password';
CREATE DATABASE coldlinebrasil OWNER "user";
\q
```

### Passo 2: Backend (Go)

**Terminal 1:**
```powershell
cd backend
copy .env.example .env
go run ./cmd/server
```

Você deve ver:
```
🚀 Servidor rodando em http://localhost:8080
```

### Passo 3: Frontend (React)

**Terminal 2:**
```powershell
npm install
npm run dev
```

Você deve ver:
```
  VITE v5.3.5  ready in 123 ms
  ➜  Local:   http://localhost:5173/
```

---

## ✅ Verificar Setup

```powershell
# Backend health check
curl http://localhost:8080/health

# Deve retornar: {"status":"ok"}
```

---

## 🧪 Teste a API

### Criar Usuário
```powershell
curl -X POST http://localhost:8080/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{"name":"Admin","email":"admin@test.com","password":"admin123"}'
```

### Login
```powershell
curl -X POST http://localhost:8080/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@test.com","password":"admin123"}'
```

### Enviar Contato
```powershell
curl -X POST http://localhost:8080/api/contacts `
  -H "Content-Type: application/json" `
  -d '{"name":"João","email":"joao@test.com","phone":"67998765432","message":"Oi"}'
```

---

## 🎯 URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8080
- **Database:** localhost:5432 (pgAdmin ou similar)

---

## 🆘 Erros Comuns

### ❌ "go: command not found"
- Go não está instalado ou não está no PATH
- Reinstale Go: https://golang.org/dl

### ❌ "psql: command not found"
- PostgreSQL não está no PATH
- Adicione ao PATH do Windows ou use pgAdmin

### ❌ "password authentication failed"
- Verifique user/password em `.env`
- Default: `user` / `password`

### ❌ "port 5432 already in use"
- Outra aplicação usando PostgreSQL
- Mude `PORT=5433` em `.env` (não recomendado)

### ❌ "port 8080 already in use"
- Mude em `backend/.env`: `PORT=3000`

### ❌ CORS error no frontend
- Backend rodando em `http://localhost:8080`?
- Limpe cache CTRL+SHIFT+DEL

---

## 📝 Estrutura Esperada

```
Terminal 1: Backend
┌───────────────────────┐
│ 🚀 Servidor rodando em│
│ http://localhost:8080 │
└───────────────────────┘

Terminal 2: Frontend
┌───────────────────────┐
│ ➜  Local:             │
│ http://localhost:5173/│
└───────────────────────┘

PostgreSQL Running (background)
```

---

## 💾 Parar Tudo

```powershell
# Terminal 1 & 2: Ctrl+C

# PostgreSQL (se rodando em background):
# Use Services.msc e pare "postgresql-x64-16"
```

---

## ✨ Próximos Passos

1. Abra http://localhost:5173
2. Teste o ContactForm
3. Faça login em /admin
4. Gerencie serviços

---

**Simples, rápido e sem Docker!** 🎉

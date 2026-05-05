 🎯 COMECE AQUI - Setup Rápido Windows

## 1️⃣ Instale (uma vez só)

- [ ] Go 1.22+ → https://golang.org/dl
- [ ] PostgreSQL → https://www.postgresql.org/download/windows/
- [ ] Node.js 18+ → https://nodejs.org/

## 2️⃣ Configure Database

```powershell
# Abra PowerShell como Admin
psql -U postgres

# Cole:
CREATE USER "user" WITH PASSWORD 'password';
CREATE DATABASE coldlinebrasil OWNER "user";
\q
```

## 3️⃣ Execute (3 terminais)

### Terminal 1: Backend
```powershell
cd C:\Users\JP\Desktop\coldlinebrasil\backend
go run ./cmd/server
```
Aguarde ver: `🚀 Servidor rodando em http://localhost:8080`

### Terminal 2: Frontend
```powershell
cd C:\Users\JP\Desktop\coldlinebrasil
npm install
npm run dev
```
Aguarde ver: `http://localhost:5173/`

### Terminal 3 (Opcional): Ver logs
```powershell
cd C:\Users\JP\Desktop\coldlinebrasil\backend
curl http://localhost:8080/health
```

---

## ✅ Pronto!

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8080/api
- **Health Check:** http://localhost:8080/health

---

## 🧪 Testar

### 1. Enviar Contato (no Frontend)
Abra http://localhost:5173 e use o ContactForm

### 2. Criar Usuário (via API)
```powershell
curl -X POST http://localhost:8080/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{
    "name": "Admin",
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

### 3. Login
```powershell
curl -X POST http://localhost:8080/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```
Copie o token retornado!

### 4. Criar Serviço (admin only)
```powershell
# Substitua YOUR_TOKEN_HERE pelo token anterior
curl -X POST http://localhost:8080/api/services `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -d '{
    "name": "Ar Condicionado",
    "description": "Sistemas de refrigeração",
    "icon": "wind"
  }'
```

---

## 📝 Documentação Completa

- `backend/SETUP_WINDOWS.md` — Setup detalhado
- `INTEGRATION_GUIDE.md` — Como usar no React
- `README_INTEGRACAO.md` — Overview completo

---

## 🛑 Parar

```powershell
# Em cada terminal: Ctrl+C
```

---

**Tudo pronto?** 🚀

Abra http://localhost:5173 e comece!

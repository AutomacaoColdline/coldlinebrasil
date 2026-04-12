# 🚀 ColdLine Brasil - Backend + Frontend Integrado

> Status: ✅ **PRONTO PARA USAR**

---

## 📦 Arquitetura

```
coldlinebrasil/
│
├── 🎨 Frontend (React + Vite)
│   ├── src/
│   │   ├── services/api.js              ← Cliente HTTP (fetch)
│   │   ├── context/AuthContext.jsx      ← Auth global
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useApi.js
│   │   ├── components/
│   │   │   ├── ContactForm.jsx          ← Novo
│   │   │   └── AdminServices.jsx        ← Novo
│   │   ├── pages/
│   │   │   └── LoginPage.jsx            ← Novo
│   │   └── sections/                    ← Seções existentes
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── 🔧 Backend (Go + Gin + PostgreSQL)
│   ├── cmd/server/main.go               ← Entry point
│   ├── internal/
│   │   ├── auth/                        ← JWT + Middlewares
│   │   ├── config/                      ← Env loading
│   │   ├── db/                          ← PostgreSQL
│   │   ├── handlers/                    ← Endpoints
│   │   └── models/                      ← Data structures
│   ├── docker-compose.yml               ← Dev setup
│   ├── Dockerfile                       ← Prod build
│   ├── Makefile
│   ├── go.mod / go.sum
│   └── README.md
│
├── 📖 Documentação
│   ├── INTEGRATION_GUIDE.md              ← Como usar
│   ├── INTEGRATION_SUMMARY.md            ← Overview
│   ├── .gitignore
│   └── backend/FRONTEND_INTEGRATION.md
```

---

## ⚡ Quick Start (5min)

### Opção 1: Docker (Recomendado)

```bash
# Terminal 1: Backend
cd backend
docker-compose up -d
# Verifique: curl http://localhost:8080/health

# Terminal 2: Frontend
cd ..
npm install
npm run dev
# Acesse: http://localhost:5173
```

### Opção 2: Local

```bash
# Backend
cd backend
go run ./cmd/server
# Necessário: PostgreSQL em localhost:5432

# Frontend
npm install
npm run dev
```

---

## 🔗 Integração Pronta

### 1️⃣ **Autenticação**
```jsx
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, login, logout } = useAuth()
  // ✅ Pronto para usar!
}
```

### 2️⃣ **Formulário de Contato**
```jsx
import ContactForm from './components/ContactForm'

export default () => <ContactForm />
// ✅ Envia direto para o backend
```

### 3️⃣ **Gerenciar Serviços**
```jsx
import AdminServices from './components/AdminServices'

export default () => <AdminServices />
// ✅ CRUD completo com autenticação
```

### 4️⃣ **API Manualmente**
```jsx
import { apiClient } from './services/api'

async function myFunction() {
  // Contactos
  await apiClient.createContact(name, email, phone, message)
  
  // Serviços
  const services = await apiClient.getServices()
  await apiClient.createService(name, desc, icon)
  
  // Auth
  await apiClient.login(email, pass)
  await apiClient.signup(name, email, pass)
}
```

---

## 📍 Endpoints Backend

### 🟢 Públicos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Status do servidor |
| POST | `/api/auth/signup` | Registrar usuário |
| POST | `/api/auth/login` | Fazer login |
| GET | `/api/services` | Listar serviços |
| GET | `/api/services/:id` | Detalhes serviço |
| POST | `/api/contacts` | Enviar contato |

### 🔴 Protegidos (requer JWT)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/services` | Criar serviço (admin) |
| PUT | `/api/services/:id` | Atualizar (admin) |
| DELETE | `/api/services/:id` | Deletar (admin) |
| GET | `/api/contacts` | Ver contatos (admin) |

---

## 🧪 Testar Agora

### 1. Health Check
```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

### 2. Criar Usuário
```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João",
    "email": "joao@example.com",
    "password": "senha123"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "senha123"
  }'
# Retorna: {"token": "eyJ...", "user": {...}}
```

### 4. Criar Contato
```bash
curl -X POST http://localhost:8080/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cliente",
    "email": "cliente@example.com",
    "phone": "67998765432",
    "message": "Oi!"
  }'
```

---

## 🗄️ Banco de Dados

### Tabelas Automáticas

```sql
users (id, name, email, password, role, created_at)
services (id, name, description, icon, created_at, updated_at)
contacts (id, name, email, phone, message, created_at)
```

### Inserir Dados de Teste

```bash
# Via API
curl http://localhost:8080/api/services \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "Climatização", "description": "...", "icon": "wind"}'
```

---

## 📱 Usando no Frontend

### Exemplo 1: Form com Contato
```jsx
import { useContacts } from './hooks/useApi'

export function ContactForm() {
  const { createContact, loading, error } = useContacts()
  
  const handleSubmit = async (name, email, phone, msg) => {
    try {
      await createContact(name, email, phone, msg)
      alert('Enviado!')
    } catch (e) {
      alert('Erro: ' + e)
    }
  }
  
  return (
    <form onSubmit={() => handleSubmit(...)}>
      {/* campos */}
      <button disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  )
}
```

### Exemplo 2: Listar Serviços
```jsx
import { useServices } from './hooks/useApi'
import { useEffect } from 'react'

export function Services() {
  const { services, loading, getServices } = useServices()
  
  useEffect(() => {
    getServices()
  }, [])
  
  return loading ? (
    <p>Carregando...</p>
  ) : (
    services.map(s => <div key={s.id}>{s.name}</div>)
  )
}
```

### Exemplo 3: Login
```jsx
import { useAuth } from './hooks/useAuth'

export function LoginForm() {
  const { login, isAuthenticated } = useAuth()
  
  const handleLogin = async (email, pass) => {
    try {
      await login(email, pass)
      // Automaticamente redireciona após sucesso
    } catch (e) {
      alert('Erro: ' + e)
    }
  }
  
  return isAuthenticated ? (
    <p>Bem-vindo!</p>
  ) : (
    <form onSubmit={() => handleLogin(...)}>
      {/* campos */}
    </form>
  )
}
```

---

## 🔐 Segurança

✅ **Implementado:**
- JWT tokens (24h por padrão)
- Senhas com bcrypt
- CORS configurável
- Auto-logout em 401
- Roles (user/admin)
- Middlewares

**⚠️ Para Produção:**
```bash
# Mude no backend/.env
JWT_SECRET=gerar_uma_senha_segura_muito_longa_e_complexa
ENV=production
CORS_ORIGINS=https://seu-dominio.com
```

---

## 🚨 Troubleshooting

### ❌ CORS Error
```
Access to XMLHttpRequest blocked
```
**Solução:** Backend rodando em http://localhost:8080?

### ❌ Cannot find module
```
Cannot find module './services/api'
```
**Solução:** Rode `npm install` no frontend

### ❌ Database Error
```
connection refused
```
**Solução:** PostgreSQL rodando? `docker-compose up -d`

### ❌ 401 Unauthorized
```
token invalid or expired
```
**Solução:** Fazer login novamente

---

## 📚 Documentação Completa

- **Frontend Integration:** `INTEGRATION_GUIDE.md`
- **Backend README:** `backend/README.md`
- **Backend Integration:** `backend/FRONTEND_INTEGRATION.md`
- **API TypeScript Example:** `backend/API_CLIENT_EXAMPLE.ts`

---

## ✨ O que você pode fazer

### Agora (pronto para usar):
- ✅ Enviar contatos via formulário
- ✅ Listar serviços
- ✅ Autenticar usuários
- ✅ Gerenciar serviços (admin)

### Próximo:
- 🔄 Router protegidas (React Router)
- 🔄 Dashboard admin completo
- 🔄 Email de notificação
- 🔄 WhatsApp API integration
- 🔄 Deploy em produção

---

## 🎯 Status

```
Frontend         ✅
Backend          ✅
Database         ✅
Integração       ✅
Documentação     ✅
Testes           ⏳ (próximo)
Deploy           ⏳ (próximo)
```

---

## 🤝 Próximas Etapas

1. **Testar localmente**
   ```bash
   docker-compose up -d
   npm run dev
   # Teste em http://localhost:5173
   ```

2. **Adicionar ContactForm em uma section do site**

3. **Criar painel admin com React Router**

4. **Deploy backend + frontend em produção**

---

## 💬 Tips

| Dica | Comando |
|------|---------|
| Ver logs do backend | `docker-compose logs -f server` |
| Acessar DB diretamente | `docker-compose exec postgres psql -U user -d coldlinebrasil` |
| Rebuild backend | `docker-compose build --no-cache` |
| Limpar tudo | `docker-compose down -v` |
| Build frontend | `npm run build` |

---

**🎉 Pronto! Sua aplicação está totalmente integrada e segura!**

Qualquer dúvida, consulte a documentação ou abra uma issue no repositório.

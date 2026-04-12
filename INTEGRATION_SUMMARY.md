# 🎉 Integração Completa: Frontend + Backend

## ✅ O que foi criado

### **Frontend (React + Vite)**

```
src/
├── services/
│   └── api.js                  # Cliente HTTP com contexto de token
├── context/
│   └── AuthContext.jsx         # Contexto global de autenticação
├── hooks/
│   ├── useAuth.js              # Hook para usar autenticação
│   └── useApi.js               # Hooks para Services, Contacts, genérico
├── components/
│   ├── ContactForm.jsx         # Formulário de contato (novo)
│   └── AdminServices.jsx       # Painel de gerenciamento (novo)
└── pages/
    └── LoginPage.jsx           # Página de login (novo)
```

### **Backend (Go + Gin)**

```
backend/
├── cmd/server/main.go          # Entry point com todas as rotas
├── internal/
│   ├── auth/                   # JWT + Middlewares de segurança
│   ├── config/                 # Variáveis de ambiente
│   ├── db/                     # PostgreSQL + Auto-migrations
│   ├── handlers/               # Auth, Services, Contacts endpoints
│   └── models/                 # Estruturas de dados
├── docker-compose.yml          # PostgreSQL + Server
├── Dockerfile                  # Multi-stage production-ready
└── README.md                   # Documentação completa
```

---

## 🚀 Quick Start (5 minutos)

### **Passo 1: Backend**
```bash
cd backend
cp .env.example .env
docker-compose up -d
# Ou: go run ./cmd/server
```

### **Passo 2: Frontend**
```bash
cd ..
cp .env.example .env
npm install
npm run dev
```

### **Passo 3: Testar**

1. Abra http://localhost:5173
2. Teste o health check:
   ```bash
   curl http://localhost:8080/health
   ```
3. Crie um usuário:
   ```bash
   curl -X POST http://localhost:8080/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Admin",
       "email": "admin@example.com",
       "password": "admin123"
     }'
   ```

---

## 🔌 Funcionalidades Integradas

### **Autenticação**
- ✅ Login/Signup pelo frontend
- ✅ Token JWT armazenado em localStorage
- ✅ Contexto de auth em toda a app
- ✅ Redirecionamento automático em 401

### **API Endpoints Disponíveis**

**Públicos:**
- `POST /api/auth/signup` — Registrar
- `POST /api/auth/login` — Login
- `GET /api/services` — Listar serviços
- `GET /api/services/:id` — Detalhes do serviço
- `POST /api/contacts` — Enviar contato
- `GET /health` — Status do servidor

**Protegidos (requer JWT):**
- `POST /api/services` — Criar serviço (admin)
- `PUT /api/services/:id` — Atualizar (admin)
- `DELETE /api/services/:id` — Deletar (admin)
- `GET /api/contacts` — Ver contatos (admin)

### **Componentes Disponíveis**

1. **`<ContactForm />`** — Envia contatos para o backend
   ```jsx
   import ContactForm from './components/ContactForm'
   export default () => <ContactForm />
   ```

2. **`<AdminServices />`** — Gerencia serviços (CRUD)
   ```jsx
   import AdminServices from './components/AdminServices'
   export default () => <AdminServices />
   ```

3. **LoginPage** — Página de autenticação
   ```jsx
   import LoginPage from './pages/LoginPage'
   ```

### **Hooks Disponíveis**

```jsx
// Autenticação
import { useAuth } from './hooks/useAuth'
const { user, isAuthenticated, login, logout, signup } = useAuth()

// Serviços
import { useServices } from './hooks/useApi'
const { services, loading, getServices } = useServices()

// Contatos
import { useContacts } from './hooks/useApi'
const { createContact, loading, error } = useContacts()

// Genérico
import { useApi } from './hooks/useApi'
const { call, loading, error } = useApi()
```

---

## 🔐 Fluxo de Segurança

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │ 1. POST /api/auth/login
         │ { email, password }
         ▼
┌─────────────────┐
│   Backend (Go)  │
│ (Gin + JWT)     │
└────────┬────────┘
         │ 2. Valida credenciais
         │ 3. Gera JWT
         │ 4. Retorna { token, user }
         ▼
┌─────────────────┐
│   LocalStorage  │
│   { token }     │
└─────────────────┘
         │
         │ 5. Envia token em header
         │ Authorization: Bearer {token}
         ▼
   Backend valida JWT
   ✓ Se válido → executa ação
   ✗ Se inválido → 401 Unauthorized
```

---

## 📝 Exemplo: Adicionar Contato

### **No Componente:**
```jsx
import { useContacts } from './hooks/useApi'

export function ContactPage() {
  const { createContact, loading, error } = useContacts()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createContact('João', 'joao@email.com', '67998765432', 'Mensagem')
      alert('Enviado com sucesso!')
    } catch (err) {
      alert('Erro: ' + err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* campos */}
      <button disabled={loading}>{loading ? 'Enviando...' : 'Enviar'}</button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  )
}
```

### **Fluxo:**
```
1. Usuário clica "Enviar"
2. Frontend chama: apiClient.createContact(...)
3. Frontend faz POST para: http://localhost:8080/api/contacts
4. Backend recebe, valida, salva no PostgreSQL
5. Backend retorna: { id, name, email, ... }
6. Frontend mostra sucesso
```

---

## 🧪 Testar Manualmente

### **1. Verificar Backend**
```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

### **2. Criar Contato**
```bash
curl -X POST http://localhost:8080/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João",
    "email": "joao@example.com",
    "phone": "67998765432",
    "message": "Oi, tudo bem?"
  }'
```

### **3. Listar Serviços**
```bash
curl http://localhost:8080/api/services
```

### **4. Login e Gerenciar (com auth)**
```bash
# 1. Login
LOGIN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}')

TOKEN=$(echo $LOGIN | jq -r '.token')

# 2. Criar serviço
curl -X POST http://localhost:8080/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Ar Condicionado",
    "description": "Sistemas de refrigeração",
    "icon": "wind"
  }'
```

---

## 📚 Próximos Passos

1. **Configurar React Router** (opcional)
   ```bash
   npm install react-router-dom
   ```
   - Página pública: Home (atual)
   - Página protegida: /admin (AdminServices)
   - Página pública: /login (LoginPage)

2. **Adicionar ContactForm em uma section**

3. **Criar dashboard de admin completo**

4. **Deploy em produção**

---

## ⚙️ Troubleshooting

### **CORS Error**
```
❌ Access to XMLHttpRequest blocked by CORS
```
**Solução:** Backend rodando? CORS_ORIGINS configurado?

### **Token inválido**
```
❌ 401 Unauthorized
```
**Solução:** Limpar localStorage, fazer login novamente

### **API não responde**
```
❌ fetch http://localhost:8080 failed
```
**Solução:** Backend não está rodando. Execute: `docker-compose up -d`

---

## 📖 Documentação

- **Frontend Integration:** `INTEGRATION_GUIDE.md`
- **Backend Docs:** `backend/README.md`
- **Backend Integration Docs:** `backend/FRONTEND_INTEGRATION.md`
- **API Example (TypeScript):** `backend/API_CLIENT_EXAMPLE.ts`

---

## 🎯 Status

✅ **Backend**
- [x] API REST completa
- [x] Autenticação JWT
- [x] PostgreSQL com migrations
- [x] CORS configurado
- [x] Docker pronto

✅ **Frontend**
- [x] Contexto de auth
- [x] Cliente HTTP
- [x] Hooks customizados
- [x] Componente de contato
- [x] Painel admin
- [x] Integración com backend

✅ **Pronto para usar!**

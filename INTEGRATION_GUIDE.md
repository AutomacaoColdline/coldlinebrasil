# Guia de Integração Frontend-Backend

## ✅ Setup Rápido

### 1. Variáveis de Ambiente

```bash
# Na raiz do projeto (frontend)
cp .env.example .env
```

Conteúdo do `.env`:
```
VITE_API_URL=http://localhost:8080
```

### 2. Iniciar Backend

```bash
cd backend
docker-compose up -d
# ou
go run ./cmd/server
```

### 3. Iniciar Frontend

```bash
npm install
npm run dev
# Acesse: http://localhost:5173
```

---

## 📁 Estrutura de Integração

```
src/
├── services/
│   └── api.js              # Cliente HTTP (fetch)
├── context/
│   └── AuthContext.jsx     # Contexto de autenticação
├── hooks/
│   ├── useAuth.js          # Hook para usar auth
│   └── useApi.js           # Hooks para serviços
└── components/
    ├── ContactForm.jsx     # Formulário de contato
    ├── Navbar.jsx
    └── ...
```

---

## 🔗 Como Usar

### A. Contexto de Autenticação

O `AuthProvider` já está envolvendo toda a aplicação em `App.jsx`.

```jsx
import { useAuth } from './hooks/useAuth'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()

  return (
    <div>
      {isAuthenticated && <p>Olá, {user.name}!</p>}
      <button onClick={() => login('email@example.com', 'senha')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### B. Hooks de API

```jsx
import { useServices, useContacts } from './hooks/useApi'

function Services() {
  const { services, loading, getServices } = useServices()

  useEffect(() => {
    getServices()
  }, [])

  return (
    <div>
      {loading && <p>Carregando...</p>}
      {services.map(s => <div key={s.id}>{s.name}</div>)}
    </div>
  )
}
```

### C. Cliente API Direto

```jsx
import { apiClient } from './services/api'

async function example() {
  // Contatos
  await apiClient.createContact('João', 'joao@email.com', '67998765432', 'Mensagem')

  // Services
  const services = await apiClient.getServices()
  await apiClient.createService('Novo', 'Desc', 'icon')

  // Auth
  const login = await apiClient.login('email@example.com', 'senha')
  apiClient.setToken(login.token)
}
```

---

## 📝 Componente de Contato

O componente `ContactForm` já está criado e pronto para usar:

```jsx
import ContactForm from './components/ContactForm'

function MyPage() {
  return <ContactForm />
}
```

---

## 🧪 Testar a Integração

### 1. Verificar Saúde do Backend

```bash
curl http://localhost:8080/health
# Resposta: {"status":"ok"}
```

### 2. Criar Usuário Admin

```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### 3. Fazer Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### 4. Usar Token para Criar Serviço

```bash
TOKEN="seu_token_aqui"

curl -X POST http://localhost:8080/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Climatização Residencial",
    "description": "Sistemas de ar condicionado para residências",
    "icon": "wind"
  }'
```

### 5. Criar Contato (sem autenticação)

```bash
curl -X POST http://localhost:8080/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "67998765432",
    "message": "Gostaria de um orçamento"
  }'
```

---

## 🔐 Fluxo de Autenticação

```
1. Usuário entra email/senha
2. Frontend chama apiClient.login()
3. Backend retorna { token, user }
4. Frontend armazena token em localStorage
5. Frontend envia token em Authorization header
6. Backend valida JWT
7. Se válido, executa ação
8. Se inválido (401), frontend limpa token e redireciona
```

---

## ⚙️ Troubleshooting

### CORS Error

Se receber erro de CORS:

1. Verifique se o backend está rodando em `http://localhost:8080`
2. Verifique se `VITE_API_URL` está correto no `.env`
3. Verifique se `CORS_ORIGINS` no backend inclui `http://localhost:5173`

### Token Inválido

```
- Limpe localStorage: F12 > Application > Clear
- Faça login novamente
- Token expires em 24h por padrão
```

### Endpoint não encontrado

Verfique se:

1. Backend está rodando: `curl http://localhost:8080/health`
2. Endpoint existe no backend (consulte `backend/README.md`)
3. Método HTTP está correto (GET, POST, PUT, DELETE)

---

## 📚 Próximos Passos

1. **Integrar ContactForm em uma section** — Adicionar formulário ao site
2. **Criar painel admin** — Page interna para gerenciar serviços
3. **Adicionar testes** — Testes unitários e E2E
4. **Deploy** — Colocar em produção

Para mais detalhes, consulte:
- `backend/FRONTEND_INTEGRATION.md`
- `backend/README.md`

# Backend - ColdLine Brasil

API REST em Go para o site institucional da ColdLine Brasil.

## Stack

- **Framework:** Gin
- **Database:** PostgreSQL
- **Auth:** JWT
- **ORM:** Sem ORM (raw SQL)

## Requisitos

- Go 1.22+
- Docker & Docker Compose (opcional, mas recomendado)
- PostgreSQL 16+ (se não usar Docker)

## Setup Rápido

### Com Docker (Recomendado)

```bash
# Clonar variáveis de ambiente
cp .env.example .env

# Iniciar containers
docker-compose up -d

# Servidor rodará em http://localhost:8080
```

### Sem Docker

```bash
# Copiar variáveis de ambiente
cp .env.example .env

# Editar .env e configurar DATABASE_URL
nano .env

# Instalar dependências
go mod download

# Executar migrations e iniciar servidor
go run ./cmd/server
```

## Variáveis de Ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexão PostgreSQL | - |
| `PORT` | Porta do servidor | 8080 |
| `ENV` | development/production | development |
| `JWT_SECRET` | Chave para assinar tokens JWT | - |
| `JWT_EXPIRATION` | Expiração do token | 24h |
| `CORS_ORIGINS` | Origins CORS permitidas | http://localhost:5173 |

## Endpoints

### Health Check
- `GET /health` — Status do servidor

### Autenticação
- `POST /api/auth/signup` — Registrar novo usuário
- `POST /api/auth/login` — Fazer login (retorna JWT)

### Serviços (Públicos)
- `GET /api/services` — Listar todos os serviços
- `GET /api/services/:id` — Obter serviço específico

### Serviços (Admin)
- `POST /api/services` — Criar novo serviço
- `PUT /api/services/:id` — Atualizar serviço
- `DELETE /api/services/:id` — Deletar serviço

### Contatos
- `POST /api/contacts` — Criar novo contato/questão
- `GET /api/contacts` — Listar todos (apenas admin)

## Exemplo de Uso

### Signup
```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "senha123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "senha123"
  }'
```

Resposta:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "user"
  }
}
```

### Usar Token
```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:8080/api/services
```

## Estrutura de Diretórios

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # Entry point
├── internal/
│   ├── auth/
│   │   ├── auth.go          # JWT logic
│   │   └── middleware.go    # Auth middlewares
│   ├── config/
│   │   └── config.go        # Config loading
│   ├── db/
│   │   └── db.go            # Database connection & migrations
│   ├── handlers/
│   │   ├── auth.go
│   │   ├── services.go
│   │   └── contacts.go
│   └── models/
│       └── models.go        # Data models
├── migrations/              # SQL migrations (future)
├── Dockerfile
├── docker-compose.yml
├── go.mod
├── go.sum
└── README.md
```

## Desenvolvimento

### Build
```bash
go build -o ./bin/server ./cmd/server
```

### Build com Docker
```bash
docker build -t coldlinebrasil-api .
```

### Próximos Passos

- [ ] Adicionar testes unitários
- [ ] Implementar migrations SQL dedicadas
- [ ] Integrar com WhatsApp API
- [ ] Validações mais robustas
- [ ] Logging estruturado
- [ ] Documentação Swagger/OpenAPI

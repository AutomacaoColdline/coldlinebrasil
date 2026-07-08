# Coldline Brasil — Guia de Deploy

> Documentação do processo de build e deploy do sistema Coldline Brasil
> (API Go + Frontend React + PostgreSQL, tudo via Docker).

---

## 1. Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  Servidor SRVAP02 (IP: 10.0.0.44)                           │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │ coldlinebrasil-    │  │ coldlinebrasil-    │            │
│  │   postgres-1       │  │     web-1          │            │
│  │  (PostgreSQL 16)   │  │  (nginx + React)   │  ← 8888  │
│  │  porta 5432 (interna)│ │  porta 80 interna  │            │
│  └────────────────────┘  └────────────────────┘            │
│            ▲                       ▲                        │
│            │                       │                        │
│  ┌────────────────────┐           │                        │
│  │ coldlinebrasil-    │───────────┘                        │
│  │     api-1           │                                    │
│  │  (Go binary)        │  ← 4000                            │
│  │  porta 4000         │                                    │
│  └────────────────────┘                                    │
│                                                              │
│  Porta 80 (host) = ocupada por nginx-proxy-manager (outro)   │
│  Porta 4000 (host) = API                                    │
│  Porta 8888 (host) = Frontend (web)                         │
└─────────────────────────────────────────────────────────────┘
```

**Acesso interno (sem DNS):**
- Frontend: `http://10.0.0.44:8888/`
- API: `http://10.0.0.44:4000/api/health`
- Banco: `127.0.0.1:5432` (somente rede Docker)

---

## 2. Pré-requisitos

### No Windows (build):
- **Node.js 20+** — para buildar o React
- **Go 1.22+** — para compilar o binário
- **Docker Desktop** — para buildar as imagens
- **PowerShell 5+** — para rodar o `deploy.ps1`

### No servidor (SRVAP02):
- **Docker + Docker Compose** (instalado)
- **PostgreSQL 16** já em cache no Docker (NÃO tem acesso ao Docker Hub)
- **bash** (padrão)

⚠️ **Importante:** O servidor NÃO tem acesso a `registry-1.docker.io` (Docker Hub). As imagens precisam ser **buildadas no Windows** e transferidas via `.tar`.

---

## 3. Estrutura do projeto

```
coldlinebrasil/
├── api/                          # Backend Go
│   ├── cmd/server/main.go        # entry point
│   ├── internal/
│   │   ├── handlers/             # HTTP handlers
│   │   ├── models/               # GORM models
│   │   ├── repositories/         # data access
│   │   ├── middleware/            # auth, etc
│   │   └── db/                    # conexão + migrations
│   ├── go.mod / go.sum
│   ├── Dockerfile                 # build da imagem (apenas copia binário)
│   └── server                     # binário Go (Linux ELF)
│
├── web/                          # Frontend React
│   ├── src/
│   │   ├── pages/                 # páginas
│   │   ├── services/              # API clients
│   │   └── ...
│   ├── dist/                      # build do React (gerado pelo `npm run build`)
│   ├── .env.production             # VITE_API_URL= (vazio = URLs relativas)
│   ├── nginx.conf                 # config do nginx dentro do container
│   ├── Dockerfile                 # build da imagem
│   └── package.json
│
├── deploy/                        # Pacote para deploy no servidor
│   ├── api-image.tar              # imagem Docker da API
│   ├── web-image.tar              # imagem Docker do Web
│   ├── docker-compose.yml         # config dos serviços
│   ├── api/
│   │   ├── server                 # binário Go
│   │   └── Dockerfile
│   ├── web/
│   │   ├── dist/                  # React buildado
│   │   ├── nginx.conf
│   │   └── Dockerfile
│   ├── up.sh                      # script de deploy
│   └── start.sh                   # wrapper do up.sh (sem precisar chmod)
│
├── deploy.ps1                     # script Windows (gera deploy.zip)
└── deploy.zip                     # pacote final (gerado pelo deploy.ps1)
```

---

## 4. Workflow de deploy (rotina completa)

### Passo 1 — Modificar código no Windows

Edite os arquivos em `api/` ou `web/src/` conforme necessário.

### Passo 2 — Compilar e empacotar (no Windows)

Abra PowerShell na raiz do projeto (`C:\Users\joao.garbeline\Desktop\coldlinebrasil`) e rode:

```powershell
.\deploy.ps1
```

O script faz automaticamente:
1. Compila o backend Go para **Linux** (cross-compile com `GOOS=linux GOARCH=amd64`)
2. Constrói o frontend React (`npm run build`)
3. Builda a imagem Docker da **API** (`docker build -t coldlinebrasil-api:local ./api`)
4. Builda a imagem Docker do **Web** (`docker build -t coldlinebrasil-web:local ./web`)
5. Exporta ambas as imagens como `.tar` (api-image.tar, web-image.tar)
6. Atualiza a pasta `deploy/` com tudo
7. Compacta tudo em `deploy.zip` (~220 MB)

**Saída esperada:**
```
==> Compilando backend (Go)...
    server: 14.84 MB
==> Compilando frontend (React)...
    dist/assets: 2 arquivos
==> Buildando imagem Docker da API...
==> Buildando imagem Docker do Web...
==> Exportando imagens para .tar...
    api-image.tar: 110.57 MB
    web-image.tar: 106.05 MB
```

### Passo 3 — Transferir para o servidor

Como o servidor não tem acesso fácil para SCP, use **FileZilla** ou **WinSCP**:

1. Conecte em `SRVAP02` como usuário `automacao`
2. Painel esquerdo: navegue até `C:\Users\joao.garbeline\Desktop\coldlinebrasil\`
3. Painel direito: navegue até `/home/automacao/coldlinebrasil/`
4. Arraste o arquivo `deploy.zip` (substitui o existente)

### Passo 4 — Deploy no servidor (Linux)

Conecte no servidor via SSH e rode **exatamente** estes comandos (você deve estar em `~/coldlinebrasil/`):

```bash
cd ~/coldlinebrasil
unzip -o deploy.zip -d .
bash start.sh
```

⚠️ **Importante:** Use `bash start.sh`, **NÃO** `./up.sh` diretamente. O `start.sh` é um wrapper que faz o `chmod +x` automaticamente.

### Passo 5 — Validar

A saída do `start.sh` deve mostrar (em ordem):

```
==> Tornando scripts executaveis...
==> Executando up.sh...
==> Removendo containers existentes (forçar recriação)...
==> Removendo imagens antigas (forçar reload)...
==> Carregando imagens Docker...
==> Verificando imagens carregadas:
coldlinebrasil-api:local   <hash>   ...
coldlinebrasil-web:local   <hash>   ...
==> Subindo containers...
[+] Running 3/3
 ✔ Container coldlinebrasil-postgres-1  Running
 ✔ Container coldlinebrasil-api-1       Started
 ✔ Container coldlinebrasil-web-1       Started
==> Status:
NAME                        STATUS
coldlinebrasil-api-1        Up (criado há segundos)
coldlinebrasil-web-1        Up (criado há segundos)
coldlinebrasil-postgres-1   Up
==> Validando:
{"db":"postgres","status":"ok"} - API OK
HTTP 200 - Web OK
==> Hash da imagem web em execução:
sha256:...
==> Monitorings cadastrados:
 count
-------
    XX
==> Última ação: testar a API de Monitoring:
[{"id":"...","unidade":"...",...}]
```

**Containers devem ter sido CRIADOS HÁ SEGUNDOS** (não há 49 minutos). Se aparecer `49 minutes ago` ou similar, o deploy não recriou os containers — verifique se o `up.sh` está com as proteções (deve ter `docker compose down` antes do load).

### Passo 6 — Testar no navegador

1. Abra `http://10.0.0.44:8888/` no navegador
2. **Hard refresh:** `Ctrl+Shift+Delete` → limpar cache, ou `Ctrl+Shift+R` para forçar reload
3. Faça login e teste as funcionalidades

---

## 5. Backup do banco de dados

**Fazer backup completo (binário):**
```bash
docker exec coldlinebrasil-postgres-1 pg_dump -U coldline -d coldlinedb -Fc > ~/backup_coldline_$(date +%Y%m%d_%H%M%S).dump
ls -lh ~/backup_coldline_*.dump
```

**Restaurar backup:**
```bash
docker exec -i coldlinebrasil-postgres-1 pg_restore -U coldline -d coldlinedb --clean --if-exists < ~/backup_coldline_XXXXXXXX_XXXXXX.dump
```

**Verificar se o backup é válido:**
```bash
docker exec coldlinebrasil-postgres-1 pg_restore -l ~/backup_coldline_*.dump | head -20
```

---

## 6. Troubleshooting

### ❌ "Port 80 already allocated" ou conflito de porta
O `nginx-proxy-manager` de outro sistema está ocupando a porta 80. **Não mexer nele** — o nosso web está na porta **8888** propositalmente.

```bash
# Ver o que está na porta 80
sudo ss -tlnp | grep ':80 '

# Ver containers rodando
docker ps
```

### ❌ "cannot execute binary file: Exec format error" (api crashando)
O binário foi compilado para Windows em vez de Linux. Verificar:

```powershell
# No Windows, conferir o cabeçalho do binário
Format-Hex "C:\Users\joao.garbeline\Desktop\coldlinebrasil\api\server" | Select-Object -First 2
# Deve começar com 7F 45 4C 46 (ELF = Linux)
# Se começar com 4D 5A (MZ = Windows), o cross-compile falhou
```

Garantir que o `deploy.ps1` está fazendo:
```powershell
$env:CGO_ENABLED = "0"
$env:GOOS = "linux"
$env:GOARCH = "amd64"
go build -trimpath -ldflags="-s -w" -o server ./cmd/server
```

### ❌ "permission denied" ao rodar `./up.sh`
Sempre use `bash start.sh` (em vez de `./up.sh`). O `start.sh` faz o `chmod +x` automaticamente.

Se ainda falhar:
```bash
chmod +x start.sh up.sh
bash start.sh
```

### ❌ "bash: deploy/start.sh: Arquivo ou diretório inexistente"
Os arquivos foram extraídos em `./` (não em `./deploy/`). Use:
```bash
cd ~/coldlinebrasil
bash start.sh
```

### ❌ Containers não recriam (mostram "49 minutes ago")
O `up.sh` precisa ter as proteções:
```bash
head -8 deploy/up.sh
# Deve mostrar "==> Removendo containers existentes"
# Se mostrar só "==> Carregando imagens Docker..." é a versão antiga
```

Se for a versão antiga, transfira o `deploy.zip` novo novamente.

### ❌ Frontend mostra tela em branco ou cache antigo
1. **Hard refresh:** `Ctrl+Shift+Delete` → limpar cache
2. Ou abrir em aba anônima (`Ctrl+Shift+N`)
3. Verificar se o nginx.conf tem `Cache-Control: no-store` (já está configurado)

### ❌ API retorna "user não encontrado" ou erro de permissão
O `userType` no JWT é o **ID** (não o nome). A função `canManageAtend` resolve o ID para nome via DB + cache. Se aparecer problemas, limpar cache e reiniciar a API:
```bash
cd ~/coldlinebrasil/deploy
docker compose restart api
```

### ❌ Imagens Docker não buildam no Windows
Certificar que:
- Docker Desktop está rodando
- As imagens base `postgres:16-alpine` estão em cache local:
  ```powershell
  docker images | Select-String "postgres:16-alpine"
  ```
  Se não estiver: `docker pull postgres:16-alpine` (precisa de internet)

---

## 7. Endpoints da API (referência rápida)

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/User/login` | POST | Login (retorna token JWT) |
| `/api/Atendimento` | GET | Lista atendimentos |
| `/api/Atendimento/search` | GET | Busca com filtros (page, pageSize, status, priority, etc) |
| `/api/Atendimento` | POST | Cria atendimento |
| `/api/Atendimento/:id` | GET | Detalhes de um atendimento |
| `/api/Atendimento/:id` | PUT | Atualiza atendimento |
| `/api/Atendimento/:id` | DELETE | Remove atendimento |
| `/api/Atendimento/:id/status` | PATCH | Altera status |
| `/api/Atendimento/:id/diagnosis` | PATCH | Atualiza diagnóstico |
| `/api/Atendimento/:id/tags` | PATCH | Atualiza tags |
| `/api/Atendimento/:id/files` | POST | Upload (multipart) |
| `/api/Atendimento/dashboard` | GET | Indicadores |
| `/api/Atendimento/knowledge-base` | GET | Artigos da base de conhecimento |
| `/api/Atendimento/report/general` | GET | Relatório geral |
| `/api/Atendimento/report/client/:id` | GET | Relatório por cliente |
| `/api/Monitoring` | GET | Lista equipamentos de monitoramento (sem paginação) |
| `/api/Monitoring/search` | GET | Busca de monitoramentos (com paginação) |
| `/api/Client` | GET | Lista clientes |

---

## 8. Funcionalidades implementadas (módulo Atendimentos)

- ✅ Cadastro com busca de cliente (do **Monitoramento**)
- ✅ 6 status: Aberto, Em andamento, Aguardando cliente, Aguardando peça, Resolvido, Encerrado
- ✅ 4 prioridades: Baixa, Média, Alta, Crítica
- ✅ 6 tipos de equipamento: CLP, Controlador, IHM, Gateway, Sistema Supervisório, Outro
- ✅ Diagnóstico com **auto-save** e **histórico de edições**
- ✅ Upload de **imagens** (com preview) e **documentos** (PDF, Excel, Word, etc)
- ✅ Linha do tempo cronológica com ícones por tipo
- ✅ Histórico por cliente (resumo + lista)
- ✅ Dashboard com **6 gráficos** (recharts): status, mês, técnico, cliente, causa, equipamento
- ✅ Relatórios (geral + por cliente) com exportação **CSV**
- ✅ **Base de Conhecimento** (publicar atendimentos resolvidos)
- ✅ **Checklist** com templates (Instalação, Comissionamento, Manutenção)
- ✅ **Assinatura digital** (técnico + cliente) com IP
- ✅ **Controle de tempo** (trabalho + deslocamento) com cronômetro
- ✅ **Sistema de Tags** (com sugestões predefinidas)
- ✅ **Pesquisa avançada** (full-text em vários campos)
- ✅ Integração com **Monitoramento** (CLP, IHM, Gateway, etc)

---

## 9. Permissões

- **Admin** (`Administrador`): vê tudo
- **Técnico** (`Técnico`): só vê os atendimentos onde é o técnico responsável
- **Outros tipos**: comportamento padrão (precisa ser admin para acessar)

A função `canManageAtend` no backend (`api/internal/handlers/atendimentos.go`) resolve o userType do JWT (que é o **ID**) para o nome via DB com cache em `sync.Map`.

---

## 10. Comandos úteis no servidor

```bash
# Ver logs do container api em tempo real
docker logs -f coldlinebrasil-api-1

# Ver status dos containers
docker compose -f ~/coldlinebrasil/deploy/docker-compose.yml ps

# Entrar no container do postgres
docker exec -it coldlinebrasil-postgres-1 psql -U coldline -d coldlinedb

# Contar registros de uma tabela
docker exec coldlinebrasil-postgres-1 psql -U coldline -d coldlinedb -c "SELECT COUNT(*) FROM atendimentos;"

# Backup rápido
docker exec coldlinebrasil-postgres-1 pg_dump -U coldline -d coldlinedb -Fc > ~/backup_$(date +%Y%m%d).dump

# Reiniciar só a API (sem perder o banco)
cd ~/coldlinebrasil/deploy && docker compose restart api

# Ver quanto espaço o banco está usando
docker exec coldlinebrasil-postgres-1 psql -U coldline -d coldlinedb -c "SELECT pg_size_pretty(pg_database_size('coldlinedb'));"

# Remover TUDO e começar do zero (CUIDADO!)
cd ~/coldlinebrasil/deploy
docker compose down -v    # O -v remove os volumes (banco) também!
docker compose up -d
```

---

## 11. Variáveis de ambiente importantes

### Backend (`api/cmd/server/main.go`)
- `DATABASE_URL` — string de conexão PostgreSQL
- `JWT_SECRET` — chave para tokens JWT
- `ENCRYPTION_KEY` — chave para criptografia
- `PORT` — porta (padrão 4000)

### Frontend (`web/.env.production`)
- `VITE_API_URL` — **vazio** em produção (usa URLs relativas, nginx faz proxy)
- `VITE_USER_TYPE_ADMIN` — ID do tipo admin (controle de UI)

---

## 12. Contatos / referências

- **Repositório:** `C:\Users\joao.garbeline\Desktop\coldlinebrasil`
- **Servidor:** `10.0.0.44` (usuário `automacao`)
- **Domínio (em produção):** `coldnex.com` (porta 80 — via proxy reverso do nginx-proxy-manager)
- **Acesso interno:** `http://10.0.0.44:8888/`

---

_Documento gerado em 23/06/2026 — manter atualizado conforme mudanças no deploy._

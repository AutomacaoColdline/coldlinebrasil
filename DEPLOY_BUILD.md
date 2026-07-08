# Runbook de Deploy — Coldline Brasil

> ⚠️ **OBSOLETO** — o deploy atual é via Easypanel (build direto do Git, sem
> `.tar`/FileZilla). Veja [`EASYPANEL.md`](./EASYPANEL.md). Mantido só como
> referência histórica.

> Instruções para a IA gerar o pacote de deploy (`deploy.zip`) e para o usuário
> instalar no servidor. O servidor **não tem acesso ao Docker Hub**, então as
> imagens são buildadas aqui no Windows e enviadas como `.tar` dentro do zip.

---

## Objetivo

Gerar um `deploy.zip` enxuto contendo **apenas**:

```
api-image.tar        # imagem Docker da API (Go) já compilada
web-image.tar        # imagem Docker do Web (React + nginx) já buildada
docker-compose.yml   # usa image: (NÃO build:) — não precisa do código-fonte
up.sh                # carrega os .tar e sobe os containers
start.sh             # wrapper: dá chmod e chama up.sh
```

As pastas `api/` e `web/` (código-fonte) **não vão no zip** — o código já está
compilado dentro dos `.tar`.

---

## Pré-requisitos (Windows, máquina de build)

- Docker Desktop rodando
- Go 1.22+
- Node 20+
- Imagem base `postgres:16-alpine` em cache local (`docker images | grep postgres`)

---

## Passo a passo (IA executa)

### 1. Compilar o binário Go para Linux

```bash
cd api
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o server ./cmd/server
```

Validar que é ELF (Linux): `head -c 4 server | xxd` deve começar com `7f45 4c46`.
Se começar com `4d5a` (MZ) é binário Windows — o cross-compile falhou.

### 2. Buildar o frontend React

```bash
cd web
npm run build
# confirmar que web/dist/index.html existe
```

### 3. Buildar as imagens Docker

```bash
# a partir da raiz do projeto
docker build -t coldlinebrasil-api:local ./api
docker build -t coldlinebrasil-web:local ./web
```

### 4. Montar a pasta do pacote e exportar as imagens

```bash
rm -rf deploy-pkg && mkdir -p deploy-pkg
docker save -o deploy-pkg/api-image.tar coldlinebrasil-api:local
docker save -o deploy-pkg/web-image.tar coldlinebrasil-web:local
```

### 5. Criar o `docker-compose.yml` (dentro de deploy-pkg)

Pontos críticos: usar `image:` (não `build:`) e mapear o web em **8888:80**
(a porta 80 do host é do nginx-proxy-manager).

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=coldline
      - POSTGRES_PASSWORD=<db-password>
      - POSTGRES_DB=coldlinedb
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  api:
    image: coldlinebrasil-api:local
    dns:
      - 1.1.1.1
      - 8.8.8.8
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgres://coldline:<db-password>@postgres:5432/coldlinedb?sslmode=disable
      - JWT_SECRET=<jwt-secret>
      - ENCRYPTION_KEY=<encryption-key>
      - PORT=4000
    volumes:
      - uploads:/app/wwwroot/uploads
    depends_on:
      - postgres
    restart: unless-stopped

  web:
    image: coldlinebrasil-web:local
    ports:
      - "8888:80"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  uploads:
  pgdata:
```

### 6. Criar o `up.sh` (dentro de deploy-pkg)

```bash
#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "==> Removendo containers existentes (forçar recriação)..."
docker compose down || true

echo "==> Removendo imagens antigas (forçar reload)..."
docker image rm coldlinebrasil-api:local coldlinebrasil-web:local 2>/dev/null || true

echo "==> Carregando imagens Docker..."
docker load -i "$DIR/api-image.tar"
docker load -i "$DIR/web-image.tar"

echo "==> Subindo containers..."
docker compose up -d

echo ""
echo "==> Status:"
docker compose ps

echo ""
echo "==> Validando:"
sleep 4
curl -sf http://localhost:4000/api/health && echo " - API OK" || echo " - API FAIL"
curl -sf -o /dev/null -w "%{http_code}" http://localhost:8888/ | grep -q "200" && echo " - Web OK" || echo " - Web FAIL"
```

### 7. Criar o `start.sh` (dentro de deploy-pkg)

```bash
#!/bin/bash
echo "==> Tornando scripts executaveis..."
DIR="$(cd "$(dirname "$0")" && pwd)"
chmod +x "$DIR/up.sh"
echo "==> Executando up.sh..."
bash "$DIR/up.sh"
```

### 8. Compactar em deploy.zip (PowerShell)

```powershell
$src = "C:\Users\joao.garbeline\Desktop\coldlinebrasil\deploy-pkg\*"
$dst = "C:\Users\joao.garbeline\Desktop\coldlinebrasil\deploy.zip"
Remove-Item $dst -ErrorAction SilentlyContinue
Compress-Archive -Path $src -DestinationPath $dst -CompressionLevel Optimal
```

Resultado esperado: `deploy.zip` de ~215 MB com 5 arquivos.

---

## Instalação no servidor (usuário executa)

O Postgres já roda no servidor — o compose reusa o volume `pgdata`, então o banco
**não é apagado**.

1. Transferir o `deploy.zip` (FileZilla/WinSCP) para `/home/automacao/coldlinebrasil/`
2. Rodar via SSH:

```bash
cd ~/coldlinebrasil
unzip -o deploy.zip -d .
bash start.sh
```

O `start.sh` derruba os containers antigos, carrega os `.tar` novos, sobe tudo e
valida API e Web ao final.

---

## Portas e acesso

- **coldnex.com** (porta 80/443, sem porta na URL) → atendido pelo
  **nginx-proxy-manager**, que faz proxy reverso para `10.0.0.44:8888`.
- **8888** → porta do container web no host (alvo do proxy + acesso interno direto
  em `http://10.0.0.44:8888/`).
- **4000** → API (`http://10.0.0.44:4000/api/health`).

A porta 8888 é obrigatória mesmo usando o domínio — é para onde o proxy encaminha.

---

## Troubleshooting rápido

- **`pull access denied`** → o compose está com `image:` mas os `.tar` não foram
  carregados (faltou rodar `up.sh`) ou não estão no zip. Confirmar que
  `api-image.tar` e `web-image.tar` estão presentes.
- **`port 8888 already allocated`** → `sudo ss -tlnp | grep ':8888 '` para ver quem
  está usando.
- **`Exec format error` na API** → binário compilado para Windows. Refazer o passo 1
  com `GOOS=linux GOARCH=amd64`.
- **Tela em branco / cache antigo** → hard refresh (`Ctrl+Shift+R`) ou aba anônima.

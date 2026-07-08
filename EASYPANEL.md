# Coldline Brasil — Deploy via Easypanel (intranet)

> Sistema interno do projeto **Coldline** no Easypanel. Diferente dos outros
> apps (que usam domínio público real), este roda em `coldnex.com`, um
> domínio que **não existe no DNS público** — ele só funciona porque cada
> máquina da rede tem uma entrada manual no arquivo `hosts` apontando para o
> servidor. Ninguém fora da rede interna consegue acessar.

---

## 1. Arquitetura

```
Easypanel (servidor 10.0.0.73)
 └─ Projeto "coldline" → App "coldlinebrasil" (Compose)
     ├─ postgres   (sem domínio, sem porta pública)
     ├─ api        (sem domínio, sem porta pública — só rede interna do compose)
     └─ web        (nginx + React) ← domínio coldnex.com, porta 80, HTTP apenas
```

O `docker-compose.yml` da raiz **não expõe nenhuma porta de host** (`ports:`).
Isso evita o conflito "ports is used in api/web" que aparecia no Easypanel
quando duas apps tentavam reservar a mesma porta do servidor. O roteamento
até o container `web` é feito pelo proxy do próprio Easypanel (Traefik), que
decide para onde mandar a requisição olhando o **Host** (`coldnex.com`) —
não a porta.

O `web` (nginx) já faz proxy interno de `/api/` e `/uploads/` para o
container `api` pela rede Docker do compose (`web/nginx.conf`), então o
frontend usa URLs relativas (`VITE_API_URL` vazio) e só o `web` precisa de
domínio público/interno.

---

## 2. Build

Antes o deploy era: compilar no Windows → gerar `.tar` → subir por
FileZilla → `bash start.sh` no servidor (ver `DEPLOY.md`, processo
**obsoleto**). Agora o Easypanel builda direto do repositório Git a partir
dos `Dockerfile` multi-stage:

- `api/Dockerfile`: builder `golang:1.22-alpine` compila `./cmd/server`,
  imagem final `alpine:3.20` só com o binário.
- `web/Dockerfile`: builder `node:20-alpine` roda `npm install && npm run build`,
  imagem final `nginx:1.27-alpine` serve o `dist/`.

Ou seja: **basta dar push no Git** e configurar o app no Easypanel para
rebuildar (deploy automático ou manual pelo painel). Não precisa mais gerar
`deploy.zip`, `.tar` nem usar `deploy.ps1`/`up.sh`/`start.sh`.

---

## 3. Configuração no Easypanel

### 3.1 App (Compose)

1. Criar app do tipo **Compose** dentro do projeto **coldline**, nome
   sugerido: `coldlinebrasil` (ou `intranet`).
2. Apontar para este repositório Git (branch `main`), usando o
   `docker-compose.yml` da raiz.
3. **Não marcar** nenhuma porta como pública na tela de conflito de portas —
   o compose já não declara `ports:`, então esse aviso não deve mais
   aparecer.

### 3.2 Variáveis de ambiente (única caixa do stack)

Cole na aba de variáveis de ambiente do app:

```
POSTGRES_DB=coldlinedb
POSTGRES_USER=coldline
POSTGRES_PASSWORD=<gerar-uma-senha-forte>
JWT_SECRET=<gerar-um-secret-forte>
ENCRYPTION_KEY=<gerar-uma-chave-de-32-chars>
```

`DATABASE_URL` e `PORT` são montados sozinhos dentro do `docker-compose.yml`
a partir dessas variáveis — não precisa declarar. Se as variáveis não forem
setadas, o compose cai nos valores padrão de desenvolvimento (não usar em
produção).

### 3.3 Domínio (coldnex.com)

Na aba **Domains** do app:

- Domínio: `coldnex.com`
- Serviço: `web`
- Porta: `80` (a interna do `Dockerfile.web`/nginx)
- **HTTPS/Let's Encrypt: desabilitado.** Como o domínio não existe no DNS
  público, a emissão de certificado vai falhar — deixar só HTTP.

Não exponha `postgres` nem `api` com domínio.

### 3.4 Entrada no `hosts` de cada máquina da rede

Para `http://coldnex.com` resolver para o servidor Easypanel (`10.0.0.73`),
cada máquina da rede interna precisa de uma linha no arquivo de hosts:

```
10.0.0.73    coldnex.com
```

- **Windows:** editar `C:\Windows\System32\drivers\etc\hosts` como
  Administrador.
- **Linux/Mac:** editar `/etc/hosts` com `sudo`.

Se a rede tiver um servidor DNS interno (ex: um AD/Windows Server ou
Pi-hole), é preferível cadastrar `coldnex.com → 10.0.0.73` lá em vez de
editar máquina por máquina — mas por enquanto o combinado é hosts manual.

---

## 4. Migração do servidor antigo (10.0.0.44 → 10.0.0.73)

O Docker antigo (`nginx-proxy-manager` + containers manuais) rodava em
`10.0.0.44`. O CORS do backend (`api/internal/config/config.go` e
`api/cmd/server/main.go`) já foi atualizado para liberar `10.0.0.73` no
lugar de `10.0.0.44`. Se `10.0.0.44` ainda estiver em uso durante a
transição, adicione a origem de volta temporariamente nesses dois arquivos.

Depois que o Easypanel em `10.0.0.73` estiver validado, desligar os
containers antigos em `10.0.0.44` (`docker compose down` — não usar `-v`
antes de confirmar que o banco novo já tem os dados migrados).

---

## 5. Backup e comandos úteis

Mesmos comandos de sempre, só troque o nome do container pelo prefixo que o
Easypanel usa (visível em `docker ps` no servidor):

```bash
docker exec <container-postgres> pg_dump -U coldline -d coldlinedb -Fc > backup_$(date +%Y%m%d).dump
docker exec -it <container-postgres> psql -U coldline -d coldlinedb
```

---

## 6. Documentos antigos (obsoletos)

`DEPLOY.md`, `DEPLOY_BUILD.md`, `deploy.ps1`, `up.sh`, `start.sh` descrevem o
fluxo antigo (build no Windows + transferência manual de `.tar` para
`10.0.0.44` atrás do `nginx-proxy-manager`). Mantidos só como referência
histórica — o fluxo atual é este documento.

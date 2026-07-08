$ErrorActionPreference = "Stop"
$src = $PSScriptRoot
$out = Join-Path $src "deploy"

Write-Host "==> Limpando build anterior..." -ForegroundColor Cyan
Remove-Item -Recurse -Force $out -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "$out\api" | Out-Null
New-Item -ItemType Directory -Force -Path "$out\web" | Out-Null

Write-Host "==> Compilando backend (Go)..." -ForegroundColor Cyan
$env:CGO_ENABLED = "0"
Set-Location "$src\api"
go build -trimpath -ldflags="-s -w" -o "$out\api\server.exe" ./cmd/server
if (-not (Test-Path "$out\api\server.exe")) { throw "Falha ao compilar backend" }
Write-Host "    server.exe: $((Get-Item "$out\api\server.exe").Length / 1MB) MB" -ForegroundColor Gray

Write-Host "==> Compilando frontend (React)..." -ForegroundColor Cyan
Set-Location "$src\web"
npm run build 2>&1 | Out-Null
if (-not (Test-Path "$src\web\dist\index.html")) { throw "Falha ao buildar frontend" }
Copy-Item "$src\web\dist" "$out\web\dist" -Recurse -Force
Write-Host "    dist/assets: $((Get-ChildItem "$out\web\dist\assets" | Measure-Object).Count) arquivos" -ForegroundColor Gray

Write-Host "==> Copiando Dockerfiles e configs..." -ForegroundColor Cyan
Copy-Item "$src\api\Dockerfile" "$out\api\Dockerfile"
Copy-Item "$src\web\Dockerfile" "$out\web\Dockerfile"
Copy-Item "$src\web\nginx.conf" "$out\web\nginx.conf"
Copy-Item "$src\docker-compose.yml" "$out\docker-compose.yml"

Write-Host "==> Buildando imagem Docker da API..." -ForegroundColor Cyan
Set-Location "$src"
docker build -t coldlinebrasil-api:local "$src\api"
if ($LASTEXITCODE -ne 0) { throw "Falha ao buildar imagem da API" }

Write-Host "==> Buildando imagem Docker do Web..." -ForegroundColor Cyan
docker build -t coldlinebrasil-web:local "$src\web"
if ($LASTEXITCODE -ne 0) { throw "Falha ao buildar imagem do Web" }

Write-Host "==> Exportando imagens para .tar..." -ForegroundColor Cyan
docker save -o "$out\api-image.tar" coldlinebrasil-api:local
docker save -o "$out\web-image.tar" coldlinebrasil-web:local
Get-ChildItem "$out\*.tar" | ForEach-Object {
    Write-Host "    $($_.Name): $([math]::Round($_.Length / 1MB, 2)) MB" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==> PRONTO! Envie a pasta '$out' para o servidor e rode:" -ForegroundColor Green
Write-Host "    ./up.sh" -ForegroundColor Yellow

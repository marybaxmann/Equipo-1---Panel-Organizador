# Levanta, en orden, el ambiente de integracion en la red compartida plataforma-eventos-net:
#   Auth (postgres, rabbitmq, keycloak y auth-service) -> API Gateway -> Entradas / Inventario -> Panel Organizador.
# Los repos de los otros squads NO se modifican. Solo el Gateway necesita un override (gateway.override.yml), porque su
# .env no viene en el repo y su .env.example apunta Auth al puerto 3000.
# La clave compartida de Auth se lee de su .env y se pasa por variable de entorno; no se imprime ni se guarda.
# Requisitos: Docker Desktop corriendo y Auth preparado una vez segun su README (backend/.env, llaves *.pem, prisma-init y usuarios QA).
# Uso:
#   powershell -ExecutionPolicy Bypass -File tools\pruebas-integracion\levantar-ambiente.ps1 [-SinSeed]
param(
  [string]$RepoAuth = '',
  [string]$RepoGateway = '',
  [string]$RepoEntradas = '',
  # Sin -SinSeed, el Panel arranca con SEED_DEMO=true: BORRA sus eventos, carga el seed y lo anuncia por el broker
  [switch]$SinSeed
)
. "$PSScriptRoot\comun.ps1"
if (-not $RepoAuth) { $RepoAuth = Join-Path $CarpetaRepos 'auth-arquitectura' }
if (-not $RepoGateway) { $RepoGateway = Join-Path $CarpetaRepos 'backendticketU' }
if (-not $RepoEntradas) { $RepoEntradas = Join-Path $CarpetaRepos 'entradas-inventario' }
foreach ($ruta in @("$RepoAuth\backend\.env", "$RepoGateway\api-gateway\docker-compose.yml", "$RepoEntradas\docker-compose.yml")) {
  if (-not (Test-Path $ruta)) { Write-Host "No encuentro $ruta. Indica la carpeta con -RepoAuth, -RepoGateway o -RepoEntradas." -ForegroundColor Red; exit 1 }
}

function Write-Paso([string]$texto) { Write-Host "`n--- $texto" -ForegroundColor Cyan }

docker info *> $null
if ($LASTEXITCODE -ne 0) { Write-Host 'Docker no responde: abre Docker Desktop y espera "Engine running".' -ForegroundColor Red; exit 1 }
$red = 'plataforma-eventos-net'
if (-not (docker network ls --format '{{.Name}}' | Where-Object { $_ -eq $red })) { docker network create $red | Out-Null; Write-Host "Red $red creada" }

$clave = Get-ValorEnv "$RepoAuth\backend\.env" 'INTERNAL_API_KEY'
$env:INTERNAL_API_KEY = $clave       # lo lee el docker-compose.yml de Entradas (${INTERNAL_API_KEY})
$env:AUTH_INTERNAL_API_KEY = $clave   # lo lee docker-compose.integracion.yml del Panel

Write-Paso 'Auth: postgres, rabbitmq y keycloak'
docker compose -f "$RepoAuth\backend\docker-compose.yml" up -d 2>&1 | Select-Object -Last 3
foreach ($c in 'ticketu-db', 'ticketu-rabbitmq', 'ticketu-keycloak') {
  $redes = docker inspect $c --format '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}'
  if ($redes -notcontains $red) { docker network connect $red $c; Write-Host "$c conectado a $red" }
}
Write-Host 'Esperando el realm de Keycloak...'
if (-not (Wait-Http 'http://localhost:8081/realms/ticketu-realm' 60 3)) { Write-Host 'Keycloak no respondio a tiempo' -ForegroundColor Red; exit 1 }

Write-Paso 'Auth: auth-service'
docker compose -f "$RepoAuth\backend\docker-compose.auth-service.yml" up -d 2>&1 | Select-Object -Last 2
if (-not (Wait-Http 'http://localhost:10000/api/health' 40 3)) { Write-Host 'Auth no respondio a tiempo' -ForegroundColor Red; exit 1 }

Write-Paso 'API Gateway (:8080)'
docker compose -f "$RepoGateway\api-gateway\docker-compose.yml" -f "$PSScriptRoot\gateway.override.yml" up -d --build 2>&1 | Select-Object -Last 2

Write-Paso 'Entradas / Inventario (:3003)'
# Su Mongo publica el 27017 del host, el mismo del Mongo de desarrollo del Panel: si esta encendido, se detiene
if (docker ps --format '{{.Names}}' | Where-Object { $_ -eq 'panel-organizador-mongo-1' }) { docker stop panel-organizador-mongo-1 | Out-Null; Write-Host 'Mongo de desarrollo del Panel detenido (usaba el 27017)' }
docker compose -f "$RepoEntradas\docker-compose.yml" up -d --build 2>&1 | Select-Object -Last 2
# Entradas no reintenta la conexion a RabbitMQ: si ya corria desde antes que el broker (p. ej. tras reiniciar Docker),
# queda sin broker. Se reinicia para que se conecte con RabbitMQ ya listo
docker restart entradas-service | Out-Null

Write-Paso "Panel Organizador ($(if ($SinSeed) { 'sin tocar sus datos' } else { 'SEED_DEMO=true' }))"
# Siempre con --env-file: sin el, Docker lee el .env de desarrollo del repo, que apunta Auth a localhost (no existe dentro
# del contenedor). Una variable del entorno pesa mas que el archivo, asi -SinSeed apaga el seed
if ($SinSeed) { $env:SEED_DEMO = 'false' }
docker compose --env-file "$PSScriptRoot\panel-integracion.env" -f "$RepoPanel\docker-compose.integracion.yml" up -d --build 2>&1 | Select-Object -Last 2
if ($SinSeed) { Remove-Item Env:SEED_DEMO }

Write-Host "`nEsperando que respondan el Gateway y el Panel por el Gateway..."
$okGateway = Wait-Http 'http://localhost:8080/health' 40 2
$okPanel = Wait-Http 'http://localhost:8080/api/organizador/v1/organizador/eventos/proximos' 60 2
Remove-Item Env:INTERNAL_API_KEY, Env:AUTH_INTERNAL_API_KEY

Write-Paso 'Contenedores'
docker ps --format 'table {{.Names}}\t{{.Status}}' | Out-Host
if ($okGateway -and $okPanel) { Write-Host "Ambiente listo: Gateway http://localhost:8080 - RabbitMQ http://localhost:15672 (vhost ticketu)" -ForegroundColor Green; exit 0 }
Write-Host 'El Gateway o el Panel no respondieron: revisa docker logs de cada contenedor.' -ForegroundColor Red
exit 1

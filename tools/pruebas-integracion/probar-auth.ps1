# Prueba de integracion Panel <-> Auth REAL (contrato Auth v1.1). Muestra una tabla con cada caso.
#
# Dos modos:
#   (sin -Red)  Auth en localhost:10000 y el Panel en localhost:3000 (npm run dev:api con AUTH_SERVICE_URL=http://localhost:10000)
#   -Red        dentro de la red plataforma-eventos-net, entrando por el API Gateway :8080. El Panel corre en su
#               contenedor (docker-compose.integracion.yml) y valida contra http://auth-service:10000
#
# Ojo: la prueba 6 apaga y vuelve a encender el contenedor de Auth, y la 7 revoca la sesion de organizador1.
# Uso:
#   powershell -ExecutionPolicy Bypass -File tools\pruebas-integracion\probar-auth.ps1 [-Red] [-AuthEnv <ruta al .env de Auth>]
param(
  [switch]$Red,
  # .env del repo de Auth: de ahi salen INTERNAL_API_KEY (prueba 8) y AUTH_OPERATIONS_KEY (prueba 7).
  # Tambien se pueden pasar como variables de entorno con esos mismos nombres
  [string]$AuthEnv = '',
  [string]$AuthUrl = 'http://localhost:10000',
  [string]$Gateway = 'http://localhost:8080',
  [string]$ContenedorAuth = 'ticketu-auth-service',
  [string]$ContenedorPanel = 'panel-organizador-integracion-organizador-service-1'
)
. "$PSScriptRoot\comun.ps1"
$ClaveQA = Get-ClaveQA
if (-not $AuthEnv) { $AuthEnv = Join-Path $CarpetaRepos 'auth-arquitectura\backend\.env' }
$tmp = New-CarpetaTemporal 'prueba-auth'

if ($Red) {
  $entrada = $Gateway
  $panel = "$Gateway/api/organizador/v1"
  $titulo = 'red plataforma-eventos-net via Gateway'
} else {
  $entrada = $AuthUrl
  $panel = 'http://localhost:3000/api/v1'
  $titulo = 'Auth y Panel en localhost'
}

Write-Host "`n=== Panel <-> Auth REAL: $titulo ($(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')) ===`n" -ForegroundColor Cyan
Write-Host "Auth ($AuthUrl/api/health): $(& curl.exe -s "$AuthUrl/api/health")"
if ($Red) {
  Write-Host "Gateway ($Gateway/health): $(& curl.exe -s "$Gateway/health")"
  Write-Host "AUTH_SERVICE_URL del contenedor del Panel: $(docker exec $ContenedorPanel printenv AUTH_SERVICE_URL)"
  Write-Host "Desde el contenedor del Panel, GET http://auth-service:10000/api/health: $(docker exec $ContenedorPanel node -e "fetch('http://auth-service:10000/api/health').then(r=>r.json()).then(j=>console.log(j.status))")"
} else {
  Write-Host "Panel (http://localhost:3000/health): $(& curl.exe -s http://localhost:3000/health)"
}

Write-Host "`nLogin real en $entrada/api/auth/login con los usuarios QA..."
$org = Get-Jwt "$entrada/api/auth/login" 'organizador1@ticketu.test' $true $tmp
$staff = Get-Jwt "$entrada/api/auth/login" 'staff1@ticketu.test' $true $tmp
$comp = Get-Jwt "$entrada/api/auth/login" 'comprador1@ticketu.test' $false $tmp
Write-Host "jwt recibidos: organizador1, staff1, comprador1 (no se muestran)`n"

$r = Invoke-Http "$panel/panel/eventos/mios" $org $tmp
Add-Resultado 1 'Organizador real entra al panel' '200' $r ($r.status -eq 200)
$r = Invoke-Http "$panel/panel/eventos/mios" $null $tmp
Add-Resultado 2 'Sin sesion' '401' $r ($r.status -eq 401)
$r = Invoke-Http "$panel/panel/eventos/mios" 'token-inventado' $tmp
Add-Resultado 3 'jwt inventado' '401' $r ($r.status -eq 401)
$r = Invoke-Http "$panel/panel/eventos/mios" $comp $tmp
Add-Resultado 4 'Comprador (rol usuario) en el panel' '403' $r ($r.status -eq 403 -and $r.codigo -eq 'FORBIDDEN_ROLE')
$r = Invoke-Http "$panel/panel/eventos/mios" $staff $tmp
Add-Resultado '4b' 'Staff en el panel del organizador' '403' $r ($r.status -eq 403)
$r = Invoke-Http "$panel/panel/eventos/66f1a0000000000000000004" $staff $tmp
Add-Resultado '4c' 'Staff en GET compartido (Check-in)' '200' $r ($r.status -eq 200)

# 8. Identidad: el evento queda con el id_usuario que entrega Auth
$cuerpo = '{"nombre_evento":"Prueba Auth ' + (Get-Date -Format 'HH:mm:ss') + '","descripcion":"Integracion Panel-Auth","fecha_evento":"2026-12-20","hora_evento":"20:00","direccion_evento":"Auditorio Principal"}'
$r = Invoke-Http "$panel/panel/eventos" $org $tmp 'POST' $cuerpo
$idOrganizador = if ($r.obj) { $r.obj.id_organizador } else { '' }
$apiKey = Get-ValorEnv $AuthEnv 'INTERNAL_API_KEY'
$idAuth = (& curl.exe -s "$AuthUrl/internal/validar-sesion" --cookie "jwt=$org" -H "x-api-key: $apiKey" | ConvertFrom-Json).usuario.id_usuario
Add-Resultado 8 'Identidad: id_organizador = id_usuario de Auth' '201, ids iguales' $r ($r.status -eq 201 -and $idOrganizador -and $idOrganizador -eq $idAuth) "Panel=$idOrganizador | Auth=$idAuth"

# 5. x-api-key incorrecta: una segunda instancia del Panel con otra clave (no se toca la que esta corriendo)
if ($Red) {
  docker rm -f panel-clave-mala *> $null
  $imagen = docker inspect $ContenedorPanel --format '{{.Config.Image}}'
  $redInterna = docker inspect $ContenedorPanel --format '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | Where-Object { $_ -and $_ -ne 'plataforma-eventos-net' } | Select-Object -First 1
  docker run -d --name panel-clave-mala --network $redInterna -p 3012:3000 `
    -e PORT=3000 -e MONGO_URI=mongodb://organizador-mongo:27017/panel_organizador -e AUTH_SERVICE_URL=http://auth-service:10000 `
    -e AUTH_INTERNAL_API_KEY=clave-incorrecta --entrypoint node $imagen backend/dist/server.js *> $null
  docker network connect plataforma-eventos-net panel-clave-mala *> $null
  Wait-Http 'http://localhost:3012/health' 30 | Out-Null
  $r = Invoke-Http 'http://localhost:3012/api/organizador/v1/panel/eventos/mios' $org $tmp
  docker rm -f panel-clave-mala *> $null
} else {
  $env:PORT = '3002'; $env:AUTH_INTERNAL_API_KEY = 'clave-incorrecta'
  Start-Process cmd.exe -ArgumentList '/c', "npx tsx --env-file-if-exists=../.env src/server.ts > `"$tmp\panel-3002.log`" 2>&1" -WorkingDirectory (Join-Path $RepoPanel 'backend') -WindowStyle Hidden
  Remove-Item Env:PORT, Env:AUTH_INTERNAL_API_KEY
  Wait-Http 'http://localhost:3002/health' 40 | Out-Null
  $r = Invoke-Http 'http://localhost:3002/api/v1/panel/eventos/mios' $org $tmp
  $c = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force }
}
Add-Resultado 5 'x-api-key incorrecta (Auth responde 403)' '502 AUTH_ERROR' $r ($r.status -eq 502)

# 7. Revocacion de sesion en Auth (HU-B8): el jwt anterior deja de servir en el Panel
$opsKey = Get-ValorEnv $AuthEnv 'AUTH_OPERATIONS_KEY'
('{"target_user_id":"' + $idAuth + '","reason":"Prueba integracion Panel"}') | Set-Content -Encoding ascii "$tmp\revoke.json"
$revStatus = & curl.exe -s -o NUL -w '%{http_code}' -X POST "$entrada/api/auth/revoke-session" -H "x-operations-key: $opsKey" -H 'Content-Type: application/json' --data-binary "@$tmp\revoke.json"
$r = Invoke-Http "$panel/panel/eventos/mios" $org $tmp
Add-Resultado 7 'Sesion revocada por Auth' '401' $r ($r.status -eq 401) "revoke-session: HTTP $revStatus"

# 6. Auth apagado: fail-secure (503 sin ejecutar la operacion)
docker stop $ContenedorAuth *> $null
$r = Invoke-Http "$panel/panel/eventos/mios" 'jwt-cualquiera' $tmp
Add-Resultado 6 'Auth apagado (fail-secure)' '503 AUTH_UNAVAILABLE' $r ($r.status -eq 503) ("{0:N2} s" -f $r.segundos)
docker start $ContenedorAuth *> $null
Wait-Http "$AuthUrl/api/health" 40 2 | Out-Null

$fallas = Show-Resumen $titulo
Write-Host "Auth vuelve a estar encendido: $(& curl.exe -s "$AuthUrl/api/health")"
exit $fallas

# Demuestra que el Panel reenvia a Auth el MISMO jwt que Auth emitio (cookie jwt, sin modificar) junto con la x-api-key.
# Levanta un proxy espia (:10001 -> Auth) y una instancia del Panel (:3002) que consulta a Auth a traves del espia.
# No modifica el .env ni el Panel que ya este corriendo. Del jwt solo muestra el inicio, el final y su huella SHA-256.
# Requisitos: Auth en localhost:10000 y la base del Panel (npm run infra:up). Node en el PATH.
# Uso:
#   powershell -ExecutionPolicy Bypass -File tools\pruebas-integracion\probar-jwt.ps1 [-AuthEnv <ruta al .env de Auth>]
param(
  [string]$AuthEnv = '',
  [string]$AuthUrl = 'http://localhost:10000'
)
. "$PSScriptRoot\comun.ps1"
if (-not $AuthEnv) { $AuthEnv = Join-Path $CarpetaRepos 'auth-arquitectura\backend\.env' }
$tmp = New-CarpetaTemporal 'prueba-jwt'
function Get-Sha([string]$v) { $b = [Text.Encoding]::UTF8.GetBytes($v); (-join ([Security.Cryptography.SHA256]::Create().ComputeHash($b) | ForEach-Object { $_.ToString('x2') })).Substring(0, 16) }
function Stop-Puerto([int]$p) { $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force } }

Write-Host "`n=== Prueba: el Panel pasa el jwt de Auth a /internal/validar-sesion ===`n" -ForegroundColor Cyan
Stop-Puerto 10001; Stop-Puerto 3002

# 1. Espia entre Panel y Auth
$logEspia = Join-Path $tmp 'espia.log'
Start-Process node -ArgumentList "`"$PSScriptRoot\espiar-jwt.mjs`"", '10001', $AuthUrl -RedirectStandardOutput $logEspia -WindowStyle Hidden

# 2. Instancia del Panel que habla con Auth a traves del espia, con la clave de Auth de este ambiente
$env:PORT = '3002'; $env:AUTH_SERVICE_URL = 'http://localhost:10001'; $env:AUTH_INTERNAL_API_KEY = Get-ValorEnv $AuthEnv 'INTERNAL_API_KEY'
Start-Process cmd.exe -ArgumentList '/c', "npx tsx --env-file-if-exists=../.env src/server.ts > `"$tmp\panel.log`" 2>&1" -WorkingDirectory (Join-Path $RepoPanel 'backend') -WindowStyle Hidden
Remove-Item Env:PORT, Env:AUTH_SERVICE_URL, Env:AUTH_INTERNAL_API_KEY
if (-not (Wait-Http 'http://localhost:3002/health' 40)) { Write-Host "El Panel de prueba no arranco: revisa $tmp\panel.log" -ForegroundColor Red; Stop-Puerto 10001; exit 1 }

# 3. Login real en Auth: este es el jwt que emite Auth
$jwt = Get-Jwt "$AuthUrl/api/auth/login" 'organizador1@ticketu.test' $true $tmp
Write-Host '1) Auth emitio (POST /api/auth/login, organizador1):' -ForegroundColor Yellow
Write-Host ("   jwt = {0}...{1}  ({2} caracteres, sha256 {3})`n" -f $jwt.Substring(0, 20), $jwt.Substring($jwt.Length - 12), $jwt.Length, (Get-Sha $jwt))

# 4. El navegador llama al Panel con esa cookie
Write-Host '2) Llamada al Panel con esa cookie: GET /api/v1/panel/eventos/mios' -ForegroundColor Yellow
$r = Invoke-Http 'http://localhost:3002/api/v1/panel/eventos/mios' $jwt $tmp
Write-Host "   -> Panel respondio HTTP $($r.status)`n"
Start-Sleep 1

# 5. Lo que vio el espia entre Panel y Auth
Write-Host '3) Lo que el Panel envio a Auth (visto por el espia):' -ForegroundColor Yellow
Get-Content $logEspia | Where-Object { $_ -match '\[ESPIA\]' -and $_ -notmatch 'escuchando' } | ForEach-Object { Write-Host "   $_" }

$visto = (Get-Content $logEspia | Where-Object { $_ -match 'Cookie jwt' } | Select-Object -Last 1) -replace '.*sha256 ([0-9a-f]{16}).*', '$1'
Write-Host ''
$ok = $visto -eq (Get-Sha $jwt) -and $r.status -eq 200
if ($ok) { Write-Host "RESULTADO: el jwt que recibio Auth es IDENTICO al que Auth emitio (sha256 $visto). El Panel lo reenvia sin modificar." -ForegroundColor Green }
else { Write-Host "RESULTADO: FALLA (emitido $(Get-Sha $jwt) / recibido $visto / Panel HTTP $($r.status))" -ForegroundColor Red }

Stop-Puerto 3002; Stop-Puerto 10001
exit $(if ($ok) { 0 } else { 1 })

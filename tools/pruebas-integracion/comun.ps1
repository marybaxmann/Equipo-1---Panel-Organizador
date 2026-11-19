# Funciones compartidas por los scripts de prueba de integracion (se cargan con: . "$PSScriptRoot\comun.ps1").
# Archivo en ASCII a proposito: Windows PowerShell 5.1 lee los .ps1 sin BOM como ANSI.
# Ningun script imprime claves ni jwt completos.
$ErrorActionPreference = 'Continue'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')

$RepoPanel = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
# Los repos de los otros squads se buscan como carpetas hermanas del repo del Panel (se pueden cambiar por parametro)
$CarpetaRepos = Split-Path $RepoPanel -Parent
# Contrasena de los usuarios QA de Auth: la que se eligio al crearlos (QA_SEED_PASSWORD en tools/crear-usuarios-qa.cjs
# de su repo). No tiene valor por defecto: los scripts que hacen login la piden al inicio y se detienen si falta
function Get-ClaveQA {
  if (-not $env:QA_SEED_PASSWORD) {
    Write-Host 'Define QA_SEED_PASSWORD con la contrasena de los usuarios QA de Auth antes de ejecutar este script.' -ForegroundColor Red
    exit 1
  }
  return $env:QA_SEED_PASSWORD
}
$script:Resultados = New-Object System.Collections.ArrayList

function New-CarpetaTemporal([string]$nombre) {
  $dir = Join-Path $env:TEMP $nombre
  New-Item -ItemType Directory -Force $dir | Out-Null
  return $dir
}

# Lee una variable de un .env sin mostrarla. Primero mira la variable de entorno del mismo nombre
function Get-ValorEnv([string]$archivo, [string]$nombre) {
  $desdeEntorno = [Environment]::GetEnvironmentVariable($nombre)
  if ($desdeEntorno) { return $desdeEntorno }
  if (-not (Test-Path $archivo)) { throw "No encuentro $archivo. Indica la ruta con -AuthEnv o define la variable $nombre." }
  $linea = Get-Content $archivo | Where-Object { $_ -match "^$nombre=" } | Select-Object -First 1
  if (-not $linea) { throw "$archivo no tiene $nombre" }
  return ($linea -replace "^$nombre=", '').Trim().Trim('"')
}

# Login real en Auth (directo o por el Gateway). Devuelve el valor de la cookie jwt
function Get-Jwt([string]$urlLogin, [string]$email, [bool]$admin, [string]$tmp) {
  $body = Join-Path $tmp 'login.json'
  ('{"email":"' + $email + '","password":"' + $ClaveQA + '","admin":' + $admin.ToString().ToLower() + '}') | Set-Content -Encoding ascii $body
  $headers = & curl.exe -s -D - -o NUL -X POST $urlLogin -H 'Content-Type: application/json' --data-binary "@$body"
  $linea = $headers | Where-Object { $_ -match '^[Ss]et-[Cc]ookie: jwt=' } | Select-Object -First 1
  if (-not $linea) { throw "Login de $email en $urlLogin fallo" }
  return ($linea -replace '^[Ss]et-[Cc]ookie: jwt=([^;]*).*', '$1')
}

# Llamada HTTP con la cookie jwt. Devuelve status, segundos, codigo de error del Panel y el cuerpo
function Invoke-Http([string]$url, [string]$jwt, [string]$tmp, [string]$metodo = 'GET', [string]$cuerpo = $null) {
  $resp = Join-Path $tmp 'resp.json'
  $a = @('-s', '-o', $resp, '-w', '%{http_code} %{time_total}', '-X', $metodo, $url)
  if ($jwt) { $a += @('--cookie', "jwt=$jwt") }
  if ($cuerpo) {
    $archivo = Join-Path $tmp 'body.json'
    $cuerpo | Set-Content -Encoding ascii $archivo
    $a += @('-H', 'Content-Type: application/json', '--data-binary', "@$archivo")
  }
  $out = (& curl.exe @a) -split ' '
  $json = if (Test-Path $resp) { Get-Content -Raw -Encoding UTF8 $resp } else { '' }
  $codigo = ''
  $obj = $null
  try { $obj = $json | ConvertFrom-Json; if ($obj.error) { $codigo = $obj.error.codigo } } catch {}
  return @{ status = [int]$out[0]; segundos = [double]::Parse($out[1], [Globalization.CultureInfo]::InvariantCulture); codigo = $codigo; json = $json; obj = $obj }
}

function Wait-Http([string]$url, [int]$intentos = 40, [int]$pausa = 1) {
  for ($i = 0; $i -lt $intentos; $i++) {
    if ((& curl.exe -s -o NUL -w '%{http_code}' $url) -eq '200') { return $true }
    Start-Sleep $pausa
  }
  return $false
}

function Add-Resultado($n, [string]$caso, [string]$esperado, $r, [bool]$ok, [string]$detalle = '') {
  $obtenido = "$($r.status) $($r.codigo)".Trim()
  [void]$script:Resultados.Add([pscustomobject]@{ '#' = $n; Caso = $caso; Esperado = $esperado; Obtenido = $obtenido; Resultado = $(if ($ok) { 'OK' } else { 'FALLA' }); Detalle = $detalle })
  Write-Host ("[{0}] {1,-4} {2} -> {3}" -f $(if ($ok) { 'OK' } else { 'XX' }), $n, $caso, $obtenido) -ForegroundColor $(if ($ok) { 'Green' } else { 'Red' })
}

# Imprime la tabla y devuelve el numero de fallas (sirve como codigo de salida)
function Show-Resumen([string]$titulo) {
  Write-Host "`n=== Resumen ===" -ForegroundColor Cyan
  $script:Resultados | Format-Table -AutoSize -Wrap | Out-Host
  $fallas = @($script:Resultados | Where-Object { $_.Resultado -ne 'OK' }).Count
  $total = $script:Resultados.Count
  # Si el script se corto antes de la primera prueba, no hay nada que dar por bueno
  if ($total -eq 0) { Write-Host "NO SE EJECUTO NINGUNA PRUEBA - $titulo (revisa el error de arriba)" -ForegroundColor Red; return 1 }
  if ($fallas -eq 0) { Write-Host "TODAS LAS PRUEBAS OK ($total/$total) - $titulo" -ForegroundColor Green }
  else { Write-Host "$fallas de $total prueba(s) con FALLA - $titulo" -ForegroundColor Red }
  return $fallas
}

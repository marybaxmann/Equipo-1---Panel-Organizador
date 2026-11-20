# Prueba Panel -> Notificaciones por el exchange acordado panel.evento.notificaciones.v1 (ADR-0019, contrato v1.4 sec. 2.2).
# Sigue los pasos acordados con el equipo, todo por el API Gateway:
#   crear y publicar (no llega nada) -> reprogramar (evento_reprogramado) -> comprar 1 entrada en Entradas
#   -> eliminar (CANCELADO, evento_actualizado) -> cambios-estado
# Si Notificaciones no esta levantado, una cola temporal ligada SOLO a ese exchange hace de su consumidor; se borra al final.
# Requisitos: ambiente de levantar-ambiente.ps1 (Gateway, Auth, RabbitMQ, Entradas y el Panel en la red compartida).
# Uso:
#   powershell -ExecutionPolicy Bypass -File tools\pruebas-integracion\probar-notificaciones.ps1
param(
  [string]$Gateway = 'http://localhost:8080',
  [string]$RabbitAdmin = 'http://localhost:15672',
  [string]$ContenedorRabbit = 'ticketu-rabbitmq',
  [string]$VHost = 'ticketu',
  [string]$Exchange = 'panel.evento.notificaciones.v1'
)
. "$PSScriptRoot\comun.ps1"
$ClaveQA = Get-ClaveQA
$tmp = New-CarpetaTemporal 'prueba-notificaciones'
$panel = "$Gateway/api/organizador/v1/panel/eventos"

# Credenciales de la consola de RabbitMQ: se leen del contenedor y no se muestran
$envRabbit = docker inspect $ContenedorRabbit --format '{{range .Config.Env}}{{println .}}{{end}}'
$usuario = ($envRabbit | Where-Object { $_ -match '^RABBITMQ_DEFAULT_USER=' }) -replace '^RABBITMQ_DEFAULT_USER=', ''
$clave = ($envRabbit | Where-Object { $_ -match '^RABBITMQ_DEFAULT_PASS=' }) -replace '^RABBITMQ_DEFAULT_PASS=', ''
$auth = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${usuario}:$clave")) }
$cola = 'prueba.notificaciones.' + (Get-Date -Format 'HHmmss')
$api = "$RabbitAdmin/api"

Write-Host "`n=== Panel -> Notificaciones por el exchange $Exchange ($(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')) ===`n" -ForegroundColor Cyan
try {
  Invoke-RestMethod -Method Put -Uri "$api/queues/$VHost/$cola" -Headers $auth -ContentType 'application/json' -Body '{"durable":false,"auto_delete":false}' | Out-Null
  Invoke-RestMethod -Method Post -Uri "$api/bindings/$VHost/e/$Exchange/q/$cola" -Headers $auth -ContentType 'application/json' -Body '{"routing_key":"#"}' | Out-Null
  Write-Host "Cola temporal $cola ligada solo al exchange $Exchange`n"

  $org = Get-Jwt "$Gateway/api/auth/login" 'organizador1@ticketu.test' $true $tmp
  $comp = Get-Jwt "$Gateway/api/auth/login" 'comprador1@ticketu.test' $false $tmp
  Write-Host "1) login de organizador1 y comprador1 por el Gateway (jwt no se muestran)"

  $r = Invoke-Http $panel $org $tmp 'POST' '{"nombre_evento":"Prueba Notificaciones","descripcion":"Evento de prueba","fecha_evento":"2026-12-05","hora_evento":"18:00","hora_fin_evento":"20:00","direccion_evento":"Sala Multiuso","cantidad_entradas":50,"tipo_entrada":"GRATUITA"}'
  $id = if ($r.obj) { $r.obj.id_evento } else { '' }
  Add-Resultado 2 'Crear evento' '201' $r ($r.status -eq 201 -and $id) "id_evento $id"
  if (-not $id) { throw 'No se pudo crear el evento' }

  $r = Invoke-Http "$panel/mios/$id/publicar" $org $tmp 'POST'
  Add-Resultado 3 'Publicar (a Notificaciones no le llega nada)' '200' $r ($r.status -eq 200)

  $r = Invoke-Http "$panel/mios/$id" $org $tmp 'PATCH' '{"fecha_evento":"2026-12-13","hora_evento":"20:00"}'
  Add-Resultado 4 'Reprogramar al 13/12 20:00' '200' $r ($r.status -eq 200 -and $r.obj.fecha_evento -eq '2026-12-13')

  Start-Sleep 2   # Entradas conoce el evento por el mensaje evento_publicado
  $r = Invoke-Http "$Gateway/api/entradas/procesar-compra" $comp $tmp 'POST' ('{"id_evento":"' + $id + '","tipo_entrada":"GRATUITA","cantidad":1}')
  Add-Resultado 5 'Comprar 1 entrada en Entradas' '200/201' $r ($r.status -in 200, 201) "nuevo_stock $($r.obj.nuevo_stock)"

  Start-Sleep 2
  $r = Invoke-Http "$panel/mios/$id" $org $tmp 'DELETE'
  Add-Resultado 6 'Eliminar con entradas vendidas' '200 CANCELADO' $r ($r.status -eq 200 -and $r.obj.resultado -eq 'CANCELADO')

  $r = Invoke-Http "$panel/$id/cambios-estado" $null $tmp
  $traza = if ($r.obj) { (@($r.obj) | ForEach-Object { $_.nuevo_estado }) -join ' <- ' } else { '' }
  Add-Resultado 7 'cambios-estado' 'CANCELADO <- PUBLICADO <- BORRADOR' $r ($traza -eq 'CANCELADO <- PUBLICADO <- BORRADOR') $traza

  Start-Sleep 4   # el outbox del Panel publica cada segundo
  $respuesta = Invoke-RestMethod -Method Post -Uri "$api/queues/$VHost/$cola/get" -Headers $auth -ContentType 'application/json' -Body '{"count":10,"ackmode":"ack_requeue_true","encoding":"auto"}'
  # En PowerShell 5.1 el arreglo JSON llega como un solo objeto: el pipeline lo desarma en mensajes
  $mensajes = @($respuesta | ForEach-Object { $_ })
  Write-Host "`nMensajes en la cola ligada solo a $Exchange :" -ForegroundColor Yellow
  foreach ($m in $mensajes) { Write-Host "  type=$($m.properties.type) routing_key=$($m.routing_key)`n    $($m.payload)" }
  $delEvento = @($mensajes | Where-Object { ($_.payload | ConvertFrom-Json).id_evento -eq $id })
  $repro = $delEvento | Where-Object { $_.properties.type -eq 'evento_reprogramado' } | Select-Object -First 1
  $cancel = $delEvento | Where-Object { $_.properties.type -eq 'evento_actualizado' } | Select-Object -First 1
  $okRepro = $repro -and (($repro.payload | ConvertFrom-Json).fecha_cambio -eq '2026-12-13')
  $okCancel = $cancel -and (($cancel.payload | ConvertFrom-Json).nuevo_estado -eq 'CANCELADO')
  Add-Resultado 8 'Llega evento_reprogramado (fecha_cambio 2026-12-13)' '1 mensaje' @{ status = @($repro).Count } ([bool]$okRepro)
  Add-Resultado 9 'Llega evento_actualizado (nuevo_estado CANCELADO)' '1 mensaje' @{ status = @($cancel).Count } ([bool]$okCancel)
  Add-Resultado 10 'No llega nada mas (crear y publicar no avisan)' '2 mensajes' @{ status = $delEvento.Count } ($delEvento.Count -eq 2)
} finally {
  try { Invoke-RestMethod -Method Delete -Uri "$api/queues/$VHost/$cola" -Headers $auth | Out-Null; Write-Host "`nCola temporal $cola borrada" } catch {}
}
exit (Show-Resumen "Notificaciones por $Exchange")

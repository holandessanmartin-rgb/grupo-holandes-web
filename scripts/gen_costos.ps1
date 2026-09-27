# Carga renglones de prueba en la hoja Costos.
$URL = "https://script.google.com/macros/s/AKfycbzMjM28bTa52i4adlTifQVFNDCwEL8aQ9nWvbne8oEOf7znEHzeVs2gfs9n1o4rP_cF/exec"
function Post-Costo($c, $canal, $monto, $ini, $fin, $pl, $es) {
  $b = @{ form = "costo"; campana = $c; canal = $canal; monto = $monto
    inicio = $ini; fin = $fin; plantel = $pl; especialidad = $es } | ConvertTo-Json
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($b)
  try {
    ((Invoke-WebRequest -Uri $URL -Method POST -Body $bytes -ContentType "text/plain; charset=utf-8" -TimeoutSec 20).Content | ConvertFrom-Json).ok
  } catch { $false }
}
$hoy = (Get-Date).ToString("yyyy-MM-dd")
$m30 = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
$m60 = (Get-Date).AddDays(-60).ToString("yyyy-MM-dd")
$m90 = (Get-Date).AddDays(-90).ToString("yyyy-MM-dd")
$rows = @(
  @("inscripciones","facebook",15000,$m90,$m60,"",""),
  @("facebook-verano","facebook",8000,$m90,$m60,"",""),
  @("volante","offline",3000,$m90,$m60,"",""),
  @("mecanica-motocicletas","facebook",12000,$m60,$m30,"","Mecanica de Motocicletas"),
  @("tiktok","tiktok",8000,$m60,$m30,"",""),
  @("plantel-san-martin","facebook",10000,$m30,$hoy,"Plantel San Martin, Oaxaca",""),
  @("whatsapp","whatsapp",2000,$m30,$hoy,"",""),
  @("instagram","instagram",6000,$m30,$hoy,"",""),
  @("google","google",5000,$m30,$hoy,"","")
)
$ok = 0
foreach ($r in $rows) {
  if (Post-Costo $r[0] $r[1] $r[2] $r[3] $r[4] $r[5] $r[6]) { $ok++ }
}
"Costos OK: $ok / 9"

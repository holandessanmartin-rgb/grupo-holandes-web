# Genera eventos de prueba en la hoja Interacciones.
# Uso: ... gen_interact.ps1 -Seed 1 -Start 0 -Count 200
param([int]$Seed = 1, [int]$Start = 0, [int]$Count = 200)

$URL = "https://script.google.com/macros/s/AKfycbzMjM28bTa52i4adlTifQVFNDCwEL8aQ9nWvbne8oEOf7znEHzeVs2gfs9n1o4rP_cF/exec"
function Post-Row($h) {
  $j = ($h | ConvertTo-Json -Depth 4)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($j)
  try {
    $r = Invoke-WebRequest -Uri $URL -Method POST -Body $bytes -ContentType "text/plain; charset=utf-8" -TimeoutSec 20
    return ($r.Content | ConvertFrom-Json).ok
  } catch { return $false }
}
$PP = @("Plantel San Martin, Oaxaca","Plantel Santa Maria del Tule","Plantel Tuxtepec","Plantel Huajuapan de Leon","Plantel Puerto Escondido","Plantel Juchitan de Zaragoza","Plantel Tehuacan","Plantel Villahermosa")
$CTX = @("hero","plantel","curso-biker","especialidades","flotante","camp-inscripciones")
$rnd = New-Object Random($Seed)
$ok = 0
for ($i = 0; $i -lt $Count; $i++) {
  $gi = $Start + $i
  $rv = $rnd.NextDouble()
  if ($rv -lt 0.45) { $xev = "whatsapp"; $xdet = $CTX[$rnd.Next(6)] }
  elseif ($rv -lt 0.60) { $xev = "llamada"; $xdet = "clic en telefono" }
  elseif ($rv -lt 0.85) { $xev = "registro"; $xdet = "Mecanica de Motocicletas" }
  else { $xev = "cita"; $xdet = "visita" }
  $xf = (Get-Date).Date.AddDays(-1 * $rnd.Next(0, 90)).AddHours($rnd.Next(8, 21)).AddMinutes($rnd.Next(0, 60))
  $row = @{ form = "interaccion"; evento = $xev; detalle = $xdet
    nombre = "PRUEBA Ev $gi"; telefono = "9519$('{0:d6}' -f (($gi * 104729) % 1000000))"
    plantel = $PP[$rnd.Next(8)]; fecha = $xf.ToString("o") }
  if (Post-Row $row) { $ok++ }
}
"Seed $Seed OK: $ok / $Count"

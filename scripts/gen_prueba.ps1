# Genera datos de prueba en la hoja (prospectos + citas).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/gen_prueba.ps1
$URL = "https://script.google.com/macros/s/AKfycbzMjM28bTa52i4adlTifQVFNDCwEL8aQ9nWvbne8oEOf7znEHzeVs2gfs9n1o4rP_cF/exec"

function Post-Row($h) {
  $j = ($h | ConvertTo-Json -Depth 4)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($j)
  try {
    $r = Invoke-WebRequest -Uri $URL -Method POST -Body $bytes -ContentType "text/plain; charset=utf-8" -TimeoutSec 20
    return ($r.Content | ConvertFrom-Json).ok
  } catch { return $false }
}

$N = @("Carlos","Maria","Jorge","Lucia","Pedro","Fernanda","Miguel","Sofia","Luis","Valeria")
$A = @("Mendez","Lopez","Hernandez","Garcia","Sanchez","Ruiz","Torres","Vargas","Ramirez","Cruz")
$PL = @("Plantel San Martin, Oaxaca","Plantel Santa Maria del Tule","Plantel Tuxtepec","Plantel Huajuapan de Leon")
$PLID = @{"Plantel San Martin, Oaxaca"="san-martin-oaxaca";"Plantel Santa Maria del Tule"="santa-maria-tule";"Plantel Tuxtepec"="tuxtepec";"Plantel Huajuapan de Leon"="huajuapan-leon"}
$SP = @("Mecanica de Motocicletas","Mecanica Automotriz","Mecanica Diesel","Electronica Automotriz")
$rnd = New-Object Random(99)
$okP = 0; $okC = 0; $saved = @()

for ($i = 0; $i -lt 100; $i++) {
  $pnom = $PL[$rnd.Next(4)]; $snom = $SP[$rnd.Next(4)]
  $f = (Get-Date).AddDays(-1 * $rnd.Next(0, 60))
  $nom = "PRUEBA $($N[$rnd.Next(10)]) $($A[$rnd.Next(10)])"
  $tel = "9515$('{0:d6}' -f $rnd.Next(1000000))"
  $row = @{ form = "registro"; nombre = $nom; telefono = $tel; especialidad = $snom
    plantel = $pnom; plantelId = $PLID[$pnom]; cupon = "GH-W$('{0:d3}' -f $i)"
    origen = "test"; campana = @{ source = "facebook"; medium = "cpc"; campaign = "inscripciones" }
    via = "test"; fecha = $f.ToString("o") }
  if (Post-Row $row) { $okP++ }
  $saved += @{ nom = $nom; tel = $tel; sp = $snom; pl = $pnom; plId = $PLID[$pnom]; f = $f }
  if ($i % 4 -eq 0 -and $okC -lt 25) {
    $s = $saved[$saved.Count - 1]
    $fc = $s.f.AddDays($rnd.Next(1, 12))
    $cita = @{ form = "citas"; nombre = $s.nom; telefono = $s.tel; especialidad = $s.sp
      plantel = $s.pl; plantelId = $s.plId; tipo = @("visita","visita","clase-muestra","asesoria")[$rnd.Next(4)]
      fechaCita = $fc.ToString("o"); horarioCita = @("9:00 AM","11:00 AM","4:00 PM")[$rnd.Next(3)]
      origen = "test"; via = "test"; fecha = $fc.ToString("o") }
    if (Post-Row $cita) { $okC++ }
  }
}
"Prospectos OK: $okP / 100 | Citas OK: $okC / 25"

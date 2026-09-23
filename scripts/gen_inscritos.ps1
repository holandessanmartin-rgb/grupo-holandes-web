# Genera 15 inscritos de prueba en la hoja Inscripciones.
$URL = "https://script.google.com/macros/s/AKfycbzMjM28bTa52i4adlTifQVFNDCwEL8aQ9nWvbne8oEOf7znEHzeVs2gfs9n1o4rP_cF/exec"
function Post-Row($h) {
  $j = ($h | ConvertTo-Json -Depth 4)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($j)
  try {
    $r = Invoke-WebRequest -Uri $URL -Method POST -Body $bytes -ContentType "text/plain; charset=utf-8" -TimeoutSec 20
    return ($r.Content | ConvertFrom-Json).ok
  } catch { return $false }
}
$NN = @("Carlos","Maria","Jorge","Lucia","Pedro","Fernanda","Miguel","Sofia","Luis","Valeria","Daniel","Carmen","Ricardo","Elena","Alejandro")
$AA = @("Mendez","Lopez","Hernandez","Garcia","Sanchez","Ruiz","Torres","Vargas","Ramirez","Cruz")
$PP = @("Plantel San Martin, Oaxaca","Plantel San Martin, Oaxaca","Plantel Santa Maria del Tule","Plantel Tuxtepec","Plantel Huajuapan de Leon","Plantel Puerto Escondido")
$SS = @("Mecanica de Motocicletas","Mecanica de Motocicletas","Mecanica Automotriz","Mecanica Diesel","Electronica Automotriz")
$rnd = New-Object Random(53)
$okI = 0
for ($i = 0; $i -lt 15; $i++) {
  $xpl = $PP[$rnd.Next(6)]
  $xsp = $SS[$rnd.Next(5)]
  $xf = (Get-Date).AddDays(-1 * $rnd.Next(0, 30))
  $row = @{ form = "inscripcion"; nombre = "PRUEBA $($NN[$rnd.Next(15)]) $($AA[$rnd.Next(10)])"
    plantel = $xpl; especialidad = $xsp; cupon = "GH-I$('{0:d2}' -f $i)"
    fecha = $xf.ToString("o") }
  if (Post-Row $row) { $okI++ }
}
"Inscritos OK: $okI / 15"

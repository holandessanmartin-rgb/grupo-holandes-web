# Prueba: 100 registros de HOY, 10 por intervalo de 15 min (09:00-11:30),
# repartidos aleatoriamente en informacion / citas / visitas / inscripciones.
$URL = "https://script.google.com/macros/s/AKfycbzMjM28bTa52i4adlTifQVFNDCwEL8aQ9nWvbne8oEOf7znEHzeVs2gfs9n1o4rP_cF/exec"
function Post-Row($h) {
  $j = ($h | ConvertTo-Json -Depth 4)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($j)
  try {
    $r = Invoke-WebRequest -Uri $URL -Method POST -Body $bytes -ContentType "text/plain; charset=utf-8" -TimeoutSec 20
    return ($r.Content | ConvertFrom-Json).ok
  } catch { return $false }
}
$NN = @("Carlos","Maria","Jorge","Lucia","Pedro","Fernanda","Miguel","Sofia","Luis","Valeria","Daniel","Carmen","Ricardo","Elena","Alejandro","Rosa","Fernando","Paola","Hugo","Daniela")
$AA = @("Mendez","Lopez","Hernandez","Garcia","Sanchez","Ruiz","Torres","Vargas","Ramirez","Cruz")
$PP = @("Plantel San Martin, Oaxaca","Plantel Santa Maria del Tule","Plantel Tuxtepec","Plantel Huajuapan de Leon","Plantel Puerto Escondido","Plantel Juchitan de Zaragoza")
$SS = @("Mecanica de Motocicletas","Mecanica Automotriz","Mecanica Diesel","Electronica Automotriz")
$rnd = New-Object Random(77)
# bolsa: 50 info + 20 citas + 15 visitas + 15 inscripciones, mezclada
$bag = @()
for ($k = 0; $k -lt 50; $k++) { $bag += "info" }
for ($k = 0; $k -lt 20; $k++) { $bag += "cita" }
for ($k = 0; $k -lt 15; $k++) { $bag += "visita" }
for ($k = 0; $k -lt 15; $k++) { $bag += "insc" }
$bag = $bag | Sort-Object { $rnd.Next() }
$ok = 0
$base = (Get-Date).Date.AddHours(9)
for ($i = 0; $i -lt 100; $i++) {
  $slot = [Math]::Floor($i / 10)
  $xf = $base.AddMinutes($slot * 15 + $rnd.Next(0, 14)).AddSeconds($rnd.Next(0, 59))
  $xnom = "PRUEBA $($NN[$rnd.Next(20)]) $($AA[$rnd.Next(10)])"
  $xtel = "9516$('{0:d6}' -f $rnd.Next(1000000))"
  $xpl = $PP[$rnd.Next(6)]
  $xsp = $SS[$rnd.Next(4)]
  $tipo = $bag[$i]
  if ($tipo -eq "info") {
    $row = @{ form = "registro"; nombre = $xnom; telefono = $xtel; especialidad = $xsp
      plantel = $xpl; cupon = "GH-H$('{0:d3}' -f $i)"; origen = "test"; via = "test"; fecha = $xf.ToString("o") }
  } elseif ($tipo -eq "insc") {
    $row = @{ form = "inscripcion"; nombre = $xnom; plantel = $xpl; especialidad = $xsp
      cupon = "GH-H$('{0:d3}' -f $i)"; fecha = $xf.ToString("o") }
  } else {
    $xt = if ($tipo -eq "visita") { "visita" } else { @("clase-muestra","asesoria","info-cursos")[$rnd.Next(3)] }
    $row = @{ form = "citas"; nombre = $xnom; telefono = $xtel; especialidad = $xsp
      plantel = $xpl; tipo = $xt; fechaCita = $xf.ToString("o")
      horarioCita = @("9:00 AM","11:00 AM","4:00 PM")[$rnd.Next(3)]
      origen = "test"; via = "test"; fecha = $xf.ToString("o") }
  }
  if (Post-Row $row) { $ok++ }
}
"Registros OK: $ok / 100"

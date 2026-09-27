# Escenario realista: prospectos en 90 dias con ritmo semanal + embudo
# vinculado (misma persona: prospecto -> cita -> inscripcion).
# Uso: ... gen_realista.ps1 -Seed 1 -Start 0 -Count 190
param([int]$Seed = 1, [int]$Start = 0, [int]$Count = 190)

$URL = "https://script.google.com/macros/s/AKfycbzMjM28bTa52i4adlTifQVFNDCwEL8aQ9nWvbne8oEOf7znEHzeVs2gfs9n1o4rP_cF/exec"
function Post-Row($h) {
  $j = ($h | ConvertTo-Json -Depth 4)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($j)
  try {
    $r = Invoke-WebRequest -Uri $URL -Method POST -Body $bytes -ContentType "text/plain; charset=utf-8" -TimeoutSec 20
    return ($r.Content | ConvertFrom-Json).ok
  } catch { return $false }
}
function Pick-W($rnd, $pairs) {
  $x = $rnd.NextDouble() * 100
  $acc = 0
  foreach ($p in $pairs) { $acc += $p[1]; if ($x -lt $acc) { return $p[0] } }
  return $pairs[-1][0]
}
$NN = @("Carlos","Maria","Jorge","Lucia","Pedro","Fernanda","Miguel","Sofia","Luis","Valeria","Daniel","Carmen","Ricardo","Elena","Alejandro","Rosa","Fernando","Paola","Hugo","Daniela","Andres","Mariana","Diego","Natalia","Emilio","Renata","Gabriel","Antonia","Raul","Julia","Teresa","Ignacio","Patricia","Roberto","Alicia","Felipe","Lorena","Arturo","Beatriz","Marco")
$AA = @("Mendez","Lopez","Hernandez","Garcia","Sanchez","Ruiz","Torres","Vargas","Ramirez","Cruz","Morales","Ortega","Fuentes","Castillo","Rios","Delgado","Gil","Nunez","Salinas","Paredes","Reyes","Aguilar","Rosas","Flores","Medina")
$PLW = @(@("Plantel San Martin, Oaxaca",28),@("Plantel Santa Maria del Tule",13),@("Plantel Santa Cruz Xoxocotlan",8),@("Plantel Tuxtepec",7),@("Plantel Huajuapan de Leon",6),@("Plantel Juchitan de Zaragoza",5),@("Plantel Miahuatlan",4),@("Plantel Puerto Escondido",4),@("Plantel Ocotlan",3),@("Plantel Ejutla",3),@("Plantel Tlaxiaco",3),@("Plantel Pinotepa",3),@("Plantel Putla",2),@("Plantel Tierra Blanca",2),@("Plantel Tehuacan",2),@("Plantel Ometepec",2),@("Plantel Villahermosa",1),@("Plantel Zimatlan",1))
$SPW = @(@("Mecanica de Motocicletas",35),@("Mecanica Automotriz",30),@("Mecanica Diesel",20),@("Electronica Automotriz",15))
$rnd = New-Object Random($Seed)
$okP = 0; $okC = 0; $okI = 0
for ($k = 0; $k -lt $Count; $k++) {
  $gi = $Start + $k
  $age = [int](90 * (1 - [Math]::Pow($rnd.NextDouble(), 1.35)))
  $xf = (Get-Date).Date.AddDays(-1 * $age).AddHours($rnd.Next(8, 21)).AddMinutes($rnd.Next(0, 60))
  if ($xf.DayOfWeek -eq [DayOfWeek]::Sunday -and $rnd.NextDouble() -lt 0.6) { $xf = $xf.AddDays(-1) }
  $xnom = "PRUEBA $($NN[$rnd.Next(40)]) $($AA[$rnd.Next(25)])"
  $xtel = "9519$('{0:d6}' -f (($gi * 7919) % 1000000))"
  $xpl = (Pick-W $rnd $PLW); $xsp = (Pick-W $rnd $SPW)
  $xcup = "GH-R$('{0:d4}' -f $gi)"
  if ($age -gt 60) { $xcmp = Pick-W $rnd @(@("inscripciones",45),@("facebook-verano",20),@("volante",15),@("directo",20)) }
  elseif ($age -gt 30) { $xcmp = Pick-W $rnd @(@("mecanica-motocicletas",35),@("tiktok",25),@("inscripciones",20),@("google",20)) }
  else { $xcmp = Pick-W $rnd @(@("plantel-san-martin",30),@("whatsapp",20),@("instagram",20),@("google",15),@("directo",15)) }
  $prow = @{ form = "registro"; nombre = $xnom; telefono = $xtel; especialidad = $xsp
    plantel = $xpl; cupon = $xcup; origen = "test"
    campana = @{ source = "ads"; medium = "cpc"; campaign = $xcmp }
    via = "test"; fecha = $xf.ToString("o") }
  if (!(Post-Row $prow)) { continue }
  $okP++
  if ($rnd.NextDouble() -lt 0.45) {
    $xtp = Pick-W $rnd @(@("visita",50),@("asesoria",25),@("clase-muestra",15),@("info-cursos",10))
    $xfc = $xf.AddDays($rnd.Next(1, 11))
    $crow = @{ form = "citas"; nombre = $xnom; telefono = $xtel; especialidad = $xsp
      plantel = $xpl; tipo = $xtp; fechaCita = $xfc.ToString("o")
      horarioCita = @("9:00 AM","10:00 AM","11:00 AM","4:00 PM","5:00 PM")[$rnd.Next(5)]
      origen = "test"; via = "test"; fecha = $xfc.ToString("o") }
    if (Post-Row $crow) { $okC++ }
    if ($rnd.NextDouble() -lt 0.27) {
      $xfi = $xfc.AddDays($rnd.Next(0, 8))
      if ($xfi -gt (Get-Date)) { $xfi = (Get-Date).AddDays(-1 * $rnd.Next(0, 3)) }
      $irow = @{ form = "inscripcion"; nombre = $xnom; plantel = $xpl; especialidad = $xsp
        cupon = $xcup; fecha = $xfi.ToString("o") }
      if (Post-Row $irow) { $okI++ }
    }
  }
}
"Seed $Seed -> P:$okP C:$okC I:$okI / $Count"

# Genera N prospectos de prueba con distribución desproporcionada y
# campañas que fluctúan por época (90 días, sesgo a lo reciente).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/gen_masivo.ps1 -Seed 1 -Count 200 -Offset 0
param([int]$Seed = 1, [int]$Count = 200, [int]$Offset = 0)

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

$NN = @("Carlos","Maria","Jorge","Lucia","Pedro","Fernanda","Miguel","Sofia","Luis","Valeria","Daniel","Carmen","Ricardo","Elena","Alejandro","Rosa","Fernando","Paola","Hugo","Daniela","Andres","Mariana","Diego","Natalia","Emilio","Renata","Gabriel","Antonia","Raul","Julia")
$AA = @("Mendez","Lopez","Hernandez","Garcia","Sanchez","Ruiz","Torres","Vargas","Ramirez","Cruz","Morales","Ortega","Fuentes","Castillo","Rios","Delgado","Gil","Nunez","Salinas","Paredes")
$PLW = @(@("Plantel San Martin, Oaxaca",30),@("Plantel Santa Maria del Tule",14),@("Plantel Santa Cruz Xoxocotlan",8),@("Plantel Tuxtepec",7),@("Plantel Huajuapan de Leon",6),@("Plantel Juchitan de Zaragoza",5),@("Plantel Miahuatlan",4),@("Plantel Puerto Escondido",4),@("Plantel Ocotlan",3),@("Plantel Ejutla",3),@("Plantel Tlaxiaco",3),@("Plantel Pinotepa",3),@("Plantel Putla",2),@("Plantel Tierra Blanca",2),@("Plantel Tehuacan",2),@("Plantel Ometepec",2),@("Plantel Villahermosa",1),@("Plantel Zimatlan",1))
$SPW = @(@("Mecanica de Motocicletas",40),@("Mecanica Automotriz",25),@("Mecanica Diesel",20),@("Electronica Automotriz",15))

$rnd = New-Object Random($Seed)
$ok = 0
for ($i = 0; $i -lt $Count; $i++) {
  $age = [int](90 * (1 - [Math]::Pow($rnd.NextDouble(), 1.4)))
  $xf = (Get-Date).Date.AddDays(-1 * $age).AddHours($rnd.Next(8, 21)).AddMinutes($rnd.Next(0, 60))
  if ($age -gt 60) {
    $xcamp = Pick-W $rnd @(@("inscripciones",50),@("facebook-verano",20),@("volante",15),@("directo",15))
  } elseif ($age -gt 30) {
    $xcamp = Pick-W $rnd @(@("mecanica-motocicletas",40),@("tiktok",25),@("inscripciones",20),@("directo",15))
  } else {
    $xcamp = Pick-W $rnd @(@("plantel-san-martin",35),@("whatsapp",20),@("instagram",15),@("google",15),@("directo",15))
  }
  $row = @{ form = "registro"; nombre = "PRUEBA $($NN[$rnd.Next(30)]) $($AA[$rnd.Next(20)])"
    telefono = "9517$('{0:d6}' -f (($Offset + $i) % 1000000))"
    especialidad = (Pick-W $rnd $SPW); plantel = (Pick-W $rnd $PLW)
    cupon = "GH-M$('{0:d2}' -f $Seed)$('{0:d3}' -f $i)"
    origen = "test"
    campana = @{ source = "ads"; medium = "cpc"; campaign = $xcamp }
    via = "test"; fecha = $xf.ToString("o") }
  if (Post-Row $row) { $ok++ }
}
"Seed $Seed OK: $ok / $Count"

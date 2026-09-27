# Genera citas, visitas o inscripciones de prueba con la misma distribución.
# Uso: ... gen_funnel.ps1 -Tipo citas -Seed 11 -Count 205 -Offset 0
param([string]$Tipo = "citas", [int]$Seed = 11, [int]$Count = 200, [int]$Offset = 0)

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
$NN = @("Carlos","Maria","Jorge","Lucia","Pedro","Fernanda","Miguel","Sofia","Luis","Valeria","Daniel","Carmen","Ricardo","Elena","Alejandro","Rosa","Fernando","Paola","Hugo","Daniela","Andres","Mariana","Diego","Natalia","Emilio")
$AA = @("Mendez","Lopez","Hernandez","Garcia","Sanchez","Ruiz","Torres","Vargas","Ramirez","Cruz","Morales","Ortega","Fuentes","Castillo","Rios","Delgado","Gil","Nunez","Salinas","Paredes")
$PLW = @(@("Plantel San Martin, Oaxaca",30),@("Plantel Santa Maria del Tule",14),@("Plantel Santa Cruz Xoxocotlan",8),@("Plantel Tuxtepec",7),@("Plantel Huajuapan de Leon",6),@("Plantel Juchitan de Zaragoza",5),@("Plantel Miahuatlan",4),@("Plantel Puerto Escondido",4),@("Plantel Ocotlan",3),@("Plantel Ejutla",3),@("Plantel Tlaxiaco",3),@("Plantel Pinotepa",3),@("Plantel Putla",2),@("Plantel Tierra Blanca",2),@("Plantel Tehuacan",2),@("Plantel Ometepec",2),@("Plantel Villahermosa",1),@("Plantel Zimatlan",1))
$SPW = @(@("Mecanica de Motocicletas",40),@("Mecanica Automotriz",25),@("Mecanica Diesel",20),@("Electronica Automotriz",15))
$rnd = New-Object Random($Seed)
$ok = 0
for ($i = 0; $i -lt $Count; $i++) {
  $xpl = (Pick-W $rnd $PLW); $xsp = (Pick-W $rnd $SPW)
  $xnom = "PRUEBA $($NN[$rnd.Next(25)]) $($AA[$rnd.Next(20)])"
  $xtel = "9518$('{0:d6}' -f (($Offset + $i) % 1000000))"
  $xf = (Get-Date).Date.AddDays(-1 * $rnd.Next(0, 60))
  if ($Tipo -eq "insc") {
    $row = @{ form = "inscripcion"; nombre = $xnom; plantel = $xpl; especialidad = $xsp
      cupon = "GH-F$('{0:d4}' -f ($Offset + $i))"; fecha = $xf.ToString("o") }
  } else {
    if ($Tipo -eq "visitas") {
      $xtp = "visita"
      $xfc = if ($rnd.NextDouble() -lt 0.7) { $xf.AddDays(-1 * $rnd.Next(0, 20)) } else { (Get-Date).Date.AddDays($rnd.Next(1, 15)) }
    } else {
      $xtp = @("clase-muestra","asesoria","info-cursos")[$rnd.Next(3)]
      $xfc = $xf.AddDays($rnd.Next(1, 12))
    }
    $row = @{ form = "citas"; nombre = $xnom; telefono = $xtel; especialidad = $xsp
      plantel = $xpl; tipo = $xtp; fechaCita = $xfc.ToString("o")
      horarioCita = @("9:00 AM","11:00 AM","4:00 PM")[$rnd.Next(3)]
      origen = "test"; via = "test"; fecha = $xfc.ToString("o") }
  }
  if (Post-Row $row) { $ok++ }
}
"$Tipo seed $Seed OK: $ok / $Count"

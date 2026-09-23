# mini
$PL = @("a","b")
$rnd = New-Object Random(99)
$x = $PL[$rnd.Next(2)]
$h = @{ k = $x }
"OK:" + $x + "/" + $h.k

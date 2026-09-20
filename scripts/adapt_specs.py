#!/usr/bin/env python3
"""Adapta las copias de detalle de especialidad (diésel y electrónica)."""
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "especialidades"

DIESEL = [
    ("<title>Mecánica Automotriz | Grupo Holandés — 2 años, 90% práctica</title>",
     "<title>Mecánica Diésel | Grupo Holandés — 2 años, 90% práctica</title>"),
    ("mecánica automotriz y motocicletas, con clases 90% prácticas y diferentes planteles",
     "mecánica automotriz y motocicletas, con clases 90% prácticas y diferentes planteles"),
    ("De fundamentos a diagnóstico y tecnologías modernas. 90% práctica.",
     "Ajuste y afinación de motores diésel. 90% práctica."),
    ('<h1>🚗 Mecánica <span class="highlight">Automotriz</span></h1>',
     '<h1>🚐 Mecánica <span class="highlight">Diésel</span></h1>'),
    ("Desde fundamentos hasta diagnóstico y tecnologías automotrices modernas.",
     "Mantenimiento y reparación de motores diésel, de los más básicos a los más actuales."),
    ('"name":"Mecánica Automotriz"', '"name":"Mecánica Diésel"'),
    ("data-context=\"esp-mecanica\"", "data-context=\"esp-diesel\""),
    ("data-spec=\"mecanica-automotriz\"", "data-spec=\"mecanica-diesel\""),
]

ELEC = [
    ("<title>Mecánica Automotriz | Grupo Holandés — 2 años, 90% práctica</title>",
     "<title>Electrónica Automotriz | Grupo Holandés — 1 año 9 meses, 90% práctica</title>"),
    ("De fundamentos a diagnóstico y tecnologías modernas. 90% práctica.",
     "Sistemas electrónicos del vehículo. 90% práctica."),
    ('<h1>🚗 Mecánica <span class="highlight">Automotriz</span></h1>',
     '<h1>⚡ Electrónica <span class="highlight">Automotriz</span></h1>'),
    ("Desde fundamentos hasta diagnóstico y tecnologías automotrices modernas.",
     "Sistemas electrónicos: inyección, frenos, seguridad y confort."),
    ('<div class="spec-meta"><span>⏱ 2 años</span>',
     '<div class="spec-meta"><span>⏱ 1 año 9 meses</span>'),
    ('"name":"Mecánica Automotriz"', '"name":"Electrónica Automotriz"'),
    ('"timeRequired":"P2Y"', '"timeRequired":"P1Y9M"'),
    ("data-context=\"esp-mecanica\"", "data-context=\"esp-electronica\""),
    ("data-spec=\"mecanica-automotriz\"", "data-spec=\"electronica-automotriz\""),
]


def apply(path, pairs):
    t = path.read_text(encoding="utf-8")
    for old, new in pairs:
        if old not in t:
            print(f"  ! no hallado en {path.name}: {old[:60]}")
        t = t.replace(old, new)
    path.write_text(t, encoding="utf-8")


apply(BASE / "mecanica-diesel.html", DIESEL)
apply(BASE / "electronica-automotriz.html", ELEC)
print("OK adaptadas")

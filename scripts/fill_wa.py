#!/usr/bin/env python3
"""Rellena whatsapp vacíos con el número de pruebas (reversible vía git)."""
from pathlib import Path

p = Path(__file__).resolve().parent.parent / "data" / "campuses.js"
t = p.read_text(encoding="utf-8")
t = t.replace("whatsapp: ''", "whatsapp: '529513143703'")
p.write_text(t, encoding="utf-8")
print("whatsapp test:", t.count("whatsapp: '529513143703'"))

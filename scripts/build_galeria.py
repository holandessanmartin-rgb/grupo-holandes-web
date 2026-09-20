#!/usr/bin/env python3
"""Reconstruye el campo `imagenes` de cada plantel escaneando
img/planteles/<slug>/ (jpg, jpeg, png, webp).

Equivalencia con la carpeta de origen:
  recursos/PLANTELES/<NOMBRE>  ->  img/planteles/<slug>

Cuando agregues fotos nuevas a cualquier carpeta, corre:
    python3 scripts/build_galeria.py
"""
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = Path(os.environ.get("GH_CAMPUSES", str(ROOT / "data" / "campuses.js")))
IMGDIR = ROOT / "img" / "planteles"
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def main():
    text = TARGET.read_text(encoding="utf-8")
    blocks = re.split(r"(?=\{\n    id: ')", text)
    n = 0
    for i, b in enumerate(blocks):
        m = re.search(r"slug:\s*'([^']+)'", b)
        if not m:
            continue
        slug = m.group(1)
        folder = IMGDIR / slug
        imgs = []
        if folder.is_dir():
            imgs = sorted(f"img/planteles/{slug}/{p.name}" for p in folder.iterdir()
                          if p.suffix.lower() in EXTS and p.is_file())
        new_arr = "[" + ", ".join(f"'{x}'" for x in imgs) + "]"
        new_b, count = re.subn(r"imagenes:\s*\[[^\]]*\]", f"imagenes: {new_arr}", b, count=1)
        if count and new_b != b:
            blocks[i] = new_b
            n += 1
            print(f"  - {slug}: {len(imgs)} fotos")
    TARGET.write_text("".join(blocks), encoding="utf-8")
    print(f"OK: {n} planteles actualizados en {TARGET.name}")


if __name__ == "__main__":
    main()

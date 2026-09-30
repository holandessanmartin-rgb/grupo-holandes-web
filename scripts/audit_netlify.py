#!/usr/bin/env python3
"""Auditoría pre-Netlify: verifica que cada opción del sitio funcione
como estático (sin backend Node).
1. Reglas de _redirects -> archivo destino existe.
2. Enlaces internos (href="/...") de cada HTML -> resuelven a archivo o regla.
3. Assets (src="/..." + CSS) existen.
4. Formularios con atributos Netlify Forms + honeypot.
5. Páginas cargan sus scripts de datos (app.js, campuses, specialties).
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

# (shutil/subprocess/tempfile se importan en la sección 6)

ROOT = Path(__file__).resolve().parent.parent
fails = []


def ok(msg):
    print(f"  OK  {msg}")


def fail(msg):
    fails.append(msg)
    print(f"  FAIL {msg}")


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs, self.srcs, self.forms = [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and a.get("href", "").startswith("/"):
            self.hrefs.append(a["href"])
        if tag in ("script", "img") and (a.get("src", "").startswith("/") or a.get("src", "").startswith("img/")):
            self.srcs.append(a["src"])
        if tag == "link" and a.get("rel") == "stylesheet" and a.get("href", "").startswith("/"):
            self.srcs.append(a["href"])
        if tag == "form":
            self.forms.append(a)


def redirects():
    rules = []
    for line in (ROOT / "_redirects").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) >= 2:
            rules.append((parts[0], parts[1]))
    return rules


def resolve(path, rules):
    """Devuelve el archivo servido para una ruta, o None."""
    if path in ("/", ""):
        return ROOT / "index.html"
    rel = (ROOT / path.lstrip("/"))
    if rel.is_file():
        return rel
    for src, dst in rules:
        if "*" in src:
            pre = src.split("*")[0]
            if path.startswith(pre):
                rest = path[len(pre):]
                cand = ROOT / dst.replace(":splat", rest).lstrip("/")
                if cand.is_file():
                    return cand
        elif path == src or path == src + "/":
            cand = ROOT / dst.lstrip("/")
            if cand.is_file():
                return cand
    # índice de directorio (/admin -> /admin/index.html)
    idx = rel / "index.html"
    if idx.is_file():
        return idx
    return None


def main():
    htmls = sorted(ROOT.rglob("*.html"))
    print(f"HTML encontrados: {len(htmls)}")
    rules = redirects()

    print("== 1. Reglas _redirects ==")
    for src, dst in rules:
        target = ROOT / dst.replace(":splat", "x").lstrip("/")
        if "*" in src:
            base = dst.split(":splat")[0]
            print(f"  OK  {src} -> {dst} (splat, base existe: {(ROOT / base.lstrip('/')).is_dir()})")
        elif target.is_file():
            ok(f"{src} -> {dst}")
        else:
            fail(f"{src} -> {dst} (no existe)")

    print("== 2/3. Enlaces y assets por página ==")
    for h in htmls:
        p = Links()
        p.feed(h.read_text(encoding="utf-8"))
        for href in p.hrefs:
            clean = href.split("?")[0].split("#")[0] or "/"
            if not resolve(clean, rules):
                fail(f"{h.relative_to(ROOT)}: enlace roto {href}")
        for src in p.srcs:
            f = ROOT / src.lstrip("/")
            if not f.is_file():
                fail(f"{h.relative_to(ROOT)}: asset faltante {src}")
    if not fails:
        ok("todos los enlaces y assets resuelven")

    print("== 4. Netlify Forms ==")
    for name in ("registro.html", "citas.html"):
        p = Links()
        p.feed((ROOT / name).read_text(encoding="utf-8"))
        f = next((x for x in p.forms), None)
        if not f:
            fail(f"{name}: sin <form>")
            continue
        need = {"name": True, "data-netlify": True, "netlify-honeypot": True}
        missing = [k for k in need if k not in f]
        txt = (ROOT / name).read_text(encoding="utf-8")
        if missing:
            fail(f"{name}: faltan atributos {missing}")
        elif 'name="form-name"' not in txt or 'name="bot-field"' not in txt:
            fail(f"{name}: falta form-name/honeypot ocultos")
        else:
            ok(f"{name}: Netlify Forms OK (name={f.get('name')})")

    print("== 5. Scripts de datos por página ==")
    for h in htmls:
        if "admin" in h.parts or "alumnos" in h.parts:
            continue
        txt = h.read_text(encoding="utf-8")
        for need in ("/js/app.js", "/data/campuses.js", "/data/specialties.js"):
            if need not in txt:
                fail(f"{h.relative_to(ROOT)}: falta {need}")

    print("== 6. Sintaxis de scripts inline ==")
    import shutil
    import subprocess
    import tempfile
    if shutil.which("node"):
        for h in htmls:
            txt = h.read_text(encoding="utf-8")
            for i, m in enumerate(re.findall(r"<script>(.*?)</script>", txt, re.S)):
                if not m.strip():
                    continue
                with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
                    f.write(m)
                    tmp = f.name
                r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
                Path(tmp).unlink(missing_ok=True)
                if r.returncode != 0:
                    err = (r.stderr.strip().splitlines() or ["error"])[:3]
                    fail(f"{h.relative_to(ROOT)}: JS inline bloque {i}: {' | '.join(err)}")
        if not any("inline" in f for f in fails):
            ok("scripts inline sin errores de sintaxis")

    print("== 7. Integridad de datos ==")
    try:
        import json as _json
        import subprocess as _sp
        _js = ("const c=require('./data/campuses.js');const s=require('./data/specialties.js');"
               "const k=require('./data/courses.js');const fs=require('fs');"
               "fs.writeFileSync(process.env.PRE_TMP,JSON.stringify({c:c.CAMPUSES,s:s.SPECIALTIES,k:(typeof k.COURSES!=='undefined'?k.COURSES:[])}),'utf8');")
        _tmp = str(ROOT / 'scripts' / '.aud_tmp.json')
        _env = dict(__import__('os').environ, PRE_TMP=_tmp)
        _r = _sp.run(['node', '-e', _js], capture_output=True, text=True, cwd=ROOT, env=_env)
        _d = _json.loads(Path(_tmp).read_text(encoding='utf-8'))
        Path(_tmp).unlink(missing_ok=True)
        _spec_ids = {x['id'] for x in _d['s']}
        _camp_ids = {x['id'] for x in _d['c']}
        _slugs = [x.get('slug', '') for x in _d['c']]
        if len(_slugs) != len(set(_slugs)):
            fail('slugs de planteles duplicados')
        for c in _d['c']:
            for req in ('id', 'nombre', 'ciudad', 'slug'):
                if not c.get(req):
                    fail(f"plantel sin {req}: {c.get('id')}")
            for sid in (c.get('especialidades') or []):
                if sid not in _spec_ids:
                    fail(f"{c['id']}: especialidad inexistente {sid}")
        for s in _d['s']:
            for pid in (s.get('campuses') or []):
                if pid not in _camp_ids:
                    fail(f"{s['id']}: plantel inexistente {pid}")
        for k in _d['k']:
            for pid in (k.get('planteles') or []):
                if pid not in _camp_ids:
                    fail(f"curso {k.get('id')}: plantel inexistente {pid}")
        # toda página html pública debe tener regla de _redirects o índice
        _pubs = [h for h in htmls if 'admin' not in h.parts and 'alumnos' not in h.parts]
        for h in _pubs:
            rel = '/' + h.relative_to(ROOT).as_posix()
            if rel == '/index.html':
                continue
            route = rel[:-len('.html')] if rel.endswith('.html') else rel
            if not resolve(route, rules):
                fail(f'sin ruta pública: {route}')
        if not any('integridad' in f or 'data' in f for f in fails):
            ok('datos cruzados y rutas OK')
    except Exception as e:
        fail(f'auditoría de datos no pudo correr: {e}')

    print()
    if fails:
        print(f"RESULTADO: {len(fails)} FALLOS")
        return 1
    print("RESULTADO: TODO OK — listo para Netlify")
    return 0


if __name__ == "__main__":
    sys.exit(main())

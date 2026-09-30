#!/usr/bin/env python3
"""Pre-renderiza el contenido de los contenedores que se llenan por JS
(#home-specs, #specs-grid, #grid, #courses-grid) para que la información
sea visible incluso sin JavaScript (y mejora SEO).
El JS existente reemplaza el contenido al cargar (mismo HTML), así que
es seguro re-ejecutar. Uso: python3 scripts/prerender.py
"""
import html
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def esc(s):
    return html.escape('' if s is None else str(s), quote=True)


def load_data():
    js = """
const fs = require('fs');
const c = require('./data/campuses.js');
const s = require('./data/specialties.js');
const k = require('./data/courses.js');
fs.writeFileSync(process.env.PRE_TMP, JSON.stringify({
  campuses: c.getAllActiveCampuses(),
  specialties: s.getAllActiveSpecialties(),
  courses: k.getAllActiveCourses()
}), 'utf8');
"""
    import os
    tmp = str(ROOT / 'scripts' / '.pre_tmp.json')
    env = dict(os.environ, PRE_TMP=tmp)
    out = subprocess.run(['node', '-e', js], capture_output=True, text=True, cwd=ROOT, env=env)
    if out.returncode != 0 or not Path(tmp).exists():
        raise SystemExit('node dump falló:\n' + (out.stderr or ''))
    data = json.loads(Path(tmp).read_text(encoding='utf-8'))
    Path(tmp).unlink(missing_ok=True)
    return data


def spec_cards(specs):
    cards = []
    for s in specs:
        rvoe = f'<p class="muted" style="margin-top:8px">RVOE: <strong>{esc(s.get("rvoe"))}</strong></p>' if s.get('rvoe') else ''
        cards.append(
            f'<div class="service-card"><div class="service-icon">{esc(s.get("icon", ""))}</div>'
            f'<h3>{esc(s["nombre"])}</h3><p>{esc(s.get("descripcionCorta", ""))}</p>'
            f'<div class="duracion">⏱ {esc(s.get("duracion", ""))}</div>{rvoe}'
            f'<p style="margin-top:12px"><a class="btn-primary btn-sm" href="/especialidades/{esc(s["slug"])}">Ver especialidad</a></p></div>')
    return ''.join(cards)


def spec_index(specs):
    cards = []
    for s in specs:
        mods = ''.join(f'<li>✅ {esc(m)}</li>' for m in (s.get('modulos') or [])[:5])
        rvoe = f' <span class="duracion">📜 RVOE {esc(s["rvoe"])}</span>' if s.get('rvoe') else ''
        cards.append(
            f'<div class="info-card"><div class="service-icon">{esc(s.get("icon", ""))}</div><h3>{esc(s["nombre"])}</h3>'
            f'<p>{esc(s.get("descripcionCorta", ""))}</p><ul class="mod-list">{mods}</ul>'
            f'<p><span class="duracion">⏱ {esc(s.get("duracion", ""))}</span>{rvoe}</p>'
            f'<p><a class="btn-primary btn-sm" href="/especialidades/{esc(s["slug"])}">Ver especialidad</a></p></div>')
    cards.append('<div class="info-card"><div class="service-icon">🎯</div><h3>Cursos Especializados</h3>'
                 '<p>Talleres cortos y bootcamps intensivos.</p>'
                 '<p><a class="btn-primary btn-sm" href="/cursos">Ver cursos</a></p></div>')
    return ''.join(cards)


def campus_cards(campuses, spec_names):
    cards = []
    for c in campuses:
        specs = ' · '.join(spec_names.get(sid, sid) for sid in (c.get('especialidades') or []))
        maps = c.get('mapsUrl') or (
            f"https://www.google.com/maps/dir/?api=1&destination={c['latitud']},{c['longitud']}"
            if isinstance(c.get('latitud'), (int, float)) else '#')
        cards.append(
            f'<div class="info-card"><h3><a href="/planteles/{esc(c["slug"])}">📍 {esc(c["nombre"])}</a></h3>'
            f'<p class="muted">{esc(c.get("direccion", ""))}'
            f'{(" · " + esc(c["referencia"]) if c.get("referencia") else "")}<br>{esc(c.get("ciudad", ""))}, {esc(c.get("estado", ""))}</p>'
            f'<p class="muted">🎓 {esc(specs)}</p>'
            f'<p class="muted">{("📞 " + esc(c["telefono"]) + "<br>") if c.get("telefono") else ""}{("🕐 " + esc(c["horario"])) if c.get("horario") else ""}</p>'
            f'<p><a class="btn-map btn-map-directions btn-sm" href="{esc(maps)}" target="_blank" rel="noopener">🗺️ Mapa</a> '
            f'<a class="btn-map btn-map-other btn-sm" href="/galeria?plantel={esc(c["slug"])}" target="_blank" rel="noopener">📸 Ver galería</a> '
            f'<a class="btn-primary btn-sm" href="/registro">Solicitar información</a></p>'
            f'<p><a href="#" data-wa data-campus="{esc(c["id"])}" data-context="plantel">💬 WhatsApp del plantel</a></p></div>')
    return ''.join(cards)


def course_cards(courses, camp_names):
    cards = []
    for c in courses:
        pls = ' · '.join(camp_names.get(pid, pid) for pid in (c.get('planteles') or []))
        cards.append(
            f'<div class="info-card"><div class="service-icon">{esc(c.get("icon", ""))}</div><h3>{esc(c["nombre"])}</h3>'
            f'<p class="muted">📍 {esc(pls)}</p>'
            f'<p><button class="btn-primary btn-sm" data-toggle="{esc(c["id"])}">Ver detalles</button></p></div>')
    return ''.join(cards)


def inject(path, container_id, html):
    p = ROOT / path
    t = p.read_text(encoding='utf-8')
    pat = re.compile(r'(<div[^>]*id="%s"[^>]*>)(.*?)(</div>)' % re.escape(container_id), re.S)
    m = pat.search(t)
    if not m:
        print(f'  ! contenedor #{container_id} no hallado en {path}')
        return False
    marked = f'{m.group(1)}<!--PRE-->{html}<!--/PRE-->{m.group(3)}'
    # reemplazar contenido previo (entre marcadores o vacío)
    pat2 = re.compile(r'(<div[^>]*id="%s"[^>]*>)(?:<!--PRE-->.*?<!--/PRE-->)?(</div>)' % re.escape(container_id), re.S)
    t2, n = pat2.subn(lambda mm: f'{mm.group(1)}<!--PRE-->{html}<!--/PRE-->{mm.group(2)}', t, count=1)
    if n == 0:
        print(f'  ! no se pudo inyectar #{container_id} en {path}')
        return False
    p.write_text(t2, encoding='utf-8')
    return True


def main():
    data = load_data()
    specs = data['specialties']
    camps = data['campuses']
    courses = data['courses']
    spec_names = {s['id']: s['nombre'] for s in specs}
    camp_names = {c['id']: c['nombre'] for c in camps}
    print('datos:', len(specs), 'specs,', len(camps), 'planteles,', len(courses), 'cursos')
    ok = True
    ok &= inject('index.html', 'home-specs', spec_cards(specs))
    ok &= inject('especialidades.html', 'specs-grid', spec_index(specs))
    ok &= inject('planteles.html', 'grid', campus_cards(camps, spec_names))
    ok &= inject('cursos.html', 'courses-grid', course_cards(courses, camp_names))
    print('OK prerender' if ok else 'FALLOS (ver arriba)')


if __name__ == '__main__':
    main()

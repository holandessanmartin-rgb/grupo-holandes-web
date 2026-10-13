# -*- coding: utf-8 -*-
"""Vacía las galerías de todos los planteles salvo san-martin-oaxaca (calidad de imagen).
No borra archivos de imagen; solo quita las referencias."""
import io, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEEP = 'san-martin-oaxaca'

# ---------- 1) data/campuses.js ----------
p = os.path.join(RAIZ, 'data', 'campuses.js')
with io.open(p, encoding='utf-8') as f:
    lineas = f.readlines()

slug = ''
vac = 0
for i, ln in enumerate(lineas):
    m = re.search(r"slug:\s*'([^']+)'", ln)
    if m:
        slug = m.group(1)
    if 'imagenes:' in ln and slug != KEEP:
        indent = ln[:len(ln) - len(ln.lstrip())]
        linea = ln.split('imagenes:')[0] + 'imagenes: [],\n'
        # preservar fin de línea del original
        fin = '\r\n' if ln.endswith('\r\n') else '\n'
        linea = ln.split('imagenes:')[0] + 'imagenes: [],' + fin
        lineas[i] = linea
        vac += 1

with io.open(p, 'w', encoding='utf-8', newline='') as f:
    f.writelines(lineas)
print('[campuses.js] imagenes vaciadas: %d' % vac)

# ---------- 2) planteles/*.html ----------
CTA = ('<div class="info-card"><div class="service-icon">🏫</div><h3>Conoce el taller</h3>'
       '<p class="muted">Ven a conocer las instalaciones en persona, con alumnos trabajando.</p>'
       '<p><a class="btn-primary btn-sm" href="/citas?plantel={slug}">Agendar visita</a></p></div>')

tocados, sin_col = [], []
for fn in sorted(os.listdir(os.path.join(RAIZ, 'planteles'))):
    if not fn.endswith('.html'):
        continue
    slug = fn[:-5]
    fp = os.path.join(RAIZ, 'planteles', fn)
    with io.open(fp, encoding='utf-8') as f:
        t = f.read()
    orig = t
    if slug == KEEP:
        continue
    # a) quitar enlace "Ver galería"
    t = re.sub(r'\s*<a href="/galeria\?plantel=[^"]+"[^>]*>📸 Ver galería</a>', '', t)
    # b) reemplazar el collage por una tarjeta CTA (quita tambien el <h2>El taller</h2> huérfano)
    if 'taller-collage' in t:
        t = re.sub(r'\s*<h2>El taller</h2>\s*<a class="taller-collage[^>]*>.*?</a>',
                   '\n      ' + CTA.format(slug=slug), t, flags=re.S)
        sin_col.append(slug)
    if t != orig:
        with io.open(fp, 'w', encoding='utf-8', newline='') as f:
            f.write(t)
        tocados.append(slug)

print('[planteles/*.html] archivos modificados: %d' % len(tocados))
print('  collage eliminado en: %s' % ', '.join(sin_col))

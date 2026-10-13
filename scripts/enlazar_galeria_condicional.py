# -*- coding: utf-8 -*-
"""Hace que el enlace 'Ver galeria' solo aparezca cuando el plantel tiene imagenes.
Afecta: los templates JS inline (citas, empezar, registro, planteles), el bloque
PRE pre-renderizado de planteles.html y el generador scripts/build-planteles.js."""
import io, os, re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEEP = 'san-martin-oaxaca'

# ---------- 1) templates JS inline ----------
JS = ['citas.html', 'empezar.html', 'registro.html', 'planteles.html']
for fn in JS:
    fp = os.path.join(RAIZ, fn)
    with io.open(fp, encoding='utf-8') as f:
        t = f.read()
    orig = t

    # <a ... href="/galeria?plantel=${c.slug}" ...>Ver galeria</a>  ->  condicional
    def cond(m):
        ancla = m.group(0)
        return "${((c.imagenes||[]).length) ? `" + ancla + "` : ''}"
    t = re.sub(r'<a[^>]*href="/galeria\?plantel=\$\{c\.slug\}"[^>]*>.*?Ver galería</a>',
               cond, t, flags=re.S)

    if t != orig:
        with io.open(fp, 'w', encoding='utf-8', newline='') as f:
            f.write(t)
        print('[JS] %s OK' % fn)
    else:
        print('[JS] %s sin cambios (!)' % fn)

# ---------- 2) bloque PRE pre-renderizado de planteles.html ----------
# Todo el bloque vive en UNA sola linea (la que contiene <!--PRE-->), por eso se
# procesa linea a linea y no el archivo entero: asi no se tocan otras secciones.
fp = os.path.join(RAIZ, 'planteles.html')
with io.open(fp, encoding='utf-8') as f:
    lineas = f.readlines()

quitadas, tocada = 0, None
for i, ln in enumerate(lineas):
    if '<!--PRE-->' not in ln:
        continue
    partes = ln.split('<div class="info-card">')
    fuera = [partes[0]]
    for p in partes[1:]:
        if 'href="/galeria?plantel=%s"' % KEEP in p:
            fuera.append('<div class="info-card">' + p)
            continue
        nuevo = re.sub(
            r'\s*<a class="btn-map btn-map-other btn-sm" href="/galeria\?plantel=[^"]+"[^>]*>.*?Ver galería</a>',
            '', p, flags=re.S)
        if nuevo != p:
            quitadas += 1
        fuera.append('<div class="info-card">' + nuevo)
    lineas[i] = ''.join(fuera)
    tocada = i + 1

if tocada:
    with io.open(fp, 'w', encoding='utf-8', newline='') as f:
        f.writelines(lineas)
    print('[PRE] planteles.html L%d -> enlaces quitados: %d (se conserva %s)'
          % (tocada, quitadas, KEEP))
else:
    print('[PRE] planteles.html sin marcador <!--PRE--> (!)')

# ---------- 3) generador scripts/build-planteles.js ----------
fp = os.path.join(RAIZ, 'scripts', 'build-planteles.js')
with io.open(fp, encoding='utf-8') as f:
    t = f.read()
orig = t

# 3a) collage(): sin imagenes -> cadena vacia
t = t.replace(
    "function collage(c) {\n  const imgs = c.imagenes || [];",
    "function collage(c) {\n  const imgs = c.imagenes || [];\n  if (!imgs.length) return '';")

# 3b) enlace del hero: solo si hay imagenes
t = re.sub(
    r'( *)<a href="/galeria\?plantel=\$\{c\.slug\}" target="_blank" rel="noopener" class="btn-outline">.*?Ver galería</a>',
    lambda m: m.group(1) + "${hasPhotos ? `<a href=\"/galeria?plantel=${c.slug}\" target=\"_blank\" rel=\"noopener\" class=\"btn-outline\">📸 Ver galería</a>` : ''}",
    t)

if t != orig:
    with io.open(fp, 'w', encoding='utf-8', newline='') as f:
        f.write(t)
    print('[GEN] build-planteles.js OK')
else:
    print('[GEN] build-planteles.js sin cambios (!)')

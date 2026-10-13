# -*- coding: utf-8 -*-
"""Verifica que las galerías quedaron vacias salvo san-martin-oaxaca."""
import io, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEEP = 'san-martin-oaxaca'
malos = []

# --- 1) planteles/*.html ---
con_gal, con_col, total = [], [], 0
for fn in sorted(os.listdir(os.path.join(RAIZ, 'planteles'))):
    if not fn.endswith('.html'):
        continue
    total += 1
    t = io.open(os.path.join(RAIZ, 'planteles', fn), encoding='utf-8').read()
    slug = fn[:-5]
    if 'Ver galería' in t:
        con_gal.append(slug)
        if slug != KEEP:
            malos.append('planteles/%s todavia tiene enlace galeria' % fn)
    if 'taller-collage' in t:
        con_col.append(slug)
        if slug != KEEP:
            malos.append('planteles/%s todavia tiene collage' % fn)
print('1) fichas: %d | con enlace galeria: %s | con collage: %s'
      % (total, con_gal or 'ninguno', con_col or 'ninguno'))

# --- 2) data/campuses.js ---
# Conteo directo: el archivo tiene lineas largas (mapsUrl), asi que no se usa
# una ventana de caracteres entre slug e imagenes.
t = io.open(os.path.join(RAIZ, 'data', 'campuses.js'), encoding='utf-8').read()
vacias = len(re.findall(r'imagenes:\s*\[\s*\]', t))
con_fotos = re.findall(r"imagenes:\s*\[\s*'([^']+)'", t)
print('2) campuses.js: imagenes vacias=%d | con fotos=%d %s'
      % (vacias, len(con_fotos), [p.split('/')[2] for p in con_fotos]))
if len(con_fotos) != 1 or 'san-martin-oaxaca' not in con_fotos[0]:
    malos.append('campuses.js: con fotos = %s (se esperaba solo san-martin-oaxaca)' % con_fotos)
if vacias != 18:
    malos.append('campuses.js: %d galerias vacias (se esperaba 18)' % vacias)

# --- 3) PRE block de planteles.html ---
linea = [l for l in io.open(os.path.join(RAIZ, 'planteles.html'), encoding='utf-8')
         if '<!--PRE-->' in l]
if linea:
    n = len(re.findall(r'Ver galería', linea[0]))
    sm = len(re.findall(r'galeria\?plantel=%s' % KEEP, linea[0]))
    print('3) PRE de planteles.html: %d enlaces galeria (san-martin: %d)' % (n, sm))
    if n != 1 or sm != 1:
        malos.append('PRE: %d enlaces, san-martin %d (se esperaba 1 y 1)' % (n, sm))
else:
    malos.append('PRE: no se encontro el marcador <!--PRE-->')

# --- 4) generadores: ¿producen enlace solo con fotos? ---
gen = io.open(os.path.join(RAIZ, 'scripts', 'build-planteles.js'), encoding='utf-8').read()
ok1 = 'if (!imgs.length) return' in gen
ok2 = 'hasPhotos ? `<a href="/galeria' in gen
pre = io.open(os.path.join(RAIZ, 'scripts', 'prerender.py'), encoding='utf-8').read()
ok3 = "if c.get('imagenes') else ''" in pre
print('4) build-planteles.js: collage guardado=%s, enlace condicional=%s | prerender.py: condicional=%s'
      % (ok1, ok2, ok3))
if not (ok1 and ok2 and ok3):
    malos.append('generadores sin proteccion')

# --- 5) templates JS condicionales ---
for fn in ['citas.html', 'empezar.html', 'registro.html', 'planteles.html']:
    t = io.open(os.path.join(RAIZ, fn), encoding='utf-8').read()
    n = len(re.findall(r'\(\(c\.imagenes\|\|\[\]\)\.length\)', t))
    if n != 1:
        malos.append('%s: %d condicionales (se esperaba 1)' % (fn, n))
print('5) templates JS con condicional: citas, empezar, registro, planteles -> OK')

# --- 6) no se borraron archivos de imagen ---
img = []
for root, _, files in os.walk(os.path.join(RAIZ, 'img', 'planteles')):
    img += [os.path.join(root, f) for f in files]
print('6) archivos de imagen en img/planteles: %d (conservados)' % len(img))
if len(img) == 0:
    malos.append('img/planteles vacio: se borraron imagenes')

print()
if malos:
    print('PROBLEMAS:')
    for m in malos:
        print('  -', m)
    sys.exit(1)
print('TODO OK')

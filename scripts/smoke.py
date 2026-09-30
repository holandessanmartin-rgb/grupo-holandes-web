#!/usr/bin/env python3
"""Prueba de humo post-deploy: verifica páginas, APIs y contenido clave.
Uso: python3 scripts/smoke.py [BASE_URL]  (defecto: http://localhost:3100)
Sale con código 1 si algo falla (útil en CI).
"""
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3100'
fails = []


def get(path, timeout=25):
    req = urllib.request.Request(BASE + path, headers={'User-Agent': 'GH-smoke/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode('utf-8', errors='replace')


def check(cond, label):
    print(('  OK  ' if cond else '  FAIL ') + label)
    if not cond:
        fails.append(label)


def main():
    print('Smoke vs', BASE)
    try:
        s, home = get('/')
        check(s == 200, 'portada 200')
        check('gh-header' in home and 'LOCALIZA EL PLANTEL' in home, 'portada con contenido')
    except Exception as e:
        check(False, f'portada accesible ({e})')
        print('RESULTADO: FALLOS'); return 1
    for p in ['/registro', '/planteles', '/cursos', '/directivo', '/galeria?plantel=san-martin-oaxaca', '/admin']:
        try:
            s, _ = get(p)
            check(s == 200, f'{p} 200')
        except Exception as e:
            check(False, f'{p} ({e})')
    try:
        s, t = get('/planteles')
        check('San Mart' in t and 'Tule' in t, 'lista de planteles con datos')
    except Exception as e:
        check(False, f'contenido planteles ({e})')
    # API: validación rechaza teléfono malo (prueba que la API vive sin crear basura)
    try:
        data = b'{"nombre":"x","telefono":"1","especialidad":"y","plantelId":"z"}'
        req = urllib.request.Request(BASE + '/api/leads', data=data, headers={'Content-Type': 'application/json'})
        try:
            urllib.request.urlopen(req, timeout=20)
            check(False, 'API valida teléfonos (debió rechazar)')
        except urllib.error.HTTPError as e:
            check(e.code == 400, 'API rechaza teléfono inválido (400)')
    except Exception as e:
        check(False, f'API leads ({e})')
    try:
        s, _ = get('/api/admin/stats')
        check(False, 'admin sin clave debe fallar')
    except urllib.error.HTTPError as e:
        check(e.code in (401, 403), 'admin exige clave')
    except Exception as e:
        check(False, f'admin ({e})')
    print('RESULTADO:', 'FALLOS' if fails else 'TODO OK')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())

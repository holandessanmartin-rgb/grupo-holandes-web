#!/usr/bin/env python3
"""Inyecta header/footer ESTÁTICOS en cada HTML (menú y pie visibles
incluso sin JavaScript). El JS de app.js los omite si ya existen.
Uso: python3 scripts/static_chrome.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

NAV = [('/', 'Inicio'), ('/nosotros', 'Nosotros'), ('/especialidades', 'Especialidades'),
       ('/planteles', 'Planteles'), ('/admisiones', 'Admisiones'), ('/cursos', 'Cursos'),
       ('/blog', 'Blog'), ('/contacto', 'Contacto')]


def specs():
    t = (ROOT / 'data' / 'specialties.js').read_text(encoding='utf-8')
    ids = re.findall(r"id:\s*'([^']+)'", t)
    out = []
    for i in ids:
        nm = re.search(r"id:\s*'" + re.escape(i) + r"',\s*\n\s*nombre:\s*'([^']+)'", t)
        sl = re.search(r"id:\s*'" + re.escape(i) + r"'[\s\S]{0,300}?slug:\s*'([^']+)'", t)
        if nm and sl:
            out.append((nm.group(1), sl.group(1)))
    return out


def campuses():
    t = (ROOT / 'data' / 'campuses.js').read_text(encoding='utf-8')
    names = re.findall(r"nombre:\s*'([^']+)'", t)
    return names[:8]


def header_html(active, minimal):
    if minimal:
        return ('<div id="gh-header"><nav class="navbar"><div class="container">'
                '<a href="/" class="navbar-brand"><img src="/img/logotipo.png" alt="Grupo Holandés" class="navbar-logo">'
                '<span>GRUPO <span>HOLANDÉS</span></span></a>'
                '<ul class="navbar-nav"><li><a href="/registro" class="btn-nav-cta">Quiero información</a></li></ul>'
                '</div></nav></div>')
    items = []
    for href, label in NAV:
        cls = ' class="active"' if (active == href or (href != '/' and active.startswith(href))) else ''
        items.append(f'<li><a href="{href}"{cls}>{label}</a></li>')
    items.append('<li><a href="/registro" class="btn-nav-cta">Quiero información</a></li>')
    return ('<div id="gh-header"><div class="top-bar"><div class="container">'
            '<div class="top-bar-left"><a class="top-bar-item" href="tel:+529515678678">📞 +52 951 567 8678</a></div>'
            '<div class="top-bar-right"><a href="/planteles#buscar" class="top-bar-cta">📍 Encuentra tu plantel</a></div>'
            '</div></div><nav class="navbar" id="navbar"><div class="container">'
            '<a href="/" class="navbar-brand"><img src="/img/logotipo.png" alt="Grupo Holandés" class="navbar-logo">'
            '<span>GRUPO <span>HOLANDÉS</span></span></a>'
            '<ul class="navbar-nav" id="navbar-nav">' + ''.join(items) + '</ul>'
            '<button class="hamburger" id="hamburger" aria-label="Menú"><span></span><span></span><span></span></button>'
            '</div></nav></div>')


def footer_html(specs, camps):
    sp = ''.join(f'<li><a href="/especialidades/{sl}">{nm}</a></li>' for nm, sl in specs)
    cp = ''.join(f'<li><a href="/planteles">{c}</a></li>' for c in camps)
    return ('<div id="gh-footer"><footer class="footer"><div class="container"><div class="footer-grid">'
            '<div class="footer-brand"><img src="/img/logotipo.png" alt="Grupo Holandés" class="footer-logo">'
            '<p>Escuela de Mecánica Automotriz con clases 90% prácticas en vehículos reales.</p></div>'
            f'<div class="footer-column"><h4>Especialidades</h4><ul>{sp}</ul></div>'
            f'<div class="footer-column"><h4>Planteles</h4><ul>{cp}</ul><p><a href="/planteles">Ver los 19 planteles →</a></p></div>'
            '<div class="footer-column"><h4>Contacto</h4><ul>'
            '<li>📞 <a href="tel:+529515678678">+52 951 567 8678</a></li>'
            '<li>📍 Tierra y Libertad #100 A, Col. Ejidal San Martín Montoya, Oaxaca</li>'
            '<li>📌 A 3 cuadras de Plaza Bella</li></ul></div></div>'
            '<div class="footer-bottom"><p>&copy; 2026 Grupo Holandés. '
            '<a href="/contacto">Contacto</a> · <a href="/aviso-privacidad">Aviso de Privacidad</a> · '
            '<a href="#" data-prefs>Preferencias de privacidad</a> · '
            '<a href="/terminos-cupon">Términos del cupón</a> · <a href="/admin">Acceso asesores</a></p></div>'
            '</div></footer>'
            '<a class="floating-whatsapp" id="gh-wa-float" href="https://wa.me/529515678678?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20Grupo%20Holand%C3%A9s." target="_blank" rel="noopener" aria-label="WhatsApp">💬</a></div>')


def page_path(f):
    rel = f.relative_to(ROOT).as_posix()
    if rel == 'index.html':
        return '/'
    if rel.endswith('/index.html'):
        return '/' + rel[:-len('/index.html')]
    if rel.endswith('.html'):
        return '/' + rel[:-len('.html')]
    return '/' + rel


def main():
    sp, cp = specs(), campuses()
    n = 0
    for f in sorted(ROOT.rglob('*.html')):
        t = f.read_text(encoding='utf-8')
        if '<div id="gh-header"></div>' not in t and '<div id="gh-footer"></div>' not in t:
            continue
        minimal = 'data-nav="minimal"' in t
        active = page_path(f)
        if '<div id="gh-header"></div>' in t:
            t = t.replace('<div id="gh-header"></div>', header_html(active, minimal))
            n += 1
        if '<div id="gh-footer"></div>' in t:
            t = t.replace('<div id="gh-footer"></div>', footer_html(sp, cp))
            n += 1
        f.write_text(t, encoding='utf-8')
    print(f'OK: {n} reemplazos en HTML')


if __name__ == '__main__':
    main()

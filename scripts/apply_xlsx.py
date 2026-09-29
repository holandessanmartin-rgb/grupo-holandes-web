#!/usr/bin/env python3
"""Aplica DATOS POR PLANTEL (respuestas).xlsx a data/campuses.js.
Fuente: Escritorio del usuario. Agrega campos instagram/email si faltan.
Uso: python3 scripts/apply_xlsx.py [--write]
Sin --write solo muestra el diff.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "data" / "campuses.js"

AUTO = 'mecanica-automotriz'
MOTO = 'reparacion-motocicletas'
DIESEL = 'mecanica-diesel'
ELEC = 'electronica-automotriz'

DATA = {
    'tlaxiaco': dict(
        direccion='Calle Jacarandas núm. 19, Barrio San Sebastián, Tlaxiaco, Oaxaca',
        referencia='', latitud=17.2696919, longitud=-96.6886497,
        telefono='+52 953 171 2465', whatsapp='529531712465',
        email='', facebook='https://www.facebook.com/EscuelaDeMecanicaTlaxiaco',
        tiktok='https://www.tiktok.com/@mecanicatlaxiaco',
        instagram='https://www.instagram.com/mecanicatlaxiaco',
        mapsUrl='https://maps.app.goo.gl/6owhFMmHV6qL5gWM8',
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 15:00–17:00 · Sáb–Dom: 8:00–15:00'),
    'zimatlan-alvarez': dict(
        direccion='García Vigil #400, San Lorenzo, Zimatlán de Álvarez, Oaxaca',
        referencia='', latitud=16.8657107, longitud=-96.7823507,
        telefono='+52 951 184 2843', whatsapp='529511842843',
        email='mecanicaholandeszimatlan@gmail.com',
        facebook='https://www.facebook.com/profile.php?id=61577364175503',
        tiktok='https://www.tiktok.com/@mecanicaholandesz',
        instagram='https://www.instagram.com/mecanicaghzimatlan/',
        mapsUrl='https://maps.app.goo.gl/oweskxvPE5ysgCR17',
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00'),
    'juchitan-zaragoza': dict(
        direccion='Calle los Robles entre Frambollanes, Fraccionamiento Reforma, Juchitán de Zaragoza, Oaxaca',
        referencia='', latitud=16.4344, longitud=-95.0208,
        telefono='+52 971 729 8631', whatsapp='529717298631',
        email='escuelaautomotrizjuchitan@gmail.com',
        facebook='https://www.facebook.com/share/19hSWdSLr9/',
        tiktok='https://www.tiktok.com/@mecanicaholandesjuchitan',
        instagram='https://www.instagram.com/escuelamecanicajuchitan',
        mapsUrl='https://maps.app.goo.gl/9A6ZXhNSv5oVVZoS6',
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 9:00–11:00, 15:00–17:00 · Sáb–Dom: 8:00–15:00'),
    'santa-maria-tule': dict(
        direccion='Privada de la Cruz n. 5, Santa María del Tule, Oaxaca, C.P. 68297',
        referencia='', latitud=17.0488986, longitud=-96.6397517,
        telefono='+52 951 244 6714', whatsapp='529512446714',
        email='escuelaautomotrizdeltule@gmail.com',
        facebook='https://www.facebook.com/escuelademecanicaeltule',
        tiktok='https://www.tiktok.com/@escuelaholandes',
        instagram='https://www.instagram.com/escuelaautomotrizdeltule/',
        mapsUrl='https://maps.app.goo.gl/qhRgmxdE5P3XFL4q7',
        especialidades=[AUTO, MOTO, DIESEL, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 15:00–17:00, 17:00–19:00, 19:00–21:00 · Sáb–Dom: 8:00–15:00'),
    'miahuatlan-diaz': dict(
        direccion='Ejército Nacional 283, Benito Juárez, 70805 Miahuatlán de Porfirio Díaz, Oaxaca',
        referencia='', latitud=16.3494615, longitud=-96.5994194,
        telefono='+52 951 425 0632', whatsapp='529514250632',
        email='grupoholandesmiahuatlan@gmail.com',
        facebook='https://www.facebook.com/share/1F9iWZZdDD/',
        tiktok='https://www.tiktok.com/@miahuatlan.grupoholandes',
        instagram='https://www.instagram.com/grupoholandesmiahuatlan',
        mapsUrl='https://maps.app.goo.gl/Kg1cth2xViQSYKpC7',
        especialidades=[AUTO, MOTO],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 11:00–13:00 · Sáb–Dom: 8:00–15:00'),
    'santa-cruz-xoxocotlan': dict(
        direccion='Calle Progreso N. 929, Fraccionamiento ICHI-KOLO, Colonia Centro, Santa Cruz Xoxocotlán, C.P. 71230',
        referencia='A un costado de la Gasolinera Pemex y el Monte de Piedad, cerca de la Policía Vial',
        latitud=17.021988, longitud=-96.7336239,
        telefono='+52 951 561 5847', whatsapp='529515615847',
        email='grupoholandesxoxo@gmail.com',
        facebook='https://www.facebook.com/profile.php?id=100063788365063',
        tiktok='https://www.tiktok.com/@grupo_holandes_xoxo',
        instagram='https://www.instagram.com/escuelademecanicaxoxo',
        mapsUrl='https://maps.app.goo.gl/BYkQhEtEirPAR2Lp6?g_st=awb',
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00'),
    'villahermosa': dict(
        direccion='Sánchez Magallanes 1204, Centro, Villahermosa, Tabasco, C.P. 86000',
        referencia='', latitud=17.9750389, longitud=-92.9513741,
        telefono='', whatsapp='',
        email='escuelademecanicavillahermosa@gmail.com',
        facebook='https://www.facebook.com/share/19XFTnB6Aj/',
        tiktok='https://www.tiktok.com/@grupoholandesvhs',
        instagram='',
        mapsUrl='https://maps.app.goo.gl/JasHDmKCUJrTyLr36?g_st=ic',
        especialidades=[AUTO, MOTO, DIESEL, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 11:00–13:00, 15:00–17:00, 17:00–19:00, 19:00–21:00 · Sáb–Dom: 8:00–15:00'),
}

FIELDS_STR = ['direccion', 'referencia', 'telefono', 'whatsapp', 'email',
              'facebook', 'tiktok', 'instagram', 'mapsUrl', 'horario']


def set_field(block, field, value):
    if isinstance(value, float):
        pat = re.compile(r"(" + field + r":\s*)[-\d.]+")
        return pat.sub(lambda m: m.group(1) + repr(round(value, 7)), block, count=1)
    pat = re.compile(r"(" + field + r":\s*')[^']*(')")
    return pat.sub(lambda m: m.group(1) + value + m.group(2), block, count=1)


def ensure_field(block, field, value):
    if re.search(field + r":", block):
        return block
    anchor = re.search(r"(    horario:\s*'[^']*',\n)", block)
    ins = f"    {field}: '{value}',\n"
    if anchor:
        return block.replace(anchor.group(1), anchor.group(1) + ins, 1)
    return block.rstrip() + "\n" + ins + "  },\n"


def main():
    text = TARGET.read_text(encoding="utf-8")
    blocks = re.split(r"(?=\{\n    id: ')", text)
    changed = []
    for i, b in enumerate(blocks):
        m = re.search(r"id: '([^']+)'", b)
        if not m or m.group(1) not in DATA:
            continue
        cid = m.group(1)
        d = DATA[cid]
        nb = b
        for f in FIELDS_STR:
            if f in ('instagram', 'email') and f not in b:
                nb = ensure_field(nb, f, '')
            if f in d:
                nb2 = set_field(nb, f, d[f])
                if nb2 != nb:
                    changed.append(f"{cid}.{f}")
                nb = nb2
        for num in ('latitud', 'longitud'):
            nb2 = set_field(nb, num, d[num])
            if nb2 != nb:
                changed.append(f"{cid}.{num}")
            nb = nb2
        new_arr = "[" + ", ".join(f"'{x}'" for x in d['especialidades']) + "]"
        nb2, n = re.subn(r"especialidades:\s*\[[^\]]*\]", f"especialidades: {new_arr}", nb, count=1)
        if n and nb2 != nb:
            changed.append(f"{cid}.especialidades")
        nb = nb2
        blocks[i] = nb
    print(f"{len(changed)} campos actualizados")
    for c in sorted(set(changed)):
        print("  -", c)
    if "--write" in sys.argv:
        TARGET.write_text("".join(blocks), encoding="utf-8")
        print("OK escrito")
    else:
        print("(dry-run)")


if __name__ == "__main__":
    import sys
    main()

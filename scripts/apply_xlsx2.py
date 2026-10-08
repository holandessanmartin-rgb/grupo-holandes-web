#!/usr/bin/env python3
"""Aplica DATOS POR PLANTEL (respuestas).xlsx (16 filas) a data/campuses.js
y da de alta el plantel CEMAS. Idempotente.
Uso: python3 scripts/apply_xlsx2.py [--write]
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

# LV/MO... turnos canónicos ya usados en horario:
# Solo se actualizan los campos que difieren.
DATA = {
    'tlaxiaco': dict(
        direccion='Calle Jacarandas núm. 19, Barrio San Sebastián, Tlaxiaco, Oaxaca',
        telefono='+52 953 171 2465', whatsapp='529531712465',
        email='mecanicaautomotriztlaxiaco@gmail.com',
        facebook='https://www.facebook.com/EscuelaDeMecanicaTlaxiaco',
        tiktok='https://www.tiktok.com/@mecanicatlaxiaco',
        instagram='https://www.instagram.com/mecanicatlaxiaco',
        mapsUrl='https://maps.app.goo.gl/6owhFMmHV6qL5gWM8',
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 15:00–17:00 · Sáb–Dom: 8:00–15:00'),
    'zimatlan-alvarez': dict(
        direccion='García Vigil #400, San Lorenzo, Zimatlán de Álvarez, Oaxaca',
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
        telefono='+52 993 167 2561', whatsapp='529931672561',
        email='escuelademecanicavillahermosa@gmail.com',
        facebook='https://www.facebook.com/share/19XFTnB6Aj/',
        tiktok='https://www.tiktok.com/@grupoholandesvhs',
        instagram='',
        mapsUrl='https://maps.app.goo.gl/JasHDmKCUJrTyLr36?g_st=ic',
        especialidades=[AUTO, MOTO, DIESEL, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 11:00–13:00, 15:00–17:00, 17:00–19:00, 19:00–21:00 · Sáb–Dom: 8:00–15:00'),
    'huajuapan-leon': dict(
        direccion='Calle Galeana #25, Colonia Centro, Heroica Ciudad de Huajuapan de León, Oaxaca',
        telefono='+52 953 171 2465', whatsapp='529531712465',
        email='escuelaautomotrizhuajuapan@hotmail.com',
        facebook='https://escuela-de-mecanica-automotriz-diesel-y-gasolina-grupo.negocio.site',
        tiktok='https://www.tiktok.com/@grupoholandes267',
        instagram='https://www.instagram.com/escuelaautomotrizhuajuapan',
        mapsUrl='https://maps.app.goo.gl/vNYQnL28SEKTkhMM7',
        especialidades=[AUTO, MOTO, DIESEL, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 17:00–19:00, 19:00–21:00 · Sáb–Dom: 8:00–15:00 · Licenciatura en Ingeniería Automotriz: jue–vie 8:00–14:00 · Bachillerato: lun, mié, vie 12:00–15:00'),
    'tuxtepec': dict(
        direccion='Av. 5 de Mayo #420 entre Rayón e Hidalgo, Col. Centro, Tuxtepec, Oaxaca',
        telefono='+52 287 128 5361', whatsapp='522871285361',
        email='escuelaautomotriztuxtepec1@gmail.com',
        facebook='https://www.facebook.com/profile.php?id=100083378160643',
        tiktok='https://www.tiktok.com/@escuelautomotriztux',
        instagram='https://www.instagram.com/escuelamecanicatuxtepec',
        mapsUrl='https://share.google/LaLCJgY257JlT5A0P',
        latitud=18.0874632, longitud=-96.1227767,
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00'),
    'ejutla-crespo': dict(
        direccion='Calle 20 de Noviembre 763, C.P. 71500, Vista Hermosa, Ejutla de Crespo, Oaxaca',
        telefono='+52 951 112 3419', whatsapp='529511123419',
        email='Grupoholandes.ejutla@gmail.com',
        facebook='https://www.facebook.com/profile',
        tiktok='https://www.tiktok.com/@mecanica.gh.ejutl',
        instagram='https://www.instagram.com/mecanicaghejutla',
        mapsUrl='https://maps.app.goo.gl/KbmkuT8HVEMpiR5o7',
        latitud=16.5976679, longitud=-96.6608337,
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00'),
    'tehuacan': dict(
        direccion='Calle 2 Norte #405, Colonia Ignacio Zaragoza, Tehuacán, Puebla',
        telefono='+52 230 103 4203', whatsapp='522301034203',
        email='haromiguelharo@gmail.com',
        facebook='https://www.facebook.com/share/1QDXiSp6Ca/',
        tiktok='https://www.tiktok.com/@mecanicaholandes',
        instagram='https://www.instagram.com/mecanicaghtehuacan',
        mapsUrl='https://maps.app.goo.gl/ijRqJ8g6YGkGAYmu6',
        latitud=18.4658011, longitud=-97.3978348,
        especialidades=[AUTO, MOTO, DIESEL, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 11:00–13:00, 15:00–17:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00'),
    'tierra-blanca': dict(
        direccion='Calle Mártires de Chicago #17B, Colonia Obrera, Tierra Blanca, Veracruz',
        telefono='+52 274 118 4468', whatsapp='522741184468',
        email='mecanicaholandestierrablanca@gmail.com',
        facebook='https://www.facebook.com/share/1J353tMCEA/',
        tiktok='https://www.tiktok.com/@mecanicaholandesti',
        instagram='https://www.instagram.com/mecholandestierrablanca',
        mapsUrl='https://maps.app.goo.gl/stpk6SyKQGTceYG98?g_st=awb',
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00, 15:00–17:00 · Sáb–Dom: 8:00–15:00'),
    'pinotepa-nacional': dict(
        direccion='22 Sur, Colonia Santa Cruz, Pinotepa Nacional, Oaxaca',
        telefono='+52 954 135 0663', whatsapp='529541350663',
        email='guerreroelizabethnohemi@gmail.com',
        facebook='https://www.facebook.com/escuelaholandespinotepa',
        tiktok='https://www.tiktok.com/@mecanicaghpino',
        instagram='https://www.instagram.com/escuelademecanicapinotepa',
        mapsUrl='https://share.google/Kzy9aUa6WJ8egJ6jg',
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00'),
    'ometepec': dict(
        direccion='Kilómetro 1, salida a Igualapa, Ometepec, Guerrero',
        telefono='+52 741 126 3176', whatsapp='527411263176',
        email='elizabethnohemiguerreromarin1@gmail.com',
        facebook='https://www.facebook.com/profile.php?id=61591521839835',
        tiktok='https://www.tiktok.com/@escuela.mecnica.o',
        instagram='https://www.instagram.com/mecanicaometepec',
        mapsUrl='https://maps.google.com/maps/search/escuela%20de%20mec%C3%A1nica%20Ometepec/@16.7016,-98.4209,17z?hl=es',
        latitud=16.7016, longitud=-98.4209,
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00'),
    'puerto-escondido': dict(
        direccion='Carretera Costera 200 S/N, Barra Navidad, Puerto Escondido, Oaxaca',
        telefono='+52 954 137 7496', whatsapp='529541377496',
        email='holandesmecanicapuertoescondid@gmail.com',
        facebook='https://www.facebook.com/share/19oUeeDHNw/',
        tiktok='https://www.tiktok.com/@holandes.mecanica',
        instagram='',
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00'),
    'ocotlan-morelos': dict(
        direccion='Oaxaca - Puerto Ángel SN, Morelos, 71510 Ocotlán de Morelos, Oaxaca',
        telefono='+52 951 156 9122', whatsapp='529511569122',
        email='mecanicaholandesocotlan@gmail.com',
        facebook='https://www.facebook.com/profile.php?id=61586800357027',
        tiktok='https://www.tiktok.com/@mecanica.holandes',
        instagram='https://www.instagram.com/mecanicaholandes/',
        mapsUrl='https://www.google.com/maps/place/Escuela+De+Mec%C3%A1nica+Automotriz+Grupo+Holand%C3%A9s+plantel+Ocotl%C3%A1n+de+Morelos/@16.81087,-96.6731254,17z',
        latitud=16.8108649, longitud=-96.6705505,
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 9:00–11:00 · Sáb–Dom: 8:00–15:00'),
    'san-martin-oaxaca': dict(
        direccion='Tierra y Libertad 100 A, Ejidal, 68144 Oaxaca de Juárez, Oaxaca',
        referencia='A 3 cuadras de Plaza Bella',
        telefono='+52 951 567 8678', whatsapp='529515678678',
        email='holandes.san.martin@gmail.com',
        facebook='https://www.facebook.com/share/18ZNmVAa6D/',
        tiktok='https://www.tiktok.com/@escuelamecanicasanmartin',
        instagram='https://www.instagram.com/mecanicaholandesmontoya',
        mapsUrl='https://maps.app.goo.gl/9ARtRCeDxyePNtsYA',
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00'),
    'putla-guerrero': dict(
        direccion='Calle México Num. 9, Barrio Palo de Obo, Putla de Guerrero, Oaxaca',
        telefono='+52 951 470 1010', whatsapp='529514701010',
        email='escuelaautomotrizdeltule@hotmail.com',
        facebook='https://www.facebook.com/profile.php?id=100063545187105',
        tiktok='https://www.tiktok.com/@mecnica.automotri2',
        instagram='https://www.instagram.com/esc_mecanica_putla/',
        mapsUrl='https://www.google.com/maps/place/Escuela+De+Mec%C3%A1nica+Automotriz+Grupo+Holand%C3%A9s/@17.0222727,-97.9259081,17z',
        latitud=17.0222727, longitud=-97.9259081,
        especialidades=[AUTO, MOTO, ELEC],
        horario='Lun–Vie: 7:00–9:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00'),
}

CEMAS = """  {
    id: 'cemas-licenciatura',
    nombre: 'Plantel CEMAS — Licenciatura en Ingeniería en Mecánica Automotriz',
    slug: 'cemas',
    ciudad: 'Santa María del Tule',
    estado: 'Oaxaca',
    direccion: 'Privada de la Cruz N. 5, Santa María del Tule, Oaxaca',
    referencia: 'Centro Educativo de Mecánica Automotriz del Sureste',
    latitud: 17.0487494,
    longitud: -96.6397995,
    telefono: '+52 951 477 7094',
    whatsapp: '529514777094',
    email: 'mecanicaautomotrizdelsureste@gmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=61584241204914',
    tiktok: 'https://www.tiktok.com/@ingeniera.mecanic7',
    instagram: 'https://www.instagram.com/ingmecanicadelsureste',
    mapsUrl: 'https://maps.app.goo.gl/G62LwgWRGEhgcFdq6',
    especialidades: ['mecanica-automotriz'],
    horario: 'Atención personalizada: consultar directamente con Ing. Emmanuel',
    imagenes: [],
    activo: true,
    orden: 19
  },
"""


def set_field(block, field, value):
    if isinstance(value, float):
        pat = re.compile(r"(" + field + r":\s*)[-\d.]+")
        return pat.sub(lambda m: m.group(1) + repr(round(value, 7)), block, count=1)
    pat = re.compile(r"(" + field + r":\s*')[^']*(')")
    return pat.sub(lambda m: m.group(1) + value + m.group(2), block, count=1)


def ensure_field(block, field):
    if re.search(field + r":", block):
        return block
    anchor = re.search(r"(    horario:\s*'[^']*',\n)", block)
    ins = f"    {field}: '',\n"
    if anchor:
        return block.replace(anchor.group(1), anchor.group(1) + ins, 1)
    return block


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
        for ef in ('instagram', 'email'):
            if ef in d:
                nb = ensure_field(nb, ef)
        for f, v in d.items():
            if f in ('latitud', 'longitud'):
                nb2 = set_field(nb, f, v)
            elif f == 'especialidades':
                new_arr = "[" + ", ".join(f"'{x}'" for x in v) + "]"
                nb2, n = re.subn(r"especialidades:\s*\[[^\]]*\]", f"especialidades: {new_arr}", nb, count=1)
                if not n:
                    continue
            else:
                nb2 = set_field(nb, f, v)
            if nb2 != nb:
                changed.append(f"{cid}.{f}")
            nb = nb2
        blocks[i] = nb
    # Alta de CEMAS si no existe
    if "id: 'cemas-licenciatura'" not in text:
        text2 = "".join(blocks)
        anchor = "\n];"
        assert anchor in text2, "cierre de CAMPUSES no hallado"
        text2 = text2.replace(anchor, ",\n" + CEMAS.rstrip() + "\n];", 1)
        blocks = [text2]
        changed.append("cemas-licenciatura.NUEVO")
    else:
        text2 = "".join(blocks)
    print(f"{len(changed)} cambios")
    for c in sorted(set(changed)):
        print("  -", c)
    if "--write" in sys.argv:
        TARGET.write_text(text2, encoding="utf-8")
        print("OK escrito")


if __name__ == "__main__":
    import sys
    main()

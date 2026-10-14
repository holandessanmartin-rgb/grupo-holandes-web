#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verifica que el DNS y el sitio de grupoholandes.com sigan intactos.

Motivo: se concedio acceso de *dominio* (gestion DNS) a un tercero via Hostinger
Account Sharing. Un cambio accidental de DNS puede borrar los registros TXT de
verificacion de Meta y de Google Search Console, o romper el apuntamiento del
sito. Este script lo detecta en segundos porque el DNS es publico.

Uso:
    python scripts/verificar_dns.py            # reporte legible
    python scripts/verificar_dns.py --json     # salida JSON (para automatizar)
    python scripts/verificar_dns.py --ci       # reporte + escribe out/dns-report.txt

Sale con codigo 1 si algo fallo (util para GitHub Actions).
"""
import json
import os
import random
import socket
import struct
import sys
import urllib.request

DOMINIO = 'grupoholandes.com'
SITIO = 'https://grupoholandes.com'

# Valores esperados (capturados el 14/10/2026). Si el negocio cambia estos
# registros a proposito, actualizar aqui.
TXT_ESPERADOS = [
    'facebook-domain-verification=anadpkkrtqdnll3t0d1vke0mpyvetx',
    'google-site-verification=4_SYo3lJKj8JikWW1uslfiV1vYYPDwogb2ao5FXqL4U',
]
PIXEL_ESPERADO = '1134460819131627'
DNS_SERVERS = ['8.8.8.8', '1.1.1.1']

T_A, T_CNAME, T_TXT = 1, 5, 16


# ---------- resolucion DNS minima en stdlib (sin dependencias) ----------

def _encode_name(name):
    out = b''
    for label in name.strip('.').split('.'):
        raw = label.encode('idna') if label else b''
        out += bytes([len(raw)]) + raw
    return out + b'\x00'


def _read_name(data, offset):
    """Lee un nombre con soporte de punteros de compresion."""
    labels, fin = [], None
    while True:
        if offset >= len(data):
            raise ValueError('nombre truncado')
        length = data[offset]
        if length == 0:
            offset += 1
            break
        if (length & 0xC0) == 0xC0:
            ptr = struct.unpack('>H', data[offset:offset + 2])[0] & 0x3FFF
            if fin is None:
                fin = offset + 2
            offset = ptr
            continue
        offset += 1
        labels.append(data[offset:offset + length].decode('utf-8', 'replace'))
        offset += length
    return '.'.join(labels), (fin if fin is not None else offset)


def dns_query(name, qtype, server, timeout=6):
    tid = random.randint(0, 65535)
    packet = (struct.pack('>HHHHHH', tid, 0x0100, 1, 0, 0, 0)
              + _encode_name(name) + struct.pack('>HH', qtype, 1))
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    try:
        sock.sendto(packet, (server, 53))
        data, _ = sock.recvfrom(4096)
    finally:
        sock.close()

    _, flags, qd, an, _, _ = struct.unpack('>HHHHHH', data[:12])
    if flags & 0x000F:  # RCODE != NoError
        return []
    offset = 12
    for _ in range(qd):
        _, offset = _read_name(data, offset)
        offset += 4

    answers = []
    for _ in range(an):
        _, offset = _read_name(data, offset)
        rtype, _, _, rdlen = struct.unpack('>HHIH', data[offset:offset + 10])
        offset += 10
        rstart = offset
        offset += rdlen
        if rtype == T_TXT:
            texts, i = [], 0
            rdata = data[rstart:rstart + rdlen]
            while i < len(rdata):
                ln = rdata[i]
                i += 1
                texts.append(rdata[i:i + ln].decode('utf-8', 'replace'))
                i += ln
            answers.append(''.join(texts))
        elif rtype == T_CNAME:
            answers.append(_read_name(data, rstart)[0])
        elif rtype == T_A:
            answers.append(socket.inet_ntoa(data[rstart:rstart + 4]))
    return answers


def resolver(nombre, qtype):
    """Intenta varios servidores publicos; devuelve [] si todos fallan."""
    for server in DNS_SERVERS:
        try:
            return dns_query(nombre, qtype, server)
        except Exception:
            continue
    return []


# ------------------------------- checks --------------------------------

def chk(nombre, ok, detalle=''):
    return {'check': nombre, 'ok': bool(ok), 'detalle': detalle}


def ejecutar():
    resultados = []

    txts = resolver(DOMINIO, T_TXT)
    for esperado in TXT_ESPERADOS:
        clave = esperado.split('=', 1)[0]
        encontrado = next((t for t in txts if t.startswith(clave + '=')), None)
        if encontrado == esperado:
            resultados.append(chk('TXT %s presente y correcto' % clave, True, encontrado))
        elif encontrado:
            resultados.append(chk('TXT %s presente y correcto' % clave, False,
                                  'valor alterado: %s' % encontrado))
        else:
            resultados.append(chk('TXT %s presente y correcto' % clave, False,
                                  'REGISTRO AUSENTE (verificacion perdida)'))

    cnames = resolver('www.' + DOMINIO, T_CNAME)
    ok_www = any('cdn.hstgr.net' in c for c in cnames)
    resultados.append(chk('www apunta al CDN de Hostinger', ok_www,
                          ' · '.join(cnames) if cnames else 'sin respuesta CNAME'))

    ips = [r for r in resolver(DOMINIO, T_A) if r.count('.') == 3]
    resultados.append(chk('el dominio resuelve (A)', bool(ips), ' · '.join(ips) or 'sin IP'))

    try:
        req = urllib.request.Request(SITIO, headers={'User-Agent': 'Mozilla/5.0 (dns-check)'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            cuerpo = resp.read().decode('utf-8', 'replace')
        resultados.append(chk('https responde 200', status == 200, 'HTTP %s' % status))
        resultados.append(chk('metaetiqueta de verificacion Meta en el HTML',
                              'facebook-domain-verification' in cuerpo,
                              'respaldo si se borra el TXT'))
        resultados.append(chk('sitio sirve el pixel del dataset',
                              PIXEL_ESPERADO in cuerpo or _pixel_en_config(),
                              'pixel %s' % PIXEL_ESPERADO))
    except Exception as exc:
        resultados.append(chk('https responde 200', False, str(exc)[:90]))

    return resultados


def _pixel_en_config():
    try:
        req = urllib.request.Request(SITIO + '/data/app-config.js',
                                     headers={'User-Agent': 'Mozilla/5.0 (dns-check)'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return PIXEL_ESPERADO in resp.read().decode('utf-8', 'replace')
    except Exception:
        return False


def main():
    args = sys.argv[1:]
    resultados = ejecutar()
    fallos = [r for r in resultados if not r['ok']]
    payload = {
        'dominio': DOMINIO,
        'total': len(resultados),
        'fallos': len(fallos),
        'ok': not fallos,
        'resultados': resultados,
    }

    if '--json' in args:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print('== Verificacion de DNS y sitio: %s ==' % DOMINIO)
        for r in resultados:
            print('  %-4s %s%s' % ('OK' if r['ok'] else 'FALLO', r['check'],
                                   ('  <- ' + r['detalle']) if r['detalle'] else ''))
        print('\nRESULTADO: %s (%d/%d OK)' % ('TODO OK' if not fallos
                                              else 'FALLAS: %d' % len(fallos),
                                              len(resultados) - len(fallos), len(resultados)))

    if '--ci' in args:
        base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'out')
        os.makedirs(base, exist_ok=True)
        with open(os.path.join(base, 'dns-report.txt'), 'w', encoding='utf-8') as fh:
            fh.write('Verificacion de DNS de %s\n\n' % DOMINIO)
            for r in resultados:
                fh.write('%s  %s%s\n' % ('OK  ' if r['ok'] else 'FALLO',
                                         r['check'], (' -> ' + r['detalle']) if r['detalle'] else ''))
            fh.write('\nFallos: %d de %d\n' % (len(fallos), len(resultados)))

    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())

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

Comprueba ademas la autenticacion del correo del dominio (buzon info@):
MX, SPF, DKIM y DMARC, para que los correos salientes no caigan en spam.
"""
import json
import os
import random
import socket
import struct
import sys
import time
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

# Autenticacion del correo del dominio (buzon info@grupoholandes.com).
# Sin estos registros los correos salientes caen en spam.
MX_ESPERADOS = ['mx1.hostinger.com', 'mx2.hostinger.com']
SPF_INCLUYE = '_spf.mail.hostinger.com'
DKIM_SELECTORES = ['hostingermail-a', 'hostingermail-b', 'hostingermail-c']

T_A, T_CNAME, T_TXT, T_MX = 1, 5, 16, 15


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


def _build_packet(name, qtype):
    tid = random.randint(0, 65535)
    # EDNS0: registro OPT con payload de 4096 bytes. Sin el, los servidores
    # limitan la respuesta a 512 bytes y se TRUNCAN los registros TXT
    # (grupoholandes.com tiene varios: Meta, Google, SPF, DMARC) — ese era el
    # motivo de los falsos "REGISTRO AUSENTE".
    opt = b'\x00' + struct.pack('>HHIH', 41, 4096, 0, 0)
    header = struct.pack('>HHHHHH', tid, 0x0100, 1, 0, 0, 1)
    return tid, header + _encode_name(name) + struct.pack('>HH', qtype, 1) + opt


def _recv_exact(sock, size):
    buf = b''
    while len(buf) < size:
        chunk = sock.recv(size - len(buf))
        if not chunk:
            break
        buf += chunk
    return buf


def _udp_exchange(packet, server, timeout):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    try:
        sock.sendto(packet, (server, 53))
        return sock.recvfrom(8192)[0]
    finally:
        sock.close()


def _tcp_exchange(packet, server, timeout):
    """Fallback por TCP cuando el servidor marca la respuesta como truncada."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((server, 53))
        sock.sendall(struct.pack('>H', len(packet)) + packet)
        length = struct.unpack('>H', _recv_exact(sock, 2))[0]
        return _recv_exact(sock, length)
    finally:
        sock.close()


def _parse_answers(data):
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
        elif rtype == T_MX:
            pref = struct.unpack('>H', data[rstart:rstart + 2])[0]
            answers.append((pref, _read_name(data, rstart + 2)[0]))
    return answers


def dns_query(name, qtype, server, timeout=6):
    _, packet = _build_packet(name, qtype)
    data = _udp_exchange(packet, server, timeout)
    if struct.unpack('>HHHHHH', data[:12])[1] & 0x0200:  # bit TC = truncado
        data = _tcp_exchange(packet, server, timeout)
    return _parse_answers(data)


def resolver(nombre, qtype, intentos=3):
    """Intenta varios servidores publicos, con reintentos; [] si todos fallan.

    Los reintentos son importantes: al publicar registros (por ejemplo cuando
    Hostinger reconfigura el DNS al crear un buzón de correo) los nameservers
    pueden responder de forma inconsistente durante unos segundos. Sin reintentos
    eso se traducia en un falso "REGISTRO AUSENTE" y una alarma equivocada.
    """
    ultimo = []
    for _ in range(intentos):
        for server in DNS_SERVERS:
            try:
                res = dns_query(nombre, qtype, server)
            except Exception:
                continue
            if res:
                return res
            ultimo = res
        time.sleep(1.5)
    return ultimo


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

    # --- autenticacion del correo (MX / SPF / DKIM / DMARC) ---
    mx = [h.lower() for _, h in resolver(DOMINIO, T_MX) if h]
    mx_faltan = [m for m in MX_ESPERADOS if m not in mx]
    resultados.append(chk('MX del correo configurado', not mx_faltan,
                          ' · '.join(mx) if mx else 'sin MX'))
    if mx_faltan:
        resultados[-1]['detalle'] = 'faltan: ' + ' · '.join(mx_faltan)

    txts_dm = resolver(DOMINIO, T_TXT)
    spf = next((t for t in txts_dm if t.startswith('v=spf1')), None)
    resultados.append(chk('SPF del correo presente', bool(spf) and SPF_INCLUYE in spf,
                          spf or 'sin registro SPF'))

    dkim = [resolver(s + '._domainkey.' + DOMINIO, T_CNAME) for s in DKIM_SELECTORES]
    dkim_ok = sum(1 for d in dkim if d)
    resultados.append(chk('DKIM del correo (3 selectores)', dkim_ok == len(DKIM_SELECTORES),
                          '%d/%d CNAME presentes' % (dkim_ok, len(DKIM_SELECTORES))))

    dmarc = resolver('_dmarc.' + DOMINIO, T_TXT)
    d = next((t for t in dmarc if t.startswith('v=DMARC1')), None)
    resultados.append(chk('DMARC presente', bool(d), d or 'sin registro _dmarc'))

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

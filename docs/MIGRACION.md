# Migración a servidor propio (VPS) — Grupo Holandés

## 0. Pre-requisitos (tener a la mano)
- [ ] VPS Ubuntu 24.04 con acceso root (IP: ______)
- [ ] Dominio registrado (ej. `tudominio.mx`) con acceso al DNS
- [ ] Este repositorio clonado localmente y al día (`git pull`)
- [ ] Clave maestra nueva y robusta (NO reutilizar la de pruebas)

## 1. Preparar el VPS (15 min)
```bash
# como root
apt update && apt upgrade -y
bash deploy/setup-ubuntu.sh   # Node 22, PM2, Nginx, UFW, Certbot
```

## 2. Desplegar el código
```bash
useradd -m -s /bin/bash ghapp  # (ya lo hace setup); entrar como ghapp
cd /opt/grupo-holandes-web
git clone <TU-REPO> .
cp deploy/.env.example .env
nano .env   # PORT=3100, GH_ADMIN_KEY=<clave nueva>, NODE_ENV=production
pm2 start deploy/ecosystem.config.js --env production
pm2 save && pm2 startup   # seguir la instrucción que imprime
```

## 3. Nginx + SSL
```bash
cp deploy/nginx-grupoholandes.conf /etc/nginx/sites-available/grupoholandes
nano /etc/nginx/sites-available/grupoholandes  # poner tu dominio
ln -s /etc/nginx/sites-available/grupoholandes /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d tudominio.mx -d www.tudominio.mx
```

## 4. DNS (en tu registrador)
- `A @ → IP-del-VPS`
- `A www → IP-del-VPS`
- Esperar propagación (minutos a horas) y verificar el candado 🔒.

## 5. Datos y secretos a migrar (¡no se copian solos!)
| Qué | Origen | Destino | Cómo |
|---|---|---|---|
| `GH_ADMIN_KEY` nueva | inventar robusta | `/opt/.../.env` + Render viejo apagado | `nano .env` |
| Cuentas encargados | recrear | `POST /api/admin/users` con la clave nueva | script o curl |
| Profesor inicial | se crea solo al arrancar | cambiar contraseña tras entrar | `/alumnos` |
| `sheetsWebhookUrl` | `data/app-config.js` (ya en repo) | sin cambio | — |
| GA4 / Meta IDs | `data/app-config.js` | sin cambio | — |
| Historial Sheets | Google Drive | sin cambio (vive en Google) | — |
| Leads de Render | efímeros, se pierden | exportar antes si importan | `/api/prospectos` + guardar |

## 6. Respaldos
```bash
chmod +x /opt/grupo-holandes-web/deploy/backup.sh
crontab -e   # agregar: 0 3 * * * /opt/grupo-holandes-web/deploy/backup.sh
```
Probar restauración una vez al mes en carpeta temporal.

## 7. Corte y verificación
1. Probar todo en `http://IP-del-VPS:3100` antes del DNS.
2. Tras el DNS: `python3 scripts/smoke.py https://tudominio.mx` debe dar TODO OK.
3. Llenar 1 registro real de prueba y verificar WhatsApp + Sheets + admin.
4. Apagar o degradar el servicio de Render (evita doble operación).

## 8. Fase B (después, sin prisa)
Migrar `data/*.json` a Postgres siguiendo `docs/ARQUITECTURA.md` (mismo modelo).
El frontend y la API no cambian de contratos.

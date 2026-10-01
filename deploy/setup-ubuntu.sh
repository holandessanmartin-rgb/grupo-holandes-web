#!/usr/bin/env bash
# Instalación base en VPS Ubuntu 24.04: Node 22, PM2, Nginx, UFW, Certbot.
# Ejecutar como root una sola vez.
set -e
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y
apt install -y curl git ufw nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
mkdir -p /opt/grupo-holandes-web /var/log/grupo-holandes
useradd -m -s /bin/bash ghapp || true
chown -R ghapp:ghapp /opt/grupo-holandes-web /var/log/grupo-holandes
node --version
echo "OK base. Sigue docs/MIGRACION.md"

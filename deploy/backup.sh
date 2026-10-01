#!/usr/bin/env bash
# Respaldo diario de data/*.json (prospectos, citas, usuarios, cupones).
# Cron sugerido: 0 3 * * * /opt/grupo-holandes-web/deploy/backup.sh
set -e
APP=/opt/grupo-holandes-web
DEST=/var/backups/grupo-holandes
FECHA=$(date +%F)
mkdir -p "$DEST"
tar -czf "$DEST/data-$FECHA.tar.gz" -C "$APP" data
find "$DEST" -name 'data-*.tar.gz' -mtime +30 -delete
echo "OK respaldo $DEST/data-$FECHA.tar.gz"
# Opcional: subir a Drive con rclone (configurar aparte).

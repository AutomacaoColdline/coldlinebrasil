#!/bin/bash
set -e

BACKUP_DIR="/home/coldline/backups"
DB_NAME="coldlinedb"
DB_USER="coldline"
DB_PASS="Coldline123"
CONTAINER="coldline_intranet-postgres-1"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$FILENAME"

find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -type f -mtime +$((RETENTION_DAYS - 1)) -delete

echo "[$(date)] Backup criado: $FILENAME"

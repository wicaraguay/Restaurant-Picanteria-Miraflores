#!/bin/bash
# ============================================
# Backup de MongoDB
# Uso: ./scripts/backup-mongodb.sh
# Agregar a cron: 0 2 * * * /opt/app/scripts/backup-mongodb.sh
# ============================================

set -e

BACKUP_DIR="/opt/app/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_$DATE"

echo "=== Iniciando backup de MongoDB ==="

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Ejecutar backup dentro del contenedor
docker exec restaurant-pm-db mongodump \
    --username=$MONGO_ROOT_USER \
    --password=$MONGO_ROOT_PASSWORD \
    --authenticationDatabase=admin \
    --db=restaurant-pm \
    --out=/backups/$BACKUP_NAME

# Comprimir backup
cd $BACKUP_DIR
tar -czf $BACKUP_NAME.tar.gz $BACKUP_NAME
rm -rf $BACKUP_NAME

# Eliminar backups mayores a 7 dias
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "=== Backup completado: $BACKUP_NAME.tar.gz ==="

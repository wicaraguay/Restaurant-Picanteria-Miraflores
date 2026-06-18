#!/bin/bash
# ============================================
# Script de despliegue para VPS
# Uso: ./scripts/deploy.sh
# ============================================

set -e

echo "=== Desplegando Restaurant PM ==="

# Ir al directorio del proyecto
cd /opt/app

# Obtener ultimos cambios
echo ">>> Obteniendo cambios de GitHub..."
git pull origin main

# Reconstruir y reiniciar contenedores
echo ">>> Reconstruyendo contenedores..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Esperar a que los servicios esten listos
echo ">>> Esperando a que los servicios esten listos..."
sleep 10

# Verificar salud del backend
echo ">>> Verificando salud del backend..."
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo "Backend OK"
else
    echo "ERROR: Backend no responde"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

echo "=== Despliegue completado exitosamente ==="

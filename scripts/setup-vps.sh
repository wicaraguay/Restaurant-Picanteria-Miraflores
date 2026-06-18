#!/bin/bash
# ============================================
# Setup inicial de VPS para Restaurant PM
# Ejecutar como root en un VPS Ubuntu 24.04 limpio
# ============================================

set -e

echo "=== Setup inicial de VPS ==="

# Actualizar sistema
echo ">>> Actualizando sistema..."
apt update && apt upgrade -y

# Instalar dependencias
echo ">>> Instalando Docker y dependencias..."
apt install -y docker.io docker-compose git curl ufw

# Habilitar Docker
systemctl enable docker
systemctl start docker

# Configurar firewall
echo ">>> Configurando firewall..."
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw --force enable

# Crear directorio del proyecto
echo ">>> Creando directorios..."
mkdir -p /opt/app
mkdir -p /opt/app/backups

# Clonar repositorio
echo ">>> Clonando repositorio..."
cd /opt
git clone https://github.com/TU-USUARIO/PM-project.git app

# Crear archivo .env
echo ">>> Creando archivo .env..."
cd /opt/app
cp env.production.example .env

echo ""
echo "============================================"
echo "Setup completado!"
echo "============================================"
echo ""
echo "SIGUIENTES PASOS:"
echo "1. Editar variables de entorno:"
echo "   nano /opt/app/.env"
echo ""
echo "2. Iniciar la aplicacion:"
echo "   cd /opt/app"
echo "   docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "3. Ver logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "4. Configurar dominio y SSL (opcional):"
echo "   apt install nginx certbot python3-certbot-nginx"
echo "============================================"

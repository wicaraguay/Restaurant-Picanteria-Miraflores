# 🚀 Setup del Proyecto - Restaurant PM

Guía completa para configurar el proyecto en una nueva computadora usando Docker.

## 📋 Requisitos Previos

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)

## 🔧 Instalación Paso a Paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/wicaraguay/Restaurant-Picanteria-Miraflores.git
cd Restaurant-Picanteria-Miraflores
```

### 2. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores reales
# En Windows: notepad .env
# En Mac/Linux: nano .env
```

**Variables IMPORTANTES que DEBES cambiar:**
- `JWT_SECRET` - Clave secreta para JWT (genera una aleatoria)
- `MASTER_ENCRYPTION_KEY` - Clave de 32 caracteres para encriptar datos sensibles
- `MONGO_ROOT_PASSWORD` - Contraseña de MongoDB
- `RESEND_API_KEY` - Tu API key de Resend para envío de emails
- `SRI_SIGNATURE_BASE64` y `SRI_SIGNATURE_PASSWORD` - Firma digital del SRI

### 3. Levantar el proyecto con Docker

```bash
docker-compose up -d
```

Esto iniciará:
- **MongoDB** en puerto `27017`
- **Backend** en puerto `3000` (http://localhost:3000)
- **Frontend** en puerto `80` (http://localhost)

### 4. Verificar que todo funciona

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver solo logs del backend
docker-compose logs -f backend

# Verificar que los contenedores estén corriendo
docker-compose ps
```

Abre el navegador en:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000/health

## 🛑 Detener el proyecto

```bash
# Detener los contenedores (sin borrar datos)
docker-compose stop

# Detener y borrar contenedores (datos de MongoDB persisten)
docker-compose down

# Detener, borrar contenedores Y borrar datos
docker-compose down -v
```

## 🔄 Actualizar después de un git pull

```bash
# Si hay cambios en dependencias o código
git pull
docker-compose up -d --build
```

## 📱 WhatsApp

WhatsApp está **habilitado por defecto** (`WHATSAPP_ENABLED=true` en `.env`).

- Para **generar QR**: Ve a http://localhost/configuracion (sección WhatsApp)
- Para **deshabilitarlo**: Cambia `WHATSAPP_ENABLED=false` en `.env` y reinicia

## 🐛 Troubleshooting

### El frontend no carga
```bash
docker-compose logs frontend
# Verifica que VITE_API_URL apunte a http://localhost:3000/api
```

### El backend no conecta a MongoDB
```bash
docker-compose logs mongodb
# Verifica que MongoDB esté healthy
docker-compose ps
```

### WhatsApp no funciona
```bash
docker-compose logs backend | grep WhatsApp
# Debe decir "WhatsApp is ENABLED" y "Launching Puppeteer/Chrome"
```

### Limpiar todo y empezar de cero
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## 📦 Estructura del Proyecto

```
PM-project/
├── restaurant-backend/    # API Node.js/Express/TypeScript
│   ├── Dockerfile         # Imagen con Chromium para WhatsApp
│   └── src/
├── restaurant-pm/         # Frontend React/Vite/TypeScript
│   ├── Dockerfile         # Build + Nginx
│   └── src/
├── docker-compose.yml     # Orquestación de servicios
└── .env                   # Variables de entorno (NO commitear)
```

## 🌐 Producción

El proyecto está deployado en:
- **Backend**: Render (Docker)
- **Frontend**: Vercel

Para deployar en producción, configura las mismas variables de entorno en Render/Vercel.

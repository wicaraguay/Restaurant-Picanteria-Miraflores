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

## 📝 Variables de Entorno Detalladas

### 🔐 Seguridad y Autenticación (OBLIGATORIAS)

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `JWT_SECRET` | Clave secreta para firmar tokens JWT. Debe ser una cadena aleatoria larga y única. | `mi-super-secreto-jwt-2024-xyz` | ✅ SÍ |
| `JWT_EXPIRATION` | Tiempo de expiración de tokens JWT | `24h`, `8h`, `7d` | ⚠️ Opcional (default: 8h) |
| `MASTER_ENCRYPTION_KEY` | Clave de 32 caracteres para encriptar certificados del SRI en la base de datos. **CRÍTICO: Si pierdes esta clave, no podrás desencriptar los certificados guardados.** | `abcd1234efgh5678ijkl9012mnop3456` | ✅ SÍ |

**Cómo generar claves seguras:**
```bash
# JWT_SECRET
openssl rand -base64 64

# MASTER_ENCRYPTION_KEY (exactamente 32 caracteres)
openssl rand -hex 16
```

### 🗄️ Base de Datos MongoDB

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `MONGO_ROOT_USER` | Usuario administrador de MongoDB | `admin` | ✅ SÍ |
| `MONGO_ROOT_PASSWORD` | Contraseña del admin de MongoDB | `MiPassword2024!` | ✅ SÍ |
| `MONGODB_URI` | URI completa de conexión (se genera automáticamente en docker-compose) | `mongodb://admin:pass@mongodb:27017/restaurant-pm?authSource=admin` | ⚠️ Auto |

### 🌐 CORS y Seguridad Web

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `ALLOWED_ORIGINS` | Dominios permitidos para hacer requests al backend (separados por comas, sin espacios) | `http://localhost,https://tuapp.vercel.app` | ✅ SÍ |
| `RATE_LIMIT_MAX` | Máximo de requests por IP cada 15 minutos | `500` | ⚠️ Opcional (default: 500) |
| `PORT` | Puerto donde corre el backend | `3000` | ⚠️ Opcional (default: 3000) |
| `NODE_ENV` | Ambiente de ejecución | `production`, `development` | ⚠️ Opcional (default: production) |

### 🧾 SRI - Facturación Electrónica Ecuador (OBLIGATORIO para facturar)

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `SRI_ENV` | Ambiente del SRI. `1` = Pruebas, `2` = Producción | `1` | ✅ SÍ |
| `SRI_SIGNATURE_BASE64` | Certificado digital del SRI en formato Base64. **Obtén el .p12 del SRI, conviértelo:** `base64 -i certificado.p12` | `MIIKqQIBAzCCCm8GCSqGS...` | ✅ SÍ |
| `SRI_SIGNATURE_PASSWORD` | Contraseña del certificado .p12 del SRI | `MiPasswordSRI123` | ✅ SÍ |
| `RUC` | RUC de tu negocio (13 dígitos) | `1234567890001` | ✅ SÍ |
| `BUSINESS_NAME` | Razón social registrada en el SRI | `RESTAURANTE MIRAFLORES S.A.` | ✅ SÍ |
| `COMMERCIAL_NAME` | Nombre comercial del negocio | `Picantería Miraflores` | ⚠️ Opcional |
| `DIR_MATRIZ` | Dirección de la matriz según el RUC | `Av. Principal 123 y Secundaria, Guayaquil` | ✅ SÍ |
| `DIR_ESTABLECIMIENTO` | Dirección del punto de emisión | `Av. Principal 123 y Secundaria, Guayaquil` | ✅ SÍ |
| `ESTAB` | Código de establecimiento (3 dígitos) | `001` | ✅ SÍ |
| `PTO_EMI` | Código de punto de emisión (3 dígitos) | `001` | ✅ SÍ |

**Notas importantes sobre el SRI:**
- El certificado `.p12` lo obtienes del SRI al registrarte para facturación electrónica
- Para convertir a Base64 en Windows: usa [base64encode.org](https://www.base64encode.org/) o PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificado.p12"))`
- En desarrollo usa `SRI_ENV=1` (pruebas), en producción `SRI_ENV=2`
- El RUC debe coincidir EXACTAMENTE con el del certificado

### 📧 Email - Resend (OBLIGATORIO para enviar facturas por email)

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `RESEND_API_KEY` | API Key de [Resend.com](https://resend.com). Crea una cuenta gratuita. | `re_AbCdEfGh123456789` | ✅ SÍ |
| `SMTP_FROM` | Email "From" para enviar facturas (debe estar verificado en Resend) | `facturacion@tumarca.com` | ✅ SÍ |
| `BUSINESS_LOGO_URL` | URL pública del logo para emails y PDFs | `https://tumarca.com/logo.png` | ⚠️ Opcional |
| `TEST_EMAIL` | Email de prueba para desarrollo | `test@example.com` | ⚠️ Opcional |

**Cómo configurar Resend:**
1. Regístrate en [resend.com](https://resend.com) (plan gratuito: 100 emails/día)
2. Crea una API Key en el dashboard
3. Verifica tu dominio o usa el dominio de prueba de Resend
4. Copia la API Key a `RESEND_API_KEY`

### 📱 WhatsApp Business (OPCIONAL)

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `WHATSAPP_ENABLED` | Habilita/deshabilita WhatsApp Web.js con Chromium | `true` o `false` | ⚠️ Opcional (default: false) |
| `PUPPETEER_EXECUTABLE_PATH` | Path al ejecutable de Chromium (Docker lo configura automáticamente) | `/usr/bin/chromium-browser` | ⚠️ Auto en Docker |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | Evita descargar Chromium (usa el del sistema) | `true` | ⚠️ Auto en Docker |

**Notas sobre WhatsApp:**
- `WHATSAPP_ENABLED=false`: El servidor arranca sin WhatsApp (más rápido, menos recursos)
- `WHATSAPP_ENABLED=true`: Habilita bot de WhatsApp (requiere Chromium, genera QR para vincular)
- En desarrollo local con Docker, WhatsApp funciona automáticamente
- Para generar el QR: ve a http://localhost/configuracion → sección WhatsApp

### 🌱 Seed Data - Datos Iniciales (OPCIONAL)

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `SEED_ADMIN_USERNAME` | Usuario del administrador inicial | `admin` | ⚠️ Opcional (default: admin) |
| `SEED_ADMIN_PASSWORD` | Contraseña del admin inicial | `Admin123!` | ⚠️ Opcional (default: admin123) |
| `SEED_WAITER_USERNAME` | Usuario del mesero de ejemplo | `cmesero` | ⚠️ Opcional |
| `SEED_WAITER_PASSWORD` | Contraseña del mesero | `Mesero123!` | ⚠️ Opcional |
| `SEED_CHEF_USERNAME` | Usuario del cocinero de ejemplo | `acocinera` | ⚠️ Opcional |
| `SEED_CHEF_PASSWORD` | Contraseña del cocinero | `Cocina123!` | ⚠️ Opcional |

**Para cargar datos iniciales:**
```bash
# Entrar al contenedor del backend
docker-compose exec backend sh

# Correr el seed
node dist/seed.js

# Salir
exit
```

### 🎨 Frontend

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `VITE_API_URL` | URL del backend API (sin barra final) | `http://localhost:3000/api` | ✅ SÍ |

**Importante:** Esta variable se configura en **build-time** del frontend. Si la cambias, debes hacer rebuild:
```bash
docker-compose up -d --build frontend
```

---

## 🚀 Levantar el Proyecto

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

### 5. Iniciar sesión

Credenciales por defecto (si corriste el seed):
- **Usuario**: `admin`
- **Contraseña**: `admin123`

**⚠️ IMPORTANTE:** Cambia estas credenciales inmediatamente en producción.

---

## 🛑 Comandos Útiles

### Detener el proyecto

```bash
# Detener los contenedores (sin borrar datos)
docker-compose stop

# Detener y borrar contenedores (datos de MongoDB persisten)
docker-compose down

# Detener, borrar contenedores Y borrar datos
docker-compose down -v
```

### Actualizar después de un git pull

```bash
# Si hay cambios en dependencias o código
git pull
docker-compose up -d --build
```

### Ver logs

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend

# Solo MongoDB
docker-compose logs -f mongodb
```

### Entrar a los contenedores

```bash
# Backend (para correr seed u otros comandos)
docker-compose exec backend sh

# MongoDB (para consultas directas)
docker-compose exec mongodb mongosh -u admin -p
```

---

## 📱 Configuración de WhatsApp

WhatsApp está **deshabilitado por defecto** (`WHATSAPP_ENABLED=false` en `.env`).

### Para habilitar WhatsApp:

1. En el archivo `.env`, cambia:
   ```env
   WHATSAPP_ENABLED=true
   ```

2. Reinicia el backend:
   ```bash
   docker-compose restart backend
   ```

3. Abre el frontend en http://localhost

4. Ve a **Configuración** → **WhatsApp**

5. Escanea el código QR con tu WhatsApp Business

6. Una vez conectado, el bot responderá automáticamente a mensajes

### Para deshabilitar WhatsApp:

```env
WHATSAPP_ENABLED=false
```

```bash
docker-compose restart backend
```

---

## 🐛 Troubleshooting

### El frontend no carga

```bash
docker-compose logs frontend
# Verifica que VITE_API_URL apunte a http://localhost:3000/api
```

Si el problema persiste:
```bash
docker-compose down
docker-compose up -d --build frontend
```

### El backend no conecta a MongoDB

```bash
docker-compose logs mongodb
# Verifica que MongoDB esté healthy
docker-compose ps
```

Verifica que las credenciales en `.env` coincidan:
- `MONGO_ROOT_USER`
- `MONGO_ROOT_PASSWORD`

### WhatsApp no funciona

```bash
docker-compose logs backend | grep WhatsApp
# Debe decir "WhatsApp is ENABLED" y "Launching Puppeteer/Chrome"
```

Si ves errores de Chrome:
1. Verifica que `WHATSAPP_ENABLED=true`
2. Reinicia el backend: `docker-compose restart backend`
3. Revisa los logs: `docker-compose logs -f backend`

### Error "Cannot find module" o errores de TypeScript

```bash
# Rebuild completo
docker-compose down
docker-compose up -d --build
```

### Limpiar todo y empezar de cero

```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

**⚠️ ADVERTENCIA:** Esto borrará TODOS los datos (facturas, clientes, pedidos, etc.)

---

## 📦 Estructura del Proyecto

```
PM-project/
├── restaurant-backend/          # Backend API
│   ├── src/
│   │   ├── application/         # Casos de uso
│   │   ├── domain/              # Entidades y lógica de negocio
│   │   └── infrastructure/      # Implementaciones (DB, SRI, Email, WhatsApp)
│   ├── Dockerfile               # Imagen con Chromium para WhatsApp
│   └── package.json
│
├── restaurant-pm/               # Frontend
│   ├── src/
│   │   ├── modules/             # Módulos por feature
│   │   ├── shared/              # Componentes compartidos
│   │   └── api.ts               # Cliente HTTP
│   ├── Dockerfile               # Build + Nginx
│   └── package.json
│
├── docker-compose.yml           # Orquestación de servicios
├── .env                         # Variables de entorno (NO commitear)
├── .env.example                 # Template de variables
└── SETUP.md                     # Esta guía
```

---

## 🌐 Despliegue en Producción

El proyecto está preparado para deployar en:
- **Backend**: Render (Docker) o cualquier servicio que soporte Docker
- **Frontend**: Vercel, Netlify, o cualquier hosting estático

### Backend en Render

1. Crea un nuevo **Web Service** en Render
2. Conecta tu repositorio de GitHub
3. Selecciona **Docker** como runtime
4. **Root Directory**: `restaurant-backend`
5. Configura TODAS las variables de entorno listadas arriba
6. Deploy automático en cada push

### Frontend en Vercel

1. Importa el proyecto desde GitHub
2. **Root Directory**: `restaurant-pm`
3. **Framework**: Vite
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. **Environment Variables**:
   - `VITE_API_URL`: URL de tu backend en Render

---

## 🔒 Seguridad en Producción

✅ **Checklist de seguridad:**

- [ ] Cambia `JWT_SECRET` y `MASTER_ENCRYPTION_KEY` a valores únicos y seguros
- [ ] Usa contraseñas fuertes para `MONGO_ROOT_PASSWORD`
- [ ] Cambia las credenciales del usuario admin por defecto
- [ ] Configura `ALLOWED_ORIGINS` solo con tu dominio de producción
- [ ] Usa `SRI_ENV=2` (producción) solo cuando estés listo para facturar
- [ ] Verifica tu dominio en Resend antes de enviar emails en producción
- [ ] Habilita HTTPS en tu frontend y backend
- [ ] Haz backups regulares de MongoDB
- [ ] NO compartas tu archivo `.env` (está en `.gitignore` por seguridad)

---

## 📞 Soporte

Si tienes problemas:
1. Revisa esta guía completa
2. Revisa los logs: `docker-compose logs -f`
3. Verifica que TODAS las variables obligatorias estén configuradas
4. Intenta limpiar y rebuilder: `docker-compose down && docker-compose up -d --build`

---

**¡Listo!** Ahora puedes clonar el proyecto en cualquier computadora y levantarlo con Docker en minutos.
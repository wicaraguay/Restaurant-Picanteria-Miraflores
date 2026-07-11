# 🍲 Restaurant PM — Sistema de Gestión para Restaurantes

Sistema completo de gestión para restaurantes con **facturación electrónica SRI (Ecuador)**, punto de venta táctil, chatbot de pedidos por **WhatsApp** y **PWA instalable** en celulares y tablets del personal.

> Desarrollado para la operación real de un restaurante: rápido para el empleado, en vivo entre dispositivos y funcional desde el teléfono.

---

## 📦 Módulos del sistema

| Módulo | Descripción |
|---|---|
| 📊 **Dashboard** | Resumen del día: pedidos activos, reservas, últimos movimientos |
| 🛒 **POS / Pedidos** | Punto de venta táctil con catálogo por categorías, vista lista rápida, notas a cocina y ajuste de precios |
| 👨‍🍳 **Central de Cocina** | Cola de preparación en tiempo real con estimación de tiempos |
| 🍽️ **Gestión de Menú** | Platos con foto (Cloudinary), precios con IVA por producto y detección de duplicados |
| 🗂️ **Categorías** | Orden de visualización, visibilidad por canal (web / WhatsApp) y tipo menú/retail |
| 👥 **Clientes y Reservas** | Registro con validación de cédula/RUC ecuatoriano, búsqueda por identificación y puntos de fidelidad |
| 🧾 **Facturación SRI** | Facturas y notas de crédito electrónicas: XML firmado (XAdES-BES), autorización SRI, envío por email con PDF |
| 💬 **WhatsApp** | Chatbot de pedidos (Baileys), menú del día automático, alertas de clientes sincronizadas entre dispositivos y notificaciones push |
| 🌐 **Sitio Web público** | Página del restaurante con menú en vivo + CMS integrado (carrusel, horarios, tema de colores) |
| 🧑‍💼 **Recursos Humanos** | Empleados, roles con permisos, turnos semanales y acceso al sistema |
| ⚙️ **Configuración** | Datos del negocio, certificado de firma electrónica, personalización de marca |

---

## 🛠️ Tecnologías

**Frontend** (`restaurant-pm/`)
- React 18 + TypeScript + Vite
- Tailwind CSS (compilado en build)
- PWA instalable (vite-plugin-pwa + Workbox) con notificaciones Web Push
- Socket.IO client (alertas y QR de WhatsApp en tiempo real)

**Backend** (`restaurant-backend/`)
- Node.js 20 + Express + TypeScript
- **Arquitectura Hexagonal** (dominio / aplicación / infraestructura)
- MongoDB 7 + Mongoose
- Socket.IO (sincronización en vivo entre dispositivos)
- Baileys (WhatsApp), web-push (VAPID), firma digital XAdES-BES para el SRI
- Circuit Breaker, rate limiting y cola asíncrona de facturación

**Infraestructura**
- Docker + Docker Compose (backend + MongoDB)
- Frontend desplegable en Vercel o servido con Docker/nginx
- Imágenes en Cloudinary · Emails con Resend/SMTP

---

## 🚀 Instalación

### Requisitos
- Node.js ≥ 20 · npm
- MongoDB 7 (local o el contenedor incluido)
- Docker + Docker Compose (para producción)

### Desarrollo local

```bash
git clone https://github.com/wicaraguay/Restaurant-Picanteria-Miraflores.git
cd Restaurant-Picanteria-Miraflores

# 1. Backend (puerto 3000)
cd restaurant-backend
npm install

# Crea restaurant-backend/.env con lo mínimo para desarrollo:
#   MONGODB_URI=mongodb://localhost:27017/restaurant-pm
#   JWT_SECRET=un-secreto-de-al-menos-32-caracteres
#   MASTER_ENCRYPTION_KEY=otra-clave-aleatoria-larga
#   ALLOWED_ORIGINS=http://localhost:3001
#   WHATSAPP_ENABLED=false
npm run dev

# 2. Frontend (puerto 3001)
cd ../restaurant-pm
echo "VITE_API_URL=http://localhost:3000/api" > .env
npm install
npm run dev
```

Abre `http://localhost:3001/admin` para el panel y `http://localhost:3001/` para el sitio público.

### Producción con Docker

```bash
# En la raíz del repo, crea un .env con las variables (ver tabla abajo)
docker compose up -d --build
```

Levanta MongoDB, backend (`:3000`) y frontend (`:80`) con healthchecks y volúmenes persistentes (sesión de WhatsApp y respaldos incluidos).

### Variables de entorno principales

| Variable | Descripción |
|---|---|
| `MONGODB_URI` / `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` | Conexión a MongoDB |
| `JWT_SECRET` (mín. 32 chars) | Firma de sesiones |
| `MASTER_ENCRYPTION_KEY` | Cifrado del certificado de firma SRI |
| `SRI_ENV`, `RUC`, `BUSINESS_NAME`, `ESTAB`, `PTO_EMI`… | Facturación electrónica Ecuador |
| `WHATSAPP_ENABLED` | Activa el chatbot y las alertas de WhatsApp |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Notificaciones push (`npx web-push generate-vapid-keys`) |
| `RESEND_API_KEY` / `SMTP_FROM` | Envío de facturas por email |
| `VITE_API_URL` | URL del API que consume el frontend |

> 📄 El detalle completo de la facturación electrónica y la arquitectura del backend está en [`restaurant-backend/README.md`](restaurant-backend/README.md).

---

## 📱 PWA

El panel se instala como app en Android/iOS desde el botón **“📲 Instalar App”** (o menú del navegador → *Instalar aplicación*): pantalla completa, atajos directos al POS y a Cocina, y notificaciones de clientes de WhatsApp aunque la app esté cerrada.

## 📄 Licencia

Proyecto privado — Picantería Miraflores. Todos los derechos reservados.

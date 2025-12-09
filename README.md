# 🍽️ Sistema de Gestión para Restaurantes - PM Project

## 📋 Descripción General

Sistema completo de gestión para restaurantes desarrollado con tecnologías modernas. Incluye panel administrativo completo, página web pública del menú, y arquitectura escalable basada en principios de Clean Architecture.

### ✨ Características Principales

- **Gestión de Menú**: Administra platos, categorías, precios y disponibilidad en tiempo real
- **Gestión de Pedidos**: Control completo del flujo de pedidos desde la cocina hasta la entrega
- **Gestión de Clientes**: Base de datos de clientes con historial de pedidos y reservaciones
- **Facturación/SRI**: Integración con sistema de facturación electrónica de Ecuador
- **Gestión de Personal (RRHH)**: Control de empleados, roles, turnos y permisos
- **Cocina**: Vista especializada para el personal de cocina
- **Configuración White-Label**: Personalización completa de marca, colores y logo
- **Página Web Pública**: Menú público con diseño premium y actualización en tiempo real

---

## 🏗️ Estructura del Proyecto

```
PM-project/
├── restaurant-pm/          # Frontend - Aplicación React
│   ├── components/         # Componentes React reutilizables
│   ├── contexts/          # Context API para estado global
│   ├── hooks/             # Custom hooks de React
│   ├── pages/             # Páginas de la aplicación
│   ├── services/          # Servicios de lógica de negocio
│   ├── utils/             # Utilidades y helpers
│   └── types.ts           # Definiciones de tipos TypeScript
│
└── restaurant-backend/     # Backend - API Node.js
    └── src/
        ├── domain/        # Entidades y lógica de dominio
        ├── application/   # Casos de uso
        ├── infrastructure/# Implementaciones concretas
        │   ├── database/  # Schemas y repositorios MongoDB
        │   └── web/       # Rutas y controladores Express
        └── server.ts      # Punto de entrada del servidor
```

---

## 🚀 Instalación y Configuración

### Prerequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** v18 o superior ([Descargar](https://nodejs.org/))
- **MongoDB** (local o cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **npm** o **yarn** (viene incluido con Node.js)
- **Git** (opcional, para control de versiones)

### 1️⃣ Configuración del Backend

```bash
# Navegar a la carpeta del backend
cd restaurant-backend

# Instalar dependencias
npm install

# Crear archivo de variables de entorno
# En Windows PowerShell:
Copy-Item .env.example .env
# En Linux/Mac:
cp .env.example .env

# Editar el archivo .env con tus configuraciones
# (Ver sección "Variables de Entorno" más abajo)

# Iniciar el servidor en modo desarrollo
npm run dev
```

El backend estará corriendo en `http://localhost:3001`

### 2️⃣ Configuración del Frontend

```bash
# Navegar a la carpeta del frontend (desde la raíz del proyecto)
cd restaurant-pm

# Instalar dependencias
npm install

# Crear archivo de variables de entorno
# En Windows PowerShell:
Copy-Item .env.example .env
# En Linux/Mac:
cp .env.example .env

# Editar el archivo .env con tus configuraciones
# (Ver sección "Variables de Entorno" más abajo)

# Iniciar el servidor de desarrollo
npm run dev
```

El frontend estará corriendo en `http://localhost:5173`

---

## ⚙️ Variables de Entorno

### Backend (restaurant-backend/.env)

```env
# Puerto del servidor
PORT=3001

# URI de conexión a MongoDB
# Para MongoDB local:
MONGODB_URI=mongodb://localhost:27017/restaurant-db

# Para MongoDB Atlas (recomendado para producción):
# MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/restaurant-db

# Entorno de ejecución
NODE_ENV=development

# Secreto para JWT (cambiar en producción por una clave segura)
JWT_SECRET=tu-clave-secreta-super-segura-aqui

# Configuración CORS (opcional)
# CORS_ORIGIN=http://localhost:5173
```

### Frontend (restaurant-pm/.env)

```env
# URL del backend API
VITE_API_URL=http://localhost:3001

# Otras configuraciones opcionales
# VITE_APP_NAME=Mi Restaurante
```

---

## 👤 Credenciales de Acceso

### Panel Administrativo

Para acceder al panel de administración en `http://localhost:3001/admin`:

- **Usuario:** `admin`
- **Contraseña:** `admin123`

> ⚠️ **IMPORTANTE**: Cambia estas credenciales en producción por seguridad.

---

## 🎯 Uso del Sistema

### Acceso a las Diferentes Secciones

1. **Página Web Pública**: `http://localhost:3001/`
   - Muestra el menú público del restaurante
   - Se actualiza automáticamente cada 5 segundos
   - Solo muestra platos disponibles

2. **Panel de Administración**: `http://localhost:3001/admin`
   - Requiere login con credenciales de administrador
   - Acceso a todas las funcionalidades de gestión

### Funcionalidades Principales

#### 📋 Gestión de Menú
- Agregar, editar y eliminar platos
- Configurar precios y categorías
- Activar/desactivar disponibilidad en tiempo real
- Subir imágenes de platos

#### 🛒 Gestión de Pedidos
- Ver pedidos activos
- Cambiar estados de pedidos
- Asignar pedidos a mesas
- Historial completo de pedidos

#### 👥 Gestión de Clientes
- Registro de clientes
- Historial de pedidos por cliente
- Gestión de reservaciones
- Datos de contacto

#### 💰 Facturación/SRI
- Generar facturas electrónicas
- Integración con SRI Ecuador
- Configuración de establecimiento y punto de emisión
- Historial de facturas

#### 👨‍💼 Gestión de Personal
- Registro de empleados
- Asignación de roles y permisos
- Control de turnos
- Gestión de horarios

#### 🔧 Configuración
- Personalización de marca (logo, colores)
- Información del negocio
- Configuración fiscal (RUC, razón social)
- Configuración regional (moneda, zona horaria)

---

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** - Librería de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **TailwindCSS** - Framework de CSS
- **Context API** - Gestión de estado global
- **React Router** - Navegación

### Backend
- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **TypeScript** - Tipado estático
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticación

### Arquitectura
- **Hexagonal Architecture** (Clean Architecture)
- **Domain-Driven Design** (DDD)
- **Repository Pattern**
- **Dependency Injection**

---

## 📦 Scripts Disponibles

### Backend

```bash
# Desarrollo con hot-reload
npm run dev

# Compilar TypeScript
npm run build

# Ejecutar versión compilada
npm start

# Linting
npm run lint
```

### Frontend

```bash
# Desarrollo con hot-reload
npm run dev

# Compilar para producción
npm run build

# Preview de build de producción
npm run preview

# Tests
npm run test

# Linting
npm run lint
```

---

## 🐛 Solución de Problemas

### El backend no se conecta a MongoDB

**Problema**: Error de conexión a la base de datos

**Solución**:
1. Verifica que MongoDB esté corriendo (si es local)
2. Revisa que la URI en `.env` sea correcta
3. Si usas MongoDB Atlas, verifica:
   - Que tu IP esté en la whitelist
   - Que las credenciales sean correctas
   - Que el cluster esté activo

### El frontend no se conecta al backend

**Problema**: Errores de CORS o conexión

**Solución**:
1. Verifica que el backend esté corriendo en el puerto correcto
2. Revisa la variable `VITE_API_URL` en el `.env` del frontend
3. Asegúrate de que ambos servidores estén corriendo

### Página en blanco después de login

**Problema**: La aplicación no carga después de iniciar sesión

**Solución**:
1. Abre la consola del navegador (F12)
2. Verifica si hay errores de JavaScript
3. Limpia el localStorage del navegador
4. Recarga la página con Ctrl+Shift+R

---

## 🚀 Despliegue a Producción

### Backend

1. **Configurar variables de entorno de producción**
   ```env
   NODE_ENV=production
   MONGODB_URI=tu-mongodb-atlas-uri
   JWT_SECRET=clave-super-segura-aleatoria
   PORT=3001
   ```

2. **Compilar el proyecto**
   ```bash
   npm run build
   ```

3. **Desplegar en servicios como:**
   - Heroku
   - Railway
   - DigitalOcean
   - AWS EC2

### Frontend

1. **Configurar variable de entorno de producción**
   ```env
   VITE_API_URL=https://tu-backend-url.com
   ```

2. **Compilar el proyecto**
   ```bash
   npm run build
   ```

3. **Desplegar la carpeta `dist/` en:**
   - Vercel
   - Netlify
   - GitHub Pages
   - AWS S3 + CloudFront

---

## 📝 Notas Importantes

- ⚠️ **Seguridad**: Nunca subas archivos `.env` a repositorios públicos
- 🔒 **Credenciales**: Cambia las credenciales por defecto en producción
- 💾 **Backups**: Realiza backups regulares de tu base de datos MongoDB
- 🔄 **Actualizaciones**: Mantén las dependencias actualizadas regularmente
- 📊 **Monitoreo**: Implementa logging y monitoreo en producción

---

## 📄 Licencia

Este proyecto es privado y todos los derechos están reservados.

**© 2024 - Sistema de Gestión para Restaurantes**

---

## 👨‍💻 Soporte

Para soporte técnico o consultas sobre el sistema, contacta al equipo de desarrollo.

---

## 🎉 ¡Listo para Usar!

El sistema está completamente funcional y listo para ser usado. Explora todas las funcionalidades y personaliza según las necesidades de tu restaurante.

**¡Buen provecho! 🍽️**

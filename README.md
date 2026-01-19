# 🍽️ Restaurant Picantería Miraflores System

Sistema integral de gestión para restaurantes desarrollado con el stack MERN (MongoDB, Express, React, Node.js). Este proyecto permite la administración completa del negocio y ofrece una carta digital pública para los clientes con integración de pedidos por WhatsApp.

## 🚀 Características Principales

### 📱 Para el Cliente (Carta Digital)
- **Menú Público Interactivo**: Interfaz moderna y animada para visualizar los platos.
- **Pedidos por WhatsApp**: Botón "Ordenar" que redirige automáticamente al chat de WhatsApp del restaurante con el pedido pre-llenado.
- **Indicador de Estado**: Badge inteligente que muestra si el local está ABIERTO o CERRADO según el horario configurado (Viernes a Domingo, 9am - 9pm).
- **Diseño Responsive**: Optimizado para celulares y escritorio.

### 🏢 Para la Administración (Panel Privado)
- **Gestión de Menú**: CRUD completo (Crear, Leer, Actualizar, Eliminar) de platos.
- **Integración con Cloudinary**: Subida de imágenes de platos optimizada en la nube.
- **Configuración "White Label"**:
  - Personalización de Logo, Colores de Marca y Slogan.
  - Configuración de Información del Negocio ( Dirección, Teléfono/WhatsApp).
  - Configuración Fiscal (RUC, Razón Social) y Regional (Moneda, Zona Horaria).
- **Gestión de Facturación**: Configuración de puntos de emisión y secuencias.

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React + Vite, Tailwind CSS (Estilos), Framer Motion (Animaciones, pendiente), React Router.
- **Backend**: Node.js, Express.
- **Base de Datos**: MongoDB (Local o Atlas).
- **Almacenamiento de Imágenes**: Cloudinary.
- **Fuentes**: Google Fonts (Architects Daughter, Inter).

## ⚙️ Instalación y Configuración

### Prerrequisitos
- Node.js (v18 o superior)
- MongoDB (corriendo localmente o string de conexión a Atlas)
- Cuenta de Cloudinary (para imágenes)

### 1. Configuración del Backend

```bash
cd restaurant-backend
npm install
```

Crea un archivo `.env` en `restaurant-backend/` con:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/restaurant-db
# O tu string de conexión a MongoDB Atlas
```

Para iniciar el servidor:
```bash
npm run start:dev
```

### 2. Configuración del Frontend

```bash
cd restaurant-pm
npm install
```

Configura las credenciales de Cloudinary en `components/MenuManagement.tsx` (o variables de entorno si se configuran a futuro).

Para iniciar la aplicación web:
```bash
npm run dev
```

## 📝 Uso del Sistema

1.  **Acceso Admin**: Ingresa a `/login` (ruta protegida) para gestionar el restaurante.
2.  **Configuración**: Ve a "Ajustes" para definir el nombre del restaurante, el número de WhatsApp para pedidos y subir tu logo.
3.  **Menú**: Agrega platos con sus precios y fotos.
4.  **Vista Pública**: Comparte la URL principal con tus clientes. Ellos verán el menú y podrán pedirte por WhatsApp.

## 📦 Despliegue

Este proyecto está preparado para desplegarse en servicios como **Render**:
- **Backend**: Desplegar como Web Service (Node).
- **Frontend**: Desplegar como Static Site (Build command: `npm run build`, Publish directory: `dist`).

---
Desarrollado para Picantería Miraflores.

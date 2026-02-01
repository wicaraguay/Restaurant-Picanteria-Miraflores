# 🍽️ Restaurant PM - Enterprise Management & Electronic Billing System

> **Portfolio Highlight**: This project demonstrates the capability to architect complex, regulatory-compliant systems (SRI Ecuador) using **Hexagonal Architecture**, while leveraging **Generative AI** agents for accelerated development, refactoring, and error analysis.

---

## 🚀 About the Project

**Restaurant PM** is a comprehensive ERP solution designed for high-volume restaurants ("Picanterías") in Ecuador. Beyond standard order management, it features a robust **Electronic Billing Engine** that interfaces directly with the **SRI (Servicio de Rentas Internas)** government web services for real-time invoice authorization (Facturación Electrónica).

Key challenges solved:
- **Real-time SRI Compliance**: Handling SOAP web services, XAdES-BES XML signing, and complex tax rules.
- **Fail-safe Architecture**: Offline-first design for billing, ensuring operations continue even when government servers are down.
- **Scalable Design**: Implements **Hexagonal Architecture (Ports & Adapters)** to decouple business logic from infrastructure (Express/Mongo/SRI).

---

## 🤖 Generative AI Integration (For Recruiters)

This project serves as a case study in **AI-Native Engineering**. It was developed using an **Agentic Workflow**, where human intent directed autonomous AI agents to:

1.  **Refactor Legacy Code**: Migrated monolithic controllers to a clean Hexagonal Architecture (Domain/Application/Infrastructure layers).
2.  **Debug Complex Systems**: AI Agents analyzed raw SOAP errors from the SRI to identify and auto-correct sequence desynchronization issues (e.g., auto-healing invoice numbers).
3.  **Optimize Developer Experience**: Automated generation of documentation, types, and repetitive boilerplate.

**My Role:** Lead Architect & AI Orchestrator — Defining the system boundaries, reviewing AI-generated implementation plans, and ensuring business logic correctness.

---

## 🏗️ Technical Architecture

The backend follows **Hexagonal Architecture** to ensure testability and flexibility:

### Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts (Data Visualization).
- **Backend API**: Node.js, Express, TypeScript.
- **Database**: MongoDB (Mongoose) with atomic sequence handling.
- **Invoicing**: `ec-sri-invoice-signer` for XAdES-BES digital signatures, Axis/SOAP for government communication.

---

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/wicaraguay/Restaurant-Picanteria-Miraflores.git
    cd Restaurant-Picanteria-Miraflores
    ```

2.  **Install Dependencies**
    ```bash
    # Backend
    cd restaurant-backend
    npm install
    
    # Frontend
    cd ../restaurant-pm
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in `restaurant-backend` with your SRI credentials:
    ```env
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/restaurant-pm
    SRI_ENV=1 # 1=Test, 2=Production
    SRI_SIGNATURE_PATH=./secrets/signature.p12
    SRI_SIGNATURE_PASSWORD=your_password
    ```

4.  **Run Development Servers**
    ```bash
    # Terminal 1 (Backend)
    npm run dev
    
    # Terminal 2 (Frontend)
    npm run dev
    ```

---

<br><br>


# 🍽️ Restaurant PM - Sistema de Gestión y Facturación Electrónica

> **Destacado para Portafolio**: Este proyecto demuestra la capacidad de diseñar sistemas complejos y compatibles con normativas gubernamentales (SRI Ecuador) utilizando **Arquitectura Hexagonal**, aprovechando **Inteligencia Artificial Generativa** para acelerar el desarrollo.

---

## 🚀 Sobre el Proyecto

**Restaurant PM** es una solución ERP integral diseñada para restaurantes de alto volumen. Más allá de la gestión de pedidos estándar, cuenta con un robusto **Motor de Facturación Electrónica** que interactúa directamente con los servicios web del **SRI** para la autorización de facturas en tiempo real.

Desafíos clave resueltos:
- **Cumplimiento SRI en tiempo real**: Manejo de servicios SOAP, firma electrónica XAdES-BES y reglas fiscales complejas.
- **Arquitectura a prueba de fallos**: Diseño resiliente que permite reintentos automáticos ("Auto-healing") cuando los servidores del gobierno fallan.
- **Diseño Escalable**: Implementa **Arquitectura Hexagonal** para desacoplar la lógica de negocio de la infraestructura.

---

## 🤖 Integración de IA Generativa (Para Reclutadores)

Este proyecto es un caso de estudio en **Ingeniería Asistida por IA**. Fue desarrollado utilizando un flujo de trabajo **Agéntico**, donde la intención humana dirigió agentes de IA autónomos para:

1.  **Refactorización**: Migración de controladores monolíticos a una Arquitectura Hexagonal limpia.
2.  **Depuración Avanzada**: Agentes de IA analizaron errores SOAP crudos para identificar y corregir automáticamente problemas de desincronización de secuencias.
3.  **Eficiencia**: Generación automatizada de pruebas y documentación técnica.

**Mi Rol**: Arquitecto Principal y Orquestador de IA — Definiendo los límites del sistema y asegurando la corrección de la lógica de negocio generada.

---

## 🏗️ Arquitectura Técnica

El backend sigue una **Arquitectura Hexagonal (Puertos y Adaptadores)**:

- **Dominio**: Contiene las reglas de negocio puras (Facturas, Pedidos, Clientes). No depende de ninguna librería externa.
- **Casos de Uso**: Orquestan la lógica de la aplicación (ej: `GenerarFactura`, `SincronizarSecuencia`).
- **Infraestructura**: Implementaciones concretas (MongoDB, Express, Servicio SOAP del SRI).

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 18, Vite, Tailwind CSS.
- **Backend**: Node.js, Express, TypeScript.
- **Base de Datos**: MongoDB.
- **Facturación**: Integración SOAP XML, Firma Digital XAdES-BES.

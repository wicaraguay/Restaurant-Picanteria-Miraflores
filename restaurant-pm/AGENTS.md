# Configuración y Reglas para el Proyecto (AGENTS.md)

Este documento sirve como "fuente de la verdad" para el desarrollo, mantenimiento y futura refactorización del proyecto **Restaurant PM**. Cualquier asistente, desarrollador o agente debe seguir estas reglas estrictamente.

---

## 🏗️ 1. Arquitectura Objetivo: Modular (Feature-Sliced Design)

La migración de la actual estructura (basada en tipos técnicos) hacia una estructura modular debe priorizarse.

### 1.1 Nueva Estructura de Directorios

```text
src/
├── assets/                 # Recursos estáticos globales (imágenes, fuentes)
├── config/                 # Configuración de toda la app (env, API base)
├── lib/                    # Configuración de librerías (QR, Cloudinary)
├── store/ (o contexts/)    # Estado Global de la App (Auth, AppState)
├── hooks/                  # Custom hooks globales (NO de negocio)
├── utils/                  # Funciones utilitarias globales (Validadores, Parseo)
├── components/             # COMPONENTES GLOBALES (UI Compartida: Botón, Modal)
├── modules/ (o features/)  # 🔥 EL CORAZÓN DE LA APP (AQUÍ VAN LAS FUNCIONALIDADES)
└── routes/                 # Enrutamiento Centralizado
```

### 1.2 Reglas de los Módulos (`src/modules/`)

Cada módulo representará un Dominio de Negocio específico (`auth`, `menu`, `orders`, `kitchen`, `billing`, `hr`, `settings`).

1. **Aislamiento:** Un módulo debe contener **TODO** lo que necesita para funcionar (componentes de vista, servicios API, hooks específicos, utilidades específicas y tipos TypeScript específicos).
2. **Componentes Gigantes Prohibidos:** Dividir componentes inmensos (como `OrderManagement.tsx` o `SettingsManagement.tsx`) en sub-componentes lógicos dentro de `src/modules/{modulo}/components/`.
3. **No Cruce Clandestino de Dominios:**
    * *Mal:* Importar directamente `src/modules/orders/components/OrderListItem.tsx` desde `billing`.
    * *Bien:* Si un módulo necesita algo de otro, ese algo debe exportarse a través de un `index.ts` o, si es genérico, debe moverse a `src/components/` o `src/utils/`.
4. **Utilidades Especializadas:** Archivos como `sri.ts` y `invoiceGenerator.ts` **no** deben estar en `src/utils/`. Su lugar correcto es `src/modules/billing/utils/`.

---

## ⚙️ 2. Configuraciones Básicas y Estándares

Para asegurar consistencia durante la refactorización y el nuevo código:

### 2.1 Enrutamiento (React Router DOM)

*   **Evitar estados para navegación principal:** No utilizar `switch(currentView)` en un componente principal.
*   **Aprovechar React Router:** Mover las vistas del panel de control a rutas anidadas en `AppRoutes.tsx` o `AdminRoutes.tsx` (Ej: `<Route path="orders" element={<OrderManagementPage />} />`).
*   **Lazy Loading:** Continuar usando `React.lazy()` y `<Suspense>` para cargar las páginas de cada módulo bajo demanda y optimizar el bundle.

### 2.2 Componentización y Responsabilidades (Separation of Concerns)

*   **Componentes Contenedores vs. Presentacionales:**
    *   *Contenedores (Pages/Views):* Son los únicos que deben conectarse a contextos globales (Context API), manejar llamadas complejas a la red (Services) y manipular `useEffect` pesados.
    *   *Presentacionales:** Deben ser "tontos" (dumb). Solo reciben `props` y emiten eventos `onAction`. (Ej: `OrderCard` solo reciba `order={data}` y `onPrintTicket()`).
*   **Limitar estado local (`useState`):** Evitar poner docenas de variables de estado en un solo componente grande. Usar `useReducer` para lógica compleja o delegar a Custom Hooks especializados (`useOrders()`).

### 2.3 Tipado (TypeScript)

*   **Evitar `any`:** Prohibido usar `any`. Utilizar `unknown` o definir interfaces/tipos en `src/modules/{modulo}/types/`.
*   **Tipos Centralizados por Módulo:** Mover interfaces inmensas en un solo `types.ts` a tipos específicos dentro de su dominio (ej. `MenuItem` -> `src/modules/menu/types/menu.types.ts`).

### 2.4 Control de Estilos y Temas

*   Mantener el control actual del Tema Oscuro (`useTheme`).
*   Aprovechar las clases atómicas de Tailwind CSS.
*   No usar estilos inline (`style={{...}}`) a menos que sea para valores calculados dinámicamente que Tailwind no soporte.

### 2.5 Documentación de Archivos

*   **Comentario Inicial Obligatorio:** Todo archivo nuevo o refactorizado **debe** comenzar con un comentario claro y explicativo (cabecera) que describa para qué sirve el archivo y cuál es su responsabilidad o propósito dentro del módulo.
*   **Idioma:** Todos los comentarios en el código (incluyendo el comentario inicial) deben estar **estrictamente en español**.

---

## 🚀 3. Flujo de Refactorización Recomendado

Cuando se disponga a refactorizar hacia la arquitectura modular (Feature-Sliced), hágalo incrementalmente:

1. **Paso 1: Setup Limpio:** Crear carpetas base (`src/modules/*`).
2. **Paso 2: Módulos Hoja (Lead Modules):** Comenzar por los módulos que menos dependen de otros (Ej: `auth` o `billing` interno). Mover sus utilidades y servicios primero.
3. **Paso 3: Componentes Genéricos:** Limpiar `src/components`, separando Modales genéricos y Botones a `src/components/ui`.
4. **Paso 4: El Núcleo:** Romper los monstruos grandes (`OrderManagement`, `MenuManagement`) dividiéndolos en sus módulos respectivos.
5. **Paso 5: Enrutamiento:** Finalmente, actualizar `App.tsx` y `AdminApp.tsx` para usar enrutamiento real con `react-router-dom` a sus páginas respectivas.

---

## 🤖 4. Reglas Críticas para Agentes IA (Antigravity e IAs Generativas)

Para garantizar que el proyecto mantenga su integridad arquitectónica **FSD (Feature-Sliced Design)**, todo agente debe seguir estas directrices:

1.  **Lectura Obligatoria:** Antes de realizar cualquier cambio, consulta este `AGENTS.md` para refrescar las reglas de arquitectura.
2.  **Principio de Modularidad Total:**
    *   **NUNCA** añadas lógica de negocio o tipos de dominio en `src/services/`, `src/types.ts` o `src/components/` (globales).
    *   **SIEMPRE** crea o usa un módulo en `src/modules/` para nuevas funcionalidades.
3.  **La Regla de la Public API (`index.ts`):** 
    *   Las importaciones entre módulos deben hacerse **EXCLUSIVAMENTE** a través del archivo `index.ts` del módulo (`import { ... } from '../modules/auth'`).
    *   **PROHIBIDO** realizar importaciones profundas (`import { ... } from '../modules/auth/services/AuthService'`) desde fuera del módulo.
4.  **Servicios Singleton:** Mantener el patrón Singleton para los servicios de los módulos (ej. `AuthService.getInstance()`) y exportar la instancia (`authService`).
5.  **Verificación Técnica:** Después de cualquier cambio estructural o implementación de código, ejecuta **SIEMPRE** `npx tsc --noEmit` para garantizar que no hay errores de tipado o importaciones rotas.
6.  **Actualización de Artefactos:** Si el cambio es significativo, actualiza o crea el `implementation_plan.md` y `walkthrough.md` en la carpeta de la conversación para dejar rastro de la decisión técnica.
7.  **No Duplicidad:** Antes de crear un nuevo servicio o utilidad, utiliza `grep_search` o `list_dir` para verificar si ya existe una lógica similar en otro módulo.

---

## 🏗️ 5. Arquitectura del Backend: Clean Architecture (Hexagonal)

El backend está diseñado siguiendo los principios de **Arquitectura Limpia**, separando las preocupaciones en capas bien definidas.

### 5.1 Estructura de Capas (`src/`)

*   **`domain/` (Capa de Núcleo):** Contiene las entidades de negocio (`entities/`), las interfaces de repositorios (`repositories/`) y errores personalizados. Es agnóstica a la tecnología (sin dependencias de base de datos o frameworks).
*   **`application/` (Capa de Aplicación):** Contiene los "Casos de Uso" (`use-cases/`). Es donde reside la lógica de negocio técnica (ej. `GenerateInvoice`, `CreateOrder`). Solo depende de la capa de dominio.
*   **`infrastructure/` (Capa Externa):** Implementaciones tecnológicas concretas.
    *   `database/`: Schemas de Mongoose y conexión a MongoDB.
    *   `repositories/`: Implementaciones de las interfaces de dominio (ej. `MongoOrderRepository`).
    *   `services/`: Servicios externos (SRI, PDF, Email).
    *   `controllers/`: Controladores que reciben peticiones y ejecutan casos de uso.
    *   `web/`: Configuración del servidor (Express), rutas y middlewares.

### 5.2 Patrones de Diseño e Implementación

1.  **Repository Pattern:** Todas las operaciones de datos se abstraen mediante interfaces en `domain`. Se utiliza un `BaseRepository` en `infrastructure` para centralizar el CRUD común, evitando la redundancia.
2.  **Dependency Injection (DI):** Los casos de uso reciben sus dependencias por constructor (Inyección de Dependencias), facilitando el testing y el desacoplamiento.
3.  **Use Case Pattern:** Cada acción importante del sistema es un archivo separado en `application/use-cases/`, lo que facilita la mantenibilidad y evita archivos "monstruo".

### 5.3 Hallazgos y Reglas para el Backend

1.  **Reutilización Máxima:** Antes de crear un repositorio, verifica si puedes extender `BaseRepository`.
2.  **Control de Complejidad:** 
    *   Casos de uso críticos como `GenerateInvoice.ts` han crecido significativamente (~360 líneas). Si superan las 400 líneas, deben descomponerse en servicios de dominio internos.
3.  **Boilerplate vs. Realidad:** Evitar crear casos de uso que solo hacen un simple `return repository.create(data)` si no hay lógica de validación intermedia.
4.  **Pruebas Unitarias (Pendiente Crítico):** Actualmente existe una cobertura muy baja. Todo nuevo caso de uso o implementación de repositorio **DEBE** incluir su archivo `.test.ts` en la carpeta `test/`.
5.  **Validaciones en Tiempo Real:** Para procesos críticos (como SRI 2026), las validaciones deben ocurrir en el caso de uso antes de llamar a servicios externos.

---

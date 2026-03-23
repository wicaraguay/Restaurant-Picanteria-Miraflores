# Análisis del Backend: Restaurant Picantería Miraflores

Este documento detalla el estado actual del backend localizado en la carpeta `restaurant-backend`, evaluando su arquitectura, patrones de diseño, calidad de código y sugerencias de mejora.

## 1. Arquitectura y Estructura de Carpetas

El backend utiliza una **Arquitectura Limpia (Clean Architecture)** o **Arquitectura Hexagonal**, lo cual es una excelente práctica para sistemas modernos y escalables.

**Estructura actual:**
- `src/domain`: Contiene las entidades, interfaces de repositorios y lógica de errores. Es el núcleo del sistema y no depende de marcos externos.
- `src/application`: Contiene los casos de uso (`use-cases`). Aquí se orquestan los flujos de negocio.
- `src/infrastructure`: Implementaciones concretas (bases de datos, servicios externos como SRI, controladores y rutas).
- `src/main.ts`: Punto de entrada de la aplicación.

**Evaluación:** ✅ Cumple satisfactoriamente con una arquitectura moderada y bien segmentada.

---

## 2. Patrones de Diseño

Se identifican los siguientes patrones:
- **Repository Pattern**: Uso de interfaces en `domain` e implementaciones en `infrastructure`.
- **Use Case Pattern (Command/Action)**: Cada operación de negocio está encapsulada en una clase propia.
- **Dependency Injection (DI)**: Existe un `DIContainer.ts` que gestiona las dependencias de forma centralizada.
- **Data Transfer Objects (implícito)**: Los casos de uso reciben objetos de datos definidos.

**Evaluación:** ✅ Patrones de diseño sólidos y bien aplicados.

---

## 3. Calidad de Código y Redundancia

### 🚨 Redundancia y Código Repetido
Se ha detectado una alta redundancia en la lógica de facturación electrónica (SRI):
- **Cálculo de Impuestos y Detalles**: La lógica para calcular subtotales, IVA y formatear ítems se repite casi idénticamente en `GenerateInvoice.ts`, `GenerateCreditNote.ts` y `CheckInvoiceStatus.ts`.
- **Manejo de Respuestas de SRI**: El ciclo de consulta (*polling*) para autorizaciones y el manejo de errores (como el secuencial registrado) están duplicados en múltiples casos de uso.
- **Construcción del Objeto de Factura**: El mapeo de la entidad de base de datos al formato requerido por el `SRIService` se repite.

### 📏 Extensión de Archivos
Algunos archivos son excesivamente extensos debido a la mezcla de responsabilidades:
- `CheckInvoiceStatus.ts` (>400 líneas): Mezcla lógica de recuperación de datos, reconstrucción de XML, polling de SRI y envío de correos.
- `DIContainer.ts`: Se está volviendo muy grande y difícil de mantener.

**Evaluación:** ⚠️ Requiere refactorización para mejorar la mantenibilidad.

---

## 4. Pruebas Unitarias

La cobertura actual es **insuficiente**:
- Solo existen pruebas para la entidad `Order` (`Order.test.ts`).
- Los casos de uso críticos (Facturación, Inventario, Autenticación) carecen de pruebas automatizadas.

**Evaluación:** ❌ Punto crítico a mejorar.

---

## 5. Recomendaciones de Mejora

### 1. Refactorización de Lógica de Negocio
- **Crear un `BillingService` o `InvoiceMapper`**: Extraer la lógica de cálculo de impuestos y mapeo a objetos SRI a un servicio compartido en `domain` o `application`.
- **Manejo Centralizado de SRI**: Mover el ciclo de *polling* y la lógica de reintento/recuperación dentro del `SRIService` o un orquestador especializado.

### 2. Modularización del DI
- Dividir el `DIContainer.ts` en módulos más pequeños (ej. `BillingModule`, `UserModule`, `CoreModule`).

### 3. Incrementar Cobertura de Pruebas
- Implementar pruebas unitarias para los casos de uso principales.
- Implementar pruebas de integración para los adaptadores de infraestructura (repositorios de MongoDB).

### 4. Separación de Responsabilidades en Casos de Uso
- Los casos de uso no deberían conocer detalles de cómo enviar un mail (`EmailService`) o generar un PDF (`PDFService`) directamente si esto infla demasiado su tamaño; se pueden usar eventos de dominio o servicios de aplicación más cohesivos.

## 6. Centralización de Tests del Frontend
- **TODOS** los tests unitarios y de integración del frontend deben residir en la carpeta raíz `/tests/`.
- La estructura interna de `/tests/` debe despejar la de `src/` (ej. `tests/core/`, `tests/components/`, `tests/modules/{nombre}/`).
- **PROHIBIDO** crear carpetas `__tests__` dentro de `src/` para mantener limpio el código de producción.
# Restaurant Backend - Sistema de Facturación Electrónica SRI Ecuador

Backend CMS para gestión de restaurante con integración completa de facturación electrónica SRI Ecuador. Implementa arquitectura hexagonal con patrones de resiliencia para alta disponibilidad.

## Descripción

Sistema backend robusto para restaurantes que integra:
- Gestión de órdenes, menús, clientes y empleados
- Facturación electrónica 100% compatible con SRI Ecuador
- Generación automática de XML firmado digitalmente (XAdES-BES)
- Emisión de facturas y notas de crédito electrónicas
- Envío automático por correo con PDF y XML adjunto
- Sistema de resiliencia con Circuit Breaker y Rate Limiting
- Cola de procesamiento asíncrono para alta disponibilidad

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Capa de Interfaces                       │
│  (Express Routes, Controllers, Middleware)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Capa de Aplicación                        │
│  (Use Cases, Services, Business Logic)                       │
│  - GenerateInvoice, CreateOrder, ManageMenu                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Capa de Dominio                         │
│  (Entities, Repositories Interfaces, Domain Logic)           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Capa de Infraestructura                     │
│  (MongoDB, SRI Service, Email, PDF, Queue, Monitoring)      │
└─────────────────────────────────────────────────────────────┘
```

**Arquitectura Hexagonal**: Permite cambiar tecnologías (MongoDB → PostgreSQL, Email → SMS) sin afectar la lógica de negocio.

## Requisitos

- **Node.js** >= 18.0
- **MongoDB** >= 5.0
- **Redis** (opcional, para BullMQ en producción)
- **Certificado digital SRI** (.p12 válido)
- **SMTP** configurado para envío de emails

## Instalación

```bash
# Clonar repositorio
cd restaurant-backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar desarrollo
npm run dev

# Build para producción
npm run build
npm start
```

## Configuración

### Variables de Entorno Requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `MONGODB_URI` | URI de conexión MongoDB | `mongodb://localhost:27017/restaurant` |
| `PORT` | Puerto del servidor | `3000` |
| `JWT_SECRET` | Secreto para JWT | `your-secure-secret` |
| `SRI_ENV` | Ambiente SRI (`1`=Pruebas, `2`=Producción) | `1` |
| `SRI_SIGNATURE_PATH` | Ruta al certificado .p12 | `./certs/firma.p12` |
| `SRI_SIGNATURE_PASSWORD` | Contraseña del certificado | `your-cert-password` |
| `RUC` | RUC de la empresa | `1234567890001` |
| `BUSINESS_NAME` | Razón social | `RESTAURANTE LA ESQUINA CIA. LTDA.` |
| `COMMERCIAL_NAME` | Nombre comercial | `Restaurante La Esquina` |
| `ESTAB` | Código establecimiento (3 dígitos) | `001` |
| `PTO_EMI` | Código punto emisión (3 dígitos) | `001` |
| `SMTP_HOST` | Host del servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Usuario SMTP | `facturacion@turestaurante.com` |
| `SMTP_PASS` | Contraseña SMTP | `your-smtp-password` |
| `SMTP_FROM` | Email remitente | `noreply@turestaurante.com` |

### Variables Opcionales

| Variable | Descripción | Default |
|----------|-------------|---------|
| `SRI_MAX_DAILY_RETRIES` | Reintentos diarios permitidos por factura | `3` |
| `NODE_ENV` | Entorno de ejecución | `development` |

## Estructura del Proyecto

```
restaurant-backend/
├── src/
│   ├── application/           # Casos de uso y servicios de aplicación
│   │   ├── use-cases/         # Casos de uso (GenerateInvoice, CreateOrder)
│   │   ├── services/          # Servicios de aplicación (BillingService)
│   │   └── interfaces/        # Interfaces de servicios
│   ├── config/                # Configuraciones y constantes
│   │   └── billing.constants.ts  # Constantes de facturación
│   ├── domain/                # Entidades y lógica de dominio
│   │   ├── entities/          # Entidades del dominio
│   │   ├── repositories/      # Interfaces de repositorios
│   │   ├── billing/           # Modelos de facturación (Invoice, CreditNote)
│   │   └── errors/            # Errores personalizados
│   ├── infrastructure/        # Implementaciones de infraestructura
│   │   ├── database/          # Conexión y modelos MongoDB
│   │   ├── services/          # Servicios externos (SRI, Email, PDF)
│   │   │   └── sri/           # Módulos especializados SRI
│   │   ├── queue/             # Cola de procesamiento asíncrono
│   │   ├── utils/             # Utilidades (Logger, CircuitBreaker)
│   │   ├── web/               # Express (routes, middleware)
│   │   └── monitoring/        # Métricas y Sentry
│   ├── interfaces/            # Adaptadores de entrada
│   └── main.ts                # Punto de entrada
├── test/                      # Tests
├── .env.example               # Ejemplo de configuración
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario

### Facturación SRI
- `POST /api/billing/invoices` - Generar factura electrónica
- `GET /api/billing/invoices/:id` - Consultar estado de factura
- `POST /api/billing/invoices/:id/resend` - Reenviar factura al SRI
- `POST /api/billing/credit-notes` - Generar nota de crédito
- `GET /api/billing/credit-notes/:id` - Consultar nota de crédito

### Órdenes
- `POST /api/orders` - Crear orden
- `GET /api/orders` - Listar órdenes
- `GET /api/orders/:id` - Detalle de orden
- `PATCH /api/orders/:id` - Actualizar orden
- `DELETE /api/orders/:id` - Eliminar orden

### Menú
- `POST /api/menu` - Crear producto
- `GET /api/menu` - Listar productos
- `PATCH /api/menu/:id` - Actualizar producto
- `DELETE /api/menu/:id` - Eliminar producto

### Clientes
- `POST /api/customers` - Crear cliente
- `GET /api/customers` - Listar clientes
- `PATCH /api/customers/:id` - Actualizar cliente
- `DELETE /api/customers/:id` - Eliminar cliente

### Empleados
- `POST /api/employees` - Crear empleado
- `GET /api/employees` - Listar empleados
- `PATCH /api/employees/:id` - Actualizar empleado
- `DELETE /api/employees/:id` - Eliminar empleado

### Monitoreo
- `GET /api/health` - Health check
- `GET /api/metrics` - Métricas Prometheus
- `GET /api/circuit-breaker` - Estado del Circuit Breaker

## Facturación SRI

### Flujo de Facturación

1. **Validación**: Valida cliente, monto y cumplimiento SRI 2026
2. **Generación XML**: Crea XML firmado con certificado digital (XAdES-BES)
3. **Envío SRI**: Transmite a Web Service de Recepción SRI
4. **Autorización**: Consulta estado hasta obtener autorización
5. **Almacenamiento**: Guarda factura autorizada en base de datos
6. **Notificación**: Envía email con PDF y XML adjunto

### Resiliencia SRI

El sistema implementa múltiples capas de protección:

#### Circuit Breaker
Protege contra caídas en cascada cuando el SRI está caído:
- **Threshold**: 5 fallos consecutivos → Circuito ABIERTO
- **Timeout**: 60 segundos antes de reintentar
- **Recovery**: 2 éxitos consecutivos → Circuito CERRADO

#### Rate Limiting
Previene abuso y sobrecarga:
- **Generación facturas**: 10/minuto por IP
- **Consultas estado**: 30/minuto por IP
- **Reintentos**: 5 cada 5 minutos por factura
- **Circuit reset**: 3/hora (operación administrativa)

#### Cola de Procesamiento Asíncrono
Procesa facturas en background sin bloquear la API:
- **Concurrencia**: 3 facturas simultáneas
- **Reintentos**: 3 intentos con delay exponencial (5s → 10s → 20s)
- **Timeout**: 2 minutos por factura
- **Persistencia**: Estado guardado en MongoDB

#### Auto-healing de Secuenciales
Si el SRI rechaza por secuencial duplicado:
1. Detecta el error automáticamente
2. Solicita nuevo secuencial a la base de datos
3. Regenera y firma el XML
4. Reenvía sin intervención manual

### Cumplimiento SRI 2026

- **Transmisión en Tiempo Real**: Valida que factura se envíe < 24h desde emisión
- **Firmas Electrónicas XAdES-BES**: Usa certificado digital válido
- **Validación RUC**: Verifica que RUC certificado = RUC emisor
- **Consumidor Final**: Facturas < $50 pueden usar `9999999999999`
- **Retención Agentes**: Soporte para Resolución agente retención
- **RIMPE**: Soporte régimen RIMPE en XML

## Features de Resiliencia

### Circuit Breaker Pattern
Evita saturar el SRI cuando está caído:
```typescript
// Configurado en src/config/billing.constants.ts
CIRCUIT_FAILURE_THRESHOLD = 5
CIRCUIT_RESET_TIMEOUT_MS = 60000
CIRCUIT_SUCCESS_THRESHOLD = 2
```

### Rate Limiting
Configuración por endpoint:
```typescript
INVOICE_RATE_LIMIT = 10       // por minuto
STATUS_CHECK_RATE_LIMIT = 30  // por minuto
RESUBMIT_RATE_LIMIT = 5       // por 5 minutos
```

### Queue con Retry
Cola en memoria (puede migrarse a BullMQ/Redis):
```typescript
QUEUE_MAX_CONCURRENCY = 3
QUEUE_MAX_ATTEMPTS = 3
QUEUE_RETRY_DELAY_MS = 5000
QUEUE_JOB_TIMEOUT_MS = 120000
```

## Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

## Deployment

### Con Docker

```bash
# Build imagen
docker build -t restaurant-backend .

# Ejecutar contenedor
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://mongo:27017/restaurant \
  -e SRI_SIGNATURE_BASE64=$(cat firma.p12 | base64) \
  --name restaurant-api \
  restaurant-backend
```

### Con PM2

```bash
# Build
npm run build

# Iniciar con PM2
pm2 start ecosystem.config.js

# Ver logs
pm2 logs restaurant-backend

# Monitoreo
pm2 monit
```

### Variables de Entorno en Producción

1. Configurar certificado SRI como variable de entorno base64:
```bash
export SRI_SIGNATURE_BASE64=$(cat /path/to/firma.p12 | base64)
```

2. Usar secrets manager para credenciales sensibles
3. Configurar `SRI_ENV=2` para ambiente productivo
4. Habilitar monitoreo con Sentry y Prometheus

## Monitoreo y Observabilidad

### Logs Estructurados
El sistema usa Winston para logging estructurado:
- **Error**: Errores críticos que requieren atención inmediata
- **Warn**: Advertencias (Circuit Breaker abierto, Rate Limit excedido)
- **Info**: Eventos importantes (Factura autorizada, Email enviado)
- **Debug**: Información detallada para debugging

### Métricas Prometheus
Disponibles en `/api/metrics`:
- `invoice_generation_total` - Total facturas generadas
- `invoice_generation_failures` - Facturas fallidas
- `circuit_breaker_state` - Estado del Circuit Breaker (0=CLOSED, 1=OPEN, 2=HALF_OPEN)
- `invoice_queue_size` - Tamaño de la cola por estado
- `sri_request_duration_seconds` - Latencia de llamadas SRI

### Sentry Integration
Captura automática de errores con contexto:
- Stack traces completos
- Variables de entorno (sin secretos)
- Request context
- User context

## Licencia

MIT

## Soporte

Para soporte técnico o consultas sobre facturación SRI:
- Documentación SRI: https://www.sri.gob.ec/facturacion-electronica
- Issues: https://github.com/your-repo/issues

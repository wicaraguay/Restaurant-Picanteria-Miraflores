# 🔐 Configuración de Credenciales

## Configuración Inicial

Para configurar las credenciales de acceso de forma segura:

### 1. Copiar el archivo de ejemplo

```bash
cd restaurant-backend
cp .env.example .env
```

### 2. Editar el archivo `.env`

Abre el archivo `.env` y cambia las contraseñas por defecto:

```env
# Credenciales del Administrador
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=tu_password_seguro_aqui

# Credenciales del Mesero
SEED_WAITER_USERNAME=cmesero
SEED_WAITER_PASSWORD=tu_password_seguro_aqui

# Credenciales del Cocinero
SEED_CHEF_USERNAME=acocinera
SEED_CHEF_PASSWORD=tu_password_seguro_aqui
```

### 3. Ejecutar el seed

```bash
npm run seed
```

El script mostrará las credenciales que se están usando al final de la ejecución.

## Seguridad

✅ **El archivo `.env` está protegido** - Ya está incluido en `.gitignore`, por lo que nunca se subirá a GitHub.

✅ **Usa `.env.example` como referencia** - Este archivo SÍ se puede subir a GitHub porque solo contiene valores de ejemplo.

✅ **Cambia las contraseñas en producción** - Nunca uses las contraseñas por defecto en un entorno de producción.

## Variables de Entorno Disponibles

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `SEED_ADMIN_USERNAME` | Usuario administrador | `admin` |
| `SEED_ADMIN_PASSWORD` | Contraseña administrador | `admin123` |
| `SEED_WAITER_USERNAME` | Usuario mesero | `cmesero` |
| `SEED_WAITER_PASSWORD` | Contraseña mesero | `mesero123` |
| `SEED_CHEF_USERNAME` | Usuario cocinero | `acocinera` |
| `SEED_CHEF_PASSWORD` | Contraseña cocinero | `cocina123` |

## Notas Importantes

- Si no configuras las variables de entorno, se usarán los valores por defecto
- Las credenciales solo se usan durante el proceso de seed
- GitHub Secret Scanning no detectará credenciales en `.env` porque está en `.gitignore`

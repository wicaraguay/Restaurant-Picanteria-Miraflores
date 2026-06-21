# ============================================
# Dockerfile para Restaurant PM Backend
# Multi-stage build para producción
# Incluye Chromium para WhatsApp (si WHATSAPP_ENABLED=true)
# ============================================

# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# ============================================
# Etapa 2: Producción
FROM node:20-alpine AS production

WORKDIR /app

# Instalar Chromium y dependencias necesarias para whatsapp-web.js
# Solo necesario si WHATSAPP_ENABLED=true
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Configurar Puppeteer para usar Chromium del sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar código compilado desde la etapa de build
COPY --from=builder /app/dist ./dist

# Crear directorios para WhatsApp session (con permisos correctos)
RUN mkdir -p /app/whatsapp-session /app/.wwebjs_cache

# VOLUME para persistir sesión de WhatsApp entre deploys
# Montar este volumen en tu VPS/Docker para no perder la sesión
VOLUME ["/app/whatsapp-session"]

# Crear usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar propiedad de archivos (incluyendo directorios de WhatsApp)
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
ENV WHATSAPP_ENABLED=false
ENV WHATSAPP_SESSION_PATH=/app/whatsapp-session

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de inicio
CMD ["node", "dist/main.js"]

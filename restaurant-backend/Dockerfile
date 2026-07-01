# ============================================
# Dockerfile para Restaurant PM Backend
# Con soporte para WhatsApp (Chromium)
# ============================================

# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================
# Etapa 2: Produccion
FROM node:20-alpine AS production

WORKDIR /app

# Instalar Chromium para WhatsApp
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Variables de Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Dependencias de produccion
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Codigo compilado
COPY --from=builder /app/dist ./dist

# Crear directorios para WhatsApp con permisos correctos
RUN mkdir -p /app/whatsapp-session /app/.wwebjs_cache \
    && chmod 777 /app/whatsapp-session /app/.wwebjs_cache

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000
ENV WHATSAPP_SESSION_PATH=/app/whatsapp-session
ENV WHATSAPP_CACHE_PATH=/app/.wwebjs_cache

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

# ============================================
# Dockerfile - Restaurant PM Backend
# WhatsApp con Baileys (SIN Chromium)
# ============================================

# Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================
# Produccion - Muy ligero sin Chromium
FROM node:20-alpine AS production

WORKDIR /app

# Solo dependencias mínimas
RUN apk add --no-cache dumb-init && rm -rf /var/cache/apk/*

# Dependencias de producción
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Código compilado
COPY --from=builder /app/dist ./dist

# Directorio para sesión de WhatsApp
RUN mkdir -p /app/whatsapp-session && chmod 777 /app/whatsapp-session

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV WHATSAPP_SESSION_PATH=/app/whatsapp-session

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

# ─────────────────────────────────────────────────────────────────────────────
# NexusAI — y-websocket Collaboration Server
# Lightweight image — only needs ws, y-websocket, and the server script.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat

# Install only production deps the server actually needs
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile --omit=dev

# Copy only the server script
COPY scripts/yws-server.mjs ./scripts/yws-server.mjs

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 wsuser && \
    chown -R wsuser:nodejs /app

USER wsuser

EXPOSE 1234

ENV YWS_PORT=1234

CMD ["node", "scripts/yws-server.mjs"]

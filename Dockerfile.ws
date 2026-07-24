# ─────────────────────────────────────────────────────────────────────────────
# NexusAI — y-websocket Collaboration Server
#
# Lightweight, WS-only image: just the Yjs collaboration relay. Background job
# processing (docEmbedding) now runs on Inngest instead of an in-process Agenda
# poller, so this container no longer needs the app source tree.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json .npmrc ./
RUN npm ci --frozen-lockfile --omit=dev

COPY scripts/yws-server.mjs ./scripts/yws-server.mjs

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 wsuser && \
    chown -R wsuser:nodejs /app

USER wsuser

EXPOSE 1234

ENV YWS_PORT=1234

CMD ["node", "scripts/yws-server.mjs"]

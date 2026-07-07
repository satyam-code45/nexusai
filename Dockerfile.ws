# ─────────────────────────────────────────────────────────────────────────────
# NexusAI — y-websocket Collaboration Server + Agenda Job Worker
#
# This process doubles up: it's the Yjs collaboration relay AND the home for
# Agenda's docEmbedding job processor. Agenda's poller needs a continuously
# alive event loop (it checks the `jobs` collection every 5s) — a guarantee
# Vercel serverless functions can't provide, since their event loop freezes
# between requests. Rather than deploy a third persistent service just for
# that, this already-persistent container runs both — see
# src/lib/agenda/agenda.ts and scripts/yws-server.mjs's startAgenda() call.
#
# Because of that, this is no longer a "lightweight, WS-only" image — it
# needs the real app source and the full dependency set (OpenAI, Pinecone,
# LangChain, document loaders) to actually run the embedding pipeline.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json .npmrc ./
RUN npm ci --frozen-lockfile --omit=dev

# yws-server.mjs now imports src/lib/agenda/agenda.ts (and its transitive
# services/models/pipelines), run via tsx since it's TypeScript with "@/*"
# path aliases plain Node can't resolve on its own.
COPY src ./src
COPY tsconfig.json ./tsconfig.json
COPY scripts/yws-server.mjs ./scripts/yws-server.mjs

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 wsuser && \
    chown -R wsuser:nodejs /app

USER wsuser

EXPOSE 1234

ENV YWS_PORT=1234

CMD ["node", "node_modules/.bin/tsx", "scripts/yws-server.mjs"]

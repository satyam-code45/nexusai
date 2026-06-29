# ─────────────────────────────────────────────────────────────────────────────
# NexusAI — Next.js App
# Multi-stage build using Next.js standalone output for minimal image size.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Install libc compat for native modules on Alpine
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile


# ── Stage 2: Build the application ────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
# Pass them as build args when building for a specific environment.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_URL=http://localhost:3000
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
ARG NEXT_PUBLIC_DEVELOPPER_KEY=""
ARG NEXT_PUBLIC_YWEBSOCKET_URL=ws://localhost:1234

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_DEVELOPPER_KEY=$NEXT_PUBLIC_DEVELOPPER_KEY \
    NEXT_PUBLIC_YWEBSOCKET_URL=$NEXT_PUBLIC_YWEBSOCKET_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ── Stage 3: Production runner ─────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN apk add --no-cache libc6-compat

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone server and static assets from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

# Create writable runtime directories and set ownership
RUN mkdir -p ./public/uploads ./public/agent ./public/chat-history && \
    chown -R nextjs:nodejs ./public

USER nextjs

EXPOSE 3000

# next.config.ts output:"standalone" generates server.js at the root
CMD ["node", "server.js"]

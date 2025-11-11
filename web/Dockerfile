FROM oven/bun:1-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile --filter web

FROM base AS builder

ARG NODE_ENV
ARG NEXT_TELEMETRY_DISABLED=1
ARG SERVER_URL
ARG WEB_URL
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./web/

WORKDIR /app/web

RUN bun run build

FROM base AS runner

RUN adduser --system --uid 1001 nextjs

WORKDIR /app/web

COPY --from=builder --chown=nextjs:bun /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:bun /app/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:bun /app/web/public ./public

USER nextjs

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]

FROM oven/bun:1.3.3-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY docs/package.json  docs/source.config.ts docs/next.config.* docs/tsconfig.json ./docs/
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile --filter docs

FROM base AS builder

ARG NODE_ENV=production
ARG NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY docs/ ./docs/

WORKDIR /app/docs

RUN bun run build

FROM base AS runner

RUN adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder --chown=nextjs:bun /app/docs/.next/standalone ./
COPY --from=builder --chown=nextjs:bun /app/docs/.next/static ./docs/.next/static
COPY --from=builder --chown=nextjs:bun /app/docs/public ./docs/public

USER nextjs

EXPOSE 3003

ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "docs/server.js"]

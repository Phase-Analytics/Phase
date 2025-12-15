FROM oven/bun:1.3.3-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/source.config.ts apps/web/next.config.ts apps/web/tsconfig.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile --filter web

FROM base AS builder

ARG NODE_ENV=production
ARG NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SERVER_URL
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web

RUN bun run build

FROM base AS runner

RUN adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder --chown=nextjs:bun /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:bun /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:bun /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "apps/web/server.js"]

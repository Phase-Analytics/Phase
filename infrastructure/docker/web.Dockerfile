FROM oven/bun:1.3.3-slim AS base
WORKDIR /app

FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY apps/server/package.json ./apps/server/package.json

RUN bun install --frozen-lockfile

FROM base AS builder

ARG NODE_ENV=production
ARG NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SERVER_URL
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

WORKDIR /app

COPY --from=deps /app ./

WORKDIR /app/apps/web

RUN bun run build

FROM base AS runner

WORKDIR /app

RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public

RUN mkdir .next
RUN chown nextjs:bun .next

COPY --from=builder --chown=nextjs:bun /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:bun /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "apps/web/server.js"]

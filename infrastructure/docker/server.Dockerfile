FROM oven/bun:1.3.3-slim AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/
COPY packages/sdk/package.json ./packages/sdk/

RUN bun install --frozen-lockfile --filter server

COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/

FROM oven/bun:1.3.3-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/server ./apps/server

WORKDIR /app/apps/server

EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]

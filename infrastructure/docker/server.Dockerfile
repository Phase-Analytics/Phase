FROM oven/bun:1.3.3-slim AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/
COPY packages/sdk/package.json ./packages/sdk/

# The server runs from TypeScript source and migrates with drizzle-orm's
# runtime migrator, so dev dependencies (drizzle-kit, tsgo) are not needed.
# --omit=peer stops Bun auto-installing peers such as @better-auth/expo's
# expo/react-native and better-auth's next (~1.1 GB); every runtime import
# is a direct dependency.
RUN --mount=type=cache,id=phase-bun,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile --production --omit=peer --filter server

COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/

FROM oven/bun:1.3.3-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/server ./apps/server

WORKDIR /app/apps/server

USER bun

EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]

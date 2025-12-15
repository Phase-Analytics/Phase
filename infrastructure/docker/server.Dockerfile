FROM oven/bun:1.3.3-slim AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN bun install --frozen-lockfile --filter server

COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/

WORKDIR /app/apps/server

RUN bun build \
    --compile \
    --minify-whitespace \
    --minify-syntax \
    --target bun \
    --outfile server \
    src/index.ts

FROM busybox:1.36-musl AS busybox

FROM gcr.io/distroless/base AS runtime

WORKDIR /app

COPY --from=builder --chown=65532:65532 /app/apps/server/server .
COPY --from=builder --chown=65532:65532 /app/apps/server/drizzle ./drizzle
COPY --from=busybox --chown=65532:65532 /bin/busybox /bin/busybox

USER 65532:65532

EXPOSE 3001

CMD ["./server"]

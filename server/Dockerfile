FROM oven/bun:1.3.1-slim AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY server/package.json ./server/
COPY web/package.json ./web/

RUN bun install --frozen-lockfile --filter server

COPY server/ ./server/

WORKDIR /app/server

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

COPY --from=builder --chown=65532:65532 /app/server/server .
COPY --from=builder --chown=65532:65532 /app/server/drizzle ./drizzle
COPY --from=busybox --chown=65532:65532 /bin/busybox /bin/busybox

USER 65532:65532

EXPOSE 3001

CMD ["./server"]

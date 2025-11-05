FROM oven/bun:1.3.1 AS builder
WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--target bun \
	--outfile server \
	src/index.ts

FROM gcr.io/distroless/base AS runtime

WORKDIR /app

COPY --from=builder --chown=65532:65532 /app/server .
COPY --from=builder --chown=65532:65532 /app/drizzle ./drizzle

USER 65532:65532

EXPOSE 3001

CMD ["./server"]

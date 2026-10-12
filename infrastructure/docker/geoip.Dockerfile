# Build context: ./tooling
FROM alpine:3.24

RUN apk add --no-cache curl

COPY --chmod=0755 geoip/update.sh /usr/local/bin/geoip-update

CMD ["geoip-update"]

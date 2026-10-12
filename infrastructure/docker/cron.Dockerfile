# Build context: ./tooling
FROM alpine:3.24

RUN apk add --no-cache curl

COPY --chmod=0755 geoip/update.sh /usr/local/bin/geoip-update
COPY --chmod=0644 cron/crontab /etc/crontabs/root

# -d logs crond's own errors to stderr; job output is redirected in the crontab.
CMD ["crond", "-f", "-d", "8"]

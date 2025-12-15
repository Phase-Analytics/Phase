FROM alpine:3.20

RUN apk add --no-cache wget && \
    mkdir -p /var/log && \
    touch /var/log/cron.log

WORKDIR /app

COPY crontab /etc/crontabs/root
COPY jobs /app/jobs

RUN chmod +x /app/jobs/*.sh && \
    chmod 0644 /etc/crontabs/root

CMD ["crond", "-f", "-l", "2"]

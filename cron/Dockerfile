FROM alpine:3.20

RUN apk add --no-cache wget
WORKDIR /app

COPY crontab /etc/crontabs/root
COPY jobs /app/jobs

RUN chmod +x /app/jobs/*.sh

CMD ["crond", "-f", "-l", "2"]

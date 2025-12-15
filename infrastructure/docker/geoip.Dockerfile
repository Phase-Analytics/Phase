FROM alpine:3.20

RUN apk add --no-cache wget

WORKDIR /scripts

COPY update.sh .
RUN chmod +x update.sh

CMD ["/scripts/update.sh"]

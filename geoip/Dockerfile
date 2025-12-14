FROM busybox:1.36-musl
WORKDIR /scripts

COPY update.sh .
RUN chmod +x update.sh

CMD ["/scripts/update.sh"]

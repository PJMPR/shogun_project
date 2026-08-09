FROM alpine:3.21

RUN apk add --no-cache \
    bash \
    coreutils \
    gzip \
    mariadb-client \
    postgresql17-client \
    tzdata

WORKDIR /app
COPY backup.sh entrypoint.sh healthcheck.sh /app/
RUN chmod 0555 /app/backup.sh /app/entrypoint.sh /app/healthcheck.sh

ENTRYPOINT ["/app/entrypoint.sh"]

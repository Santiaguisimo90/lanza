FROM alpine:3.21
RUN apk add --no-cache postgresql17-client aws-cli curl tzdata bash
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
CMD ["/usr/local/bin/backup.sh", "loop"]

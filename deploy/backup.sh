#!/usr/bin/env bash
# Respaldo diario de la base de Lanza hacia Cloudflare R2.
# Cron en el VPS: 0 3 * * * /opt/lanza/deploy/backup.sh
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
STAMP=$(date +%F)
FILE="/tmp/lanza-$STAMP.sql.gz"

notify() {
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
    curl -s -o /dev/null "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=$1" || true
  fi
}
trap 'notify "Lanza: FALLO el respaldo diario ($STAMP)"' ERR

docker exec lanza-postgres pg_dump -U lanza -d lanza | gzip > "$FILE"
docker run --rm -v /tmp:/tmp \
  -e AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  -e AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  -e AWS_DEFAULT_REGION=auto \
  amazon/aws-cli --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  s3 cp "$FILE" "s3://${R2_BACKUP_BUCKET}/lanza-$STAMP.sql.gz"
rm -f "$FILE"
# Para conservar solo 14 dias: regla de ciclo de vida en el bucket de respaldos (ver README_LANZA.md)

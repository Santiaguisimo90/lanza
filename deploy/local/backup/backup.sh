#!/usr/bin/env bash
# Respaldo diario de la base de Lanza hacia Cloudflare R2 (bucket privado lanza-backups).
#   backup.sh loop   -> duerme hasta las 03:00 (hora de Ecuador) y respalda cada dia
#   backup.sh now    -> respalda ahora (para probar):  docker exec lanza-backup backup.sh now
set -uo pipefail

ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION=auto

notify() {
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -s -o /dev/null "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=$1" || true
  fi
}

respaldar() {
  local stamp file
  stamp=$(date +%F)
  file="/tmp/lanza-$stamp.sql.gz"
  if ! pg_dump -h lanza-postgres -U lanza -d lanza | gzip > "$file"; then
    notify "Lanza: FALLO el respaldo diario ($stamp): no se pudo leer la base."
    return 1
  fi
  # Un archivo casi vacio significa que pg_dump fallo a medias
  if [ "$(stat -c %s "$file")" -lt 2000 ]; then
    notify "Lanza: el respaldo de $stamp salio sospechosamente pequeno."
    return 1
  fi
  if ! aws --endpoint-url "$ENDPOINT" s3 cp "$file" "s3://${R2_BACKUP_BUCKET}/lanza-$stamp.sql.gz"; then
    notify "Lanza: FALLO la subida del respaldo ($stamp) a R2."
    rm -f "$file"
    return 1
  fi
  rm -f "$file"
  # Conserva 14 dias
  local cutoff
  cutoff=$(date -d "@$(( $(date +%s) - 14*86400 ))" +%F)
  aws --endpoint-url "$ENDPOINT" s3 ls "s3://${R2_BACKUP_BUCKET}/" | awk '{print $4}' | while read -r name; do
    d=${name#lanza-}; d=${d%.sql.gz}
    if [[ "$d" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && [[ "$d" < "$cutoff" ]]; then
      aws --endpoint-url "$ENDPOINT" s3 rm "s3://${R2_BACKUP_BUCKET}/$name"
    fi
  done
  echo "Respaldo $stamp listo."
}

if [ "${1:-}" = "now" ]; then
  respaldar
  exit $?
fi

while true; do
  now=$(date +%s)
  target=$(date -d "03:00" +%s)
  [ "$target" -le "$now" ] && target=$(( target + 86400 ))
  sleep $(( target - now ))
  respaldar
done

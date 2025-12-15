#!/bin/sh
set -e

echo "[$(date)] Starting GeoIP update check..."

TIMESTAMP_FILE=/app/geoip/.last-update
DB_FILE=/app/geoip/GeoLite2-City.mmdb
DB_URL=https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb
CURRENT_TIME=$(date +%s)
UPDATE_NEEDED=0
UPDATE_SECONDS=345600

if [ ! -f "$DB_FILE" ]; then
  echo "[$(date)] GeoIP database not found"
  UPDATE_NEEDED=1
elif [ -f "$TIMESTAMP_FILE" ]; then
  LAST_UPDATE=$(cat "$TIMESTAMP_FILE")
  AGE=$((CURRENT_TIME - LAST_UPDATE))
  DAYS_OLD=$((AGE / 86400))

  if [ "$AGE" -gt "$UPDATE_SECONDS" ]; then
    echo "[$(date)] GeoIP database is $DAYS_OLD days old, updating..."
    UPDATE_NEEDED=1
  else
    echo "[$(date)] GeoIP database is up to date ($DAYS_OLD days old)"
  fi
else
  echo "[$(date)] No timestamp found, downloading..."
  UPDATE_NEEDED=1
fi

if [ "$UPDATE_NEEDED" -eq 1 ]; then
  echo "[$(date)] Downloading GeoIP database..."
  wget -O "$DB_FILE.tmp" "$DB_URL"
  mv "$DB_FILE.tmp" "$DB_FILE"
  chown 65532:65532 "$DB_FILE"
  echo "$CURRENT_TIME" > "$TIMESTAMP_FILE"
  chown 65532:65532 "$TIMESTAMP_FILE"
  echo "[$(date)] GeoIP database updated successfully"
else
  echo "[$(date)] No update needed"
fi

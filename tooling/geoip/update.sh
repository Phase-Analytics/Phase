#!/bin/sh
# Refreshes the GeoLite2 Country database. Shared by the one-shot geoip
# service (runs before the server starts) and the cron service.
#
# Fail-soft: when a refresh fails but a database already exists, the old one
# keeps serving and the script exits 0. It only fails when no database exists,
# because the server cannot start without one.
#
# Source: MaxMind's download API (checksum-verified) when MAXMIND_ACCOUNT_ID
# and MAXMIND_LICENSE_KEY are set, otherwise the community mirror. Either way
# the file must look like a GeoLite2 Country mmdb before it replaces the
# current one.
set -eu

GEOIP_DIR=${GEOIP_DIR:-/app/geoip}
DB_NAME=GeoLite2-Country.mmdb
DB_FILE=$GEOIP_DIR/$DB_NAME
TIMESTAMP_FILE=$GEOIP_DIR/.last-update
MAX_AGE_SECONDS=345600
MIN_DB_BYTES=1000000
MIRROR_URL=https://github.com/P3TERX/GeoLite.mmdb/raw/download/$DB_NAME
MAXMIND_URL=https://download.maxmind.com/geoip/databases/GeoLite2-Country/download

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] geoip: $*"
}

update_needed() {
  if [ ! -s "$DB_FILE" ]; then
    log "database not found"
    return 0
  fi
  if [ ! -f "$TIMESTAMP_FILE" ]; then
    log "no timestamp found"
    return 0
  fi
  last_update=$(cat "$TIMESTAMP_FILE" 2>/dev/null || echo 0)
  case $last_update in
    '' | *[!0-9]*) last_update=0 ;;
  esac
  age=$(($(date +%s) - last_update))
  if [ "$age" -gt "$MAX_AGE_SECONDS" ]; then
    log "database is $((age / 86400)) days old"
    return 0
  fi
  log "database is up to date ($((age / 86400)) days old)"
  return 1
}

fetch_maxmind() {
  dest=$1
  archive="$WORK_DIR/db.tar.gz"
  auth="$MAXMIND_ACCOUNT_ID:$MAXMIND_LICENSE_KEY"

  curl -fsSL --retry 3 --max-time 300 -u "$auth" \
    -o "$archive" "$MAXMIND_URL?suffix=tar.gz" || return 1
  expected=$(curl -fsSL --retry 3 --max-time 60 -u "$auth" \
    "$MAXMIND_URL?suffix=tar.gz.sha256" | cut -d' ' -f1) || return 1
  actual=$(sha256sum "$archive" | cut -d' ' -f1)
  if [ -z "$expected" ] || [ "$expected" != "$actual" ]; then
    log "checksum mismatch for MaxMind archive" >&2
    return 1
  fi

  tar -xzf "$archive" -C "$WORK_DIR" || return 1
  extracted=$(find "$WORK_DIR" -type f -name "$DB_NAME" | head -n 1)
  [ -n "$extracted" ] && mv "$extracted" "$dest"
}

fetch_mirror() {
  curl -fsSL --retry 3 --max-time 300 -o "$1" "$MIRROR_URL"
}

is_valid_mmdb() {
  file=$1
  size=$(wc -c <"$file")
  if [ "$size" -lt "$MIN_DB_BYTES" ]; then
    log "download is too small ($size bytes)" >&2
    return 1
  fi
  # mmdb metadata lives in the last 128 KiB, after this marker.
  marker=$(printf '\253\315\357MaxMind.com')
  if ! tail -c 131072 "$file" | grep -qF "$marker"; then
    log "download has no mmdb metadata marker" >&2
    return 1
  fi
  if ! tail -c 131072 "$file" | grep -qF 'GeoLite2-Country'; then
    log "download is not a GeoLite2-Country database" >&2
    return 1
  fi
}

refresh() {
  tmp_file="$WORK_DIR/$DB_NAME"
  if [ -n "${MAXMIND_ACCOUNT_ID:-}" ] && [ -n "${MAXMIND_LICENSE_KEY:-}" ]; then
    log "downloading from MaxMind"
    fetch_maxmind "$tmp_file" || return 1
  else
    log "downloading from mirror (set MAXMIND_ACCOUNT_ID/MAXMIND_LICENSE_KEY for the official source)"
    fetch_mirror "$tmp_file" || return 1
  fi
  is_valid_mmdb "$tmp_file" || return 1

  chmod 0644 "$tmp_file"
  # Same filesystem as DB_FILE, so the swap is atomic for readers.
  mv -f "$tmp_file" "$DB_FILE"
  date +%s >"$TIMESTAMP_FILE"
  chmod 0644 "$TIMESTAMP_FILE"
}

mkdir -p "$GEOIP_DIR"
chmod 0755 "$GEOIP_DIR"

if ! update_needed; then
  exit 0
fi

WORK_DIR=$(mktemp -d "$GEOIP_DIR/.update.XXXXXX")
trap 'rm -rf "$WORK_DIR"' EXIT
trap 'exit 1' INT TERM

if refresh; then
  log "database updated"
  exit 0
fi

if [ -s "$DB_FILE" ]; then
  log "WARNING: update failed, keeping existing database" >&2
  exit 0
fi

log "ERROR: update failed and no database exists" >&2
exit 1

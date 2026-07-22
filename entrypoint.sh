#!/bin/sh
set -e

chown -R vega:nodejs /app/logs /app/configs /app/data 2>/dev/null || true

# RTU mode: join whichever group owns the mapped serial device (dialout on
# most distros, but gid varies by host), so vega can open it without root.
for dev in /dev/ttyUSB* /dev/ttyACM* /dev/ttyAMA* /dev/serial0; do
  [ -e "$dev" ] || continue
  gid=$(stat -c '%g' "$dev")
  group=$(getent group "$gid" | cut -d: -f1)
  if [ -z "$group" ]; then
    group="serial$gid"
    addgroup -g "$gid" "$group"
  fi
  addgroup vega "$group" 2>/dev/null || true
done

exec su-exec vega "$@"

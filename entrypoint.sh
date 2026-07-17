#!/bin/sh
set -e

chown -R vega:nodejs /app/logs /app/configs /app/data 2>/dev/null || true

exec su-exec vega "$@"

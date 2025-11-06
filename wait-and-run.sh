#!/usr/bin/env bash
# Wait for Postgres to be ready, then run the Bun seeder
set -euo pipefail

DB_URL=${DATABASE_URL:-postgres://postgres:postgres@db:5432/ecommerce}
# parse host and user for pg_isready
# default host 'db' and user 'postgres' are common in compose
HOST=$(echo "$DB_URL" | sed -E 's#.*@([^:/]+).*#\1#' || echo db)
USER=$(echo "$DB_URL" | sed -E 's#.*//([^:]+):.*#\1#' || echo postgres)
echo "Waiting for Postgres at ${HOST}..."
# Loop until TCP port 5432 is accepting connections. Avoid relying on pg_isready being present in the runner image.
# Try multiple probes in order: pg_isready, /dev/tcp, nc (netcat). Fall back to simple sleep loop.
check_postgres() {
  # 1) pg_isready (if present)
  if command -v pg_isready > /dev/null 2>&1; then
    pg_isready -h "${HOST}" -U "${USER}" -d "${DB_NAME:-ecommerce}" > /dev/null 2>&1
    return $?
  fi

  # 2) /dev/tcp (bash builtin)
  if bash -c "cat < /dev/tcp/${HOST}/5432 > /dev/null 2>&1" 2>/dev/null; then
    return 0
  fi

  # 3) nc (netcat)
  if command -v nc > /dev/null 2>&1; then
    nc -z "${HOST}" 5432 >/dev/null 2>&1
    return $?
  fi

  return 1
}

RETRIES=120
SLEEP=2
count=0
while true; do
  if check_postgres; then
    echo "Postgres is ready on ${HOST}:5432"
    break
  fi
  count=$((count + 1))
  if [ "$count" -ge "$RETRIES" ]; then
    echo "Timed out waiting for Postgres after $((RETRIES * SLEEP)) seconds" >&2
    exit 1
  fi
  echo "Postgres not ready yet (attempt $count/$RETRIES) - sleeping ${SLEEP}s"
  sleep $SLEEP
done

echo "Postgres appears reachable on ${HOST}:5432 — running seeder"
exec bun run src/seed.js

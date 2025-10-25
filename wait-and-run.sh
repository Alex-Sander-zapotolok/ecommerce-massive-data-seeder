#!/usr/bin/env bash
# Wait for Postgres to be ready, then run the Bun seeder
set -euo pipefail

DB_URL=${DATABASE_URL:-postgres://postgres:postgres@db:5432/ecommerce}
# parse host and user for pg_isready
# default host 'db' and user 'postgres' are common in compose
HOST=$(echo "$DB_URL" | sed -E 's#.*@([^:/]+).*#\1#' || echo db)
USER=$(echo "$DB_URL" | sed -E 's#.*//([^:]+):.*#\1#' || echo postgres)

done
echo "Waiting for Postgres at ${HOST}..."
# Loop until TCP port 5432 is accepting connections. Avoid relying on pg_isready being present in the runner image.
until bash -c "cat < /dev/tcp/${HOST}/5432 > /dev/null 2>&1"; do
  echo "Postgres not accepting TCP connections at ${HOST}:5432 yet - sleeping 2s"
  sleep 2
done

echo "Postgres appears reachable on ${HOST}:5432 — running seeder"
exec bun run src/seed.js

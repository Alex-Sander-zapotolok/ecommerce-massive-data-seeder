# ecommerce-massive-seeder

This repository contains a PostgreSQL schema (`dump.sql`) and a Bun-based seed script (`src/seed.js`) to populate the schema with realistic data. The goal is to create at least one non-lookup table with 2,000,000+ rows while preserving referential integrity and using batch inserts for performance.

Summary
- Target: `customers` = 2,000,000 rows (non-lookup table).
- Other non-lookup tables: `products` (200,000 rows), `orders` (1,000,000 rows), `order_items` (variable; ~2-4M rows depending on items per order).
- Lookups: `country`, `currency` small static tables.

Files
- `dump.sql` - schema and small lookup inserts.
- `src/seed.js` - Bun script that batches inserts using `pg` and `@faker-js/faker` with a fixed seed for reproducibility.
- `.env.example` and `env.example` - example DATABASE_URL files (copy one to `.env` or set `DATABASE_URL` in your environment).

Prerequisites
- PostgreSQL 15+ (tested on 15/16). Ensure you have a database and user.
- Bun installed (https://bun.sh/). The script uses Bun's runtime and the `bun` package manager to run.

Setup and run
1. Create database and load schema:

```powershell
# Create DB (adjust user/password as needed)
psql -U postgres -c "CREATE DATABASE ecommerce;"
# Load schema
psql -U postgres -d ecommerce -f dump.sql
```

2. Set environment variable (or copy .env.example):

```powershell
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/ecommerce'
```

3. Install dependencies with Bun and run seed:

```powershell
bun install
bun run src/seed.js
```

Docker
------

There's a simple Docker setup to run Postgres and the Bun seeder together.

1. Build and start services:

```powershell
docker-compose up --build -d
```

2. Run the seeder (container will have Bun installed via the image):

```powershell
docker-compose run --rm seeder
```

3. Tear down when done:

```powershell
docker-compose down -v
```

The `seeder` service uses the `DATABASE_URL` env var pointed at the `db` service.

Notes on the design
- Schema: `customers`, `products`, `orders`, `order_items` are non-lookup and contain realistic fields.
- Target distribution rationale:
  - `customers` chosen as the 2M+ table to simulate a large user base; product catalog and orders keep realistic proportions.
  - `products` at 200k provides variety without causing huge FK blowup.
  - `orders` at 1M ensures many customers have orders; `order_items` scales with 1-5 items per order.

Bulk-insert strategy
- Batching: script inserts in batches (20k rows by default) inside transactions to reduce WAL overhead and round-trips.
- Index strategy: keep minimal indexes during insert (only basic indexes present in `dump.sql`). After loading, consider adding additional indexes for queries (e.g., on email, order_date).
- Reproducibility: `faker.seed(12345)` is used, and deterministic SKUs/emails are derived to avoid collisions where possible.

Performance and durations
- Approximate durations depend on hardware and PostgreSQL tuning. On a modern 8-core machine with SSD, expect:
  - customers 2M in ~20-60 minutes (depends on WAL, checkpoints, maintenance_work_mem, synchronous_commit, and indexes).
  - products 200k and orders 1M add additional 20-40 minutes.
- To speed up: increase batch sizes, use parallel seeding for independent tables, temporarily set `synchronous_commit=off`, and drop non-essential indexes during load.

Verification
- Use SQL to count rows:

```powershell
psql -U postgres -d ecommerce -c "SELECT 'customers', count(*) FROM customers;"
psql -U postgres -d ecommerce -c "SELECT 'products', count(*) FROM products;"
psql -U postgres -d ecommerce -c "SELECT 'orders', count(*) FROM orders;"
psql -U postgres -d ecommerce -c "SELECT 'order_items', count(*) FROM order_items;"
```

Expected result
- `customers` = 2,000,000 rows (guaranteed by script variables).
- `products` ~200,000 rows.
- `orders` ~1,000,000 rows.
- `order_items` ~1-5M rows depending on items per order.

Follow-ups and tips
- For very large loads, run the seed script on the same machine as the DB to avoid network latency.
- Consider using COPY FROM STDIN for fastest ingestion if you can stream CSV batches.

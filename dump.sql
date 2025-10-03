-- Dump: e-commerce schema for large-scale seeding
-- Lookup tables vs non-lookup tables are commented

-- Use PostgreSQL 15+ features
CREATE SCHEMA IF NOT EXISTS ecommerce;
SET search_path = ecommerce;

-- Lookup tables (small, static)
CREATE TABLE IF NOT EXISTS country (
  id smallint PRIMARY KEY,
  iso_code char(2) NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS currency (
  id smallint PRIMARY KEY,
  code char(3) NOT NULL UNIQUE,
  name text NOT NULL
);

-- Non-lookup tables (large): customers, products, orders, order_items

CREATE TABLE IF NOT EXISTS customers (
  id bigserial PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  street text,
  city text,
  postal_code text,
  country_id smallint REFERENCES country(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id bigserial PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  currency_id smallint REFERENCES currency(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id bigserial PRIMARY KEY,
  customer_id bigint REFERENCES customers(id) NOT NULL,
  order_date timestamptz NOT NULL DEFAULT now(),
  status smallint NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  currency_id smallint REFERENCES currency(id) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id bigserial PRIMARY KEY,
  order_id bigint REFERENCES orders(id) NOT NULL,
  product_id bigint REFERENCES products(id) NOT NULL,
  quantity int NOT NULL,
  unit_price numeric(10,2) NOT NULL
);

-- Minimal indexes to allow fast bulk load: avoid many indexes on mass-insert tables
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Seed help: simple sets for countries and currencies
INSERT INTO country (id, iso_code, name) VALUES (1,'US','United States') ON CONFLICT DO NOTHING;
INSERT INTO country (id, iso_code, name) VALUES (2,'EE','Estonia') ON CONFLICT DO NOTHING;
INSERT INTO country (id, iso_code, name) VALUES (3,'DE','Germany') ON CONFLICT DO NOTHING;

INSERT INTO currency (id, code, name) VALUES (1,'USD','US Dollar') ON CONFLICT DO NOTHING;
INSERT INTO currency (id, code, name) VALUES (2,'EUR','Euro') ON CONFLICT DO NOTHING;

-- End of dump

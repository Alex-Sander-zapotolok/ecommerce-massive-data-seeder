// Bun seed script for e-commerce schema
// Reproducible: uses fixed seed for faker
import { Client } from 'pg';
import { faker } from '@faker-js/faker';

faker.seed(12345);

// Allow overriding targets and batch sizes via env for quick dev testing.
// Usage: set SEED_SCALE=dev to run with small targets, or set TARGET_CUSTOMERS etc.
const SEED_SCALE = process.env.SEED_SCALE || process.env.SEED_SCALE_MODE || 'prod';

// Defaults (production)
let BATCH_CUSTOMERS = 4000; // per batch (safe: 4000 * ~8 params = 32k)
let BATCH_PRODUCTS = 4000;
let BATCH_ORDERS = 4000;
let TARGET_CUSTOMERS = 2000000; // production targets
let TARGET_PRODUCTS = 200000;
let TARGET_ORDERS = 1000000;

if (SEED_SCALE === 'dev') {
  // quick local/dev run
  BATCH_CUSTOMERS = parseInt(process.env.BATCH_CUSTOMERS || '200', 10);
  BATCH_PRODUCTS = parseInt(process.env.BATCH_PRODUCTS || '200', 10);
  BATCH_ORDERS = parseInt(process.env.BATCH_ORDERS || '200', 10);
  TARGET_CUSTOMERS = parseInt(process.env.TARGET_CUSTOMERS || '1000', 10);
  TARGET_PRODUCTS = parseInt(process.env.TARGET_PRODUCTS || '200', 10);
  TARGET_ORDERS = parseInt(process.env.TARGET_ORDERS || '500', 10);
} else {
  // allow numeric overrides for prod-scale runs
  BATCH_CUSTOMERS = parseInt(process.env.BATCH_CUSTOMERS || String(BATCH_CUSTOMERS), 10);
  BATCH_PRODUCTS = parseInt(process.env.BATCH_PRODUCTS || String(BATCH_PRODUCTS), 10);
  BATCH_ORDERS = parseInt(process.env.BATCH_ORDERS || String(BATCH_ORDERS), 10);
  TARGET_CUSTOMERS = parseInt(process.env.TARGET_CUSTOMERS || String(TARGET_CUSTOMERS), 10);
  TARGET_PRODUCTS = parseInt(process.env.TARGET_PRODUCTS || String(TARGET_PRODUCTS), 10);
  TARGET_ORDERS = parseInt(process.env.TARGET_ORDERS || String(TARGET_ORDERS), 10);
}

const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ecommerce'
};

async function run() {
  const client = new Client(poolConfig);
  await client.connect();

  // Set search path to ecommerce schema (dump.sql creates objects in ecommerce schema)
  await client.query('SET search_path = ecommerce');

  console.log('Connected to DB');

  // Disable triggers for faster inserts? We'll rely on minimal indexes already.

  // 1) Seed lookup small tables are already in dump.sql but ensure currencies/countries exist
  // 2) Insert products
  console.log('Seeding products...');
  for (let offset = 0; offset < TARGET_PRODUCTS; offset += BATCH_PRODUCTS) {
    const batch = Math.min(BATCH_PRODUCTS, TARGET_PRODUCTS - offset);
    const values = [];
    const params = [];
    let idx = 1;
    for (let i = 0; i < batch; i++) {
      const sku = `SKU-${offset + i + 1}`;
  const name = faker.commerce.productName();
  const desc = faker.commerce.productDescription();
  const price = faker.commerce.price({ min: 5, max: 2000, dec: 2 });
  const currency_id = faker.number.int({ min: 1, max: 2 });
      params.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      values.push(sku, name, desc, price, currency_id);
    }
    const sql = `INSERT INTO products (sku,name,description,price,currency_id) VALUES ${params.join(',')}`;
    await client.query('BEGIN');
    await client.query(sql, values);
    await client.query('COMMIT');
    console.log(`Inserted products ${offset + 1}..${offset + batch}`);
  }

  // 3) Insert customers (target 2M)
  console.log('Seeding customers (this will create 2,000,000 rows)...');
  for (let offset = 0; offset < TARGET_CUSTOMERS; offset += BATCH_CUSTOMERS) {
    const batch = Math.min(BATCH_CUSTOMERS, TARGET_CUSTOMERS - offset);
    const values = [];
    const params = [];
    let idx = 1;
    for (let i = 0; i < batch; i++) {
  const first = faker.person.firstName();
  const last = faker.person.lastName();
  const email = `customer${offset + i + 1}@example.com`;
  const phone = faker.phone.number();
      const street = faker.location.streetAddress();
      const city = faker.location.city();
      const postal = faker.location.zipCode();
  const country_id = faker.number.int({ min: 1, max: 3 });
      params.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      values.push(first, last, email, phone, street, city, postal, country_id);
    }
    const sql = `INSERT INTO customers (first_name,last_name,email,phone,street,city,postal_code,country_id) VALUES ${params.join(',')}`;
    await client.query('BEGIN');
    await client.query(sql, values);
    await client.query('COMMIT');
    console.log(`Inserted customers ${offset + 1}..${offset + batch}`);
  }

  // 4) Insert orders and order_items
  console.log('Seeding orders and order_items...');
  // We'll assign orders to random customers; to avoid FK misses, assume customers ids are contiguous starting at 1
  const maxCustomerId = TARGET_CUSTOMERS;
  const maxProductId = TARGET_PRODUCTS;

  for (let offset = 0; offset < TARGET_ORDERS; offset += BATCH_ORDERS) {
    const batch = Math.min(BATCH_ORDERS, TARGET_ORDERS - offset);
    const orderValues = [];
    const orderParams = [];
    let idx = 1;
    for (let i = 0; i < batch; i++) {
  const customer_id = faker.number.int({ min: 1, max: maxCustomerId });
      const order_date = faker.date.past({ years: 3 }).toISOString();
  const status = faker.number.int({ min: 0, max: 4 });
  const currency_id = faker.number.int({ min: 1, max: 2 });
  const total_amount = faker.commerce.price({ min: 20, max: 5000, dec: 2 });
      orderParams.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      orderValues.push(customer_id, order_date, status, total_amount, currency_id);
    }
    const orderSql = `INSERT INTO orders (customer_id,order_date,status,total_amount,currency_id) VALUES ${orderParams.join(',')} RETURNING id`;
    await client.query('BEGIN');
    const res = await client.query(orderSql, orderValues);
    const insertedOrderIds = res.rows.map(r => r.id);

    // For each inserted order, create 1-5 items
    const itemParams = [];
    const itemValues = [];
    let vidx = 1;
    for (let oi = 0; oi < insertedOrderIds.length; oi++) {
      const oid = insertedOrderIds[oi];
      const items = faker.number.int({ min: 1, max: 5 });
      for (let k = 0; k < items; k++) {
  const product_id = faker.number.int({ min: 1, max: maxProductId });
  const quantity = faker.number.int({ min: 1, max: 10 });
  const unit_price = faker.commerce.price({ min: 5, max: 2000, dec: 2 });
        itemParams.push(`($${vidx++}, $${vidx++}, $${vidx++}, $${vidx++})`);
        itemValues.push(oid, product_id, quantity, unit_price);
      }
    }
    if (itemParams.length) {
      const itemSql = `INSERT INTO order_items (order_id,product_id,quantity,unit_price) VALUES ${itemParams.join(',')}`;
      await client.query(itemSql, itemValues);
    }
    await client.query('COMMIT');
    console.log(`Inserted orders ${offset + 1}..${offset + batch} (and corresponding items)`);
  }

  console.log('Seeding complete');
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });

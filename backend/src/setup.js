require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const SQL_DIR = path.join(__dirname, '../sql');

/** Preferred order; any other *.sql files run after these alphabetically. */
const SQL_ORDER = ['schema.sql', 'leads.sql', 'channel_connections.sql', 'facebook_connect.sql', 'seed.sql'];

function listSqlFiles() {
  if (!fs.existsSync(SQL_DIR)) return [];

  const all = fs
    .readdirSync(SQL_DIR)
    .filter((f) => f.toLowerCase().endsWith('.sql'));

  const ordered = [];
  for (const name of SQL_ORDER) {
    if (all.includes(name)) ordered.push(name);
  }
  for (const name of all.sort()) {
    if (!ordered.includes(name)) ordered.push(name);
  }
  return ordered.map((name) => path.join(SQL_DIR, name));
}

async function runAllSql(conn) {
  const files = listSqlFiles();
  if (!files.length) {
    console.log('No SQL files found in backend/sql');
    return [];
  }

  const ran = [];
  for (const file of files) {
    const sql = fs.readFileSync(file, 'utf8').trim();
    if (!sql) continue;
    console.log(`Running ${path.basename(file)}...`);
    await conn.query(sql);
    ran.push(path.basename(file));
    console.log(`  ✓ ${path.basename(file)}`);
  }
  return ran;
}

async function seedDefaults(conn, dbName) {
  await conn.query(`USE \`${dbName}\``);

  const hash = await bcrypt.hash('Admin@123', 10);
  await conn.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES (?, ?, ?, 'superadmin', 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name), is_active = 1`,
    ['SurfSync Superadmin', 'admin@surfsync.studio', hash]
  );

  await conn.query(`
    INSERT INTO subscription_plans
      (name, slug, description, price_monthly, price_yearly, max_salespersons, max_leads,
       whatsapp_messages, call_minutes, features, is_active)
    VALUES
      ('Starter', 'starter', 'For small teams getting started with AI sales', 2999, 29990, 5, 2000, 3000, 500,
       JSON_ARRAY('WhatsApp AI bot', 'Click to call', 'Call recordings', 'Basic reports'), 1),
      ('Growth', 'growth', 'Scale outreach with smarter handoffs and analytics', 7999, 79990, 20, 15000, 15000, 3000,
       JSON_ARRAY('Everything in Starter', 'AI call reports', 'Lead temperature', 'Smart handoff', 'Duplicate shield'), 1),
      ('Enterprise', 'enterprise', 'Full platform power for large sales orgs', 19999, 199990, 100, 100000, 100000, 20000,
       JSON_ARRAY('Everything in Growth', 'Live call copilot', 'White-label', 'Priority support', 'Custom integrations'), 1)
    ON DUPLICATE KEY UPDATE
      price_monthly = VALUES(price_monthly),
      price_yearly = VALUES(price_yearly),
      description = VALUES(description)
  `);
}

async function migrate({ seed = true, silent = false } = {}) {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'surfsync_studio';

  if (!silent) {
    console.log(`Connecting to MySQL as ${user}@${host}:${port}...`);
  }

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    const ran = await runAllSql(conn);
    if (seed) {
      await seedDefaults(conn, dbName);
      if (!silent) {
        console.log('Seed complete.');
        console.log('Superadmin login: admin@surfsync.studio / Admin@123');
      }
    }
    return ran;
  } finally {
    await conn.end();
  }
}

async function runCli() {
  try {
    const ran = await migrate({ seed: true, silent: false });
    const { ensureFacebookSchema } = require('./migrate_facebook');
    await ensureFacebookSchema({ silent: false });
    console.log(`Done. Ran ${ran.length} SQL file(s): ${ran.join(', ') || 'none'}`);
  } catch (err) {
    console.error('Setup failed:', err.message);
    console.error('\nSet the correct MySQL password in backend/.env (DB_PASSWORD), then run: npm run setup');
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = { migrate, runAllSql, listSqlFiles };

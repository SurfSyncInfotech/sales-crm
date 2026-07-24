require('dotenv').config();
const mysql = require('mysql2/promise');

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0].c) > 0;
}

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return Number(rows[0].c) > 0;
}

async function ensureFacebookSchema({ silent = false } = {}) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'surfsync_studio',
    multipleStatements: true,
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS facebook_connect_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_token VARCHAR(64) NOT NULL UNIQUE,
        company_id INT NOT NULL,
        user_id INT NULL,
        pages_json JSON NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fcs_company (company_id),
        INDEX idx_fcs_expires (expires_at)
      )
    `);
    if (!silent) console.log('facebook_connect_sessions ready');

    if (!(await columnExists(conn, 'leads', 'external_id'))) {
      await conn.query('ALTER TABLE leads ADD COLUMN external_id VARCHAR(120) NULL AFTER lead_code');
      if (!silent) console.log('leads.external_id added');
    }

    if (!(await indexExists(conn, 'leads', 'uq_leads_company_external'))) {
      await conn.query(
        'CREATE UNIQUE INDEX uq_leads_company_external ON leads (company_id, external_id)'
      );
      if (!silent) console.log('uq_leads_company_external added');
    }
  } finally {
    await conn.end();
  }
}

async function main() {
  await ensureFacebookSchema({ silent: false });
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { ensureFacebookSchema };

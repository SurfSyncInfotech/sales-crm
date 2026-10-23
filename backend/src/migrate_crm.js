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

async function addColumn(conn, table, column, ddl, silent) {
  if (await columnExists(conn, table, column)) return;
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
  if (!silent) console.log(`${table}.${column} added`);
}

/** Pipeline/activity timeline, domains + assignment, WhatsApp (Pinbot) tables. Idempotent. */
async function ensureCrmSchema({ silent = false } = {}) {
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
      CREATE TABLE IF NOT EXISTS pipeline_stages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(80) NOT NULL,
        kind ENUM('open', 'won', 'lost') NOT NULL DEFAULT 'open',
        legacy_status VARCHAR(20) NULL,
        position INT NOT NULL DEFAULT 0,
        color VARCHAR(20) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_stage_company_name (company_id, name),
        INDEX idx_stage_company (company_id, position)
      );

      CREATE TABLE IF NOT EXISTS lead_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        lead_id INT NOT NULL,
        type VARCHAR(40) NOT NULL,
        summary VARCHAR(255) NOT NULL,
        meta JSON NULL,
        actor_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_act_lead (lead_id, created_at),
        INDEX idx_act_company (company_id, created_at)
      );

      CREATE TABLE IF NOT EXISTS domains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        is_default TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_domain_company_slug (company_id, slug),
        INDEX idx_domain_company (company_id)
      );

      CREATE TABLE IF NOT EXISTS user_domains (
        user_id INT NOT NULL,
        domain_id INT NOT NULL,
        company_id INT NOT NULL,
        last_assigned_at DATETIME NULL,
        PRIMARY KEY (user_id, domain_id),
        INDEX idx_ud_domain (domain_id),
        INDEX idx_ud_company (company_id)
      );

      CREATE TABLE IF NOT EXISTS domain_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        domain_id INT NOT NULL,
        match_type ENUM('source', 'campaign', 'keyword') NOT NULL,
        pattern VARCHAR(180) NOT NULL,
        priority INT NOT NULL DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rule_company (company_id, priority)
      );

      CREATE TABLE IF NOT EXISTS company_whatsapp_settings (
        company_id INT PRIMARY KEY,
        api_key VARCHAR(255) NULL,
        phone_number_id VARCHAR(60) NULL,
        waba_id VARCHAR(60) NULL,
        default_country_code VARCHAR(6) NOT NULL DEFAULT '91',
        auto_welcome TINYINT(1) NOT NULL DEFAULT 0,
        welcome_template_name VARCHAR(120) NULL,
        welcome_template_lang VARCHAR(12) NOT NULL DEFAULT 'en',
        welcome_params JSON NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        lead_id INT NULL,
        direction ENUM('out', 'in') NOT NULL,
        purpose VARCHAR(40) NULL,
        wa_message_id VARCHAR(190) NULL,
        phone VARCHAR(40) NOT NULL,
        msg_type VARCHAR(30) NOT NULL DEFAULT 'text',
        body TEXT NULL,
        payload JSON NULL,
        status ENUM('queued', 'sent', 'delivered', 'read', 'failed', 'received') NOT NULL DEFAULT 'queued',
        error TEXT NULL,
        sent_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_wa_msg_id (wa_message_id),
        INDEX idx_wam_lead (lead_id, created_at),
        INDEX idx_wam_company (company_id, created_at)
      );
    `);

    await addColumn(conn, 'leads', 'stage_id', 'stage_id INT NULL', silent);
    await addColumn(conn, 'leads', 'domain_id', 'domain_id INT NULL', silent);
    await addColumn(conn, 'leads', 'opted_out', 'opted_out TINYINT(1) NOT NULL DEFAULT 0', silent);

    if (!silent) console.log('CRM pipeline / domains / WhatsApp schema ready');
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  ensureCrmSchema({ silent: false }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { ensureCrmSchema };

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function ensureWabaSchema({ silent = false } = {}) {
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
      CREATE TABLE IF NOT EXISTS company_waba_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL UNIQUE,
        status ENUM('inactive', 'pending_approval', 'active', 'suspended') DEFAULT 'inactive',
        waba_id VARCHAR(100) NULL,
        waba_number VARCHAR(50) NULL,
        template_namespace VARCHAR(255) NULL,
        username VARCHAR(100) NULL,
        password VARCHAR(255) NULL,
        user_api_key VARCHAR(255) NULL,
        access_token TEXT NULL,
        plan_name VARCHAR(100) DEFAULT 'Standard WABA API',
        validity_date DATE NULL,
        wallet_balance DECIMAL(10,2) DEFAULT 0.00,
        account_type TINYINT DEFAULT 0,
        billing_type TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_waba_company (company_id),
        INDEX idx_waba_number (waba_number)
      );

      CREATE TABLE IF NOT EXISTS waba_service_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        plan_key VARCHAR(50) NOT NULL,
        plan_name VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
        razorpay_order_id VARCHAR(100) NULL,
        razorpay_payment_id VARCHAR(100) NULL,
        razorpay_signature VARCHAR(255) NULL,
        request_status ENUM('submitted', 'approved', 'rejected') DEFAULT 'submitted',
        waba_id VARCHAR(100) NULL,
        waba_number VARCHAR(50) NULL,
        notes TEXT NULL,
        admin_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_req_company (company_id)
      );

      CREATE TABLE IF NOT EXISTS waba_recharge_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        razorpay_payment_id VARCHAR(100) NULL,
        pinbot_transaction_id VARCHAR(100) NULL,
        status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
        notes VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rec_company (company_id)
      );

      CREATE TABLE IF NOT EXISTS waba_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        template_name VARCHAR(100) NULL,
        audience_type VARCHAR(50) DEFAULT 'all_leads',
        target_count INT DEFAULT 0,
        submitted_count INT DEFAULT 0,
        delivered_count INT DEFAULT 0,
        read_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        status ENUM('draft', 'scheduled', 'processing', 'completed', 'cancelled') DEFAULT 'draft',
        scheduled_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_camp_company (company_id)
      );

      CREATE TABLE IF NOT EXISTS waba_media_assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_url TEXT NOT NULL,
        file_size INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_media_company (company_id)
      );

      CREATE TABLE IF NOT EXISTS waba_unsubscribes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        phone VARCHAR(50) NOT NULL,
        reason VARCHAR(255) DEFAULT 'User requested STOP',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_unsub_company (company_id)
      );
    `);

    // Ensure apikey and expiry_date columns exist
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'company_waba_accounts'
    `, [process.env.DB_NAME || 'surfsync_studio']);
    const colNames = cols.map((c) => c.COLUMN_NAME);

    if (!colNames.includes('apikey')) {
      await conn.query('ALTER TABLE company_waba_accounts ADD COLUMN apikey VARCHAR(255) NULL');
    }
    if (!colNames.includes('expiry_date')) {
      await conn.query('ALTER TABLE company_waba_accounts ADD COLUMN expiry_date DATE NULL');
    }

    // Ensure status column exists in waba_service_requests
    const [reqCols] = await conn.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'waba_service_requests'
    `, [process.env.DB_NAME || 'surfsync_studio']);
    const reqColNames = reqCols.map((c) => c.COLUMN_NAME);

    if (!reqColNames.includes('status')) {
      await conn.query("ALTER TABLE waba_service_requests ADD COLUMN status VARCHAR(50) DEFAULT 'submitted'");
    }

    if (!silent) console.log('WABA tables created successfully.');
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  ensureWabaSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('WABA migration failed:', err);
      process.exit(1);
    });
}

module.exports = { ensureWabaSchema };

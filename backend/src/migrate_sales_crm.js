const pool = require('./config/db');

async function migrate() {
  console.log('Running safe migration on live DB...');
  
  // 1. Modify leads.status to VARCHAR(50)
  try {
    await pool.query("ALTER TABLE leads MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'new'");
    console.log('✓ leads.status updated to VARCHAR(50)');
  } catch (err) {
    console.log('Note on leads.status:', err.message);
  }

  // 2. Check existing columns in leads
  const [cols] = await pool.query('DESCRIBE leads');
  const existingCols = cols.map(c => c.Field);

  const addCol = async (colName, colDef) => {
    if (!existingCols.includes(colName)) {
      await pool.query(`ALTER TABLE leads ADD COLUMN ${colName} ${colDef}`);
      console.log(`✓ Added column ${colName} to leads`);
    } else {
      console.log(`  Column ${colName} already exists`);
    }
  };

  await addCol('claimed_by', 'INT NULL');
  await addCol('claimed_at', 'DATETIME NULL');
  await addCol('quotation_services', 'TEXT NULL');
  await addCol('quotation_scope', 'TEXT NULL');
  await addCol('quotation_notes', 'TEXT NULL');
  await addCol('quotation_requested_at', 'DATETIME NULL');
  await addCol('quotation_sent_at', 'DATETIME NULL');
  await addCol('lost_reason', 'TEXT NULL');

  // 3. Create lead_reminders table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lead_reminders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      lead_id INT NOT NULL,
      salesperson_id INT NULL,
      phase VARCHAR(50) NOT NULL DEFAULT 'phase_1_interested',
      day_number INT NOT NULL,
      scheduled_for DATETIME NOT NULL,
      status ENUM('pending', 'sent', 'cancelled', 'responded') NOT NULL DEFAULT 'pending',
      notes TEXT NULL,
      sent_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_lead_reminders_company (company_id),
      INDEX idx_lead_reminders_lead (lead_id),
      INDEX idx_lead_reminders_scheduled (scheduled_for, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✓ lead_reminders table created/verified');

  console.log('Safe migration completed successfully!');
  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});

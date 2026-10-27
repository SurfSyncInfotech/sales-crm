const pool = require('./config/db');
require('dotenv').config();

async function run() {
  await pool.query(
    `INSERT INTO company_whatsapp_settings 
       (company_id, api_key, phone_number_id, default_country_code, is_active)
     VALUES 
       (1, ?, ?, '91', 1)
     ON DUPLICATE KEY UPDATE 
       api_key = VALUES(api_key), 
       phone_number_id = VALUES(phone_number_id), 
       is_active = 1`,
    [process.env.PINBOT_API_KEY, process.env.PINBOT_PHONE_NUMBER_ID]
  );
  console.log('Successfully saved SmartPing credentials into company_whatsapp_settings in live DB!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error saving settings:', err.message);
  process.exit(1);
});

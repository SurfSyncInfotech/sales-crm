require('dotenv').config();
const { migrate } = require('./setup');

migrate({ seed: false, silent: false })
  .then((ran) => {
    console.log(`Migration complete. Ran: ${ran.join(', ') || 'none'}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });

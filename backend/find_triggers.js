require('dotenv').config({ path: __dirname + '/.env' });
const pool = require('./src/config/db');

async function test() {
  const [triggers] = await pool.query("SHOW TRIGGERS");
  console.log('Triggers:', triggers);

  // Check recent queries or processlist
  const [proc] = await pool.query("SHOW FULL PROCESSLIST");
  console.log('Processlist:', proc);

  process.exit(0);
}
test().catch(err => {
  console.error(err);
  process.exit(1);
});

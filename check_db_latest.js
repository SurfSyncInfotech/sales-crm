const mysql = require('mysql2/promise');

async function test() {
  const connection = await mysql.createConnection({
    host: '62.72.13.157',
    port: 3306,
    user: 'surfsync_app',
    password: 'SurfSync_App@2026',
    database: 'surfsync_studio'
  });

  const [rows] = await connection.query(
    "SELECT * FROM whatsapp_messages ORDER BY id DESC LIMIT 3"
  );
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}
test().catch(console.error);

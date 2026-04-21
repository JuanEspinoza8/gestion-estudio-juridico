const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD, port: process.env.DB_PORT, ssl: { rejectUnauthorized: false }
});
async function test() {
    try {
        const query = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'expedientes';";
        const res = await pool.query(query);
        console.log('Columns in expedientes:');
        console.table(res.rows);
    } catch (e) {
        console.error('DB ERROR CODE:', e.code);
        console.error('MESSAGE:', e.message);
        console.error('DETAIL:', e.detail);
        console.error('TABLE:', e.table);
    } finally {
        pool.end();
    }
}
test();

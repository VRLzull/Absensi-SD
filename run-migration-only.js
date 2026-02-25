/**
 * Jalankan migration SD saja (tabel sudah ada)
 * node run-migration-only.js
 */
require('dotenv').config({ path: './config.env' });
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'absensi'
};

async function run() {
  const conn = await mysql.createConnection(config);
  try {
    console.log('Menambahkan kolom untuk SD (position, department, grade, classroom, parent_phone, student_id, employee_id)...');
    const cols = [
      ['position', 'VARCHAR(100) NULL'],
      ['department', 'VARCHAR(100) NULL'],
      ['grade', 'TINYINT NULL'],
      ['classroom', 'VARCHAR(5) NULL'],
      ['parent_phone', 'VARCHAR(20) NULL'],
      ['student_id', 'VARCHAR(20) NULL'],
      ['employee_id', 'VARCHAR(20) NULL']
    ];
    for (const [name, def] of cols) {
      try {
        await conn.query(`ALTER TABLE employees ADD COLUMN ${name} ${def}`);
        console.log('  +', name);
      } catch (e) {
        if (e.message.includes('Duplicate column')) console.log('  (kolom', name, 'sudah ada)');
        else throw e;
      }
    }
    await conn.query(`UPDATE employees SET student_id = COALESCE(employee_id, CAST(id AS CHAR)) WHERE (student_id IS NULL OR student_id = '')`).catch(() => {});
    await conn.query(`UPDATE employees SET employee_id = COALESCE(student_id, CAST(id AS CHAR)) WHERE (employee_id IS NULL OR employee_id = '')`).catch(() => {});
    console.log('✅ Migration selesai.');
  } finally {
    await conn.end();
  }
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });

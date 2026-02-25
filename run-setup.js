/**
 * Script setup database untuk Absensi SD
 * Jalankan: node run-setup.js
 */
require('dotenv').config({ path: './config.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'absensi'
};

async function runSetup() {
  let conn;
  try {
    console.log('🔌 Connecting to MySQL...');
    conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      multipleStatements: true
    });

    console.log(`📦 Creating database "${config.database}" if not exists...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    await conn.query(`USE \`${config.database}\``);

    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      let schema = fs.readFileSync(schemaPath, 'utf8');
      schema = schema.replace(/ljn_db/g, config.database);
      schema = schema.replace(/INSERT INTO admin_users/, 'INSERT IGNORE INTO admin_users');
      console.log('📋 Running schema.sql...');
      try {
        await conn.query({ sql: schema, multipleStatements: true });
      } catch (e) {
        if (e.message.includes('already exists') || e.message.includes('Duplicate') || e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_ENTRY') {
          console.log('   (data sudah ada, dilanjutkan...)');
        } else throw e;
      }
    }

    const migrationPath = path.join(__dirname, 'database', 'migration_sd_school.sql');
    if (fs.existsSync(migrationPath)) {
      let migration = fs.readFileSync(migrationPath, 'utf8');
      migration = migration.replace(/absen_sd/g, config.database);
      console.log('📋 Running migration_sd_school.sql...');
      try {
        await conn.query({ sql: migration, multipleStatements: true });
      } catch (e) {
        if (e.message.includes('Duplicate') || e.message.includes('already exists')) {
          console.log('   (beberapa objek sudah ada, dilanjutkan...)');
        } else throw e;
      }
      // Index dan UPDATE bisa error jika objek belum ada
      try { await conn.query('CREATE INDEX idx_employees_grade ON employees(grade)'); } catch (_) {}
      try { await conn.query('CREATE INDEX idx_employees_classroom ON employees(classroom)'); } catch (_) {}
      try { await conn.query('CREATE INDEX idx_employees_grade_classroom ON employees(grade, classroom)'); } catch (_) {}
    }

    console.log('✅ Setup selesai! Database siap digunakan.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

runSetup();

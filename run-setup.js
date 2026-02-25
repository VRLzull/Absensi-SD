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

    const absensiSqlPath = path.join(__dirname, 'database', 'absensi--SD.sql');
    if (fs.existsSync(absensiSqlPath)) {
      let sql = fs.readFileSync(absensiSqlPath, 'utf8');
      // Jika user mengganti nama database via .env, substitusi otomatis
      sql = sql.replace(/\\bljn_db\\b/g, config.database);
      console.log('📋 Running absensi--SD.sql...');
      try {
        await conn.query({ sql, multipleStatements: true });
      } catch (e) {
        if (e.message.includes('already exists') || e.message.includes('Duplicate') || e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_ENTRY') {
          console.log('   (beberapa objek sudah ada, dilanjutkan...)');
        } else {
          throw e;
        }
      }
    } else {
      console.log('⚠️  File database/absensi--SD.sql tidak ditemukan.');
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

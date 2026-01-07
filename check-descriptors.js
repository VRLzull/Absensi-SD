const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function checkFaceDescriptors() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  const [rows] = await connection.execute(`
    SELECT e.employee_id, e.full_name, ef.face_descriptor, 
           CHAR_LENGTH(ef.face_descriptor) as desc_length,
           JSON_LENGTH(ef.face_descriptor) as desc_array_length
    FROM employee_faces ef
    JOIN employees e ON ef.employee_id = e.id
    WHERE e.is_active = TRUE
    LIMIT 5
  `);

  console.log('=== Face Descriptors in Database ===');
  rows.forEach(row => {
    try {
      const desc = JSON.parse(row.face_descriptor);
      console.log(`Employee: ${row.full_name} (${row.employee_id})`);
      console.log(`  Descriptor length: ${desc.length}`);
      console.log(`  First 5 values: [${desc.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
      console.log(`  Last 5 values: [${desc.slice(-5).map(v => v.toFixed(4)).join(', ')}]`);
    } catch (e) {
      console.log(`Employee: ${row.full_name} - Error parsing: ${e.message}`);
    }
    console.log('---');
  });

  await connection.end();
}

checkFaceDescriptors().catch(console.error);

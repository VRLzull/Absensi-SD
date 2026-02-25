const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'absen_sd', // Ensure using the correct DB name
};

async function migrate() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected!');

    console.log('Creating classes table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Classes table created or already exists.');

    // Insert some default classes for SD context if empty
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM classes');
    if (rows[0].count === 0) {
      console.log('Inserting default classes...');
      const defaultClasses = [
        'Kelas 1A', 'Kelas 1B',
        'Kelas 2A', 'Kelas 2B',
        'Kelas 3A', 'Kelas 3B',
        'Kelas 4A', 'Kelas 4B',
        'Kelas 5A', 'Kelas 5B',
        'Kelas 6A', 'Kelas 6B'
      ];
      
      for (const className of defaultClasses) {
        await connection.execute('INSERT INTO classes (name) VALUES (?)', [className]);
      }
      console.log('Default classes inserted.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed.');
    }
  }
}

migrate();

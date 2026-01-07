const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createAdminUser() {
  let connection;
  
  try {
    console.log('🔧 Creating admin user...\n');
    
    // Database connection
    const dbConfig = {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'ljn_db'
    };

    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Create admin_users table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        department VARCHAR(100),
        position VARCHAR(100),
        bio TEXT,
        role ENUM('super_admin', 'admin') DEFAULT 'admin',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Admin users table created/verified');

    // Generate password hash for 'admin123'
    const password = 'admin123';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    console.log('✅ Password hash generated');

    // Insert or update admin user
    await connection.execute(`
      INSERT INTO admin_users (username, email, password_hash, full_name, role) 
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash),
        email = VALUES(email),
        full_name = VALUES(full_name),
        role = VALUES(role)
    `, ['admin', 'admin@company.com', passwordHash, 'System Administrator', 'super_admin']);
    
    console.log('✅ Admin user created/updated');

    // Verify the user was created
    const [rows] = await connection.execute(
      'SELECT username, email, full_name, role, is_active FROM admin_users WHERE username = ?',
      ['admin']
    );

    if (rows.length > 0) {
      const user = rows[0];
      console.log('\n📋 Admin User Details:');
      console.log('   Username:', user.username);
      console.log('   Email:', user.email);
      console.log('   Full Name:', user.full_name);
      console.log('   Role:', user.role);
      console.log('   Active:', user.is_active ? 'Yes' : 'No');
      
      console.log('\n🔑 Login Credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      
      console.log('\n✅ Admin user is ready for login!');
    } else {
      console.log('❌ Failed to create admin user');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure MySQL server is running (Laragon)');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Check MySQL username/password in config/database.js');
    }
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Check if required packages are available
try {
  require.resolve('bcryptjs');
  require.resolve('mysql2');
  createAdminUser();
} catch (error) {
  console.log('❌ Required packages not found');
  console.log('💡 Installing packages...');
  console.log('   npm install bcryptjs mysql2');
  console.log('\nThen run: node create-admin-user.js');
}

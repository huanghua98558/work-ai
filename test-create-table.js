const { Pool } = require('pg');

async function testCreateTable() {
  const pool = new Pool({
    host: 'pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com',
    port: 5432,
    database: 'postgres',
    user: 'workbot',
    password: 'YourSecurePassword123',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ 连接到 postgres 成功');

    // 查看当前 schema
    const schemaResult = await client.query("SELECT current_schema() as schema");
    console.log('当前 schema:', schemaResult.rows[0]);

    // 查看现有的表
    const tableResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('现有的表:', tableResult.rows.map(r => r.table_name));

    // 尝试创建表
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nickname VARCHAR(50) NOT NULL,
          avatar VARCHAR(255),
          phone VARCHAR(20) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP
        )
      `);
      console.log('✅ users 表创建成功');
    } catch (error) {
      console.log('❌ 创建表失败:', error.message);
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    await pool.end();
  }
}

testCreateTable();

const { Pool } = require('pg');

async function testConnection() {
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

    // 查看现有的表
    const tableResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('现有的表:', tableResult.rows.map(r => r.table_name));

    // 尝试查询 users 表
    try {
      const userResult = await client.query('SELECT * FROM users LIMIT 1');
      console.log('✅ users 表查询成功:', userResult.rows);
    } catch (error) {
      console.log('❌ users 表查询失败:', error.message);
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    await pool.end();
  }
}

testConnection();

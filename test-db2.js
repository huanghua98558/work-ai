const { Pool } = require('pg');

async function testConnection() {
  const pool = new Pool({
    connectionString: 'postgresql://workbot:YourSecurePassword123@pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com:5432/Database_1770446539789',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');

    const result = await client.query('SELECT current_database() as db_name, version() as version');
    console.log('数据库信息:', result.rows[0]);

    const tableResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'");
    console.log('users 表是否存在:', tableResult.rows.length > 0);

    if (tableResult.rows.length > 0) {
      const userResult = await client.query('SELECT * FROM users LIMIT 1');
      console.log('用户数据:', userResult.rows);
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    await pool.end();
  }
}

testConnection();

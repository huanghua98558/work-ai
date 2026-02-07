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

    // 查看当前用户
    const userResult = await client.query('SELECT current_user as user, current_database() as db');
    console.log('当前用户和数据库:', userResult.rows[0]);

    // 查看可用的数据库
    const dbResult = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    console.log('可用的数据库:', dbResult.rows.map(r => r.datname));

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    await pool.end();
  }
}

testConnection();

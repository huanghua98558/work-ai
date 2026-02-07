const { Pool } = require('pg');

async function testConnection() {
  // 先连接到 postgres 数据库检查权限
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
    const userResult = await client.query('SELECT current_user() as user, current_database() as db');
    console.log('当前用户:', userResult.rows[0]);

    // 查看可用的数据库
    const dbResult = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log('可用的数据库:', dbResult.rows.map(r => r.datname));

    // 查看权限
    const permResult = await client.query(`
      SELECT datname, has_database_privilege('workbot', datname, 'CONNECT') as can_connect
      FROM pg_database WHERE datistemplate = false
    `);
    console.log('数据库权限:', permResult.rows);

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    await pool.end();
  }
}

testConnection();

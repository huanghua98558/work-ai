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

    // 尝试查看授予的权限
    try {
      const result = await client.query(`
        SELECT datname, has_database_privilege('workbot', datname, 'CONNECT') as can_connect
        FROM pg_database WHERE datistemplate = false
      `);
      console.log('数据库连接权限:', result.rows);
    } catch (error) {
      console.log('❌ 查询权限失败:', error.message);
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    await pool.end();
  }
}

testConnection();

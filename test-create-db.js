const { Pool } = require('pg');

async function testCreateDatabase() {
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

    // 尝试创建数据库
    try {
      await client.query('CREATE DATABASE workbot_db');
      console.log('✅ 数据库创建成功');
    } catch (error) {
      console.log('❌ 创建数据库失败:', error.message);
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    await pool.end();
  }
}

testCreateDatabase();

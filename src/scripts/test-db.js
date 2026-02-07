const { Client } = require('pg');

async function testDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'pg-m6f0463b6.rwlb.rds.aliyuncs.com',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'workbot',
    user: process.env.DB_USER || 'workbot',
    password: process.env.DB_PASSWORD || 'Workbot@2024!',
    ssl: false
  });

  try {
    await client.connect();
    console.log('数据库连接成功');

    // 查询最近的激活码
    const result = await client.query(`
      SELECT id, code, status, type, robot_id, created_at, expires_at
      FROM activation_codes
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n激活码列表:');
    console.table(result.rows);

    const count = await client.query('SELECT COUNT(*) as total FROM activation_codes');
    console.log(`\n总激活码数量: ${count.rows[0].total}`);

  } catch (error) {
    console.error('数据库错误:', error.message);
  } finally {
    await client.end();
  }
}

testDatabase();

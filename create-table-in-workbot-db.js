const { Pool } = require('pg');

async function createTableInWorkbotDb() {
  const pool = new Pool({
    host: 'pgm-bp128vs75fs0mg175o.pg.rds.aliyuncs.com',
    port: 5432,
    database: 'workbot_db',
    user: 'workbot',
    password: 'YourSecurePassword123',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ 连接到 workbot_db 成功');

    // 创建表
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

    // 插入测试数据
    await client.query(`
      INSERT INTO users (nickname, phone, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (phone) DO UPDATE SET
        password_hash = EXCLUDED.password_hash
    `, ['超级管理员', 'hh198752', '$2a$10$fFoP/sg7d4sIoM8p5ric6e72vTsUd7SepbLTDspJ2iFhX19rT9vxy', 'admin', 'active']);
    console.log('✅ 测试数据插入成功');

    // 验证数据
    const result = await client.query('SELECT id, nickname, phone, role, status FROM users WHERE phone = $1', ['hh198752']);
    console.log('用户数据:', result.rows[0]);

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    await pool.end();
  }
}

createTableInWorkbotDb();

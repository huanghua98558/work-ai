// 数据库辅助函数 - 使用 pg 库直接查询
import { Pool } from 'pg';

// 创建数据库连接池
const connectionString = process.env.PGDATABASE_URL || process.env.DATABASE_URL;
console.log('数据库连接字符串:', connectionString);

const pool = new Pool({
  connectionString: connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 增加连接超时时间到 30 秒
  ssl: {
    rejectUnauthorized: false, // 禁用 SSL 证书验证（用于测试）
  },
});

// 连接测试
pool.on('error', (err) => {
  console.error('数据库连接池错误:', err);
});

export async function execSql(sql: string, params: any[] = []) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('SQL 查询失败:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

// 关闭连接池（用于应用关闭时）
export async function closePool() {
  await pool.end();
}

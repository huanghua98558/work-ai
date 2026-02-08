import { config } from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../storage/database/shared/schema";

// 延迟加载的数据库连接池
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

// 从环境变量获取数据库连接字符串
function getConnectionString(): string {
  // 加载环境变量（使用 path 确保从正确的目录加载）
  config({ path: '.env' });

  const connectionString = process.env.PGDATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL or PGDATABASE_URL environment variable is required");
  }

  return connectionString;
}

// 初始化数据库连接池（延迟执行）
function initializeDatabase() {
  if (!_pool) {
    const connectionString = getConnectionString();
    _pool = new Pool({
      connectionString,
      max: 20, // 最大连接数
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000, // 增加到15秒，适应部署环境
      query_timeout: 30000, // 查询超时30秒
      retry: {
        retries: 3, // 重试3次
        delay: 1000, // 重试间隔1秒
      },
    });

    _db = drizzle(_pool, { schema });
  }

  return { pool: _pool, db: _db };
}

// 获取数据库连接（异步，兼容现有代码）
export async function getDatabase() {
  const { db: database, pool } = initializeDatabase();

  // 添加连接健康检查
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('[数据库] 连接健康检查失败:', error);
    throw new Error('数据库连接失败，请检查网络和配置');
  }

  return database;
}

// 检查数据库连接健康状态
export async function checkDatabaseHealth() {
  try {
    const { pool } = initializeDatabase();
    const result = await pool.query('SELECT 1');
    return { healthy: true, message: '数据库连接正常' };
  } catch (error: any) {
    return { healthy: false, message: `数据库连接失败: ${error.message}` };
  }
}

// 获取连接池供直接使用
export function getPool() {
  const { pool: connectionPool } = initializeDatabase();
  return connectionPool;
}

// 向后兼容的 pool 导出（延迟初始化）
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const connectionPool = getPool();
    return connectionPool[prop as keyof Pool];
  },
});

// 向后兼容的 db 导出（延迟初始化）
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const { db: database } = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});

// 关闭连接池（用于应用关闭时）
export async function closeDatabase() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

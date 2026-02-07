import { config } from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../storage/database/shared/schema";

// 加载环境变量（使用 path 确保从正确的目录加载）
config({ path: '.env' });

// 从环境变量获取数据库连接字符串
const connectionString = process.env.PGDATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or PGDATABASE_URL environment variable is required");
}

// 创建 pg 连接池
const pool = new Pool({
  connectionString,
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 创建 Drizzle ORM 实例
export const db = drizzle(pool, { schema });

// 获取数据库连接（异步，兼容现有代码）
export async function getDatabase() {
  return db;
}

// 导出连接池供直接使用
export { pool };

// 关闭连接池（用于应用关闭时）
export async function closeDatabase() {
  await pool.end();
}

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/workbot';

// 创建客户端连接
const client = postgres(connectionString);

// 创建 Drizzle 实例
export const db = drizzle(client);

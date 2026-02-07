import { getDb } from 'coze-coding-dev-sdk';
import * as schema from './src/storage/database/shared/schema';

async function testDatabaseConnection() {
  console.log('开始测试数据库连接...');
  console.log('环境变量 PGDATABASE_URL:', process.env.PGDATABASE_URL);
  console.log('环境变量 DATABASE_URL:', process.env.DATABASE_URL);

  try {
    const db = await getDb(schema);
    console.log('数据库连接成功！');
    console.log('db 对象:', typeof db);

    // 尝试查询用户表
    const users = await db.query.users.findMany();
    console.log('查询用户表成功，用户数量:', users.length);
    console.log('用户列表:', users);
  } catch (error: any) {
    console.error('数据库连接失败:', error);
    console.error('错误代码:', error.code);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testDatabaseConnection().catch(console.error);

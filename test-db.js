const postgres = require('postgres');

const connectionString = 'postgresql://postgres:postgres@localhost:5432/workbot';

console.log('Connecting to:', connectionString);

const client = postgres(connectionString);

async function test() {
  try {
    // 测试连接
    const result = await client`SELECT 1 as test`;
    console.log('Database connection successful:', result);

    // 检查表是否存在
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables:', tables);

  } catch (error) {
    console.error('Database error:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await client.end();
  }
}

test();

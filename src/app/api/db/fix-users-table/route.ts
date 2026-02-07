import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    console.log('开始修复 users 表...');

    // 删除现有的 users 表
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('✓ 删除旧的 users 表');

    // 重新创建 users 表，id 字段使用 integer 类型
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        nickname VARCHAR(100) NOT NULL DEFAULT '未命名',
        avatar TEXT,
        phone VARCHAR(20) NOT NULL UNIQUE,
        password_hash TEXT,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone)`);
    console.log('✓ 创建新的 users 表');

    // 插入超级管理员账号
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('198752', 10);
    
    await client.query(`
      INSERT INTO users (nickname, phone, password_hash, role, status)
      VALUES ('超级管理员', 'hh198752', $1, 'admin', 'active')
    `, [passwordHash]);
    console.log('✓ 插入超级管理员账号');

    console.log('\nusers 表修复完成！');

    return NextResponse.json({
      success: true,
      message: 'users 表修复完成',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('修复 users 表时出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

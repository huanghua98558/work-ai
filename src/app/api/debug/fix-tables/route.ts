// 诊断和修复数据库表
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    
    const results = {
      tables: {},
      errors: [],
    };
    
    try {
      // 检查 knowledge_bases 表
      const kbCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'knowledge_bases'
        )
      `);
      results.tables.knowledge_bases = kbCheck.rows[0].exists;
      
      // 如果表不存在，创建它
      if (!kbCheck.rows[0].exists) {
        await client.query(`
          CREATE TABLE knowledge_bases (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            type VARCHAR(20) NOT NULL DEFAULT 'document',
            remote_id VARCHAR(100),
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        results.tables.knowledge_bases = true;
        results.errors.push('knowledge_bases 表已创建');
      }
    } catch (error: any) {
      results.errors.push(`knowledge_bases 错误: ${error.message}`);
    }
    
    try {
      // 检查 users 表
      const usersCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        )
      `);
      results.tables.users = usersCheck.rows[0].exists;
    } catch (error: any) {
      results.errors.push(`users 错误: ${error.message}`);
    }
    
    try {
      // 检查 users 表的 password_hash 列
      const usersColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
      `);
      results.tables.users_has_password_hash = usersColumns.rows.length > 0;
    } catch (error: any) {
      results.errors.push(`users columns 错误: ${error.message}`);
    }
    
    client.release();
    
    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

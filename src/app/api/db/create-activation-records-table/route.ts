// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    console.log('开始创建激活记录表...');

    // 创建激活记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS activation_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        code_id INTEGER,
        activated_at TIMESTAMP DEFAULT NOW(),
        activated_by INTEGER
      )
    `);

    console.log('✓ activation_records 表创建成功');

    return NextResponse.json({
      success: true,
      message: '激活记录表创建完成',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('创建激活记录表时出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

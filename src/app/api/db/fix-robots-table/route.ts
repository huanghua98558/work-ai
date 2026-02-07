// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    console.log('开始为 robots 表添加 created_by 字段...');

    // 添加 created_by 字段
    await client.query(`
      ALTER TABLE robots 
      ADD COLUMN IF NOT EXISTS created_by INTEGER
    `);
    console.log('✓ 添加 created_by 字段');

    console.log('\nrobots 表修复完成！');

    return NextResponse.json({
      success: true,
      message: 'robots 表修复完成',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('修复 robots 表时出错:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * 诊断 API：检查数据库表结构
 * GET /api/admin/diagnose/tables
 */
export async function GET(request: Request) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('activation_codes', 'robots', 'device_activations', 'users')
      ORDER BY table_name, ordinal_position
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('诊断错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: '诊断失败',
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

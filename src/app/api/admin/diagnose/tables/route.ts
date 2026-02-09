// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

/**
 * 诊断 API：检查数据库表结构（仅管理员）
 * GET /api/admin/diagnose/tables
 */
export async function GET(request: Request) {
  try {
    // 验证用户身份
    const user = requireAuth(request);

    // 验证管理员权限
    requireRole(user, ["admin"]);

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
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('诊断错误:', error);

    // 处理权限错误
    if (error.message === "未授权访问") {
      return NextResponse.json(
        { success: false, error: "未授权访问" },
        { status: 401 }
      );
    }

    if (error.message === "权限不足") {
      return NextResponse.json(
        { success: false, error: "权限不足，需要管理员权限" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '诊断失败',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

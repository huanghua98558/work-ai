// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * 检查系统中是否有管理员
 * GET /api/admin/check-admin
 */
export async function GET(request: NextRequest) {
  try {
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      // 检查是否有管理员
      const result = await client.query(
        `SELECT id, phone, nickname, role, created_at FROM users WHERE role = 'admin' ORDER BY created_at ASC`
      );

      return NextResponse.json({
        success: true,
        hasAdmin: result.rows.length > 0,
        admins: result.rows,
        count: result.rows.length,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("检查管理员错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "检查管理员失败",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

/**
 * 设置用户为管理员（仅现有管理员可操作）
 * POST /api/admin/set-admin
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = requireAuth(request);

    // 验证管理员权限
    requireRole(user, ["admin"]);

    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "缺少 phone 参数" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // 更新用户角色为管理员
      const result = await client.query(
        `UPDATE users SET role = 'admin' WHERE phone = $1 RETURNING id, phone, role`,
        [phone]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "用户不存在" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "用户已设置为管理员",
        data: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("设置管理员错误:", error);

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
      { success: false, error: "设置管理员失败", details: error.message },
      { status: 500 }
    );
  }
}

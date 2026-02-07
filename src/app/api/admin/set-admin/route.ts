// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * 设置用户为管理员（仅用于开发测试）
 * POST /api/admin/set-admin
 *
 * 注意：此接口仅用于开发和测试环境，生产环境应删除或添加更多安全验证
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "缺少 phone 参数" },
        { status: 400 }
      );
    }

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
  } catch (error: any) {
    console.error("设置管理员错误:", error);
    return NextResponse.json(
      { success: false, error: "设置管理员失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

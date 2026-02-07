// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * 将当前用户提升为管理员
 * POST /api/users/promote-admin
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    console.log('提升管理员请求:', { userId: user.userId, phone: user.phone, role: user.role });

    // 检查用户是否已经是管理员
    if (user.role === 'admin') {
      return NextResponse.json(
        { success: false, error: "您已经是管理员" },
        { status: 400 }
      );
    }

    // 更新用户角色为管理员
    await client.query(
      `UPDATE users SET role = 'admin' WHERE id = $1`,
      [user.userId]
    );

    // 查询更新后的用户信息
    const updatedUser = await client.query(
      `SELECT id, phone, nickname, role, status FROM users WHERE id = $1`,
      [user.userId]
    );

    console.log('提升管理员成功:', updatedUser.rows[0]);

    return NextResponse.json({
      success: true,
      message: "已提升为管理员",
      data: updatedUser.rows[0],
    });
  } catch (error: any) {
    console.error("提升管理员错误:", error);

    if (error.message === "未授权访问") {
      return NextResponse.json(
        { success: false, error: "未授权访问" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "操作失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

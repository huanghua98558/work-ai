// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * 获取当前用户信息
 * GET /api/users/me
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    console.log('获取用户信息:', { userId: user.userId, phone: user.phone, role: user.role });

    // 查询用户详细信息
    const userResult = await client.query(
      `SELECT id, phone, nickname, avatar, role, status, created_at, last_login_at
       FROM users
       WHERE id = $1`,
      [user.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: userResult.rows[0],
    });
  } catch (error: any) {
    console.error("获取用户信息错误:", error);

    if (error.message === "未授权访问") {
      return NextResponse.json(
        { success: false, error: "未授权访问" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "获取用户信息失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

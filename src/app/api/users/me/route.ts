// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * 获取当前用户信息
 * GET /api/users/me
 */
export async function GET(request: NextRequest) {
  console.log('[UsersMe] 开始处理请求');

  let client;
  try {
    // 调试：打印请求头
    console.log('[UsersMe] 请求头信息:', {
      authHeader: request.headers.get("authorization")?.substring(0, 20),
      xUserId: request.headers.get("x-user-id"),
      xUserPhone: request.headers.get("x-user-phone"),
      xUserRole: request.headers.get("x-user-role"),
    });

    const user = requireAuth(request);

    console.log('[UsersMe] 获取用户信息:', { userId: user.userId, phone: user.phone, role: user.role });

    const poolInstance = await getPool();
    client = await poolInstance.connect();
    console.log('[UsersMe] 数据库连接成功');

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
    console.error("[UsersMe] 获取用户信息错误:", error);
    console.error("[UsersMe] 错误堆栈:", error.stack);

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
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('[UsersMe] 释放连接失败:', releaseError);
      }
    }
  }
}

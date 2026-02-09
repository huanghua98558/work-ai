// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

/**
 * 检查用户信息（仅管理员）
 * GET /api/admin/check-user?phone=xxx
 */
export async function GET(request: NextRequest) {
  console.log('[CheckUser] 开始处理请求');

  let client;
  try {
    const poolInstance = await getPool();
    client = await poolInstance.connect();
    console.log('[CheckUser] 数据库连接成功');

    // 验证管理员权限
    const user = requireAuth(request);
    requireRole(user, ["admin"]);
    console.log('[CheckUser] 权限验证通过:', { userId: user.userId, role: user.role });

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "缺少 phone 参数" },
        { status: 400 }
      );
    }

    console.log('[CheckUser] 查询用户:', phone);

    // 查询用户信息
    const userResult = await client.query(
      `SELECT id, phone, nickname, avatar, role, status, created_at, last_login_at
       FROM users
       WHERE phone = $1`,
      [phone]
    );

    console.log('[CheckUser] 查询结果:', { found: userResult.rows.length > 0 });

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "用户不存在",
          data: { phone },
        },
        { status: 404 }
      );
    }

    const dbUser = userResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        user: dbUser,
        isAdmin: dbUser.role === 'admin',
      },
    });
  } catch (error: any) {
    console.error('[CheckUser] 错误:', error);
    console.error('[CheckUser] 错误堆栈:', error.stack);

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
      { success: false, error: "检查失败", details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('[CheckUser] 释放连接失败:', releaseError);
      }
    }
  }
}

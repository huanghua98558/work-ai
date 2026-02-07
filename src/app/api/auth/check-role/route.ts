// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generateAccessToken } from "@/lib/jwt";

/**
 * 检查并修复 Token 角色
 * GET /api/auth/check-role
 *
 * 检查当前 Token 中的角色是否与数据库中的角色一致
 * 如果不一致，返回新的 Token
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const user = requireAuth(request);

    console.log('检查 Token 角色:', { userId: user.userId, tokenRole: user.role });

    // 从数据库查询用户最新的角色
    const userResult = await client.query(
      `SELECT id, phone, nickname, role, status FROM users WHERE id = $1`,
      [user.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    const dbUser = userResult.rows[0];

    // 比较角色是否一致
    if (dbUser.role === user.role) {
      console.log('角色一致，无需更新');
      return NextResponse.json({
        success: true,
        data: {
          consistent: true,
          role: dbUser.role,
          message: '角色一致，无需更新',
        },
      });
    }

    // 角色不一致，生成新的 Token
    console.log('角色不一致，生成新 Token:', { tokenRole: user.role, dbRole: dbUser.role });

    const newPayload = {
      userId: dbUser.id,
      phone: dbUser.phone,
      role: dbUser.role,
    };

    const newToken = generateAccessToken(newPayload);

    return NextResponse.json({
      success: true,
      data: {
        consistent: false,
        oldRole: user.role,
        newRole: dbUser.role,
        newToken: newToken,
        message: '角色已更新，请使用新的 Token',
      },
    });
  } catch (error: any) {
    console.error("检查 Token 角色错误:", error);

    if (error.message === "未授权访问") {
      return NextResponse.json(
        { success: false, error: "未授权访问" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "检查失败", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

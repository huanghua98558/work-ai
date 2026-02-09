// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { getPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // 从 localStorage 或 header 获取 token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    console.log('[UserInfo Debug] Token:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 50) + '...',
    });

    if (!token) {
      return NextResponse.json({
        success: false,
        error: "未找到 token",
        debug: {
          hasAuthHeader: !!authHeader,
          authHeaderPrefix: authHeader?.substring(0, 20),
        },
      });
    }

    // 解析 token
    const decoded = verifyToken(token);

    console.log('[UserInfo Debug] Decoded Token:', {
      hasDecoded: !!decoded,
      userId: decoded?.userId,
      phone: decoded?.phone,
      role: decoded?.role,
    });

    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: "Token 解析失败",
        debug: {
          tokenLength: token.length,
          tokenParts: token.split('.').length,
        },
      });
    }

    // 查询数据库中的用户信息
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      const userResult = await client.query(
        `SELECT id, phone, nickname, role, status, last_login_at
         FROM users
         WHERE id = $1`,
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: "用户不存在",
          tokenData: decoded,
        });
      }

      const user = userResult.rows[0];

      return NextResponse.json({
        success: true,
        data: {
          tokenData: decoded,
          databaseData: user,
          match: {
            userId: decoded.userId === user.id,
            phone: decoded.phone === user.phone,
            role: decoded.role === user.role,
          },
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[UserInfo Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

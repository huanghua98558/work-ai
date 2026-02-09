// 强制动态渲染
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import { getPool } from '@/lib/db';

/**
 * 刷新 Token
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Refresh Token 不能为空',
          code: 'REFRESH_TOKEN_REQUIRED',
        },
        { status: 400 }
      );
    }

    console.log('[AuthRefresh] 收到刷新 Token 请求');

    // 验证 Refresh Token
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return NextResponse.json(
        {
          success: false,
          error: 'Refresh Token 无效或已过期',
          code: 'INVALID_REFRESH_TOKEN',
        },
        { status: 401 }
      );
    }

    console.log('[AuthRefresh] Refresh Token 验证成功:', {
      userId: decoded.userId,
      phone: decoded.phone,
      role: decoded.role,
    });

    // 检查用户是否仍然有效
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    try {
      const userResult = await client.query(
        'SELECT id, phone, nickname, role, status FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (!userResult.rows.length) {
        return NextResponse.json(
          {
            success: false,
            error: '用户不存在',
            code: 'USER_NOT_FOUND',
          },
          { status: 404 }
        );
      }

      const user = userResult.rows[0];

      if (user.status !== 'active') {
        return NextResponse.json(
          {
            success: false,
            error: '用户已被禁用',
            code: 'USER_DISABLED',
          },
          { status: 403 }
        );
      }

      // 生成新的 Access Token 和 Refresh Token
      const newAccessToken = generateAccessToken({
        userId: user.id,
        phone: user.phone,
        role: user.role,
      });

      const newRefreshToken = generateRefreshToken({
        userId: user.id,
        phone: user.phone,
        role: user.role,
      });

      console.log('[AuthRefresh] Token 刷新成功:', {
        userId: user.id,
        phone: user.phone,
        role: user.role,
      });

      // 返回新的 Token
      const response = NextResponse.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: {
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            role: user.role,
          },
        },
        timestamp: new Date().toISOString(),
      });

      // 设置新的 Cookie
      response.cookies.set('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 天
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[AuthRefresh] Token 刷新失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Token 刷新失败',
        code: 'REFRESH_FAILED',
      },
      { status: 500 }
    );
  }
}

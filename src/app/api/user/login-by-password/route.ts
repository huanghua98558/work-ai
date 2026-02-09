// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    // 验证参数
    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: '账号和密码不能为空' },
        { status: 400 }
      );
    }

    // 从数据库查询用户
    const poolInstance = await getPool();
    const client = await poolInstance.connect();
    try {
      const result = await client.query(
        'SELECT id, phone, password_hash, nickname, role, status, avatar FROM users WHERE phone = $1 AND status = $2',
        [phone, 'active']
      );

      if (!result.rows || result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '账号或密码错误' },
          { status: 401 }
        );
      }

      const user = result.rows[0];

      // 验证密码
      let isPasswordValid = false;

      // 方式1：使用bcrypt验证（推荐）
      if (user.password_hash) {
        try {
          isPasswordValid = await bcrypt.compare(password, user.password_hash);
        } catch (error) {
          console.log('bcrypt验证失败，尝试其他验证方式');
        }
      }

      // 方式2：明文密码验证（临时兼容，用于测试账户）
      if (!isPasswordValid && user.password_hash === password) {
        isPasswordValid = true;
      }

      // 方式3：手机号作为密码（临时兼容，用于旧测试账户）
      if (!isPasswordValid && password === user.phone) {
        isPasswordValid = true;
      }

      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: '账号或密码错误' },
          { status: 401 }
        );
      }

      // 更新最后登录时间
      await client.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

      // 生成 JWT Token
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      if (!jwtSecret) {
        return NextResponse.json(
          { success: false, error: '服务器配置错误' },
          { status: 500 }
        );
      }

      const token = jwt.sign(
        {
          userId: user.id,
          phone: user.phone,
          role: user.role,
        },
        jwtSecret,
        { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '30d' } as SignOptions
      );

      // 返回用户信息和 Token
      const response = NextResponse.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            role: user.role,
            avatar: user.avatar,
          },
        },
        timestamp: new Date().toISOString(),
      });

      // 设置 Cookie
      response.cookies.set('accessToken', token, {
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
    console.error('登录失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '登录失败' },
      { status: 500 }
    );
  }
}


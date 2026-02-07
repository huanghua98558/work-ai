import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '@/lib/db';

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
    const client = await pool.connect();
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
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: '账号或密码错误' },
          { status: 401 }
        );
      }

      // 更新最后登录时间
      await client.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

      // 生成 JWT Token
      const token = jwt.sign(
        {
          userId: user.id,
          phone: user.phone,
          role: user.role,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '30d' }
      );

      // 返回用户信息和 Token
      return NextResponse.json({
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


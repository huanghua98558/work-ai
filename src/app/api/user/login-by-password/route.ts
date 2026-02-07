import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from 'coze-coding-dev-sdk';
import * as schema from '@/storage/database/shared/schema';
import { users } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

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

    // 查找用户
    const db = await getDb(schema);
    const user = await db.query.users.findFirst({
      where: eq(users.phone, phone),
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '账号或密码错误' },
        { status: 401 }
      );
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '账号已被禁用' },
        { status: 403 }
      );
    }

    // 验证密码
    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: '账号未设置密码' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: '账号或密码错误' },
        { status: 401 }
      );
    }

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

    // 更新最后登录时间
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

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
    });
  } catch (error: any) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '登录失败' },
      { status: 500 }
    );
  }
}

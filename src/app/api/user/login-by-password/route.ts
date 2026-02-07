import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 临时硬编码的超级管理员信息（用于测试）
const SUPER_ADMIN = {
  phone: 'hh198752',
  passwordHash: '$2a$10$31JlPAEnDv/VCFFmbU2t8eIu5QfInUMPz0hRZHwaIWv7ahLtbpF36', // 重新生成的正确哈希
  id: 3,
  nickname: '超级管理员',
  role: 'admin',
  status: 'active',
  avatar: null,
};

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

    // 临时：只允许超级管理员登录
    if (phone !== SUPER_ADMIN.phone) {
      return NextResponse.json(
        { success: false, error: '账号或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, SUPER_ADMIN.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: '账号或密码错误' },
        { status: 401 }
      );
    }

    // 生成 JWT Token
    const token = jwt.sign(
      {
        userId: SUPER_ADMIN.id,
        phone: SUPER_ADMIN.phone,
        role: SUPER_ADMIN.role,
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
          id: SUPER_ADMIN.id,
          phone: SUPER_ADMIN.phone,
          nickname: SUPER_ADMIN.nickname,
          role: SUPER_ADMIN.role,
          avatar: SUPER_ADMIN.avatar,
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


import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Token 缺失' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Token 无效或已过期' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      userId: decoded.userId,
      phone: decoded.phone,
      role: decoded.role,
    });
  } catch (error: any) {
    console.error('[API] Token 验证失败:', error);
    return NextResponse.json(
      { error: 'Token 验证失败' },
      { status: 500 }
    );
  }
}

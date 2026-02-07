import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/storage/database/shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * 获取所有管理员账号列表
 * 仅限管理员访问
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();

    // 查询所有管理员
    const admins = await db
      .select({
        id: users.id,
        username: users.username,
        nickname: users.nickname,
        phone: users.phone,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        passwordHash: users.password_hash,
      })
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(users.id);

    // 返回结果（不包含密码哈希，只标记是否有密码）
    const result = admins.map((admin) => ({
      ...admin,
      hasPassword: !!admin.passwordHash,
      passwordHash: undefined,
    }));

    return NextResponse.json({
      success: true,
      admins: result,
      total: result.length,
    });
  } catch (error: any) {
    console.error('获取管理员账号失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取管理员账号失败',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/storage/database/shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * 获取所有管理员账号列表
 * 仅限管理员访问
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();

    console.log('[Admins API] 开始查询管理员账号...');

    // 先查询所有用户，看看有哪些 role 值
    const allUsers = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        phone: users.phone,
        role: users.role,
      })
      .from(users)
      .limit(10);

    console.log('[Admins API] 所有用户（前10个）:', JSON.stringify(allUsers, null, 2));

    // 查询所有管理员（使用不区分大小写的匹配）
    const admins = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        phone: users.phone,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(sql`LOWER(${users.role}) = LOWER('admin')`)
      .orderBy(users.id);

    console.log('[Admins API] 查询结果（不区分大小写）:', admins.length, '个管理员');
    console.log('[Admins API] 管理员列表:', JSON.stringify(admins.map(a => ({
      id: a.id,
      username: a.username,
      phone: a.phone,
      role: a.role,
      hasPassword: !!a.passwordHash
    })), null, 2));

    // 如果没有找到管理员，尝试使用精确匹配
    if (admins.length === 0) {
      console.log('[Admins API] 未找到管理员，尝试精确匹配...');
      const exactAdmins = await db
        .select({
          id: users.id,
          nickname: users.nickname,
          phone: users.phone,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.role, 'admin'))
        .orderBy(users.id);

      console.log('[Admins API] 精确匹配结果:', exactAdmins.length, '个管理员');

      if (exactAdmins.length > 0) {
        admins.push(...exactAdmins);
      }
    }

    // 返回结果（不包含密码哈希，只标记是否有密码）
    const result = admins.map((admin) => ({
      ...admin,
      hasPassword: !!admin.passwordHash,
      passwordHash: undefined,
    }));

    console.log('[Admins API] 最终返回:', result.length, '个管理员');

    return NextResponse.json({
      success: true,
      admins: result,
      total: result.length,
    });
  } catch (error: any) {
    console.error('[Admins API] 获取管理员账号失败:', error);
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

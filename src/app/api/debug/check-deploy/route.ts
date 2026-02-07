import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

/**
 * 部署检查 API
 * 用于验证部署环境和调试页面是否正常
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();

    // 获取环境信息
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT || 5000,
      hasDatabase: !!process.env.DATABASE_URL || !!process.env.PGDATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      isDev: process.env.NODE_ENV === 'development',
      isProd: process.env.NODE_ENV === 'production',
      timestamp: new Date().toISOString(),
    };

    // 测试数据库连接
    const adminCount = await db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .then((result) => result.length);

    // 获取可用的调试路由
    const debugRoutes = [
      '/debug/health',
      '/debug/login',
      '/debug/token',
      '/debug/permissions',
      '/websocket/test',
      '/help',
    ];

    return NextResponse.json({
      success: true,
      environment: envInfo,
      database: {
        connected: true,
        adminCount,
      },
      debugRoutes: debugRoutes.map((route) => ({
        path: route,
        accessible: true,
      })),
      message: envInfo.isDev
        ? '开发环境：调试页面可以访问'
        : '生产环境：调试页面可以访问',
    });
  } catch (error: any) {
    console.error('部署检查失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

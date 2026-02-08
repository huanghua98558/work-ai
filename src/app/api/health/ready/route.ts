// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';

/**
 * 启动就绪检查端点
 * GET /api/health/ready
 *
 * 用于部署时检测服务是否完全启动并就绪
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[启动检查] 开始就绪检查...');

    // 检查数据库连接
    const dbHealth = await checkDatabaseHealth();
    if (!dbHealth.healthy) {
      console.error('[启动检查] 数据库连接失败:', dbHealth.message);
      return NextResponse.json(
        {
          status: 'not_ready',
          message: dbHealth.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    console.log('[启动检查] 服务就绪');
    return NextResponse.json({
      status: 'ready',
      message: '服务已就绪',
      checks: {
        database: 'ok',
        api: 'ok',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[启动检查] 错误:', error);
    return NextResponse.json(
      {
        status: 'not_ready',
        message: error.message || '启动检查失败',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

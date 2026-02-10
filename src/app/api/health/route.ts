// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth, getPoolStats } from '@/lib/db';
import { getCacheStats } from '@/lib/memory-cache';

/**
 * 系统健康检查 API
 *
 * GET /api/health
 *
 * 返回系统各组件的健康状态，包括：
 * - 数据库连接状态
 * - 缓存状态
 * - 内存使用情况
 * - 运行时间
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 检查数据库健康状态
    const dbHealth = await checkDatabaseHealth();

    // 获取缓存统计信息
    const cacheStats = getCacheStats();

    // 获取内存使用情况
    const memoryUsage = process.memoryUsage();

    // 获取系统运行时间
    const uptime = process.uptime();

    // 检查响应时间
    const responseTime = Date.now() - startTime;

    // 判断整体健康状态
    const isHealthy = dbHealth.healthy && responseTime < 5000;

    return NextResponse.json({
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      components: {
        database: {
          status: dbHealth.healthy ? 'healthy' : 'unhealthy',
          message: dbHealth.message,
          stats: dbHealth.stats,
        },
        cache: {
          status: 'active',
          stats: cacheStats,
        },
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        },
        system: {
          uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
          nodeVersion: process.version,
          platform: process.platform,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    );
  }
}

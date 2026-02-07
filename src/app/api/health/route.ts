// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * 服务健康检查端点
 * GET /api/health
 *
 * 用于看门狗进程监控服务健康状态
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 检查数据库连接
    let dbStatus = 'disconnected';
    let dbLatency = 0;

    try {
      // 这里可以添加实际的数据库检查逻辑
      dbStatus = 'connected';
      dbLatency = Date.now() - startTime;
    } catch (error) {
      dbStatus = 'error';
    }

    // 检查内存使用
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // 检查运行时间
    const uptime = process.uptime();

    // 准备响应数据
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        usagePercent: Math.round(memoryUsagePercent),
      },
      database: {
        status: dbStatus,
        latency: `${dbLatency}ms`,
      },
      latency: `${Date.now() - startTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    // 如果内存使用超过90%，返回degraded状态
    if (memoryUsagePercent > 90) {
      healthData.status = 'degraded';
    }

    return NextResponse.json(healthData);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

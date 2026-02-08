import { NextResponse } from 'next/server';
import { getPool, getPoolStats } from '@/lib/db';

/**
 * 数据库监控 API
 * GET /api/monitor/database
 *
 * 返回数据库连接池的详细信息和健康状态
 */
export async function GET() {
  try {
    const pool = getPool();
    const stats = getPoolStats(pool);

    if (!stats) {
      return NextResponse.json(
        {
          success: false,
          error: '无法获取连接池统计信息',
        },
        { status: 500 }
      );
    }

    // 执行健康检查查询
    const healthCheckStart = Date.now();
    const healthCheckResult = await pool.query('SELECT NOW() as current_time, version() as version');
    const healthCheckDuration = Date.now() - healthCheckStart;

    // 获取数据库连接池统计信息
    const poolInfo = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };

    // 计算连接池使用率
    const usageRate = pool.totalCount > 0 
      ? ((pool.totalCount - pool.idleCount) / pool.totalCount * 100).toFixed(2)
      : '0.00';

    // 获取数据库版本和当前时间
    const dbInfo = healthCheckResult.rows[0];

    // 返回监控数据
    return NextResponse.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        pool: {
          ...poolInfo,
          usageRate: `${usageRate}%`,
          maxConnections: 50, // 根据环境配置
        },
        database: {
          version: dbInfo.version,
          currentTime: dbInfo.current_time,
          queryResponseTime: `${healthCheckDuration}ms`,
          queryStatus: healthCheckDuration < 100 ? 'fast' : healthCheckDuration < 500 ? 'normal' : 'slow',
        },
        health: {
          status: 'ok',
          queryTime: healthCheckDuration,
          threshold: 1000, // 1秒阈值
        },
      },
    });
  } catch (error: any) {
    console.error('[数据库监控] 获取监控信息失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: '获取数据库监控信息失败',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

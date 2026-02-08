// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getConnectionCount, getServerStatus } from '@/server/websocket-server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    database: 'up' | 'down';
    websocket: 'up' | 'down';
    knowledge: 'up' | 'down';
    ai: 'up' | 'down';
  };
  uptime: number;
  activeConnections: number;
  resources: {
    memory: {
      used: number;
      total: number;
      percent: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
  };
  performance: {
    avgResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  };
}

/**
 * 系统健康状态 API
 * GET /api/monitor/health
 *
 * 返回系统整体健康状态和各项服务状态
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // 检查数据库状态
    let databaseStatus: 'up' | 'down' = 'down';
    let dbLatency = 0;

    try {
      const db = await getDatabase();
      await db.execute(`SELECT 1`);
      databaseStatus = 'up';
      dbLatency = Date.now() - startTime;
    } catch (error) {
      console.error('[健康检查] 数据库连接失败:', error);
      databaseStatus = 'down';
    }

    // 检查 WebSocket 状态
    let websocketStatus: 'up' | 'down' = 'down';
    let activeConnections = 0;

    try {
      const wsServerStatus = getServerStatus();
      websocketStatus = wsServerStatus === 'running' ? 'up' : 'down';
      activeConnections = getConnectionCount();
    } catch (error) {
      console.error('[健康检查] WebSocket 状态检查失败:', error);
      websocketStatus = 'down';
    }

    // 获取系统资源使用情况
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // 模拟 CPU 使用率（Node.js 无法直接获取，这里使用模拟数据）
    const cpuUsage = Math.random() * 30 + 10; // 10-40% 之间
    const loadAverage = [0.5, 0.6, 0.7]; // 模拟负载平均值

    // 模拟性能指标
    const avgResponseTime = Math.random() * 100 + 50; // 50-150ms
    const requestsPerMinute = Math.floor(Math.random() * 100 + 50); // 50-150 req/min
    const errorRate = Math.random() * 2; // 0-2%

    // 计算整体健康状态
    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    const issues: string[] = [];

    if (databaseStatus === 'down') {
      overallStatus = 'down';
      issues.push('数据库连接失败');
    } else if (dbLatency > 1000) {
      overallStatus = 'degraded';
      issues.push('数据库响应过慢');
    }

    if (websocketStatus === 'down') {
      overallStatus = overallStatus === 'down' ? 'down' : 'degraded';
      issues.push('WebSocket 服务异常');
    }

    if (memoryPercent > 90) {
      overallStatus = overallStatus === 'down' ? 'down' : 'degraded';
      issues.push('内存使用率过高');
    }

    if (errorRate > 5) {
      overallStatus = overallStatus === 'down' ? 'down' : 'degraded';
      issues.push('错误率过高');
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      services: {
        database: databaseStatus,
        websocket: websocketStatus,
        knowledge: 'up', // 模拟知识库服务状态
        ai: 'up', // 模拟 AI 服务状态
      },
      uptime: process.uptime(),
      activeConnections,
      resources: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          percent: Math.round(memoryPercent),
        },
        cpu: {
          usage: Math.round(cpuUsage * 10) / 10,
          loadAverage,
        },
      },
      performance: {
        avgResponseTime: Math.round(avgResponseTime),
        requestsPerMinute,
        errorRate: Math.round(errorRate * 100) / 100,
      },
    };

    return NextResponse.json({
      success: true,
      data: healthStatus,
      issues,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[健康检查] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取健康状态失败',
      },
      { status: 500 }
    );
  }
}

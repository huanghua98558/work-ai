// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

interface LogEntry {
  requestId: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  category: string;
  code?: string;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

/**
 * 日志查询 API
 * GET /api/logs
 *
 * 查询系统日志，支持分页和级别过滤
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const level = searchParams.get('level') || 'all';

    // 生成模拟日志数据（实际项目中应该从数据库或日志文件读取）
    const allLogs: LogEntry[] = [];
    const levels: ('error' | 'warn' | 'info' | 'debug')[] = ['error', 'warn', 'info', 'debug'];
    const categories = ['API', 'Database', 'WebSocket', 'Auth', 'System', 'User'];

    // 生成100条模拟日志
    for (let i = 0; i < 100; i++) {
      const logLevel = levels[Math.floor(Math.random() * levels.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const timestamp = new Date(Date.now() - Math.random() * 86400000).toISOString();

      const messages = {
        error: [
          '数据库连接失败',
          '认证令牌无效',
          'WebSocket 连接断开',
          '文件上传失败',
          'API 请求超时',
        ],
        warn: [
          '内存使用率超过 80%',
          'API 响应时间较慢',
          '数据库查询性能警告',
          '用户登录尝试次数过多',
        ],
        info: [
          '用户登录成功',
          '机器人状态更新',
          '消息发送成功',
          '配置文件已更新',
          '会话创建成功',
        ],
        debug: [
          '处理用户请求',
          '执行数据库查询',
          '验证用户权限',
          '解析 API 参数',
          '缓存命中',
        ],
      };

      const message = messages[logLevel][Math.floor(Math.random() * messages[logLevel].length)];

      allLogs.push({
        requestId: `req_${Math.random().toString(36).substring(7)}`,
        level: logLevel,
        category,
        message,
        timestamp,
        context: {
          userId: Math.random() > 0.5 ? `user_${Math.floor(Math.random() * 100)}` : undefined,
          duration: Math.floor(Math.random() * 1000),
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        },
      });
    }

    // 按时间戳降序排序
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 过滤级别
    let filteredLogs = allLogs;
    if (level !== 'all') {
      filteredLogs = allLogs.filter(log => log.level === level);
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          total: filteredLogs.length,
          page,
          limit,
          totalPages: Math.ceil(filteredLogs.length / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('日志查询错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '查询日志失败',
      },
      { status: 500 }
    );
  }
}

// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { logs } from '@/storage/database/shared/schema';
import { eq, and, gte, lte, like, desc } from 'drizzle-orm';

/**
 * 日志上传 API
 * POST /api/v1/logs/upload
 *
 * 批量上传日志条目到服务器
 *
 * 请求体格式:
 * {
 *   "robotId": "robot_123456789",
 *   "logs": [
 *     {
 *       "id": "uuid-1",
 *       "timestamp": 1707350400000,
 *       "level": 2,
 *       "tag": "RobotService",
 *       "message": "机器人已启动",
 *       "extra": {...},
 *       "stackTrace": "...",
 *       "deviceId": "device_fingerprint_123"
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { robotId, logs: logEntries } = body;

    // 验证请求参数
    if (!robotId || !Array.isArray(logEntries) || logEntries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: '参数错误',
          error: 'robotId 和 logs 数组是必需的',
        },
        { status: 400 }
      );
    }

    // 验证 Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          message: '认证失败',
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    // TODO: 验证 Token 并从中提取 robotId，确保与请求中的 robotId 匹配
    // 这里暂时跳过验证，实际项目中需要实现

    const db = await getDatabase();

    // 批量插入日志
    const uploadedLogs: any[] = [];
    const failedIds: string[] = [];

    for (const entry of logEntries) {
      try {
        const logData = {
          id: entry.id,
          robotId: robotId,
          timestamp: entry.timestamp,
          level: entry.level,
          tag: entry.tag,
          message: entry.message,
          extra: entry.extra ? JSON.stringify(entry.extra) : null,
          stackTrace: entry.stackTrace || null,
          syncStatus: 'success' as const,
          syncTime: Math.floor(Date.now() / 1000),
          deviceId: entry.deviceId || null,
        };

        console.log('[日志上传] 插入日志数据:', JSON.stringify(logData));
        await db.insert(logs).values(logData);
        uploadedLogs.push(entry.id);
        console.log('[日志上传] 插入成功:', entry.id);
      } catch (error: any) {
        console.error('[日志上传] 插入日志失败:', entry.id, error);
        failedIds.push(entry.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: '日志上传成功',
      data: {
        uploaded: uploadedLogs.length,
        failed: failedIds.length,
        failedIds: failedIds,
      },
    });
  } catch (error: any) {
    console.error('日志上传错误:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || '日志上传失败',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

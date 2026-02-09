// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { logs } from '@/storage/database/shared/schema';
import { eq, and, gte, lte, like, desc, sql } from 'drizzle-orm';

/**
 * 日志查询 API
 * GET /api/v1/logs/query
 *
 * 查询指定机器人的日志
 *
 * Query 参数:
 * - robotId: 机器人ID（必需）
 * - level: 日志级别筛选（可选）
 * - tag: 日志标签筛选（可选）
 * - startTime: 开始时间戳（可选）
 * - endTime: 结束时间戳（可选）
 * - keyword: 关键词搜索（可选）
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认50）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const robotId = searchParams.get('robotId');
    const level = searchParams.get('level');
    const tag = searchParams.get('tag');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    // 验证必需参数（robotId 改为可选）
    // 如果不提供 robotId，则查询所有机器人的日志
    // const robotId = searchParams.get('robotId');

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
    // TODO: 验证 Token 并检查用户是否有权限查询该机器人的日志
    // 这里暂时跳过验证，实际项目中需要实现

    const db = await getDatabase();

    // 构建查询条件
    const conditions: any[] = [];

    // robotId 可选：如果不提供，则查询所有机器人的日志
    if (robotId) {
      conditions.push(eq(logs.robotId, robotId));
    }

    if (level !== null && level !== undefined && level !== '') {
      conditions.push(eq(logs.level, parseInt(level, 10)));
    }

    if (tag) {
      conditions.push(eq(logs.tag, tag));
    }

    if (startTime) {
      conditions.push(gte(logs.timestamp, parseInt(startTime, 10)));
    }

    if (endTime) {
      conditions.push(lte(logs.timestamp, parseInt(endTime, 10)));
    }

    if (keyword) {
      conditions.push(like(logs.message, `%${keyword}%`));
    }

    // 查询总数
    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(logs)
      .where(and(...conditions));

    const totalResult = await totalQuery;
    const total = totalResult[0]?.count || 0;

    // 查询日志（分页）
    const offset = (page - 1) * pageSize;
    const queryResults = await db
      .select()
      .from(logs)
      .where(and(...conditions))
      .orderBy(desc(logs.timestamp))
      .limit(pageSize)
      .offset(offset);

    // 转换为响应格式
    const logEntries = queryResults.map((log) => ({
      id: log.id,
      robotId: log.robotId,
      timestamp: log.timestamp,
      level: log.level,
      tag: log.tag,
      message: log.message,
      extra: log.extra ? JSON.parse(log.extra) : null,
      stackTrace: log.stackTrace,
      syncStatus: log.syncStatus,
      syncTime: log.syncTime,
      deviceId: log.deviceId,
    }));

    return NextResponse.json({
      success: true,
      message: '查询成功',
      data: {
        total,
        page,
        pageSize,
        logs: logEntries,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('日志查询错误:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || '查询日志失败',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

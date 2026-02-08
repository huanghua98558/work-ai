// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPool } from "@/lib/db";

/**
 * 日志级别枚举
 * 0: VERBOSE
 * 1: DEBUG
 * 2: INFO
 * 3: WARN
 * 4: ERROR
 * 5: FATAL
 */
enum LogLevel {
  VERBOSE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

/**
 * 日志级别名称映射
 */
const LOG_LEVEL_NAMES: { [key: string]: LogLevel } = {
  'VERBOSE': LogLevel.VERBOSE,
  'DEBUG': LogLevel.DEBUG,
  'INFO': LogLevel.INFO,
  'WARN': LogLevel.WARN,
  'WARNING': LogLevel.WARN, // 兼容 WARNING
  'ERROR': LogLevel.ERROR,
  'FATAL': LogLevel.FATAL,
};

/**
 * 日志上传接口
 * POST /api/v1/logs
 *
 * 请求参数:
 * {
 *   "robotId": "robot_123",
 *   "logs": [
 *     {
 *       "level": "INFO",
 *       "tag": "RobotService",
 *       "message": "机器人已启动",
 *       "timestamp": 1707360000000,
 *       "extras": null
 *     }
 *   ]
 * }
 *
 * 响应格式:
 * {
 *   "code": 200,
 *   "message": "上传成功",
 *   "data": {
 *     "successCount": 1,
 *     "failedCount": 0,
 *     "failedIds": []
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();

  try {
    // 解析请求体
    const body = await request.json();

    // 验证必需参数
    if (!body.robotId) {
      return NextResponse.json({
        code: 400,
        message: "robotId 参数缺失",
        data: null
      }, { status: 400 });
    }

    if (!Array.isArray(body.logs) || body.logs.length === 0) {
      return NextResponse.json({
        code: 400,
        message: "logs 参数必须是非空数组",
        data: null
      }, { status: 400 });
    }

    const robotId = body.robotId;
    const logs = body.logs;
    const deviceId = body.deviceId || null;

    // 限制每次上传的日志数量（最多 1000 条）
    if (logs.length > 1000) {
      return NextResponse.json({
        code: 400,
        message: "单次上传日志数量不能超过 1000 条",
        data: null
      }, { status: 400 });
    }

    // 开始事务
    await client.query('BEGIN');

    let successCount = 0;
    let failedCount = 0;
    const failedIds: number[] = [];

    // 批量插入日志
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const logId = nanoid();

      try {
        // 验证日志字段
        if (!log.level || !log.tag || !log.message) {
          throw new Error(`日志 ${i} 缺少必需字段: level, tag 或 message`);
        }

        // 转换日志级别
        const levelName = (log.level as string).toUpperCase();
        const level = LOG_LEVEL_NAMES[levelName];

        if (level === undefined) {
          throw new Error(`日志 ${i} 包含无效的日志级别: ${log.level}`);
        }

        // 获取时间戳（使用提供的时间戳或当前时间）
        const timestamp = log.timestamp ? Number(log.timestamp) : Date.now();

        // 处理 extras（转换为 JSON 字符串）
        let extra = null;
        if (log.extras !== null && log.extras !== undefined) {
          extra = JSON.stringify(log.extras);
        }

        // 插入日志
        await client.query(
          `INSERT INTO logs (
            id, robot_id, timestamp, level, tag, message, extra,
            stack_trace, sync_status, sync_time, device_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            logId,
            robotId,
            timestamp,
            level,
            log.tag,
            log.message,
            extra,
            log.stackTrace || null,
            'success', // 上传成功
            Math.floor(Date.now() / 1000), // 同步时间（秒）
            deviceId,
          ]
        );

        successCount++;

      } catch (error: any) {
        console.error(`[日志上传] 日志 ${i} 处理失败:`, error);
        failedCount++;
        failedIds.push(i);

        // 继续处理下一条日志
      }
    }

    // 提交事务
    await client.query('COMMIT');

    // 返回响应
    return NextResponse.json({
      code: 200,
      message: "上传成功",
      data: {
        successCount,
        failedCount,
        failedIds,
      }
    });

  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');

    console.error('[日志上传] 处理失败:', error);

    return NextResponse.json({
      code: 500,
      message: error.message || "上传失败",
      data: null
    }, { status: 500 });

  } finally {
    client.release();
  }
}

/**
 * GET 请求 - 获取日志查询接口（可选）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const robotId = searchParams.get('robotId');
  const level = searchParams.get('level');
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  if (!robotId) {
    return NextResponse.json({
      code: 400,
      message: "robotId 参数缺失",
      data: null
    }, { status: 400 });
  }

  const poolInstance = await getPool();
  const client = await poolInstance.connect();

  try {
    // 构建查询条件
    const conditions: string[] = ['robot_id = $1'];
    const params: any[] = [robotId];
    let paramIndex = 2;

    if (level !== null) {
      conditions.push(`level = $${paramIndex}`);
      params.push(parseInt(level, 10));
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // 查询日志总数
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // 查询日志列表
    const logsResult = await client.query(
      `SELECT
        id, robot_id, timestamp, level, tag, message, extra,
        stack_trace, sync_status, device_id, created_at
      FROM logs
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // 转换日志级别为名称
    const LEVEL_NAMES = ['VERBOSE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

    const logs = logsResult.rows.map((row: any) => ({
      id: row.id,
      robotId: row.robot_id,
      timestamp: row.timestamp,
      level: LEVEL_NAMES[row.level] || 'UNKNOWN',
      tag: row.tag,
      message: row.message,
      extras: row.extra ? JSON.parse(row.extra) : null,
      stackTrace: row.stack_trace,
      syncStatus: row.sync_status,
      deviceId: row.device_id,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      code: 200,
      message: "查询成功",
      data: {
        logs,
        total,
        limit,
        offset,
      }
    });

  } catch (error: any) {
    console.error('[日志查询] 处理失败:', error);

    return NextResponse.json({
      code: 500,
      message: error.message || "查询失败",
      data: null
    }, { status: 500 });

  } finally {
    client.release();
  }
}

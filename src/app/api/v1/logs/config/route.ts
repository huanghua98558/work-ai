// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { logConfigs } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

/**
 * 获取日志配置 API
 * GET /api/v1/logs/config?robotId=xxx
 *
 * 获取机器人的日志配置
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const robotId = searchParams.get('robotId');

    // 验证必需参数
    if (!robotId) {
      return NextResponse.json(
        {
          success: false,
          message: '参数错误',
          error: 'robotId 是必需的',
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
    // TODO: 验证 Token 并检查用户是否有权限查询该机器人的配置
    // 这里暂时跳过验证，实际项目中需要实现

    const db = await getDatabase();

    // 查询配置
    const config = await db
      .select()
      .from(logConfigs)
      .where(eq(logConfigs.robotId, robotId))
      .limit(1);

    let result;

    if (config.length > 0) {
      // 配置存在
      result = {
        robotId: config[0].robotId,
        logLevel: config[0].logLevel,
        uploadEnabled: config[0].uploadEnabled,
        uploadInterval: config[0].uploadInterval,
        uploadOnWifiOnly: config[0].uploadOnWifiOnly,
        maxLogEntries: config[0].maxLogEntries,
        retentionDays: config[0].retentionDays,
        tags: config[0].tags ? JSON.parse(config[0].tags) : {},
        updatedAt: Math.floor(new Date(config[0].updatedAt).getTime() / 1000),
      };
    } else {
      // 配置不存在，返回默认配置
      result = {
        robotId: robotId,
        logLevel: 2, // INFO
        uploadEnabled: true,
        uploadInterval: 300000, // 5分钟
        uploadOnWifiOnly: true,
        maxLogEntries: 10000,
        retentionDays: 30,
        tags: {},
        updatedAt: Math.floor(Date.now() / 1000),
      };
    }

    return NextResponse.json({
      success: true,
      message: '获取配置成功',
      data: result,
    });
  } catch (error: any) {
    console.error('获取日志配置错误:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || '获取配置失败',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * 更新日志配置 API
 * POST /api/v1/logs/config
 *
 * 更新机器人的日志配置
 *
 * 请求体格式:
 * {
 *   "robotId": "robot_123456789",
 *   "logLevel": 2,
 *   "uploadEnabled": true,
 *   "uploadInterval": 300000,
 *   "uploadOnWifiOnly": true,
 *   "maxLogEntries": 10000,
 *   "retentionDays": 30,
 *   "tags": {
 *     "RobotService": 2,
 *     "NetworkRequest": 3
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      robotId,
      logLevel,
      uploadEnabled,
      uploadInterval,
      uploadOnWifiOnly,
      maxLogEntries,
      retentionDays,
      tags,
    } = body;

    // 验证必需参数
    if (!robotId) {
      return NextResponse.json(
        {
          success: false,
          message: '参数错误',
          error: 'robotId 是必需的',
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
    // TODO: 验证 Token 并检查用户是否有权限更新该机器人的配置
    // 这里暂时跳过验证，实际项目中需要实现

    const db = await getDatabase();

    // 查询现有配置
    const existingConfig = await db
      .select()
      .from(logConfigs)
      .where(eq(logConfigs.robotId, robotId))
      .limit(1);

    const configData = {
      robotId: robotId,
      logLevel: logLevel !== undefined ? logLevel : 2,
      uploadEnabled: uploadEnabled !== undefined ? uploadEnabled : true,
      uploadInterval: uploadInterval !== undefined ? uploadInterval : 300000,
      uploadOnWifiOnly: uploadOnWifiOnly !== undefined ? uploadOnWifiOnly : true,
      maxLogEntries: maxLogEntries !== undefined ? maxLogEntries : 10000,
      retentionDays: retentionDays !== undefined ? retentionDays : 30,
      tags: tags ? JSON.stringify(tags) : null,
      updatedAt: new Date(),
    };

    if (existingConfig.length > 0) {
      // 更新现有配置
      await db
        .update(logConfigs)
        .set(configData)
        .where(eq(logConfigs.robotId, robotId));
    } else {
      // 插入新配置
      await db.insert(logConfigs).values(configData);
    }

    return NextResponse.json({
      success: true,
      message: '配置更新成功',
      data: {
        configId: `config_${robotId}`,
        updatedAt: Math.floor(Date.now() / 1000),
      },
    });
  } catch (error: any) {
    console.error('更新日志配置错误:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || '配置更新失败',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

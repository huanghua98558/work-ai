// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { verifyAccessToken } from '@/lib/jwt';

/**
 * 设备配置查询接口（兜底方案）
 *
 * 使用场景：
 * - WebSocket 连接失败时主动查询配置
 * - 配置推送失败时重新获取
 * - APP 启动时主动同步配置
 *
 * 认证方式：
 * - Bearer Token (从 Authorization 头获取)
 * - Token 必须是有效的 JWT
 *
 * 参数：
 * - robotId: 机器人 ID（从 Header 或 Query 获取）
 *
 * 返回：
 * - worktoolApiUrl: 第三方 API 地址
 * - resultCallbackUrl: 结果回调地址
 * - secretKey: 密钥
 * - updatedAt: 配置更新时间
 * - version: 配置版本
 * - fallbackMode: 是否为回退模式（true 表示未配置第三方 API）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证 Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: '缺少认证信息',
        code: 'MISSING_AUTH'
      }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const result = verifyAccessToken(token);

    if (!result.valid) {
      return NextResponse.json({
        success: false,
        error: result.error,
        code: 'INVALID_TOKEN'
      }, { status: 401 });
    }

    // 2. 获取 robotId
    const robotId = request.headers.get('x-robot-id') || request.nextUrl.searchParams.get('robotId');

    if (!robotId) {
      return NextResponse.json({
        success: false,
        error: '缺少机器人ID',
        code: 'MISSING_ROBOT_ID'
      }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: '数据库连接失败',
        code: 'DB_ERROR'
      }, { status: 500 });
    }

    // 3. 查询机器人配置
    const robotResult = await db.execute(sql`
      SELECT
        r.robot_id,
        r.robot_uuid,
        r.third_party_callback_url as worktool_api_url,
        r.third_party_result_callback_url,
        r.third_party_secret_key,
        r.updated_at,
        EXTRACT(EPOCH FROM r.updated_at) * 1000 as updated_at_timestamp
      FROM robots r
      WHERE r.robot_id = ${robotId}
      LIMIT 1
    `);

    if (robotResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '机器人不存在',
        code: 'ROBOT_NOT_FOUND'
      }, { status: 404 });
    }

    const robot = robotResult.rows[0];

    // 4. 如果配置了第三方 API，返回配置
    if (robot.worktool_api_url) {
      return NextResponse.json({
        success: true,
        data: {
          worktoolApiUrl: robot.worktool_api_url,
          resultCallbackUrl: robot.third_party_result_callback_url,
          secretKey: robot.third_party_secret_key,
          updatedAt: robot.updated_at_timestamp,
          version: '1.0'
        }
      });
    }

    // 5. 如果未配置，返回默认配置（回退到主服务器）
    const mainServerUrl = process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com';

    console.log(`[Device Config] 机器人未配置第三方 API，返回默认配置: ${robotId}`);

    return NextResponse.json({
      success: true,
      data: {
        worktoolApiUrl: mainServerUrl,
        resultCallbackUrl: null,
        secretKey: null,
        updatedAt: robot.updated_at_timestamp,
        version: '1.0',
        fallbackMode: true
      }
    });

  } catch (error) {
    console.error('[Device Config] 查询配置失败:', error);
    return NextResponse.json({
      success: false,
      error: '查询配置失败',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

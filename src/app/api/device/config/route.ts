// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

/**
 * 设备配置查询接口（兜底方案）
 * 
 * 接口: GET /api/device/config
 * 
 * 使用场景:
 * - WebSocket 连接失败时主动查询配置
 * - 配置推送失败时重新获取
 * - APP 启动时主动同步配置
 * 
 * 请求头:
 * - Authorization: Bearer {token}
 * - X-Robot-Id: {robotId} (可选，也可以从Token中获取)
 */
export async function GET(request: NextRequest) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  
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
    const payload = verifyToken(token);
    
    if (!payload || !payload.valid) {
      return NextResponse.json({
        success: false,
        error: payload?.error || 'Token 无效',
        code: 'INVALID_TOKEN'
      }, { status: 401 });
    }
    
    // 2. 获取 robotId
    const robotId = request.headers.get('x-robot-id') || request.nextUrl.searchParams.get('robotId') || payload.robotId;
    
    if (!robotId) {
      return NextResponse.json({
        success: false,
        error: '缺少机器人ID',
        code: 'MISSING_ROBOT_ID'
      }, { status: 400 });
    }
    
    console.log(`[Device Config] 查询配置: robotId=${robotId}`);
    
    // 3. 查询机器人配置
    const robotResult = await client.query(`
      SELECT 
        r.robot_id,
        r.robot_uuid,
        r.third_party_callback_url as worktool_api_url,
        r.third_party_result_callback_url as result_callback_url,
        r.third_party_secret_key as secret_key,
        EXTRACT(EPOCH FROM r.updated_at) * 1000 as updated_at_timestamp
      FROM robots r
      WHERE r.robot_id = $1
      LIMIT 1
    `, [robotId]);
    
    if (robotResult.rows.length === 0) {
      console.warn(`[Device Config] 机器人不存在: ${robotId}`);
      return NextResponse.json({
        success: false,
        error: '机器人不存在',
        code: 'ROBOT_NOT_FOUND'
      }, { status: 404 });
    }
    
    const robot = robotResult.rows[0];
    
    // 4. 如果配置了第三方 API，返回配置
    if (robot.worktool_api_url) {
      console.log(`[Device Config] 返回配置: ${robotId}`, {
        worktoolApiUrl: robot.worktool_api_url,
        hasResultCallbackUrl: !!robot.result_callback_url,
        hasSecretKey: !!robot.secret_key
      });
      
      return NextResponse.json({
        success: true,
        data: {
          worktoolApiUrl: robot.worktool_api_url,
          resultCallbackUrl: robot.result_callback_url,
          robotId: robot.robot_id,
          secretKey: robot.secret_key,
          updatedAt: robot.updated_at_timestamp,
          version: '1.0'
        }
      });
    }
    
    // 5. 如果未配置，返回默认配置（回退到主服务器）
    const mainServerUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.worktool.ymdyes.cn';
    
    console.log(`[Device Config] 返回默认配置（回退模式）: ${robotId}`);
    
    return NextResponse.json({
      success: true,
      data: {
        worktoolApiUrl: mainServerUrl,
        resultCallbackUrl: null,
        robotId: robot.robot_id,
        secretKey: null,
        updatedAt: robot.updated_at_timestamp,
        version: '1.0',
        fallbackMode: true
      }
    });
    
  } catch (error: any) {
    console.error('[Device Config] 查询配置失败:', error);
    return NextResponse.json({
      success: false,
      error: '查询配置失败',
      code: 'INTERNAL_ERROR',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

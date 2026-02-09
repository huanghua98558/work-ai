// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * 机器人配置管理接口
 * 
 * GET: 获取机器人配置
 * PUT: 更新机器人配置
 * 
 * 接口: GET/PUT /api/robots/[robotId]/config
 */

/**
 * 获取机器人配置
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { robotId: string } }
) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  
  try {
    const { robotId } = params;
    
    console.log(`[Robot Config] 查询配置: robotId=${robotId}`);
    
    const result = await client.query(`
      SELECT 
        robot_id,
        robot_uuid,
        name,
        third_party_callback_url,
        third_party_result_callback_url,
        third_party_secret_key,
        ai_mode,
        ai_provider,
        ai_model,
        EXTRACT(EPOCH FROM updated_at) * 1000 as updated_at_timestamp
      FROM robots
      WHERE robot_id = $1
      LIMIT 1
    `, [robotId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '机器人不存在',
        code: 'ROBOT_NOT_FOUND'
      }, { status: 404 });
    }
    
    const robot = result.rows[0];
    
    return NextResponse.json({
      success: true,
      data: {
        robotId: robot.robot_id,
        robotUuid: robot.robot_uuid,
        name: robot.name,
        thirdPartyCallbackUrl: robot.third_party_callback_url,
        thirdPartyResultCallbackUrl: robot.third_party_result_callback_url,
        thirdPartySecretKey: robot.third_party_secret_key,
        aiMode: robot.ai_mode,
        aiProvider: robot.ai_provider,
        aiModel: robot.ai_model,
        updatedAt: robot.updated_at_timestamp
      }
    });
    
  } catch (error: any) {
    console.error('[Robot Config] 查询配置失败:', error);
    return NextResponse.json({
      success: false,
      error: '查询配置失败',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * 更新机器人配置
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { robotId: string } }
) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  
  try {
    const { robotId } = params;
    const body = await request.json();
    
    const {
      thirdPartyCallbackUrl,
      thirdPartyResultCallbackUrl,
      thirdPartySecretKey,
      aiMode,
      aiProvider,
      aiModel,
      name
    } = body;
    
    console.log(`[Robot Config] 更新配置: robotId=${robotId}`);
    
    // 更新配置
    await client.query(`
      UPDATE robots
      SET 
        third_party_callback_url = COALESCE($1, third_party_callback_url),
        third_party_result_callback_url = COALESCE($2, third_party_result_callback_url),
        third_party_secret_key = COALESCE($3, third_party_secret_key),
        ai_mode = COALESCE($4, ai_mode),
        ai_provider = COALESCE($5, ai_provider),
        ai_model = COALESCE($6, ai_model),
        name = COALESCE($7, name),
        updated_at = NOW()
      WHERE robot_id = $8
    `, [
      thirdPartyCallbackUrl,
      thirdPartyResultCallbackUrl,
      thirdPartySecretKey,
      aiMode,
      aiProvider,
      aiModel,
      name,
      robotId
    ]);
    
    // 推送配置到 APP
    const { pushConfigToRobot } = await import('@/server/websocket/message-handler');
    await pushConfigToRobot(robotId, {
      worktoolApiUrl: thirdPartyCallbackUrl || null,
      resultCallbackUrl: thirdPartyResultCallbackUrl || null,
      robotId,
      secretKey: thirdPartySecretKey || null,
      updatedAt: Date.now(),
      version: '1.0'
    });
    
    console.log(`[Robot Config] 配置已更新并推送: ${robotId}`);
    
    return NextResponse.json({
      success: true,
      message: '配置已更新'
    });
    
  } catch (error: any) {
    console.error('[Robot Config] 更新配置失败:', error);
    return NextResponse.json({
      success: false,
      error: '更新配置失败',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

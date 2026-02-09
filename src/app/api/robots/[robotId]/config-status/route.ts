// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * 配置同步状态查询接口
 * 
 * 接口: GET /api/robots/[robotId]/config-status
 * 
 * 说明: 查询机器人配置同步状态，包括是否已同步、同步时间、错误信息等
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { robotId: string } }
) {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  
  try {
    const { robotId } = params;
    
    console.log(`[Config Status] 查询配置同步状态: robotId=${robotId}`);
    
    const result = await client.query(`
      SELECT 
        robot_id,
        device_id,
        config_version,
        config_synced_at,
        config_synced,
        config_error,
        last_seen_at
      FROM device_activations
      WHERE robot_id = $1
      LIMIT 1
    `, [robotId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '机器人未激活',
        code: 'ROBOT_NOT_ACTIVATED'
      }, { status: 404 });
    }
    
    const config = result.rows[0];
    
    return NextResponse.json({
      success: true,
      data: {
        robotId: config.robot_id,
        deviceId: config.device_id,
        configVersion: config.config_version,
        configSyncedAt: config.config_synced_at,
        configSynced: config.config_synced,
        configError: config.config_error,
        status: config.config_synced ? 'synced' : 'unsynced',
        lastSeenAt: config.last_seen_at
      }
    });
    
  } catch (error: any) {
    console.error('[Config Status] 查询配置同步状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '查询配置同步状态失败',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

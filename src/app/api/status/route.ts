import { NextRequest, NextResponse } from 'next/server';
import { queryDeviceStatus } from '@/server/websocket-server-v3';
import { getOnlineRobots, getConnectionInfo } from '@/server/websocket-server-v3';
import { getPool } from '@/lib/db';

/**
 * 获取在线机器人列表
 * GET /api/status/online
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 获取在线机器人列表
    if (action === 'list') {
      const robots = getOnlineRobots();

      return NextResponse.json({
        success: true,
        data: {
          count: robots.length,
          robots: robots.map(robotId => {
            const conn = getConnectionInfo(robotId);
            return {
              robotId,
              userId: conn?.userId,
              deviceId: conn?.deviceId,
              connectedAt: conn?.connectedAt,
              lastHeartbeatAt: conn?.lastHeartbeatAt,
            };
          }),
        },
      });
    }

    // 主动查询设备状态
    if (action === 'query' && searchParams.get('robotId')) {
      const robotId = searchParams.get('robotId')!;

      try {
        const status = await queryDeviceStatus(robotId);

        return NextResponse.json({
          success: true,
          data: {
            robotId,
            status,
          },
        });
      } catch (error) {
        // 如果实时查询失败，尝试从数据库获取
        const poolInstance = await getPool();
        const client = await poolInstance.connect();

        try {
          const result = await client.query(
            'SELECT * FROM device_status WHERE robot_id = $1',
            [robotId]
          );

          if (result.rows.length > 0) {
            const status = result.rows[0];
            return NextResponse.json({
              success: true,
              data: {
                robotId,
                status: status.status,
                deviceInfo: status.device_info,
                battery: status.battery,
                signal: status.signal,
                memoryUsage: status.memory_usage,
                cpuUsage: status.cpu_usage,
                networkType: status.network_type,
                weworkVersion: status.wework_version,
                lastHeartbeatAt: status.last_heartbeat_at,
                lastUpdatedAt: status.last_updated_at,
                cached: true,
              },
            });
          } else {
            return NextResponse.json(
              {
                success: false,
                error: 'Device status not found',
              },
              { status: 404 }
            );
          }
        } finally {
          client.release();
        }
      }
    }

    // 默认返回概览信息
    const robots = getOnlineRobots();
    const connectionCount = robots.length;

    // 获取设备状态统计
    const poolInstance = await getPool();
    const client = await poolInstance.connect();

    let statusStats: any = {};
    try {
      const result = await client.query(`
        SELECT status, COUNT(*) as count
        FROM device_status
        WHERE last_heartbeat_at > NOW() - INTERVAL '5 minutes'
        GROUP BY status
      `);

      statusStats = Object.fromEntries(
        result.rows.map(row => [row.status, parseInt(row.count)])
      );
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      data: {
        onlineRobots: connectionCount,
        robots,
        statusStats,
      },
    });
  } catch (error) {
    console.error('[API] 获取状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

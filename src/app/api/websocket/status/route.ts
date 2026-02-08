import { NextRequest, NextResponse } from 'next/server';

// 扩展全局类型，支持 WebSocket 连接存储
declare global {
  var __webSocketConnections: Map<string, any> | undefined;
  var __webSocketServerStatus: 'running' | 'stopped' | undefined;
}

/**
 * 获取 WebSocket 实时状态
 * GET /api/websocket/status
 */
export async function GET(request: NextRequest) {
  try {
    // 从全局变量获取连接信息
    const connections = global.__webSocketConnections || new Map();
    const serverStatus = global.__webSocketServerStatus || 'stopped';

    // 获取连接详情
    const connectionDetails = Array.from(connections.entries()).map(([robotId, conn]) => ({
      robotId,
      userId: conn.userId,
      deviceId: conn.deviceId,
      connectedAt: conn.connectedAt,
      lastHeartbeat: conn.lastHeartbeat,
      connectionDuration: Date.now() - conn.connectedAt,
      isAlive: Date.now() - conn.lastHeartbeat < 60000, // 60秒内有心跳即为存活
    }));

    // 计算统计信息
    const totalConnections = connections.size;
    const aliveConnections = connectionDetails.filter(c => c.isAlive).length;
    const averageConnectionDuration = totalConnections > 0
      ? Math.round(connectionDetails.reduce((sum, c) => sum + c.connectionDuration, 0) / totalConnections / 1000)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        serverStatus,
        totalConnections,
        aliveConnections,
        deadConnections: totalConnections - aliveConnections,
        averageConnectionDuration: `${averageConnectionDuration}s`,
        connections: connectionDetails,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('[WebSocket Status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取 WebSocket 状态失败',
      },
      { status: 500 }
    );
  }
}

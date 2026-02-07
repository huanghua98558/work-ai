// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { getOnlineRobots, getConnectionCount, getConnectionInfo, getServerStatus } from "@/server/websocket-server";

/**
 * WebSocket 监控 API
 * GET /api/websocket/monitor
 *
 * 返回 WebSocket 连接状态和在线机器人列表
 */
export async function GET(request: NextRequest) {
  try {
    // 获取服务器状态
    const serverStatus = getServerStatus();

    // 获取在线机器人列表
    const onlineRobots = getOnlineRobots();

    // 获取连接数
    const connectionCount = getConnectionCount();

    // 获取真实的连接信息
    const robotsWithInfo = onlineRobots.map(robotId => {
      const conn = getConnectionInfo(robotId);
      return {
        robotId,
        status: 'online',
        connectedAt: conn ? new Date(conn.connectedAt).toISOString() : new Date().toISOString(),
      };
    });

    return Response.json({
      success: true,
      data: {
        totalConnections: connectionCount,
        onlineRobots: robotsWithInfo,
        serverStatus: serverStatus,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("WebSocket 监控 API 错误:", error);
    return Response.json(
      {
        success: false,
        error: "获取 WebSocket 状态失败",
      },
      { status: 500 }
    );
  }
}

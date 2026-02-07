// 强制动态渲染，避免构建时执行
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { pool } from "@/lib/db";

/**
 * WebSocket认证辅助API
 * GET /api/ws/auth?token=xxx&robotId=xxx
 *
 * 说明：由于Next.js限制，实际的WebSocket服务器需要单独部署
 * 这个API用于验证token和robotId的有效性，供WebSocket服务器调用
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const robotId = searchParams.get("robotId");

    console.log('WebSocket认证请求:', { robotId, token: token?.substring(0, 10) + '...' });

    if (!token || !robotId) {
      return Response.json(
        { authenticated: false, message: "缺少token或robotId" },
        { status: 400 }
      );
    }

    // 查找token记录
    const tokenResult = await client.query(
      `SELECT * FROM device_tokens WHERE access_token = $1 AND robot_id = $2`,
      [token, robotId]
    );

    if (tokenResult.rows.length === 0) {
      return Response.json(
        { authenticated: false, message: "Token无效" },
        { status: 401 }
      );
    }

    const tokenRecord = tokenResult.rows[0];

    // 检查token是否过期
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return Response.json(
        { authenticated: false, message: "Token已过期" },
        { status: 401 }
      );
    }

    // 检查设备绑定是否有效
    const deviceBindingResult = await client.query(
      `SELECT * FROM device_bindings WHERE robot_id = $1`,
      [robotId]
    );

    if (deviceBindingResult.rows.length === 0) {
      return Response.json(
        { authenticated: false, message: "设备未绑定" },
        { status: 401 }
      );
    }

    // 认证成功
    return Response.json({
      authenticated: true,
      robotId: robotId,
      deviceId: tokenRecord.device_id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("WebSocket认证错误:", error);
    return Response.json(
      { authenticated: false, message: "认证失败" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * WebSocket连接信息
 *
 * 注意：完整的WebSocket服务器需要单独部署，使用以下配置：
 *
 * 服务器地址: ws://localhost:5000/ws
 *
 * 认证流程：
 * 1. 客户端连接WebSocket
 * 2. 立即发送认证消息：
 *    {
 *      "type": "authenticate",
 *      "data": {
 *        "robotId": "robot-xxx",
 *        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *        "timestamp": 1707369600000
 *      }
 *    }
 * 3. 服务器验证后返回：
 *    {
 *      "type": "authenticated",
 *      "data": {
 *        "authenticated": true,
 *        "robotId": "robot-xxx",
 *        "timestamp": 1707369601000
 *      }
 *    }
 *
 * 超时时间：30秒
 * 错误码：
 * - 4001: 认证失败
 * - 4006: 认证超时
 * - 4007: Token过期
 * - 4008: robotId不匹配
 */

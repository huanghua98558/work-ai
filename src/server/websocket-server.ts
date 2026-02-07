import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { pool } from '@/lib/db';

console.log('[WebSocket] Module loaded, connection pool imported');

// WebSocket 连接存储
interface WSConnection {
  ws: WebSocket;
  robotId: string;
  userId: number | null;
  deviceId: string;
  lastHeartbeat: number;
}

const connections = new Map<string, WSConnection>();

// 心跳间隔（毫秒）
const HEARTBEAT_INTERVAL = 30 * 1000; // 30秒
// 超时判定（毫秒）
const HEARTBEAT_TIMEOUT = 60 * 1000; // 60秒

// 认证超时时间（毫秒）
const AUTH_TIMEOUT = 30 * 1000; // 30秒

// 心跳检测定时器
let heartbeatTimer: NodeJS.Timeout | null = null;

/**
 * 初始化 WebSocket 服务器
 */
export function initializeWebSocketServer(server: any) {
  console.log('[WebSocket] Initializing WebSocket server...');

  try {
    const wss = new (WebSocket as any).Server({ noServer: true });

    // 处理 HTTP 升级请求
    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      try {
        const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

        // 只处理 /ws 路径
        if (pathname === '/ws') {
          wss.handleUpgrade(request, socket, head, (ws: any) => {
            wss.emit('connection', ws, request);
          });
        } else {
          socket.destroy();
        }
      } catch (err) {
        console.error('[WebSocket] Error handling upgrade:', err);
        socket.destroy();
      }
    });

    // 处理连接
    wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
      let isAuthenticated = false;
      let authTimeoutTimer: NodeJS.Timeout | null = null;

      try {
        const { searchParams } = new URL(request.url || '', `http://${request.headers.host}`);
        const robotId = searchParams.get('robotId');
        const token = searchParams.get('token');

        console.log(`[WebSocket] 新连接尝试: robotId=${robotId}`);

        // 验证参数
        if (!robotId || !token) {
          const errorMsg = {
            type: 'error',
            code: 4001,
            message: '缺少必要参数：robotId 和 token',
          };
          ws.send(JSON.stringify(errorMsg));
          ws.close(4001, '缺少必要参数');
          return;
        }

        // 设置认证超时
        authTimeoutTimer = setTimeout(() => {
          if (!isAuthenticated) {
            console.log(`[WebSocket] 机器人 ${robotId} 认证超时`);
            const errorMsg = {
              type: 'error',
              code: 4006,
              message: '认证超时',
            };
            ws.send(JSON.stringify(errorMsg));
            ws.close(4006, '认证超时');
          }
        }, AUTH_TIMEOUT);

        // 验证 Token 和设备绑定
        const client = await pool.connect();
        try {
          // 查找 token 记录
          const tokenResult = await client.query(
            `SELECT * FROM device_tokens WHERE access_token = $1 AND robot_id = $2`,
            [token, robotId]
          );

          if (tokenResult.rows.length === 0) {
            if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
            const errorMsg = {
              type: 'error',
              code: 4001,
              message: 'Token 无效',
            };
            ws.send(JSON.stringify(errorMsg));
            ws.close(4001, 'Token 无效');
            return;
          }

          const tokenRecord = tokenResult.rows[0];

          // 检查 token 是否过期
          if (new Date() > new Date(tokenRecord.expires_at)) {
            if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
            const errorMsg = {
              type: 'error',
              code: 4007,
              message: 'Token 已过期',
            };
            ws.send(JSON.stringify(errorMsg));
            ws.close(4007, 'Token 已过期');
            return;
          }

          // 检查设备绑定是否有效
          const deviceBindingResult = await client.query(
            `SELECT * FROM device_bindings WHERE robot_id = $1`,
            [robotId]
          );

          if (deviceBindingResult.rows.length === 0) {
            if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
            const errorMsg = {
              type: 'error',
              code: 4001,
              message: '设备未绑定',
            };
            ws.send(JSON.stringify(errorMsg));
            ws.close(4001, '设备未绑定');
            return;
          }

          const deviceBinding = deviceBindingResult.rows[0];

          // 认证成功
          isAuthenticated = true;
          if (authTimeoutTimer) clearTimeout(authTimeoutTimer);

          // 创建连接记录
          const connection: WSConnection = {
            ws,
            robotId,
            userId: deviceBinding.user_id,
            deviceId: deviceBinding.device_id,
            lastHeartbeat: Date.now(),
          };

          connections.set(robotId, connection);

          console.log(`[WebSocket] 机器人 ${robotId} 已认证并连接，当前连接数: ${connections.size}`);

          // 发送认证成功消息
          ws.send(JSON.stringify({
            type: 'authenticated',
            data: {
              authenticated: true,
              robotId,
              deviceId: deviceBinding.device_id,
              userId: deviceBinding.user_id,
              timestamp: Date.now(),
            },
          }));

          // 处理消息
          ws.on('message', async (data: Buffer) => {
            try {
              const message = JSON.parse(data.toString());
              await handleWsMessage(robotId, message, connection);
            } catch (error) {
              console.error(`[WebSocket] 消息处理错误:`, error);
              ws.send(JSON.stringify({
                type: 'error',
                code: 4000,
                message: '消息格式错误',
              }));
            }
          });

          // 处理心跳
          ws.on('pong', () => {
            if (connections.has(robotId)) {
              const conn = connections.get(robotId)!;
              conn.lastHeartbeat = Date.now();
            }
          });

          // 处理关闭
          ws.on('close', () => {
            connections.delete(robotId);
            console.log(`[WebSocket] 机器人 ${robotId} 已断开，当前连接数: ${connections.size}`);
          });

          // 处理错误
          ws.on('error', (error) => {
            console.error(`[WebSocket] 机器人 ${robotId} 连接错误:`, error);
            connections.delete(robotId);
          });

        } finally {
          client.release();
        }
      } catch (error) {
        console.error('[WebSocket] 连接处理错误:', error);
        if (authTimeoutTimer) clearTimeout(authTimeoutTimer);
        ws.close(1000, '连接处理失败');
      }
    });

    // 启动心跳检测
    startHeartbeatCheck();

    console.log('[WebSocket] 服务器已启动');
  } catch (err) {
    console.error('[WebSocket] 初始化失败:', err);
    throw err;
  }
}

/**
 * 处理 WebSocket 消息
 */
async function handleWsMessage(robotId: string, message: any, connection: WSConnection) {
  const { type, data } = message;

  switch (type) {
    case 'ping':
      // 心跳响应
      connection.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now(),
      }));
      connection.lastHeartbeat = Date.now();
      break;

    case 'message':
      // 消息上报（待实现）
      console.log(`[WebSocket] 收到消息:`, data);
      connection.ws.send(JSON.stringify({
        type: 'message_ack',
        messageId: data.messageId,
        timestamp: Date.now(),
      }));
      break;

    case 'status':
      // 状态更新
      console.log(`[WebSocket] 状态更新:`, data);
      await updateRobotStatus(robotId, data);
      connection.ws.send(JSON.stringify({
        type: 'status_ack',
        timestamp: Date.now(),
      }));
      break;

    default:
      connection.ws.send(JSON.stringify({
        type: 'error',
        code: 4000,
        message: `未知的消息类型: ${type}`,
      }));
  }
}

/**
 * 更新机器人状态
 */
async function updateRobotStatus(robotId: string, status: any) {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE device_bindings SET last_active_at = NOW() WHERE robot_id = $1',
        [robotId]
      );
      console.log(`[WebSocket] 机器人 ${robotId} 状态已更新:`, status);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[WebSocket] 更新机器人状态失败:`, error);
  }
}

/**
 * 启动心跳检测
 */
function startHeartbeatCheck() {
  if (heartbeatTimer) {
    return;
  }

  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    const timeoutConnections: string[] = [];

    connections.forEach((conn, robotId) => {
      // 检查是否超时
      if (now - conn.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        timeoutConnections.push(robotId);
      } else {
        // 发送 ping
        conn.ws.ping();
      }
    });

    // 关闭超时连接
    timeoutConnections.forEach(robotId => {
      const conn = connections.get(robotId);
      if (conn) {
        console.log(`[WebSocket] 机器人 ${robotId} 心跳超时，断开连接`);
        conn.ws.close(1000, '心跳超时');
        connections.delete(robotId);
      }
    });
  }, HEARTBEAT_INTERVAL);
}

/**
 * 停止心跳检测
 */
function stopHeartbeatCheck() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    console.log('[WebSocket] 心跳检测已停止');
  }
}

/**
 * 发送消息到指定机器人
 */
export function sendToRobot(robotId: string, message: any) {
  const connection = connections.get(robotId);
  if (connection && connection.ws.readyState === WebSocket.OPEN) {
    connection.ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

/**
 * 广播消息到所有连接
 */
export function broadcast(message: any) {
  connections.forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(message));
    }
  });
}

/**
 * 获取在线机器人列表
 */
export function getOnlineRobots(): string[] {
  return Array.from(connections.keys());
}

/**
 * 获取连接数
 */
export function getConnectionCount(): number {
  return connections.size;
}

/**
 * 获取指定机器人的连接信息
 */
export function getConnectionInfo(robotId: string): WSConnection | undefined {
  return connections.get(robotId);
}

/**
 * 发送 WebSocket 消息（给其他模块使用）
 */
export function sendWebSocketMessage(robotId: string, message: any): boolean {
  return sendToRobot(robotId, message);
}

import { Server as WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { verifyToken, JWTPayload } from '@/lib/jwt';
import { getDatabase } from '@/lib/db';
import { sql } from 'drizzle-orm';

// WebSocket 连接存储
interface WSConnection {
  ws: WebSocket;
  robotId: string;
  userId: number;
  lastHeartbeat: number;
}

const connections = new Map<string, WSConnection>();

// 心跳间隔（毫秒）
const HEARTBEAT_INTERVAL = 30 * 1000; // 30秒
// 超时判定（毫秒）
const HEARTBEAT_TIMEOUT = 60 * 1000; // 60秒

// 心跳检测定时器
let heartbeatTimer: NodeJS.Timeout | null = null;

/**
 * 初始化 WebSocket 服务器
 */
export function initializeWebSocketServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  // 处理 HTTP 升级请求
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const { pathname, searchParams } = new URL(request.url || '', `http://${request.headers.host}`);
    
    // 只处理 /ws 路径
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // 处理连接
  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    const { searchParams } = new URL(request.url || '', `http://${request.headers.host}`);
    const robotId = searchParams.get('robotId');
    const token = searchParams.get('token');

    // 验证参数
    if (!robotId || !token) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '缺少必要参数：robotId 和 token',
      }));
      ws.close(1008, '缺少必要参数');
      return;
    }

    // 验证 Token
    const payload = verifyToken(token);
    if (!payload) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Token 无效或已过期',
      }));
      ws.close(1008, 'Token 无效');
      return;
    }

    // 验证机器人是否已激活
    const db = await getDatabase();
    const activationResult = await db.execute(sql`
      SELECT * FROM device_activations
      WHERE robot_id = ${robotId}
      LIMIT 1
    `);

    if (activationResult.rows.length === 0) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '机器人不存在或未激活',
      }));
      ws.close(1008, '机器人未激活');
      return;
    }

    // 创建连接记录
    const connection: WSConnection = {
      ws,
      robotId,
      userId: payload.userId,
      lastHeartbeat: Date.now(),
    };

    connections.set(robotId, connection);

    console.log(`[WebSocket] 机器人 ${robotId} 已连接，当前连接数: ${connections.size}`);

    // 发送连接成功消息
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket 连接成功',
      robotId,
      timestamp: Date.now(),
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
  });

  // 启动心跳检测
  startHeartbeatCheck();

  console.log('[WebSocket] 服务器已启动');
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
      break;

    default:
      connection.ws.send(JSON.stringify({
        type: 'error',
        message: `未知的消息类型: ${type}`,
      }));
  }
}

/**
 * 更新机器人状态
 */
async function updateRobotStatus(robotId: string, status: any) {
  try {
    const db = await getDatabase();
    
    await db.execute(sql`
      UPDATE device_activations
      SET last_active_at = NOW()
      WHERE robot_id = ${robotId}
    `);
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

    // 如果没有连接，可以停止定时器
    if (connections.size === 0) {
      stopHeartbeatCheck();
    }
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

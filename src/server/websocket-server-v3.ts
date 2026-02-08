/**
 * WebSocket 服务器 (v3.0)
 * 基于 WorkBot WebSocket 通讯技术文档 v3.0
 */

import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { getPool } from '@/lib/db';
import { connectionManager } from './websocket/connection-manager';
import { messageHandler } from './websocket/message-handler';
import { commandQueue } from './websocket/command-queue';
import { WSMessage, WSMessageType } from './websocket/types';

// 扩展全局类型
declare global {
  var __webSocketServerStatus: 'running' | 'stopped' | undefined;
  var __webSocketServerV3: WebSocket.Server | undefined;
}

// 全局服务器状态
let globalServerStatus: 'running' | 'stopped' = 'stopped';
if (typeof global !== 'undefined' && global.__webSocketServerStatus) {
  globalServerStatus = global.__webSocketServerStatus;
}

// 心跳配置
const HEARTBEAT_INTERVAL = 30 * 1000; // 30秒 - 文档要求
const HEARTBEAT_TIMEOUT = 60 * 1000;  // 60秒 - 文档要求
const AUTH_TIMEOUT = 30 * 1000;      // 30秒 - 文档要求

// 心跳检测定时器
let heartbeatTimer: NodeJS.Timeout | null = null;

// 最大连接数
const MAX_CONNECTIONS = 100;

console.log('[WebSocket v3.0] 模块已加载');

/**
 * 初始化 WebSocket 服务器 (v3.0)
 */
export async function initializeWebSocketServer(server: any) {
  console.log('[WebSocket v3.0] 正在初始化服务器...');

  try {
    // 初始化数据库连接池
    await getPool();
    console.log('[WebSocket v3.0] 数据库连接池已初始化');

    // 创建 WebSocket 服务器
    const wss = new WebSocket.Server({ noServer: true });

    // 保存到全局变量
    if (typeof global !== 'undefined') {
      global.__webSocketServerV3 = wss;
    }

    // 处理 HTTP 升级请求
    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      try {
        const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

        // 处理 /ws 路径（主连接）
        if (pathname === '/ws') {
          wss.handleUpgrade(request, socket, head, (ws: any) => {
            wss.emit('connection', ws, request);
          });
        } else if (pathname === '/api/v1/logs/stream') {
          // 日志流连接（保留旧版本兼容）
          wss.handleUpgrade(request, socket, head, (ws: any) => {
            wss.emit('logStreamConnection', ws, request);
          });
        } else {
          socket.destroy();
        }
      } catch (err) {
        console.error('[WebSocket v3.0] 处理升级请求失败:', err);
        socket.destroy();
      }
    });

    // 处理主连接
    wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
      console.log('[WebSocket v3.0] 新连接建立，等待认证...');

      // 检查连接数限制
      if (connectionManager.getConnectionCount() >= MAX_CONNECTIONS) {
        console.warn(`[WebSocket v3.0] 连接数已达上限 (${MAX_CONNECTIONS})`);
        sendError(ws, 4029, '服务器连接数已达上限');
        ws.close(4029, '连接数已达上限');
        return;
      }

      // 添加连接到管理器
      connectionManager.addConnection(ws);
      const connection = connectionManager.getConnectionByWs(ws)!;

      // 设置认证超时
      const authTimeout = setTimeout(() => {
        if (!connection.authenticated) {
          console.log('[WebSocket v3.0] 认证超时，断开连接');
          sendError(ws, 4006, '认证超时');
          ws.close(4006, '认证超时');
        }
      }, AUTH_TIMEOUT);

      // 处理消息
      ws.on('message', async (data: Buffer) => {
        try {
          // 清除认证超时
          if (authTimeout && !connection.authenticated) {
            clearTimeout(authTimeout);
          }

          // 解析消息
          const message: WSMessage = JSON.parse(data.toString());
          console.log(`[WebSocket v3.0] 收到消息: ${message.type}, robotId: ${connection.robotId || 'unauthenticated'}`);

          // 更新连接信息
          if (connection.authenticated && connection.robotId) {
            // 更新最后心跳时间
            connection.lastHeartbeatAt = new Date();
          }

          // 处理消息
          await messageHandler.handleMessage(message, connection);

          // 如果是认证成功，更新连接管理器
          if (message.type === WSMessageType.AUTHENTICATED && connection.authenticated && connection.robotId) {
            (connectionManager as any).updateRobotId(ws, connection.robotId);
          }

        } catch (error) {
          console.error('[WebSocket v3.0] 消息处理失败:', error);
          sendError(ws, 4000, '消息格式错误');
        }
      });

      // 处理关闭
      ws.on('close', (code: number, reason: Buffer) => {
        if (authTimeout) {
          clearTimeout(authTimeout);
        }

        console.log(`[WebSocket v3.0] 连接关闭: ${connection.robotId || 'unauthenticated'}, code: ${code}, reason: ${reason.toString()}`);
        connectionManager.removeConnection(ws);
      });

      // 处理错误
      ws.on('error', (error: Error) => {
        console.error('[WebSocket v3.0] 连接错误:', error);
        if (authTimeout) {
          clearTimeout(authTimeout);
        }
      });

      // 兼容旧版本：处理 ping/pong
      ws.on('ping', () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.pong();
        }
      });

      ws.on('pong', () => {
        if (connection.authenticated) {
          connection.lastHeartbeatAt = new Date();
        }
      });
    });

    // 处理日志流连接（保留旧版本兼容性）
    wss.on('logStreamConnection', async (ws: WebSocket, request: IncomingMessage) => {
      // TODO: 实现日志流连接逻辑
      console.log('[WebSocket v3.0] 日志流连接（暂未实现）');
    });

    // 启动心跳检测
    startHeartbeatCheck();

    // 启动定期清理
    startPeriodicCleanup();

    // 更新服务器状态
    globalServerStatus = 'running';
    if (typeof global !== 'undefined') {
      global.__webSocketServerStatus = 'running';
    }

    console.log('[WebSocket v3.0] 服务器已启动');
  } catch (error) {
    console.error('[WebSocket v3.0] 初始化失败:', error);
    throw error;
  }
}

/**
 * 启动心跳检测
 */
function startHeartbeatCheck() {
  if (heartbeatTimer) {
    console.log('[WebSocket v3.0] 心跳检测已在运行');
    return;
  }

  console.log('[WebSocket v3.0] 启动心跳检测...');

  heartbeatTimer = setInterval(() => {
    // 清理超时连接
    connectionManager.cleanupTimeoutConnections(HEARTBEAT_TIMEOUT);

    // 获取所有已认证连接
    const connections = connectionManager.getAuthenticatedConnections();

    console.log(`[WebSocket v3.0] 心跳检测: ${connections.length} 个活跃连接`);

  }, HEARTBEAT_INTERVAL);

  console.log('[WebSocket v3.0] 心跳检测已启动');
}

/**
 * 停止心跳检测
 */
function stopHeartbeatCheck() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    console.log('[WebSocket v3.0] 心跳检测已停止');
  }
}

/**
 * 启动定期清理任务
 */
function startPeriodicCleanup() {
  // 每 10 分钟清理一次已完成的指令
  setInterval(() => {
    commandQueue.cleanCompletedCommands(10 * 60 * 1000);
    console.log('[WebSocket v3.0] 定期清理完成');
  }, 10 * 60 * 1000);
}

/**
 * 发送错误消息
 */
function sendError(ws: WebSocket, code: number, message: string, details?: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: WSMessageType.ERROR,
      data: {
        code,
        message,
        details,
      },
      timestamp: Date.now(),
    }));
  }
}

/**
 * 发送消息到指定机器人
 */
export function sendToRobot(robotId: string, message: WSMessage): boolean {
  const connection = connectionManager.getConnection(robotId);
  if (!connection || !connection.authenticated) {
    console.warn(`[WebSocket v3.0] 机器人 ${robotId} 未连接或未认证`);
    return false;
  }

  if (connection.ws.readyState !== WebSocket.OPEN) {
    console.warn(`[WebSocket v3.0] 机器人 ${robotId} 连接未打开`);
    return false;
  }

  try {
    connection.ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error(`[WebSocket v3.0] 发送消息到机器人 ${robotId} 失败:`, error);
    return false;
  }
}

/**
 * 广播消息到所有连接
 */
export function broadcast(message: WSMessage, excludeRobotIds?: string[]): void {
  connectionManager.broadcast(message, excludeRobotIds);
}

/**
 * 获取在线机器人列表
 */
export function getOnlineRobots(): string[] {
  return connectionManager
    .getAuthenticatedConnections()
    .map(conn => conn.robotId!)
    .filter(Boolean);
}

/**
 * 获取连接数
 */
export function getConnectionCount(): number {
  return connectionManager.getConnectionCount();
}

/**
 * 获取服务器状态
 */
export function getServerStatus(): 'running' | 'stopped' {
  if (globalServerStatus === 'stopped' && connectionManager.getConnectionCount() > 0) {
    return 'running';
  }
  return globalServerStatus;
}

/**
 * 推送指令到机器人
 */
export async function pushCommand(robotId: string, command: any): Promise<boolean> {
  try {
    // 添加到指令队列
    await commandQueue.addCommand(command);

    // 获取连接
    const connection = connectionManager.getConnection(robotId);
    if (!connection || !connection.authenticated) {
      console.log(`[WebSocket v3.0] 机器人 ${robotId} 未连接，指令已加入队列`);
      return false;
    }

    // 发送指令
    const message: WSMessage = {
      type: WSMessageType.COMMAND_PUSH,
      data: command,
      timestamp: Date.now(),
    };

    const sent = sendToRobot(robotId, message);
    if (sent) {
      await commandQueue.markExecuting(command.commandId);
    }

    return sent;
  } catch (error) {
    console.error('[WebSocket v3.0] 推送指令失败:', error);
    return false;
  }
}

/**
 * 推送配置到机器人
 */
export async function pushConfig(robotId: string, config: any): Promise<boolean> {
  try {
    const connection = connectionManager.getConnection(robotId);
    if (!connection || !connection.authenticated) {
      console.warn(`[WebSocket v3.0] 机器人 ${robotId} 未连接`);
      return false;
    }

    const message: WSMessage = {
      type: WSMessageType.CONFIG_PUSH,
      data: config,
      timestamp: Date.now(),
    };

    return sendToRobot(robotId, message);
  } catch (error) {
    console.error('[WebSocket v3.0] 推送配置失败:', error);
    return false;
  }
}

/**
 * 查询设备状态
 */
export async function queryDeviceStatus(robotId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const connection = connectionManager.getConnection(robotId);
    if (!connection || !connection.authenticated) {
      reject(new Error('机器人未连接'));
      return;
    }

    const queryId = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 发送状态查询
    const message: WSMessage = {
      type: WSMessageType.STATUS_QUERY,
      data: { queryId },
      timestamp: Date.now(),
    };

    if (!sendToRobot(robotId, message)) {
      reject(new Error('发送状态查询失败'));
      return;
    }

    // 等待响应（简单实现：实际应该使用 Promise + 监听器）
    // TODO: 实现更完善的响应等待机制
    setTimeout(() => {
      reject(new Error('查询超时'));
    }, 5000);
  });
}

/**
 * 获取指令队列统计
 */
export function getQueueStats(): {
  total: number;
  pending: number;
  executing: number;
  success: number;
  failed: number;
} {
  return commandQueue.getStats();
}

// 向后兼容的导出
export { sendToRobot as sendWebSocketMessage };

/**
 * 获取连接信息
 */
export function getConnectionInfo(robotId: string): any {
  const connection = connectionManager.getConnection(robotId);
  if (!connection) {
    return undefined;
  }

  return {
    robotId: connection.robotId,
    userId: connection.userId,
    deviceId: connection.deviceId,
    connectedAt: connection.connectedAt,
    lastHeartbeatAt: connection.lastHeartbeatAt,
  };
}
